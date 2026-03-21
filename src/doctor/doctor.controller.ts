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
import { Role } from '../common/enums/role.enum';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { DoctorService } from './doctor.service';
import { CreateConsultationDto } from './dto/create-consultation.dto';
import { CreatePrescriptionDto } from './dto/create-prescription.dto';
import { CreatePrescriptionItemDto } from './dto/create-prescription-item.dto';
import { CompleteConsultationDto } from './dto/complete-consultation.dto';

@ApiTags('Doctor')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('doctor')
export class DoctorController {
  constructor(private readonly doctorService: DoctorService) {}

  @Post('consultations')
  @Roles(Role.DOCTOR, Role.FACILITY_ADMIN)
  @ApiOperation({ summary: 'Create consultation' })
  createConsultation(@Body() dto: CreateConsultationDto, @CurrentUser() user: JwtPayload) {
    return this.doctorService.createConsultation(dto, user.facilityId!, user.sub);
  }

  @Get('consultations/:visitId')
  @Roles(Role.DOCTOR, Role.NURSE, Role.RECEPTIONIST, Role.FACILITY_ADMIN)
  @ApiOperation({ summary: 'Get consultation by visit ID' })
  getConsultation(
    @Param('visitId', ParseUUIDPipe) visitId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.doctorService.getConsultation(visitId, user.facilityId!);
  }

  @Patch('consultations/:id')
  @Roles(Role.DOCTOR, Role.FACILITY_ADMIN)
  @ApiOperation({ summary: 'Update consultation' })
  updateConsultation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateConsultationDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.doctorService.updateConsultation(id, dto, user.facilityId!);
  }

  @Post('consultations/:id/complete')
  @Roles(Role.DOCTOR, Role.FACILITY_ADMIN)
  @ApiOperation({ summary: 'Complete consultation' })
  completeConsultation(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CompleteConsultationDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.doctorService.completeConsultation(id, dto, user.facilityId!);
  }

  @Post('prescriptions')
  @Roles(Role.DOCTOR, Role.FACILITY_ADMIN)
  @ApiOperation({ summary: 'Create prescription' })
  createPrescription(@Body() dto: CreatePrescriptionDto, @CurrentUser() user: JwtPayload) {
    return this.doctorService.createPrescription(dto, user.facilityId!, user.sub);
  }

  @Get('prescriptions/:visitId')
  @Roles(Role.DOCTOR, Role.NURSE, Role.RECEPTIONIST, Role.PHARMACIST, Role.FACILITY_ADMIN)
  @ApiOperation({ summary: 'Get prescription by visit ID' })
  getPrescription(
    @Param('visitId', ParseUUIDPipe) visitId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.doctorService.getPrescription(visitId, user.facilityId!);
  }

  @Post('prescriptions/:id/items')
  @Roles(Role.DOCTOR, Role.FACILITY_ADMIN)
  @ApiOperation({ summary: 'Add item to prescription' })
  addPrescriptionItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreatePrescriptionItemDto,
    @CurrentUser() user: JwtPayload,
  ) {
    dto.prescriptionId = id;
    return this.doctorService.addPrescriptionItem(dto, user.facilityId!);
  }

  @Post('prescriptions/:id/finalize')
  @Roles(Role.DOCTOR, Role.FACILITY_ADMIN)
  @ApiOperation({ summary: 'Finalize prescription' })
  finalizePrescription(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.doctorService.finalizePrescription(id, user.facilityId!);
  }

  @Get('icd10/search')
  @Roles(Role.DOCTOR, Role.NURSE, Role.FACILITY_ADMIN)
  @ApiOperation({ summary: 'Search ICD-10 codes' })
  @ApiQuery({ name: 'q', required: true })
  searchIcd10(@Query('q') q: string) {
    return this.doctorService.searchIcd10(q);
  }

  @Get('icd10/common')
  @Roles(Role.DOCTOR, Role.NURSE, Role.FACILITY_ADMIN)
  @ApiOperation({ summary: 'Get common ICD-10 codes' })
  getCommonIcd10() {
    return this.doctorService.getCommonIcd10();
  }
}
