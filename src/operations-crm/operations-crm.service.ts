import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { StaffRoster, ShiftType, ShiftStatus } from './entities/staff-roster.entity';
import { InsurancePreAuth, PreAuthStatus } from './entities/insurance-pre-auth.entity';
import { ConsumableItem } from './entities/consumable-item.entity';
import { WardInventory } from './entities/ward-inventory.entity';
import { ConsumableConsumption } from './entities/consumable-consumption.entity';
import { CreateRosterDto } from './dto/create-roster.dto';
import { CreatePreAuthDto } from './dto/create-pre-auth.dto';
import { UpdatePreAuthDto } from './dto/update-pre-auth.dto';
import { CreateConsumableItemDto } from './dto/create-consumable-item.dto';
import { RecordConsumptionDto } from './dto/record-consumption.dto';
import dayjs from 'dayjs';

@Injectable()
export class OperationsCrmService {
  constructor(
    @InjectRepository(StaffRoster)
    private readonly shiftRepo: Repository<StaffRoster>,
    @InjectRepository(InsurancePreAuth)
    private readonly preAuthRepo: Repository<InsurancePreAuth>,
    @InjectRepository(ConsumableItem)
    private readonly consumableRepo: Repository<ConsumableItem>,
    @InjectRepository(WardInventory)
    private readonly inventoryRepo: Repository<WardInventory>,
    @InjectRepository(ConsumableConsumption)
    private readonly consumptionRepo: Repository<ConsumableConsumption>,
  ) {}

  // ── Staff Shifts ──────────────────────────────────────────────────────

  async createShift(dto: CreateRosterDto, facilityId: string): Promise<StaffRoster> {
    const shift = this.shiftRepo.create({ ...dto, facilityId });
    return this.shiftRepo.save(shift);
  }

  async findShifts(
    facilityId: string,
    filters: {
      wardId?: string;
      date?: string;
      staffId?: string;
      shiftType?: ShiftType;
      status?: ShiftStatus;
    },
  ): Promise<StaffRoster[]> {
    const qb = this.shiftRepo
      .createQueryBuilder('s')
      .where('s.facilityId = :facilityId', { facilityId })
      .andWhere('s.deletedAt IS NULL')
      .orderBy('s.shiftDate', 'ASC')
      .addOrderBy('s.startAt', 'ASC');

    if (filters.wardId) qb.andWhere('s.wardId = :wardId', { wardId: filters.wardId });
    if (filters.date) qb.andWhere('s.shiftDate = :date', { date: filters.date });
    if (filters.staffId) qb.andWhere('s.staffId = :staffId', { staffId: filters.staffId });
    if (filters.shiftType) qb.andWhere('s.shiftType = :shiftType', { shiftType: filters.shiftType });
    if (filters.status) qb.andWhere('s.status = :status', { status: filters.status });

    return qb.getMany();
  }

  async swapShift(shiftId: string, swapWithStaffId: string, facilityId: string): Promise<StaffRoster> {
    const shift = await this.shiftRepo.findOne({ where: { id: shiftId, facilityId } });
    if (!shift) throw new NotFoundException('Shift not found');

    shift.status = ShiftStatus.SWAPPED;
    shift.swappedWithStaffId = swapWithStaffId;
    return this.shiftRepo.save(shift);
  }

  /**
   * Find wards/shifts on a given date that have no nurse assigned or below minimum coverage.
   * Returns shifts where wardId matches (if provided) with status SCHEDULED/CONFIRMED and no nurse.
   */
  async getStaffingGaps(
    facilityId: string,
    wardId: string | undefined,
    date: string,
  ) {
    const qb = this.shiftRepo
      .createQueryBuilder('s')
      .where('s.facilityId = :facilityId', { facilityId })
      .andWhere('s.shiftDate = :date', { date })
      .andWhere('s.status IN (:...active)', {
        active: [ShiftStatus.SCHEDULED, ShiftStatus.CONFIRMED],
      });

    if (wardId) qb.andWhere('s.wardId = :wardId', { wardId });

    const shifts = await qb.getMany();

    // Group by ward
    const byWard: Record<string, StaffRoster[]> = {};
    for (const s of shifts) {
      const key = s.wardId ?? 'unassigned';
      byWard[key] = byWard[key] || [];
      byWard[key].push(s);
    }

    // Flag wards with no nurse role scheduled
    const gaps: { wardId: string; hasNurse: boolean; totalShifts: number }[] = [];
    for (const [wId, wShifts] of Object.entries(byWard)) {
      const hasNurse = wShifts.some((s) => s.staffRole?.toLowerCase().includes('nurse'));
      if (!hasNurse) {
        gaps.push({ wardId: wId, hasNurse: false, totalShifts: wShifts.length });
      }
    }

    return { date, gaps, totalShiftsChecked: shifts.length };
  }

