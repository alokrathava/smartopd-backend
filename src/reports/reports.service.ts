import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, IsNull, Not } from 'typeorm';
import { Visit } from '../visits/entities/visit.entity';
import { Bill } from '../payment/entities/bill.entity';
import { Equipment } from '../equipment/entities/equipment.entity';
import { EquipmentLease } from '../equipment/entities/equipment-lease.entity';
import { Patient } from '../patients/entities/patient.entity';
import { ConfigService } from '@nestjs/config';
import dayjs from 'dayjs';

const DHIS_THRESHOLD_PER_MONTH = 100; // First 100 linkages/month are not incentivised
const DHIS_INCENTIVE_PER_LINKAGE_INR = 20; // ₹20 per eligible KYC linkage

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Visit) private visitRepo: Repository<Visit>,
    @InjectRepository(Bill) private billRepo: Repository<Bill>,
    @InjectRepository(Equipment) private equipmentRepo: Repository<Equipment>,
    @InjectRepository(EquipmentLease)
    private leaseRepo: Repository<EquipmentLease>,
    @InjectRepository(Patient) private patientRepo: Repository<Patient>,
    private readonly configService: ConfigService,
  ) {}

  async getVisitStats(facilityId: string, from: string, to: string) {
    const start = new Date(from);
    const end = dayjs(to).endOf('day').toDate();

    const total = await this.visitRepo.count({ where: { facilityId } });
    const inRange = await this.visitRepo
      .createQueryBuilder('v')
      .where('v.facilityId = :facilityId', { facilityId })
      .andWhere('v.checkedInAt BETWEEN :start AND :end', { start, end })
      .getCount();

    const byStatus = await this.visitRepo
      .createQueryBuilder('v')
      .select('v.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('v.facilityId = :facilityId', { facilityId })
      .andWhere('v.checkedInAt BETWEEN :start AND :end', { start, end })
      .groupBy('v.status')
      .getRawMany();

    const byType = await this.visitRepo
      .createQueryBuilder('v')
      .select('v.visitType', 'visitType')
      .addSelect('COUNT(*)', 'count')
      .where('v.facilityId = :facilityId', { facilityId })
      .andWhere('v.checkedInAt BETWEEN :start AND :end', { start, end })
      .groupBy('v.visitType')
      .getRawMany();

    return { total, inRange, byStatus, byType };
  }

  async getRevenueSummary(facilityId: string, from: string, to: string) {
    const start = new Date(from);
    const end = dayjs(to).endOf('day').toDate();

    const bills = await this.billRepo
      .createQueryBuilder('b')
      .where('b.facilityId = :facilityId', { facilityId })
      .andWhere('b.billDate BETWEEN :start AND :end', { start, end })
      .getMany();

    const totalBilled = bills.reduce((s, b) => s + Number(b.totalAmount || 0), 0);
    const totalCollected = bills.reduce((s, b) => s + Number(b.paidAmount || 0), 0);
    const totalOutstanding = bills.reduce((s, b) => s + Number(b.dueAmount || 0), 0);

    const byStatus = await this.billRepo
      .createQueryBuilder('b')
      .select('b.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(b.totalAmount)', 'totalAmount')
      .where('b.facilityId = :facilityId', { facilityId })
      .andWhere('b.billDate BETWEEN :start AND :end', { start, end })
      .groupBy('b.status')
      .getRawMany();

    return { totalBilled, totalCollected, totalOutstanding, billCount: bills.length, byStatus };
  }

  async getEquipmentUtilisation(facilityId: string) {
    const total = await this.equipmentRepo.count({ where: { facilityId } });
    const byStatus = await this.equipmentRepo
      .createQueryBuilder('e')
      .select('e.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('e.facilityId = :facilityId', { facilityId })
      .groupBy('e.status')
      .getRawMany();
    const activeLeases = await this.leaseRepo.count({ where: { facilityId, status: 'ACTIVE' as any } });
    const overdue = await this.leaseRepo.count({ where: { facilityId, status: 'OVERDUE' as any } });
    return { total, byStatus, activeLeases, overdue };
  }

  async getPatientStats(facilityId: string, from: string, to: string) {
    const start = new Date(from);
    const end = dayjs(to).endOf('day').toDate();
    const totalPatients = await this.patientRepo.count({ where: { facilityId } });
    const newPatientsInRange = await this.patientRepo
      .createQueryBuilder('p')
      .where('p.facilityId = :facilityId', { facilityId })
      .andWhere('p.createdAt BETWEEN :start AND :end', { start, end })
      .getCount();
    return { totalPatients, newPatientsInRange };
  }

  /**
   * DHIS Incentive Dashboard
   *
   * Formula:
   *   Monthly KYC linkages = patients with abhaLinkedAt in the current calendar month
   *   Eligible = max(0, monthly_linkages - THRESHOLD)
   *   DHIS income = eligible × ₹20
   *   Net income = DHIS income − subscription cost (if provided)
   *
   * Requires ≥100 linkages/month to trigger incentive.
   * Requires facility to be registered with 10+ live ABDM facilities (handled by NHA).
   */
  async getDhisDashboard(facilityId: string, month?: string) {
    const targetMonth = month ? dayjs(month) : dayjs();
    const monthStart = targetMonth.startOf('month').toDate();
    const monthEnd = targetMonth.endOf('month').toDate();

    // All patients with ABHA linked
    const totalAbhaLinked = await this.patientRepo.count({
      where: { facilityId, abhaNumber: Not(IsNull()) },
    });

    // Patients whose ABHA was linked THIS month (fresh KYC linkages)
    const linkedThisMonth = await this.patientRepo
      .createQueryBuilder('p')
      .where('p.facilityId = :facilityId', { facilityId })
      .andWhere('p.abha_linked_at IS NOT NULL')
      .andWhere('p.abha_linked_at BETWEEN :start AND :end', {
        start: monthStart,
        end: monthEnd,
      })
      .getCount();

    // OPD visits this month where patient has ABHA
    const abdmLinkedVisits = await this.visitRepo
      .createQueryBuilder('v')
      .innerJoin(Patient, 'p', 'p.id = v.patientId AND p.facilityId = v.facilityId')
      .where('v.facilityId = :facilityId', { facilityId })
      .andWhere('v.checkedInAt BETWEEN :start AND :end', {
        start: monthStart,
        end: monthEnd,
      })
      .andWhere('p.abha_number IS NOT NULL')
      .getCount();

    // DHIS incentive calculation
    const eligibleLinkages = Math.max(0, linkedThisMonth - DHIS_THRESHOLD_PER_MONTH);
    const dhisIncomeInr = eligibleLinkages * DHIS_INCENTIVE_PER_LINKAGE_INR;

    // Monthly-to-date totals
    const monthLabel = targetMonth.format('YYYY-MM');

    // Historical breakdown — last 6 months
    const last6Months = await this.getMonthlyDhisBreakdown(facilityId, 6);

    return {
      month: monthLabel,
      totalAbhaLinked,
      linkedThisMonth,
      abdmLinkedVisits,
      dhisThreshold: DHIS_THRESHOLD_PER_MONTH,
      eligibleLinkages,
      incentivePerLinkageInr: DHIS_INCENTIVE_PER_LINKAGE_INR,
      dhisIncomeInr,
      isEligible: linkedThisMonth >= DHIS_THRESHOLD_PER_MONTH,
      linkagesNeededForEligibility: Math.max(0, DHIS_THRESHOLD_PER_MONTH - linkedThisMonth),
      last6Months,
    };
  }

  private async getMonthlyDhisBreakdown(facilityId: string, months: number) {
    const results = [];
    for (let i = 0; i < months; i++) {
      const month = dayjs().subtract(i, 'month');
      const start = month.startOf('month').toDate();
      const end = month.endOf('month').toDate();

      const linked = await this.patientRepo
        .createQueryBuilder('p')
        .where('p.facilityId = :facilityId', { facilityId })
        .andWhere('p.abha_linked_at BETWEEN :start AND :end', { start, end })
        .getCount();

      const eligible = Math.max(0, linked - DHIS_THRESHOLD_PER_MONTH);
      results.push({
        month: month.format('YYYY-MM'),
        linkedCount: linked,
        eligibleCount: eligible,
        incomeInr: eligible * DHIS_INCENTIVE_PER_LINKAGE_INR,
      });
    }
    return results.reverse();
  }
}
