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
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { Role } from '../common/enums/role.enum';
import { OtService } from './ot.service';
import { CreateOtBookingDto } from './dto/create-ot-booking.dto';
import { CompleteOtDto } from './dto/complete-ot.dto';
import { OtStatus } from './entities/ot-booking.entity';

@ApiTags('Operation Theatre (OT)')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('ot')
export class OtController {
  constructor(private readonly otService: OtService) {}

  // POST /ot/bookings
  @Post('bookings')
  @Roles(Role.DOCTOR, Role.FACILITY_ADMIN)
  @ApiOperation({ summary: 'Create OT booking — validates no room conflict' })
  create(@Body() dto: CreateOtBookingDto, @CurrentUser() user: JwtPayload) {
    return this.otService.create(dto, user.facilityId!);
  }

  // GET /ot/bookings
  @Get('bookings')
  @Roles(Role.DOCTOR, Role.NURSE, Role.FACILITY_ADMIN)
  @ApiOperation({ summary: 'List OT bookings with optional filters' })
  @ApiQuery({ name: 'date', required: false, example: '2025-04-01' })
  @ApiQuery({ name: 'surgeonId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: OtStatus })
  @ApiQuery({ name: 'otRoomId', required: false })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('date') date?: string,
    @Query('surgeonId') surgeonId?: string,
    @Query('status') status?: OtStatus,
    @Query('otRoomId') otRoomId?: string,
  ) {
    return this.otService.findAll(user.facilityId!, { date, surgeonId, status, otRoomId });
  }

  // GET /ot/availability
  @Get('availability')
  @ApiOperation({ summary: 'Check OT room availability for a given date' })
  @ApiQuery({ name: 'otRoomId', required: true })
  @ApiQuery({ name: 'date', required: true, example: '2025-04-01' })
  checkAvailability(
    @CurrentUser() user: JwtPayload,
    @Query('otRoomId') otRoomId: string,
    @Query('date') date: string,
  ) {
    return this.otService.checkAvailability(otRoomId, date, user.facilityId!);
  }

  // GET /ot/analytics/surgeon-stats
  @Get('analytics/surgeon-stats')
  @Roles(Role.FACILITY_ADMIN, Role.DOCTOR)
  @ApiOperation({ summary: 'Surgeon performance stats — completed surgeries and avg duration' })
  @ApiQuery({ name: 'surgeonId', required: true })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  getSurgeonStats(
    @CurrentUser() user: JwtPayload,
    @Query('surgeonId') surgeonId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.otService.getSurgeonStats(surgeonId, user.facilityId!, { from, to });
  }

  // GET /ot/bookings/:id
  @Get('bookings/:id')
  @ApiOperation({ summary: 'Get OT booking by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.otService.findOne(id, user.facilityId!);
  }

  // POST /ot/bookings/:id/preop-checklist
  @Post('bookings/:id/preop-checklist')
  @Roles(Role.NURSE, Role.DOCTOR, Role.FACILITY_ADMIN)
  @ApiOperation({ summary: 'Submit/update pre-op checklist — auto-advances status to preop_check when all items checked' })
  updatePreopChecklist(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() checklistData: Record<string, any>,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.otService.updatePreopChecklist(id, checklistData, user.facilityId!);
  }

  // PATCH /ot/bookings/:id/start
  @Patch('bookings/:id/start')
  @Roles(Role.DOCTOR, Role.NURSE, Role.FACILITY_ADMIN)
  @ApiOperation({ summary: 'Start OT — blocked if pre-op checklist not complete' })
  startOt(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.otService.startOt(id, user.facilityId!);
  }

  // PATCH /ot/bookings/:id/complete
  @Patch('bookings/:id/complete')
  @Roles(Role.DOCTOR, Role.FACILITY_ADMIN)
  @ApiOperation({ summary: 'Complete OT — records notes and actual end time' })
  completeOt(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CompleteOtDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.otService.completeOt(id, dto, user.facilityId!);
  }

  // POST /ot/bookings/:id/cancel
  @Post('bookings/:id/cancel')
  @Roles(Role.DOCTOR, Role.FACILITY_ADMIN)
  @ApiOperation({ summary: 'Cancel OT booking' })
  cancelBooking(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.otService.cancelBooking(id, reason, user.facilityId!);
  }

  // POST /ot/bookings/:id/postpone
  @Post('bookings/:id/postpone')
  @Roles(Role.DOCTOR, Role.FACILITY_ADMIN)
  @ApiOperation({ summary: 'Postpone OT booking to a new time slot' })
  postponeBooking(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() newTime: { scheduledStart: string; scheduledEnd: string },
    @CurrentUser() user: JwtPayload,
  ) {
    return this.otService.postponeBooking(id, newTime, user.facilityId!);
  }
}
