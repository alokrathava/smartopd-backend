import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bill, BillStatus } from './entities/bill.entity';
import { BillItem } from './entities/bill-item.entity';
import {
  PaymentTransaction,
  PaymentMode,
  TransactionStatus,
} from './entities/payment-transaction.entity';
import { Patient } from '../patients/entities/patient.entity';
import { CreateBillDto } from './dto/create-bill.dto';
import { AddBillItemDto } from './dto/add-bill-item.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';
import {
  InitiatePaymentDto,
  VerifyPaymentDto,
  RefundPaymentDto,
} from './dto/payment-provider.dto';
import { PaymentProviderFactory } from './providers/payment-provider.factory';
import { PaymentMethod } from './enums/payment-method.enum';

@Injectable()
export class PaymentService {
  constructor(
    @InjectRepository(Bill)
    private readonly billRepo: Repository<Bill>,
    @InjectRepository(BillItem)
    private readonly billItemRepo: Repository<BillItem>,
    @InjectRepository(PaymentTransaction)
    private readonly transactionRepo: Repository<PaymentTransaction>,
    @InjectRepository(Patient)
    private readonly patientRepo: Repository<Patient>,
    private readonly paymentProviderFactory: PaymentProviderFactory,
  ) {}

  /**
   * Maps a PaymentMethod (provider/DTO layer) to a PaymentMode (entity layer).
   *
   * These are two separate enums that serve different purposes:
   *  - PaymentMethod  → which payment gateway/provider to use (RAZORPAY, STRIPE, …)
   *  - PaymentMode    → how the money actually moved on the transaction record
   *                     (CASH, UPI, CARD, NEFT, INSURANCE, WAIVED)
   *
   * Razorpay and Stripe both result in a CARD/UPI/etc. movement at the DB level,
   * so we normalise them to the closest PaymentMode here.
   */
  private toPaymentMode(method: PaymentMethod): PaymentMode {
    const map: Record<PaymentMethod, PaymentMode> = {
      [PaymentMethod.RAZORPAY]: PaymentMode.CARD, // Razorpay covers UPI/card – default to CARD
      [PaymentMethod.STRIPE]: PaymentMode.CARD, // Stripe is card-based
      [PaymentMethod.CASH]: PaymentMode.CASH,
      [PaymentMethod.CHEQUE]: PaymentMode.NEFT, // Closest offline mode
      [PaymentMethod.BANK_TRANSFER]: PaymentMode.NEFT,
      [PaymentMethod.INSURANCE]: PaymentMode.INSURANCE,
      [PaymentMethod.CUSTOM_OVERRIDE]: PaymentMode.WAIVED,
    };

    const mode = map[method];
    if (!mode) {
      throw new BadRequestException(`Unsupported payment method: ${method}`);
    }
    return mode;
  }

  /**
   * Maps a PaymentMode (entity layer) back to a PaymentMethod so the correct
   * provider can be retrieved from the factory for verify/refund operations.
   */
  private toPaymentMethod(mode: PaymentMode): PaymentMethod {
    const map: Record<PaymentMode, PaymentMethod> = {
      [PaymentMode.CASH]: PaymentMethod.CASH,
      [PaymentMode.UPI]: PaymentMethod.RAZORPAY, // UPI is processed via Razorpay
      [PaymentMode.CARD]: PaymentMethod.RAZORPAY, // Default card provider
      [PaymentMode.NEFT]: PaymentMethod.BANK_TRANSFER,
      [PaymentMode.INSURANCE]: PaymentMethod.INSURANCE,
      [PaymentMode.WAIVED]: PaymentMethod.CUSTOM_OVERRIDE,
    };

    const method = map[mode];
    if (!method) {
      throw new BadRequestException(`Unsupported payment mode: ${mode}`);
    }
    return method;
  }

  private async generateBillNumber(facilityId: string): Promise<string> {
    const year = new Date().getFullYear();
    const month = String(new Date().getMonth() + 1).padStart(2, '0');
    const prefix = `BILL-${year}${month}-`;

    const last = await this.billRepo
      .createQueryBuilder('b')
      .where('b.facilityId = :facilityId', { facilityId })
      .andWhere('b.billNumber LIKE :prefix', { prefix: `${prefix}%` })
      .orderBy('b.billNumber', 'DESC')
      .getOne();

    let seq = 1;
    if (last?.billNumber) {
      const parts = last.billNumber.split('-');
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) seq = lastSeq + 1;
    }

