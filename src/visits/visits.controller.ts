import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { VisitsService } from './visits.service';
import { CreateVisitDto } from './dto/create-visit.dto';
import { UpdateVisitStatusDto } from './dto/update-visit-status.dto';
import { VisitStatus } from './entities/visit.entity';

@ApiTags('Visits')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('visits')
export class VisitsController {
  constructor(private readonly visitsService: VisitsService) {}

  @Post()
  @Roles(Role.RECEPTIONIST, Role.NURSE, Role.FACILITY_ADMIN)
  @ApiOperation({ summary: 'Register a new visit' })
  create(@Body() dto: CreateVisitDto, @CurrentUser() user: JwtPayload) {
    return this.visitsService.create(dto, user.facilityId!, user.sub);
  }

  @Get()
  @Roles(Role.RECEPTIONIST, Role.NURSE, Role.DOCTOR, Role.FACILITY_ADMIN)
  @ApiOperation({ summary: 'List visits with filters' })
  @ApiQuery({ name: 'date', required: false })
  @ApiQuery({ name: 'doctorId', required: false })
  @ApiQuery({ name: 'status', required: false, enum: VisitStatus })
  @ApiQuery({ name: 'patientId', required: false })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('date') date?: string,
    @Query('doctorId') doctorId?: string,
    @Query('status') status?: VisitStatus,
    @Query('patientId') patientId?: string,
  ) {
    return this.visitsService.findAll(user.facilityId!, { date, doctorId, status, patientId });
  }

  @Get('queue')
  @Roles(Role.RECEPTIONIST, Role.NURSE, Role.DOCTOR, Role.FACILITY_ADMIN)
  @ApiOperation({ summary: 'Get current queue' })
  @ApiQuery({ name: 'doctorId', required: false })
  getQueue(
    @CurrentUser() user: JwtPayload,
    @Query('doctorId') doctorId?: string,
  ) {
    return this.visitsService.getQueue(user.facilityId!, doctorId);
  }

  @Get(':id')
  @Roles(Role.RECEPTIONIST, Role.NURSE, Role.DOCTOR, Role.FACILITY_ADMIN)
  @ApiOperation({ summary: 'Get visit by ID' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.visitsService.findOne(id, user.facilityId!);
  }

  @Patch(':id/status')
  @Roles(Role.RECEPTIONIST, Role.NURSE, Role.DOCTOR, Role.FACILITY_ADMIN)
  @ApiOperation({ summary: 'Update visit status' })
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateVisitStatusDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.visitsService.updateStatus(id, dto, user.facilityId!);
  }

  @Patch(':id/assign-doctor')
  @Roles(Role.RECEPTIONIST, Role.FACILITY_ADMIN)
  @ApiOperation({ summary: 'Assign doctor to visit' })
  assignDoctor(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('doctorId') doctorId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.visitsService.assignDoctor(id, doctorId, user.facilityId!);
  }

  @Patch(':id/start-triage')
  @Roles(Role.NURSE, Role.FACILITY_ADMIN)
  @ApiOperation({ summary: 'Nurse starts triage for patient' })
  startTriage(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.visitsService.startTriage(id, user.facilityId!);
  }

  @Patch(':id/start-consultation')
  @Roles(Role.DOCTOR, Role.FACILITY_ADMIN)
  @ApiOperation({ summary: 'Doctor opens consultation' })
  startConsultation(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.visitsService.startConsultation(id, user.facilityId!);
  }

  @Patch(':id/complete')
  @Roles(Role.DOCTOR, Role.FACILITY_ADMIN)
  @ApiOperation({ summary: 'Mark visit as completed' })
  completeVisit(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.visitsService.completeVisit(id, user.facilityId!);
  }

  @Patch(':id/no-show')
  @Roles(Role.RECEPTIONIST, Role.FACILITY_ADMIN)
  @ApiOperation({ summary: 'Mark patient as no-show' })
  markNoShow(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.visitsService.markNoShow(id, user.facilityId!);
  }

  @Delete(':id')
  @Roles(Role.RECEPTIONIST, Role.FACILITY_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancel a visit' })
  cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.visitsService.cancel(id, user.facilityId!);
  }
}
