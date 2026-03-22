import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Visit, VisitStatus } from '../visits/entities/visit.entity';
import { Bill } from '../payment/entities/bill.entity';
import { Equipment } from '../equipment/entities/equipment.entity';
import { EquipmentLease } from '../equipment/entities/equipment-lease.entity';
import { Patient } from '../patients/entities/patient.entity';
import dayjs from 'dayjs';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Visit) private visitRepo: Repository<Visit>,
    @InjectRepository(Bill) private billRepo: Repository<Bill>,
    @InjectRepository(Equipment) private equipmentRepo: Repository<Equipment>,
    @InjectRepository(EquipmentLease)
    private leaseRepo: Repository<EquipmentLease>,
    @InjectRepository(Patient) private patientRepo: Repository<Patient>,
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

    const totalBilled = bills.reduce(
      (s, b) => s + Number(b.totalAmount || 0),
      0,
    );
    const totalCollected = bills.reduce(
      (s, b) => s + Number(b.paidAmount || 0),
      0,
    );
    const totalOutstanding = bills.reduce(
      (s, b) => s + Number(b.dueAmount || 0),
      0,
    );

    const byPaymentMode = await this.billRepo
      .createQueryBuilder('b')
      .select('b.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(b.totalAmount)', 'totalAmount')
      .where('b.facilityId = :facilityId', { facilityId })
      .andWhere('b.billDate BETWEEN :start AND :end', { start, end })
      .groupBy('b.status')
      .getRawMany();

    return {
      totalBilled,
      totalCollected,
      totalOutstanding,
      billCount: bills.length,
      byStatus: byPaymentMode,
    };
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

    const activeLeases = await this.leaseRepo.count({
      where: { facilityId, status: 'ACTIVE' as any },
    });

    const overdue = await this.leaseRepo.count({
      where: { facilityId, status: 'OVERDUE' as any },
    });

    return { total, byStatus, activeLeases, overdue };
  }

  async getPatientStats(facilityId: string, from: string, to: string) {
    const start = new Date(from);
    const end = dayjs(to).endOf('day').toDate();

    const totalPatients = await this.patientRepo.count({
      where: { facilityId },
    });

    const newPatientsInRange = await this.patientRepo
      .createQueryBuilder('p')
      .where('p.facilityId = :facilityId', { facilityId })
      .andWhere('p.createdAt BETWEEN :start AND :end', { start, end })
      .getCount();

    return { totalPatients, newPatientsInRange };
  }

  async getDhisDashboard(facilityId: string) {
    // DHIS incentive tracking — counts visits with ABDM linkage
    const totalVisits = await this.visitRepo.count({ where: { facilityId } });
    // For now return placeholder data since ABDM integration is future phase
    return {
      totalVisits,
      abdmLinkedVisits: 0,
      dhisEligibleVisits: 0,
      estimatedIncentiveInr: 0,
      note: 'ABDM integration required for live DHIS data',
    };
  }
}
