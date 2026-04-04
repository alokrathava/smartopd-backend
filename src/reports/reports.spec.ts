import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { ReportsService } from './reports.service';
import { Visit } from '../visits/entities/visit.entity';
import { Bill } from '../payment/entities/bill.entity';
import { Equipment } from '../equipment/entities/equipment.entity';
import { EquipmentLease } from '../equipment/entities/equipment-lease.entity';
import { Patient } from '../patients/entities/patient.entity';

// Factory so each test gets a fresh, independent query builder mock
const makeQb = () => ({
  where: jest.fn().mockReturnThis(),
  andWhere: jest.fn().mockReturnThis(),
  innerJoin: jest.fn().mockReturnThis(),
  orderBy: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  take: jest.fn().mockReturnThis(),
  select: jest.fn().mockReturnThis(),
  addSelect: jest.fn().mockReturnThis(),
  groupBy: jest.fn().mockReturnThis(),
  getMany: jest.fn().mockResolvedValue([]),
  getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
  getOne: jest.fn().mockResolvedValue(null),
  getCount: jest.fn().mockResolvedValue(0),
  getRawMany: jest.fn().mockResolvedValue([]),
});

const mockVisitRepo = {
  count: jest.fn(),
  createQueryBuilder: jest.fn(),
};

const mockBillRepo = {
  count: jest.fn(),
  createQueryBuilder: jest.fn(),
};

const mockEquipmentRepo = {
  count: jest.fn(),
  createQueryBuilder: jest.fn(),
};

const mockLeaseRepo = {
  count: jest.fn(),
  createQueryBuilder: jest.fn(),
};

const mockPatientRepo = {
  count: jest.fn(),
  createQueryBuilder: jest.fn(),
};

const mockConfigService = {
  get: jest.fn().mockReturnValue(''),
};

