import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { Role } from '../common/enums/role.enum';
import { OperationsCrmService } from './operations-crm.service';
import { CreateRosterDto } from './dto/create-roster.dto';
import { UpdateRosterDto } from './dto/update-roster.dto';
import { CreatePreAuthDto } from './dto/create-pre-auth.dto';
import { UpdatePreAuthDto } from './dto/update-pre-auth.dto';
import { CreateConsumableItemDto } from './dto/create-consumable-item.dto';
import { RecordConsumptionDto } from './dto/record-consumption.dto';
import { PreAuthStatus } from './entities/insurance-pre-auth.entity';
import { ShiftType, ShiftStatus } from './entities/staff-roster.entity';

@ApiTags('Operations CRM')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class OperationsCrmController {
  constructor(private readonly service: OperationsCrmService) {}

  // ── Staff Shifts ──────────────────────────────────────────────────────

  // POST /roster/shifts
  @Post('roster/shifts')
  @Roles(Role.FACILITY_ADMIN)
  @ApiOperation({ summary: 'Create staff shift' })
  createShift(@Body() dto: CreateRosterDto, @CurrentUser() user: JwtPayload) {
    return this.service.createShift(dto, user.facilityId!);
  }

  // GET /roster/shifts
  @Get('roster/shifts')
  @ApiOperation({
    summary: 'List shifts — filter by wardId, date, staffId, shiftType, status',
  })
  @ApiQuery({ name: 'wardId', required: false })
  @ApiQuery({ name: 'date', required: false, example: '2025-04-01' })
  @ApiQuery({ name: 'staffId', required: false })
  @ApiQuery({ name: 'shiftType', required: false, enum: ShiftType })
  @ApiQuery({ name: 'status', required: false, enum: ShiftStatus })
  findShifts(
    @CurrentUser() user: JwtPayload,
    @Query('wardId') wardId?: string,
    @Query('date') date?: string,
    @Query('staffId') staffId?: string,
    @Query('shiftType') shiftType?: ShiftType,
    @Query('status') status?: ShiftStatus,
  ) {
    return this.service.findShifts(user.facilityId!, {
      wardId,
      date,
      staffId,
      shiftType,
      status,
    });
  }

  // PATCH /roster/shifts/:id/status
  @Patch('roster/shifts/:id/status')
  @Roles(Role.FACILITY_ADMIN)
  @ApiOperation({ summary: 'Update shift status' })
  updateShiftStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: ShiftStatus,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.updateShiftStatus(id, status, user.facilityId!);
  }

  // POST /roster/shifts/:id/swap
  @Post('roster/shifts/:id/swap')
  @Roles(Role.FACILITY_ADMIN)
  @ApiOperation({ summary: 'Swap shift with another staff member' })
  swapShift(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('swapWithStaffId') swapWithStaffId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.swapShift(id, swapWithStaffId, user.facilityId!);
  }

  // GET /roster/staffing-gaps
  @Get('roster/staffing-gaps')
  @Roles(Role.FACILITY_ADMIN)
  @ApiOperation({
    summary: 'Staffing gap alerts for a given date and optional ward',
  })
  @ApiQuery({ name: 'wardId', required: false })
  @ApiQuery({ name: 'date', required: true, example: '2025-04-01' })
  getStaffingGaps(
    @CurrentUser() user: JwtPayload,
    @Query('date') date: string,
    @Query('wardId') wardId?: string,
  ) {
    return this.service.getStaffingGaps(user.facilityId!, wardId, date);
  }

  // GET /roster/overtime
  @Get('roster/overtime')
  @Roles(Role.FACILITY_ADMIN)
  @ApiOperation({ summary: 'Overtime report — shifts > 8h or ON_CALL' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  getOvertimeReport(
    @CurrentUser() user: JwtPayload,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.service.getOvertimeReport(user.facilityId!, { from, to });
  }

  // ── Insurance Pre-Auth ────────────────────────────────────────────────

  // POST /insurance/pre-auth
  @Post('insurance/pre-auth')
  @Roles(Role.FACILITY_ADMIN, Role.RECEPTIONIST)
  @ApiOperation({ summary: 'Create insurance pre-authorisation request' })
  createPreAuth(
    @Body() dto: CreatePreAuthDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.createPreAuth(dto, user.facilityId!, user.sub);
  }

  // GET /insurance/pre-auth
  @Get('insurance/pre-auth')
  @ApiOperation({
    summary: 'List pre-auth requests — filter by status, admissionId',
  })
  @ApiQuery({ name: 'status', required: false, enum: PreAuthStatus })
  @ApiQuery({ name: 'admissionId', required: false })
  findPreAuths(
    @CurrentUser() user: JwtPayload,
    @Query('status') status?: PreAuthStatus,
    @Query('admissionId') admissionId?: string,
  ) {
    return this.service.findPreAuths(user.facilityId!, { status, admissionId });
  }

  // PATCH /insurance/pre-auth/:id
  @Patch('insurance/pre-auth/:id')
  @Roles(Role.FACILITY_ADMIN, Role.RECEPTIONIST)
  @ApiOperation({ summary: 'Update pre-auth status / insurer response' })
  updatePreAuth(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePreAuthDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.updatePreAuth(id, dto, user.facilityId!);
  }

  // ── Consumables ───────────────────────────────────────────────────────

  // GET /consumables
  @Get('consumables')
  @ApiOperation({ summary: 'List consumable items for facility' })
  getConsumableItems(@CurrentUser() user: JwtPayload) {
    return this.service.getConsumableItems(user.facilityId!);
  }

  // POST /consumables
  @Post('consumables')
  @Roles(Role.FACILITY_ADMIN)
  @ApiOperation({ summary: 'Create consumable item' })
  createConsumableItem(
    @Body() dto: CreateConsumableItemDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.createConsumableItem(dto, user.facilityId!);
  }

  // GET /consumables/inventory/:wardId
  @Get('consumables/inventory/:wardId')
  @ApiOperation({ summary: 'Get ward inventory for a specific ward' })
  getWardInventory(
    @Param('wardId', ParseUUIDPipe) wardId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.getWardInventory(user.facilityId!, wardId);
  }

  // POST /consumables/consumption
  @Post('consumables/consumption')
  @Roles(Role.NURSE, Role.FACILITY_ADMIN)
  @ApiOperation({
    summary: 'Record consumable consumption — deducts from ward inventory',
  })
  recordConsumption(
    @Body() dto: RecordConsumptionDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.recordConsumption(dto, user.facilityId!);
  }

  // POST /consumables/inventory/restock
  @Post('consumables/inventory/restock')
  @Roles(Role.FACILITY_ADMIN)
  @ApiOperation({ summary: 'Restock ward inventory' })
  restockInventory(
    @Body()
    body: { wardId: string; consumableItemId: string; quantity: number },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.service.restockInventory(
      body.wardId,
      body.consumableItemId,
      body.quantity,
      user.facilityId!,
    );
  }
}
