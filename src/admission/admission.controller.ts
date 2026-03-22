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
import { AdmissionService } from './admission.service';
import {
  CreateAdmissionDto,
  TransferBedDto,
  WardIntakeDto,
  NursingNoteDto,
  CreateWardRoundDto,
  InitiateDischargeDto,
  CompleteDischargeDto,
  DamaDto,
} from './admission.service';
import { AdmissionStatus } from './entities/admission.entity';

@ApiTags('Admissions & Inpatient')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admissions')
export class AdmissionController {
  constructor(private readonly admissionService: AdmissionService) {}

  @Post()
  @Roles(Role.RECEPTIONIST, Role.NURSE, Role.FACILITY_ADMIN)
  @ApiOperation({ summary: 'Create a new admission' })
  create(@Body() dto: CreateAdmissionDto, @CurrentUser() user: JwtPayload) {
    return this.admissionService.create(dto, user.facilityId!, user.sub);
  }

  @Get()
  @Roles(Role.DOCTOR, Role.NURSE, Role.RECEPTIONIST, Role.FACILITY_ADMIN)
  @ApiOperation({ summary: 'List admissions with filters' })
  @ApiQuery({ name: 'status', required: false, enum: AdmissionStatus })
  @ApiQuery({ name: 'wardId', required: false })
  @ApiQuery({ name: 'doctorId', required: false })
  @ApiQuery({ name: 'date', required: false, description: 'YYYY-MM-DD' })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('status') status?: AdmissionStatus,
    @Query('wardId') wardId?: string,
    @Query('doctorId') doctorId?: string,
    @Query('date') date?: string,
  ) {
    return this.admissionService.findAll(user.facilityId!, { status, wardId, doctorId, date });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get admission by ID' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.admissionService.findOne(id, user.facilityId!);
  }

  @Post(':id/transfer')
  @Roles(Role.NURSE, Role.FACILITY_ADMIN)
  @ApiOperation({ summary: 'Transfer patient to a different bed' })
  transfer(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransferBedDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.admissionService.transfer(id, dto, user.facilityId!);
  }

  @Post(':id/ward-intake')
  @Roles(Role.NURSE, Role.FACILITY_ADMIN)
  @ApiOperation({ summary: 'Ward nurse acknowledges patient arrival and assigns primary nurse' })
  wardIntake(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: WardIntakeDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.admissionService.wardIntake(id, dto, user.facilityId!);
  }

  @Post(':id/nursing-note')
  @Roles(Role.NURSE)
  @ApiOperation({ summary: 'Add a nursing note for an admitted patient' })
  addNursingNote(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: NursingNoteDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.admissionService.addNursingNote(id, dto, user.facilityId!);
  }

  @Post('ward-rounds')
  @Roles(Role.DOCTOR, Role.FACILITY_ADMIN)
  @ApiOperation({ summary: 'Create a ward round session with per-bed stops' })
  createWardRound(@Body() dto: CreateWardRoundDto & { admissionId: string }, @CurrentUser() user: JwtPayload) {
    const { admissionId, ...roundDto } = dto;
    return this.admissionService.createWardRound(admissionId, roundDto, user.facilityId!, user.sub);
  }

  @Get(':id/timeline')
  @ApiOperation({ summary: 'Get chronological patient timeline (ward rounds + stops + nursing notes)' })
  getTimeline(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.admissionService.getTimeline(id, user.facilityId!);
  }

  @Patch(':id/initiate-discharge')
  @Roles(Role.DOCTOR, Role.FACILITY_ADMIN)
  @ApiOperation({ summary: 'Initiate discharge planning — moves status to DISCHARGE_PLANNED' })
  initiateDischarge(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: InitiateDischargeDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.admissionService.initiateDischarge(id, dto, user.facilityId!);
  }

  @Patch(':id/complete-discharge')
  @Roles(Role.DOCTOR, Role.NURSE, Role.FACILITY_ADMIN)
  @ApiOperation({ summary: 'Complete discharge — frees the bed' })
  completeDischarge(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CompleteDischargeDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.admissionService.completeDischarge(id, dto, user.facilityId!);
  }

  @Post(':id/dama')
  @Roles(Role.DOCTOR, Role.FACILITY_ADMIN)
  @ApiOperation({ summary: 'Discharge Against Medical Advice (DAMA)' })
  dama(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DamaDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.admissionService.dama(id, dto, user.facilityId!);
  }

  @Get(':id/discharge-summary')
  @ApiOperation({ summary: 'Get discharge summary for an admission' })
  getDischargeSummary(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.admissionService.getDischargeSummary(id, user.facilityId!);
  }
}