    return `${prefix}${String(seq).padStart(5, '0')}`;
  }

  async createBill(
    dto: CreateBillDto,
    facilityId: string,
    userId: string,
  ): Promise<Bill> {
    const patient = await this.patientRepo.findOne({
      where: { id: dto.patientId, facilityId },
    });
    if (!patient)
      throw new NotFoundException(`Patient ${dto.patientId} not found`);

    // Retry loop for handling duplicate bill number race conditions
    // Multiple concurrent requests can generate the same bill number
    let lastError: any = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const billNumber = await this.generateBillNumber(facilityId);
        const bill = this.billRepo.create({
          ...dto,
          facilityId,
          generatedById: userId,
          billNumber,
          billDate: new Date(),
        });
        return await this.billRepo.save(bill);
      } catch (error: any) {
        // Check if this is a duplicate constraint error
        if (
          attempt < 2 &&
          error?.code === 'ER_DUP_ENTRY' &&
          error?.message?.includes('billNumber')
        ) {
          lastError = error;
          // Wait a small amount before retry to allow other transactions to complete
          await new Promise((resolve) => setTimeout(resolve, 10 * (attempt + 1)));
          continue;
        }
        // For other errors, fail immediately
        throw error;
      }
    }

    // If all retries failed, throw the last error
    throw lastError;
  }

  async addItem(dto: AddBillItemDto, facilityId: string): Promise<BillItem> {
    const bill = await this.getBill(dto.billId!, facilityId);
    if (
      bill.status === BillStatus.FINALIZED ||
      bill.status === BillStatus.PAID
    ) {
      throw new BadRequestException(
        'Cannot add items to a finalized or paid bill',
      );
    }
    const qty = dto.quantity ?? 1;
    const unitPrice = dto.unitPrice ?? (dto.amount ? dto.amount / qty : 0);
    const amount = dto.amount ?? qty * unitPrice;
    const item = this.billItemRepo.create({
      billId: dto.billId,
      description: dto.description,
      itemType: dto.itemType,
      quantity: qty,
      unitPrice,
      gstPercent: dto.gstPercent ?? 0,
      hsnSacCode: dto.hsnSacCode,
      facilityId,
      amount,
    });
    const saved = await this.billItemRepo.save(item);

    await this.recalculate(bill.id, facilityId);
    return saved;
  }

  private async recalculate(billId: string, facilityId: string): Promise<void> {
    const items = await this.billItemRepo.find({
      where: { billId, facilityId },
    });
    const subtotal = items.reduce((sum, i) => sum + Number(i.amount), 0);
    const taxAmount = items.reduce(
      (sum, i) => sum + (Number(i.amount) * Number(i.gstPercent)) / 100,
      0,
    );
    const totalAmount = subtotal + taxAmount;

    await this.billRepo.update(billId, {
      subtotal,
      taxAmount,
      totalAmount,
      dueAmount: totalAmount,
    });
  }

  async finalizeBill(id: string, facilityId: string): Promise<Bill> {
    const bill = await this.getBill(id, facilityId);
    await this.recalculate(id, facilityId);
    const fresh = await this.getBill(id, facilityId);
    fresh.status = BillStatus.FINALIZED;
    fresh.dueAmount = Number(fresh.totalAmount) - Number(fresh.paidAmount);
    return this.billRepo.save(fresh);
  }

  async recordPayment(
    dto: RecordPaymentDto,
    facilityId: string,
    userId: string,
  ): Promise<PaymentTransaction> {
    if (!dto.billId) {
      throw new BadRequestException('billId is required');
    }

    const billId = dto.billId;
    const bill = await this.getBill(billId, facilityId);

    // dto.method is PaymentMode (from RecordPaymentDto) — matches entity directly.
    const transaction = this.transactionRepo.create({
      billId,
      patientId: bill.patientId,
      facilityId,
      amount: dto.amount,
      paymentMode: dto.method, // PaymentMode → PaymentMode ✓
      upiTransactionId: dto.transactionRef,
      notes: dto.notes,
      receivedById: userId,
      status: TransactionStatus.SUCCESS, // TransactionStatus → TransactionStatus ✓
      paidAt: new Date(),
    });
    const saved = await this.transactionRepo.save(transaction);

    const newPaid = Number(bill.paidAmount) + Number(dto.amount);
    const newDue = Number(bill.totalAmount) - newPaid;

    let newStatus = bill.status;
    if (newDue <= 0) newStatus = BillStatus.PAID;
    else if (newPaid > 0) newStatus = BillStatus.PARTIAL;

    await this.billRepo.update(billId, {
      paidAmount: newPaid,
      dueAmount: Math.max(0, newDue),
      status: newStatus,
    });

    return saved;
  }

  async getDailyRevenue(facilityId: string, date: string) {
    const d = new Date(date);
    const next = new Date(d);
    next.setDate(next.getDate() + 1);

    const byMode = await this.transactionRepo
      .createQueryBuilder('t')
      .select('SUM(t.amount)', 'total')
      .addSelect('t.paymentMode', 'mode')
      .where('t.facilityId = :facilityId', { facilityId })
      .andWhere('t.paidAt >= :d AND t.paidAt < :next', { d, next })
      .andWhere('t.status = :status', { status: TransactionStatus.SUCCESS }) // TransactionStatus ✓
      .groupBy('t.paymentMode')
      .getRawMany();

    const totalRevenue = byMode.reduce(
      (sum, row) => sum + Number(row.total || 0),
      0,
    );

    return { totalRevenue, byMode, date };
  }

  async getBill(id: string, facilityId: string): Promise<Bill> {
    const bill = await this.billRepo.findOne({ where: { id, facilityId } });
    if (!bill) throw new NotFoundException(`Bill ${id} not found`);
    return bill;
  }

  async getPatientBills(
    patientId: string,
    facilityId: string,
  ): Promise<Bill[]> {
    return this.billRepo.find({
      where: { patientId, facilityId },
      order: { createdAt: 'DESC' },
    });
  }

  // ─── Payment Provider Integration Methods ──────────────────────────────────

  async initiatePayment(
    billId: string,
    dto: InitiatePaymentDto,
    facilityId: string,
    userId: string,
  ): Promise<any> {
    const bill = await this.getBill(billId, facilityId);

    // dto.method is PaymentMethod — route to the correct gateway provider.
    const provider = this.paymentProviderFactory.getProvider(dto.method);

    const paymentInit = await provider.initiate({
      amount: dto.amount,
      billId,
      currency: dto.currency || 'INR',
      description: dto.description || `Payment for bill ${bill.billNumber}`,
      customerEmail: dto.customerEmail,
      customerPhone: dto.customerPhone,
      metadata: dto.metadata,
    });

    // Convert PaymentMethod → PaymentMode for the entity column.
    const transaction = this.transactionRepo.create({
      billId,
      patientId: bill.patientId,
      facilityId,
      amount: dto.amount,
      paymentMode: this.toPaymentMode(dto.method), // PaymentMethod → PaymentMode ✓
      status: TransactionStatus.INITIATED, // TransactionStatus ✓
      receivedById: userId,
      notes: `Payment initiated via ${dto.method}`,
    });

    await this.transactionRepo.save(transaction);

    return paymentInit;
  }

  async verifyPayment(
    billId: string,
    dto: VerifyPaymentDto,
    facilityId: string,
    userId: string,
  ): Promise<any> {
    const bill = await this.getBill(billId, facilityId);

    const transaction = await this.transactionRepo.findOne({
      where: { billId, upiTransactionId: dto.transactionRef },
    });

    if (!transaction) {
      throw new NotFoundException(
        `Payment transaction ${dto.transactionRef} not found`,
      );
    }

    // transaction.paymentMode is PaymentMode; convert back to PaymentMethod
    // so the correct gateway provider can be retrieved from the factory.
    const provider = this.paymentProviderFactory.getProvider(
      this.toPaymentMethod(transaction.paymentMode), // PaymentMode → PaymentMethod ✓
    );

    const verifyResult = await provider.verify({
      paymentId: transaction.id,
      transactionRef: dto.transactionRef,
      amount: dto.amount,
      metadata: dto.metadata,
    });

    if (verifyResult.success) {
      transaction.status = TransactionStatus.SUCCESS; // TransactionStatus ✓
      transaction.paidAt = new Date();
      await this.transactionRepo.save(transaction);

      const newPaid = Number(bill.paidAmount) + Number(dto.amount);
      const newDue = Number(bill.totalAmount) - newPaid;

      let newStatus = bill.status;
      if (newDue <= 0) newStatus = BillStatus.PAID;
      else if (newPaid > 0) newStatus = BillStatus.PARTIAL;

      await this.billRepo.update(billId, {
        paidAmount: newPaid,
        dueAmount: Math.max(0, newDue),
        status: newStatus,
      });
    }

    return verifyResult;
  }

  async refundPayment(
    transactionId: string,
    dto: RefundPaymentDto,
    facilityId: string,
  ): Promise<any> {
    const transaction = await this.transactionRepo.findOne({
      where: { id: transactionId, facilityId },
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction ${transactionId} not found`);
    }

    // Compare using TransactionStatus — same enum as the entity property.
    if (transaction.status !== TransactionStatus.SUCCESS) {
      // TransactionStatus ✓
      throw new BadRequestException(
        `Cannot refund transaction with status ${transaction.status}`,
      );
    }

    // Convert PaymentMode → PaymentMethod to reach the correct gateway.
    const provider = this.paymentProviderFactory.getProvider(
      this.toPaymentMethod(transaction.paymentMode), // PaymentMode → PaymentMethod ✓
    );

    const refundResult = await provider.refund({
      transactionId: transaction.id,
      amount: dto.amount || Number(transaction.amount),
      reason: dto.reason,
    });

    if (refundResult.status === 'REFUNDED') {
      transaction.status = TransactionStatus.REFUNDED; // TransactionStatus ✓
      await this.transactionRepo.save(transaction);

      if (!dto.amount || dto.amount === Number(transaction.amount)) {
        const bill = await this.getBill(transaction.billId, facilityId);
        const newPaid = Math.max(
          0,
          Number(bill.paidAmount) - Number(transaction.amount),
        );
        await this.billRepo.update(transaction.billId, {
          paidAmount: newPaid,
          dueAmount: Number(bill.totalAmount) - newPaid,
          status: BillStatus.FINALIZED,
        });
      }
    }

    return refundResult;
  }
}
