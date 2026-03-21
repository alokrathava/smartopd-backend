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
import { PatientsService } from './patients.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { CreateConsentDto } from './dto/create-consent.dto';

@ApiTags('Patients')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  @Post()
  @Roles(Role.RECEPTIONIST, Role.NURSE, Role.FACILITY_ADMIN)
  @ApiOperation({ summary: 'Register a new patient' })
  create(
    @Body() dto: CreatePatientDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.patientsService.create(dto, user.facilityId!, user.sub);
  }

  @Get()
  @Roles(Role.RECEPTIONIST, Role.NURSE, Role.DOCTOR, Role.FACILITY_ADMIN)
  @ApiOperation({ summary: 'List patients with search and pagination' })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.patientsService.findAll(user.facilityId!, { search, page, limit });
  }

  @Get(':id')
  @Roles(Role.RECEPTIONIST, Role.NURSE, Role.DOCTOR, Role.FACILITY_ADMIN)
  @ApiOperation({ summary: 'Get patient by ID' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.patientsService.findOne(id, user.facilityId!);
  }

  @Patch(':id')
  @Roles(Role.RECEPTIONIST, Role.NURSE, Role.FACILITY_ADMIN)
  @ApiOperation({ summary: 'Update patient' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePatientDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.patientsService.update(id, dto, user.facilityId!);
  }

  @Delete(':id')
  @Roles(Role.FACILITY_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft delete patient' })
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.patientsService.softDelete(id, user.facilityId!);
  }

  @Post(':id/consent')
  @Roles(Role.RECEPTIONIST, Role.NURSE, Role.FACILITY_ADMIN)
  @ApiOperation({ summary: 'Record patient consent' })
  recordConsent(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateConsentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.patientsService.recordConsent(id, dto, user.facilityId!, user.sub);
  }

  @Get(':id/consents')
  @Roles(Role.RECEPTIONIST, Role.NURSE, Role.DOCTOR, Role.FACILITY_ADMIN)
  @ApiOperation({ summary: 'Get patient consents' })
  getConsents(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.patientsService.getConsents(id, user.facilityId!);
  }
}