describe('ReportsService', () => {
  let service: ReportsService;

  const facilityId = 'fac-test';

  beforeEach(async () => {
    jest.clearAllMocks();

    // Provide default query builder for all repos
    mockVisitRepo.createQueryBuilder.mockReturnValue(makeQb());
    mockBillRepo.createQueryBuilder.mockReturnValue(makeQb());
    mockEquipmentRepo.createQueryBuilder.mockReturnValue(makeQb());
    mockLeaseRepo.createQueryBuilder.mockReturnValue(makeQb());
    mockPatientRepo.createQueryBuilder.mockReturnValue(makeQb());

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: getRepositoryToken(Visit), useValue: mockVisitRepo },
        { provide: getRepositoryToken(Bill), useValue: mockBillRepo },
        { provide: getRepositoryToken(Equipment), useValue: mockEquipmentRepo },
        { provide: getRepositoryToken(EquipmentLease), useValue: mockLeaseRepo },
        { provide: getRepositoryToken(Patient), useValue: mockPatientRepo },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
  });

  // ─── getDhisDashboard() ────────────────────────────────────────────────────

  describe('getDhisDashboard()', () => {
    function setupDhisMocks(opts: {
      totalAbhaLinked: number;
      linkedThisMonth: number;
      abdmLinkedVisits: number;
    }) {
      mockPatientRepo.count.mockResolvedValue(opts.totalAbhaLinked);

      let callCount = 0;
      mockPatientRepo.createQueryBuilder.mockImplementation(() => {
        const qb = makeQb();
        if (callCount === 0) {
          qb.getCount.mockResolvedValue(opts.linkedThisMonth);
        } else {
          qb.getCount.mockResolvedValue(0);
        }
        callCount++;
        return qb;
      });

      const visitQb = makeQb();
      visitQb.getCount.mockResolvedValue(opts.abdmLinkedVisits);
      mockVisitRepo.createQueryBuilder.mockReturnValue(visitQb);
    }

    it('returns eligibleLinkages = 0 when linkedThisMonth < 100', async () => {
      setupDhisMocks({ totalAbhaLinked: 50, linkedThisMonth: 80, abdmLinkedVisits: 40 });

      const result = await service.getDhisDashboard(facilityId, '2026-03');

      expect(result.linkedThisMonth).toBe(80);
      expect(result.eligibleLinkages).toBe(0);
      expect(result.dhisIncomeInr).toBe(0);
      expect(result.isEligible).toBe(false);
    });

    it('calculates eligibleLinkages = linkedThisMonth - 100 when above threshold', async () => {
      setupDhisMocks({ totalAbhaLinked: 200, linkedThisMonth: 150, abdmLinkedVisits: 120 });

      const result = await service.getDhisDashboard(facilityId, '2026-03');

      expect(result.eligibleLinkages).toBe(50); // 150 - 100
      expect(result.dhisIncomeInr).toBe(1000); // 50 × ₹20
      expect(result.isEligible).toBe(true);
    });

    it('calculates dhisIncomeInr = eligibleLinkages × 20', async () => {
      setupDhisMocks({ totalAbhaLinked: 300, linkedThisMonth: 200, abdmLinkedVisits: 180 });

      const result = await service.getDhisDashboard(facilityId, '2026-03');

      expect(result.eligibleLinkages).toBe(100); // 200 - 100
      expect(result.dhisIncomeInr).toBe(2000); // 100 × ₹20
    });

    it('returns eligibleLinkages = 0 (not negative) when linkedThisMonth is exactly 100', async () => {
      setupDhisMocks({ totalAbhaLinked: 100, linkedThisMonth: 100, abdmLinkedVisits: 100 });

      const result = await service.getDhisDashboard(facilityId, '2026-03');

      expect(result.eligibleLinkages).toBe(0);
      expect(result.dhisIncomeInr).toBe(0);
      expect(result.isEligible).toBe(true); // exactly at threshold
    });

    it('returns linkagesNeededForEligibility = 0 when already eligible', async () => {
      setupDhisMocks({ totalAbhaLinked: 200, linkedThisMonth: 120, abdmLinkedVisits: 100 });

      const result = await service.getDhisDashboard(facilityId, '2026-03');

      expect(result.linkagesNeededForEligibility).toBe(0);
    });

    it('returns correct linkagesNeededForEligibility when below threshold', async () => {
      setupDhisMocks({ totalAbhaLinked: 50, linkedThisMonth: 60, abdmLinkedVisits: 30 });

      const result = await service.getDhisDashboard(facilityId, '2026-03');

      expect(result.linkagesNeededForEligibility).toBe(40); // 100 - 60
    });

    it('includes last6Months array in the response', async () => {
      setupDhisMocks({ totalAbhaLinked: 10, linkedThisMonth: 0, abdmLinkedVisits: 0 });

      const result = await service.getDhisDashboard(facilityId, '2026-03');

      expect(Array.isArray(result.last6Months)).toBe(true);
      expect(result.last6Months).toHaveLength(6);
    });

    it('returns correct dhisThreshold constant of 100', async () => {
      setupDhisMocks({ totalAbhaLinked: 0, linkedThisMonth: 0, abdmLinkedVisits: 0 });

      const result = await service.getDhisDashboard(facilityId, '2026-03');

      expect(result.dhisThreshold).toBe(100);
    });

    it('returns correct incentivePerLinkageInr constant of 20', async () => {
      setupDhisMocks({ totalAbhaLinked: 0, linkedThisMonth: 0, abdmLinkedVisits: 0 });

      const result = await service.getDhisDashboard(facilityId, '2026-03');

      expect(result.incentivePerLinkageInr).toBe(20);
    });
  });

  // ─── getRevenueSummary() ───────────────────────────────────────────────────

  describe('getRevenueSummary()', () => {
    it('calculates totalBilled as sum of all bill totalAmounts', async () => {
      const bills = [
        { totalAmount: 500, paidAmount: 500, dueAmount: 0 },
        { totalAmount: 300, paidAmount: 200, dueAmount: 100 },
        { totalAmount: 200, paidAmount: 0, dueAmount: 200 },
      ];
      const qb = makeQb();
      qb.getMany.mockResolvedValue(bills);
      qb.getRawMany.mockResolvedValue([]);
      mockBillRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getRevenueSummary(facilityId, '2026-03-01', '2026-03-31');

      expect(result.totalBilled).toBe(1000);
    });

    it('calculates totalCollected as sum of paidAmount', async () => {
      const bills = [
        { totalAmount: 500, paidAmount: 400, dueAmount: 100 },
        { totalAmount: 300, paidAmount: 150, dueAmount: 150 },
      ];
      const qb = makeQb();
      qb.getMany.mockResolvedValue(bills);
      qb.getRawMany.mockResolvedValue([]);
      mockBillRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getRevenueSummary(facilityId, '2026-03-01', '2026-03-31');

      expect(result.totalCollected).toBe(550);
    });

    it('calculates totalOutstanding as sum of dueAmount', async () => {
      const bills = [
        { totalAmount: 500, paidAmount: 400, dueAmount: 100 },
        { totalAmount: 300, paidAmount: 150, dueAmount: 150 },
      ];
      const qb = makeQb();
      qb.getMany.mockResolvedValue(bills);
      qb.getRawMany.mockResolvedValue([]);
      mockBillRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getRevenueSummary(facilityId, '2026-03-01', '2026-03-31');

      expect(result.totalOutstanding).toBe(250);
    });

    it('returns billCount equal to number of bills found', async () => {
      const bills = [
        { totalAmount: 100, paidAmount: 100, dueAmount: 0 },
        { totalAmount: 200, paidAmount: 200, dueAmount: 0 },
        { totalAmount: 300, paidAmount: 300, dueAmount: 0 },
      ];
      const qb = makeQb();
      qb.getMany.mockResolvedValue(bills);
      qb.getRawMany.mockResolvedValue([]);
      mockBillRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getRevenueSummary(facilityId, '2026-03-01', '2026-03-31');

      expect(result.billCount).toBe(3);
    });

    it('returns zeros when no bills exist', async () => {
      const qb = makeQb();
      qb.getMany.mockResolvedValue([]);
      qb.getRawMany.mockResolvedValue([]);
      mockBillRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getRevenueSummary(facilityId, '2026-03-01', '2026-03-31');

      expect(result.totalBilled).toBe(0);
      expect(result.totalCollected).toBe(0);
      expect(result.totalOutstanding).toBe(0);
      expect(result.billCount).toBe(0);
    });
  });

  // ─── getVisitStats() ───────────────────────────────────────────────────────

  describe('getVisitStats()', () => {
    it('returns total visit count for the facility', async () => {
      mockVisitRepo.count.mockResolvedValue(250);
      const qb = makeQb();
      qb.getCount.mockResolvedValue(40);
      qb.getRawMany.mockResolvedValue([]);
      mockVisitRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getVisitStats(facilityId, '2026-03-01', '2026-03-31');

      expect(result.total).toBe(250);
    });

    it('returns inRange count for the date window', async () => {
      mockVisitRepo.count.mockResolvedValue(250);

      let callCount = 0;
      mockVisitRepo.createQueryBuilder.mockImplementation(() => {
        const qb = makeQb();
        if (callCount === 0) {
          qb.getCount.mockResolvedValue(42);
        } else {
          qb.getRawMany.mockResolvedValue([]);
        }
        callCount++;
        return qb;
      });

      const result = await service.getVisitStats(facilityId, '2026-03-01', '2026-03-31');

      expect(result.inRange).toBe(42);
    });

    it('includes byStatus breakdown in response', async () => {
      mockVisitRepo.count.mockResolvedValue(10);
      const statusBreakdown = [
        { status: 'COMPLETED', count: '8' },
        { status: 'PENDING', count: '2' },
      ];

      let callCount = 0;
      mockVisitRepo.createQueryBuilder.mockImplementation(() => {
        const qb = makeQb();
        qb.getCount.mockResolvedValue(10);
        if (callCount === 1) {
          qb.getRawMany.mockResolvedValue(statusBreakdown);
        } else {
          qb.getRawMany.mockResolvedValue([]);
        }
        callCount++;
        return qb;
      });

      const result = await service.getVisitStats(facilityId, '2026-03-01', '2026-03-31');

      expect(result).toHaveProperty('byStatus');
      expect(result).toHaveProperty('byType');
    });
  });

  // ─── getPatientStats() ─────────────────────────────────────────────────────

  describe('getPatientStats()', () => {
    it('returns totalPatients count', async () => {
      mockPatientRepo.count.mockResolvedValue(500);
      const qb = makeQb();
      qb.getCount.mockResolvedValue(25);
      mockPatientRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getPatientStats(facilityId, '2026-03-01', '2026-03-31');

      expect(result.totalPatients).toBe(500);
    });

    it('returns newPatientsInRange count for the date window', async () => {
      mockPatientRepo.count.mockResolvedValue(500);
      const qb = makeQb();
      qb.getCount.mockResolvedValue(18);
      mockPatientRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getPatientStats(facilityId, '2026-03-01', '2026-03-31');

      expect(result.newPatientsInRange).toBe(18);
    });
  });

  // ─── getEquipmentUtilisation() ─────────────────────────────────────────────

  describe('getEquipmentUtilisation()', () => {
    it('returns total equipment count and active lease count', async () => {
      mockEquipmentRepo.count.mockResolvedValue(30);
      mockLeaseRepo.count
        .mockResolvedValueOnce(15) // activeLeases
        .mockResolvedValueOnce(3); // overdue

      const qb = makeQb();
      qb.getRawMany.mockResolvedValue([{ status: 'AVAILABLE', count: 15 }]);
      mockEquipmentRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getEquipmentUtilisation(facilityId);

      expect(result.total).toBe(30);
      expect(result.activeLeases).toBe(15);
      expect(result.overdue).toBe(3);
    });

    it('includes byStatus array in response', async () => {
      mockEquipmentRepo.count.mockResolvedValue(10);
      mockLeaseRepo.count.mockResolvedValue(0);

      const qb = makeQb();
      const byStatus = [{ status: 'AVAILABLE', count: '10' }];
      qb.getRawMany.mockResolvedValue(byStatus);
      mockEquipmentRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.getEquipmentUtilisation(facilityId);

      expect(result.byStatus).toEqual(byStatus);
    });
  });
});
