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
  TransactionStatus,
} from './entities/payment-transaction.entity';
import { Patient } from '../patients/entities/patient.entity';
import { CreateBillDto } from './dto/create-bill.dto';
import { AddBillItemDto } from './dto/add-bill-item.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';

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
  ) {}

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

    const billNumber = await this.generateBillNumber(facilityId);
    const bill = this.billRepo.create({
      ...dto,
      facilityId,
      generatedById: userId,
      billNumber,
      billDate: new Date(),
    });
    return this.billRepo.save(bill);
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

    // Recalculate subtotal
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

    const transaction = this.transactionRepo.create({
      billId,
      patientId: bill.patientId,
      facilityId,
      amount: dto.amount,
      paymentMode: dto.method,
      upiTransactionId: dto.transactionRef,
      notes: dto.notes,
      receivedById: userId,
      status: TransactionStatus.SUCCESS,
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
      .andWhere('t.status = :status', { status: TransactionStatus.SUCCESS })
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
}