  async getOvertimeReport(
    facilityId: string,
    filters: { from?: string; to?: string },
  ) {
    const qb = this.shiftRepo
      .createQueryBuilder('s')
      .where('s.facilityId = :facilityId', { facilityId })
      .andWhere('(s.shiftType = :onCall OR (s.actualEndAt IS NOT NULL AND s.actualStartAt IS NOT NULL))', {
        onCall: ShiftType.ON_CALL,
      });

    if (filters.from) qb.andWhere('s.shiftDate >= :from', { from: filters.from });
    if (filters.to) qb.andWhere('s.shiftDate <= :to', { to: filters.to });

    const shifts = await qb.getMany();

    // Calculate duration and flag > 8 hours
    const report = shifts.map((s) => {
      let durationMinutes: number | null = null;
      if (s.actualStartAt && s.actualEndAt) {
        durationMinutes = dayjs(s.actualEndAt).diff(dayjs(s.actualStartAt), 'minute');
      }
      return {
        id: s.id,
        staffId: s.staffId,
        staffRole: s.staffRole,
        wardId: s.wardId,
        shiftDate: s.shiftDate,
        shiftType: s.shiftType,
        durationMinutes,
        isOvertime: s.shiftType === ShiftType.OVERTIME || (durationMinutes !== null && durationMinutes > 480),
        isOnCall: s.shiftType === ShiftType.ON_CALL,
      };
    });

    return { total: report.length, shifts: report };
  }

  async updateShiftStatus(shiftId: string, status: ShiftStatus, facilityId: string): Promise<StaffRoster> {
    const shift = await this.shiftRepo.findOne({ where: { id: shiftId, facilityId } });
    if (!shift) throw new NotFoundException('Shift not found');
    shift.status = status;
    if (status === ShiftStatus.IN_PROGRESS && !shift.actualStartAt) shift.actualStartAt = new Date();
    if (status === ShiftStatus.COMPLETED && !shift.actualEndAt) shift.actualEndAt = new Date();
    return this.shiftRepo.save(shift);
  }

  // ── Insurance Pre-Authorization ───────────────────────────────────────

  async createPreAuth(dto: CreatePreAuthDto, facilityId: string, userId: string): Promise<InsurancePreAuth> {
    const pa = this.preAuthRepo.create({ ...dto, facilityId, requestedById: userId });
    return this.preAuthRepo.save(pa);
  }

  async updatePreAuth(id: string, dto: UpdatePreAuthDto, facilityId: string): Promise<InsurancePreAuth> {
    const pa = await this.preAuthRepo.findOne({ where: { id, facilityId } });
    if (!pa) throw new NotFoundException('Pre-auth not found');
    if (
      dto.status &&
      [PreAuthStatus.APPROVED, PreAuthStatus.APPROVED_ENHANCED, PreAuthStatus.REJECTED, PreAuthStatus.QUERY_RAISED].includes(dto.status)
    ) {
      pa.respondedAt = new Date();
    }
    if (dto.status === PreAuthStatus.SUBMITTED && !pa.submittedAt) {
      pa.submittedAt = new Date();
    }
    Object.assign(pa, dto);
    return this.preAuthRepo.save(pa);
  }

  async findPreAuths(
    facilityId: string,
    filters: { status?: PreAuthStatus; admissionId?: string },
  ): Promise<InsurancePreAuth[]> {
    const qb = this.preAuthRepo
      .createQueryBuilder('p')
      .where('p.facilityId = :facilityId', { facilityId })
      .orderBy('p.createdAt', 'DESC');
    if (filters.status) qb.andWhere('p.status = :status', { status: filters.status });
    if (filters.admissionId) qb.andWhere('p.admissionId = :admissionId', { admissionId: filters.admissionId });
    return qb.getMany();
  }

  // ── Consumables ───────────────────────────────────────────────────────

  async getConsumableItems(facilityId: string): Promise<ConsumableItem[]> {
    return this.consumableRepo.find({
      where: { facilityId, isActive: true, deletedAt: IsNull() },
      order: { itemName: 'ASC' },
    });
  }

  async createConsumableItem(dto: CreateConsumableItemDto, facilityId: string): Promise<ConsumableItem> {
    const item = this.consumableRepo.create({ ...dto, facilityId });
    return this.consumableRepo.save(item);
  }

  async getWardInventory(facilityId: string, wardId: string): Promise<WardInventory[]> {
    return this.inventoryRepo.find({
      where: { facilityId, wardId },
      order: { consumableItemId: 'ASC' },
    });
  }

  async recordConsumption(dto: RecordConsumptionDto, facilityId: string): Promise<ConsumableConsumption> {
    // Deduct from ward inventory
    const inv = await this.inventoryRepo.findOne({
      where: { facilityId, wardId: dto.wardId, consumableItemId: dto.consumableItemId },
    });

    if (!inv) {
      throw new NotFoundException(
        `Inventory not found for consumableItemId=${dto.consumableItemId} in wardId=${dto.wardId}`,
      );
    }

    if (inv.currentStock < dto.quantity) {
      throw new BadRequestException(
        `Insufficient stock: available=${inv.currentStock}, requested=${dto.quantity}`,
      );
    }

    inv.currentStock -= dto.quantity;
    await this.inventoryRepo.save(inv);

    const record = this.consumptionRepo.create({
      ...dto,
      facilityId,
      usedAt: new Date(),
    });
    return this.consumptionRepo.save(record);
  }

  async restockInventory(
    wardId: string,
    consumableItemId: string,
    quantity: number,
    facilityId: string,
  ): Promise<WardInventory> {
    let inv = await this.inventoryRepo.findOne({
      where: { facilityId, wardId, consumableItemId },
    });

    if (!inv) {
      inv = this.inventoryRepo.create({ facilityId, wardId, consumableItemId, currentStock: 0 });
    }

    inv.currentStock += quantity;
    inv.lastRestockedAt = new Date();
    inv.lastRestockedQuantity = quantity;
    return this.inventoryRepo.save(inv);
  }
}
