import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { Bill, BillStatus } from './entities/bill.entity';
import { BillItem } from './entities/bill-item.entity';
import {
  PaymentTransaction,
  TransactionStatus,
} from './entities/payment-transaction.entity';
import { Patient } from '../patients/entities/patient.entity';

const makeQb = () => ({
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  getMany: jest.fn(),
  getManyAndCount: jest.fn(),
  getOne: jest.fn(),
  getCount: jest.fn(),
  select: jest.fn().mockReturnThis(),
  addSelect: jest.fn().mockReturnThis(),
  groupBy: jest.fn().mockReturnThis(),
  getRawMany: jest.fn(),
});

const mockBillRepo = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  createQueryBuilder: jest.fn(),
};

const mockBillItemRepo = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  createQueryBuilder: jest.fn(),
};

const mockTransactionRepo = {
  create: jest.fn(),
  save: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  createQueryBuilder: jest.fn(),
};

const mockPatientRepo = {
  findOne: jest.fn(),
};

describe('PaymentService', () => {
  let service: PaymentService;

  const facilityId = 'fac-test';
  const userId = 'user-test';

  beforeEach(async () => {
    jest.clearAllMocks();

    mockBillRepo.createQueryBuilder.mockReturnValue(makeQb());
    mockBillItemRepo.createQueryBuilder.mockReturnValue(makeQb());
    mockTransactionRepo.createQueryBuilder.mockReturnValue(makeQb());

    // Default: patient exists for createBill tests
    mockPatientRepo.findOne.mockResolvedValue({ id: 'p1', facilityId });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: getRepositoryToken(Bill), useValue: mockBillRepo },
        { provide: getRepositoryToken(BillItem), useValue: mockBillItemRepo },
        {
          provide: getRepositoryToken(PaymentTransaction),
          useValue: mockTransactionRepo,
        },
        { provide: getRepositoryToken(Patient), useValue: mockPatientRepo },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
  });

  // ─── createBill() ──────────────────────────────────────────────────────────

  describe('createBill()', () => {
    it('creates and saves a bill with generated bill number', async () => {
      const qb = makeQb();
      qb.getOne.mockResolvedValue(null); // no previous bill
      mockBillRepo.createQueryBuilder.mockReturnValue(qb);

      const createdBill = { id: 'bill-1', billNumber: expect.stringMatching(/^BILL-/) };
      mockBillRepo.create.mockReturnValue(createdBill);
      mockBillRepo.save.mockResolvedValue(createdBill);

      const dto = { patientId: 'p1', visitId: 'v1' };
      const result = await service.createBill(dto as any, facilityId, userId);

      expect(mockBillRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          facilityId,
          generatedById: userId,
          billNumber: expect.stringMatching(/^BILL-\d{6}-\d{5}$/),
        }),
      );
      expect(mockBillRepo.save).toHaveBeenCalledTimes(1);
      expect(result).toBe(createdBill);
    });

    it('sequences bill numbers correctly when a previous bill exists', async () => {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const lastBillNumber = `BILL-${year}${month}-00003`;

      const qb = makeQb();
      qb.getOne.mockResolvedValue({ billNumber: lastBillNumber });
      mockBillRepo.createQueryBuilder.mockReturnValue(qb);

      mockBillRepo.create.mockImplementation((data) => data);
      mockBillRepo.save.mockImplementation((data) => Promise.resolve(data));

      await service.createBill({ patientId: 'p1' } as any, facilityId, userId);

      const callArg = mockBillRepo.create.mock.calls[0][0];
      expect(callArg.billNumber).toBe(`BILL-${year}${month}-00004`);
    });

    it('stores billDate as a Date object', async () => {
      const qb = makeQb();
      qb.getOne.mockResolvedValue(null);
      mockBillRepo.createQueryBuilder.mockReturnValue(qb);
      mockBillRepo.create.mockImplementation((data) => data);
      mockBillRepo.save.mockImplementation((data) => Promise.resolve(data));

      await service.createBill({ patientId: 'p1' } as any, facilityId, userId);

      const callArg = mockBillRepo.create.mock.calls[0][0];
      expect(callArg.billDate).toBeInstanceOf(Date);
    });
  });

  // ─── addItem() ─────────────────────────────────────────────────────────────

  describe('addItem()', () => {
    it('calculates amount as quantity × unitPrice', async () => {
      const existingBill = {
        id: 'bill-1',
        facilityId,
        totalAmount: 0,
        paidAmount: 0,
        dueAmount: 0,
      };
      mockBillRepo.findOne.mockResolvedValue(existingBill);

      const savedItem = { id: 'item-1', amount: 200 };
      mockBillItemRepo.create.mockReturnValue(savedItem);
      mockBillItemRepo.save.mockResolvedValue(savedItem);

      // recalculate will call billItemRepo.find
      mockBillItemRepo.find.mockResolvedValue([{ amount: 200, gstPercent: 0 }]);
      mockBillRepo.update.mockResolvedValue({});

      const dto = { billId: 'bill-1', description: 'Consultation', quantity: 2, unitPrice: 100, gstPercent: 0 };
      const result = await service.addItem(dto as any, facilityId);

      expect(mockBillItemRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 200 }),
      );
      expect(result).toBe(savedItem);
    });

    it('throws NotFoundException when bill does not exist', async () => {
      mockBillRepo.findOne.mockResolvedValue(null);

      const dto = { billId: 'missing', quantity: 1, unitPrice: 50, gstPercent: 0 };
      await expect(service.addItem(dto as any, facilityId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('recalculates subtotal after adding item', async () => {
      const bill = { id: 'bill-1', facilityId };
      mockBillRepo.findOne.mockResolvedValue(bill);
      mockBillItemRepo.create.mockReturnValue({ id: 'item-1', amount: 150 });
      mockBillItemRepo.save.mockResolvedValue({ id: 'item-1', amount: 150 });
      mockBillItemRepo.find.mockResolvedValue([
        { amount: 100, gstPercent: 10 },
        { amount: 50, gstPercent: 0 },
      ]);
      mockBillRepo.update.mockResolvedValue({});

      const dto = { billId: 'bill-1', quantity: 1, unitPrice: 150, gstPercent: 0 };
      await service.addItem(dto as any, facilityId);

      // subtotal = 150, taxAmount = 10, totalAmount = 160
      expect(mockBillRepo.update).toHaveBeenCalledWith(
        'bill-1',
        expect.objectContaining({ subtotal: 150, taxAmount: 10, totalAmount: 160 }),
      );
    });
  });

  // ─── recordPayment() ───────────────────────────────────────────────────────

  describe('recordPayment()', () => {
    it('creates a SUCCESS transaction record', async () => {
      const bill = { id: 'bill-1', facilityId, patientId: 'p1', totalAmount: 500, paidAmount: 0, status: BillStatus.FINALIZED };
      mockBillRepo.findOne.mockResolvedValue(bill);

      const savedTx = { id: 'tx-1', status: TransactionStatus.SUCCESS };
      mockTransactionRepo.create.mockReturnValue(savedTx);
      mockTransactionRepo.save.mockResolvedValue(savedTx);
      mockBillRepo.update.mockResolvedValue({});

      const dto = { billId: 'bill-1', amount: 200, paymentMode: 'CASH' };
      const result = await service.recordPayment(dto as any, facilityId, userId);

      expect(mockTransactionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: TransactionStatus.SUCCESS,
          receivedById: userId,
        }),
      );
      expect(result).toBe(savedTx);
    });

    it('marks bill as PAID when full amount is paid', async () => {
      const bill = { id: 'bill-1', facilityId, patientId: 'p1', totalAmount: 300, paidAmount: 0, status: BillStatus.FINALIZED };
      mockBillRepo.findOne.mockResolvedValue(bill);
      mockTransactionRepo.create.mockReturnValue({ id: 'tx-1' });
      mockTransactionRepo.save.mockResolvedValue({ id: 'tx-1' });
      mockBillRepo.update.mockResolvedValue({});

      const dto = { billId: 'bill-1', amount: 300, paymentMode: 'UPI' };
      await service.recordPayment(dto as any, facilityId, userId);

      expect(mockBillRepo.update).toHaveBeenCalledWith(
        'bill-1',
        expect.objectContaining({ status: BillStatus.PAID, dueAmount: 0 }),
      );
    });

    it('marks bill as PARTIAL when partial amount is paid', async () => {
      const bill = { id: 'bill-1', facilityId, patientId: 'p1', totalAmount: 500, paidAmount: 0, status: BillStatus.FINALIZED };
      mockBillRepo.findOne.mockResolvedValue(bill);
      mockTransactionRepo.create.mockReturnValue({ id: 'tx-1' });
      mockTransactionRepo.save.mockResolvedValue({ id: 'tx-1' });
      mockBillRepo.update.mockResolvedValue({});

      const dto = { billId: 'bill-1', amount: 200, paymentMode: 'CASH' };
      await service.recordPayment(dto as any, facilityId, userId);

      expect(mockBillRepo.update).toHaveBeenCalledWith(
        'bill-1',
        expect.objectContaining({ status: BillStatus.PARTIAL, dueAmount: 300 }),
      );
    });

    it('throws NotFoundException when bill is not found', async () => {
      mockBillRepo.findOne.mockResolvedValue(null);

      const dto = { billId: 'ghost', amount: 100, paymentMode: 'CASH' };
      await expect(
        service.recordPayment(dto as any, facilityId, userId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ─── getBill() ─────────────────────────────────────────────────────────────

  describe('getBill()', () => {
    it('returns the bill when found', async () => {
      const bill = { id: 'bill-1', facilityId };
      mockBillRepo.findOne.mockResolvedValue(bill);

      const result = await service.getBill('bill-1', facilityId);

      expect(result).toBe(bill);
    });

    it('throws NotFoundException when bill does not exist', async () => {
      mockBillRepo.findOne.mockResolvedValue(null);

      await expect(service.getBill('no-bill', facilityId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ─── getPatientBills() ─────────────────────────────────────────────────────

  describe('getPatientBills()', () => {
    it('returns all bills for a patient ordered by createdAt DESC', async () => {
      const bills = [{ id: 'b1' }, { id: 'b2' }];
      mockBillRepo.find.mockResolvedValue(bills);

      const result = await service.getPatientBills('p1', facilityId);

      expect(mockBillRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { patientId: 'p1', facilityId },
          order: { createdAt: 'DESC' },
        }),
      );
      expect(result).toEqual(bills);
    });
  });
});
