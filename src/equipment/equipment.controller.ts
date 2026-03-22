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
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Role } from '../common/enums/role.enum';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { EquipmentService } from './equipment.service';
import { CreateEquipmentDto } from './dto/create-equipment.dto';
import { CreatePatientLeaseDto } from './dto/create-patient-lease.dto';
import { ReturnEquipmentDto } from './dto/return-equipment.dto';
import { CreateMaintenanceLogDto } from './dto/create-maintenance-log.dto';

@ApiTags('Equipment')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('equipment')
export class EquipmentController {
  constructor(private readonly equipmentService: EquipmentService) {}

  @Post()
  @Roles(Role.EQUIPMENT_STAFF, Role.FACILITY_ADMIN)
  @ApiOperation({ summary: 'Create equipment' })
  create(@Body() dto: CreateEquipmentDto, @CurrentUser() user: JwtPayload) {
    return this.equipmentService.create(dto, user.facilityId!);
  }

  @Get()
  @Roles(Role.EQUIPMENT_STAFF, Role.DOCTOR, Role.NURSE, Role.FACILITY_ADMIN)
  @ApiOperation({ summary: 'List all equipment' })
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('status') status?: any,
    @Query('category') category?: string,
  ) {
    return this.equipmentService.findAll(user.facilityId!, {
      status,
      category,
    });
  }

  @Get('qr/:qrCode')
  @Public()
  @ApiOperation({ summary: 'Find equipment by QR code (Public)' })
  findByQr(@Param('qrCode') qrCode: string) {
    return this.equipmentService.findByQr(qrCode);
  }

  @Get('leases/active')
  @Roles(Role.EQUIPMENT_STAFF, Role.FACILITY_ADMIN)
  @ApiOperation({ summary: 'Get active leases' })
  getActiveLeases(@CurrentUser() user: JwtPayload) {
    return this.equipmentService.getActiveLeases(user.facilityId!);
  }

  @Get('leases/overdue')
  @Roles(Role.EQUIPMENT_STAFF, Role.FACILITY_ADMIN)
  @ApiOperation({ summary: 'Get overdue leases' })
  getOverdueLeases(@CurrentUser() user: JwtPayload) {
    return this.equipmentService.getOverdueLeases(user.facilityId!);
  }

  @Post('leases')
  @Roles(Role.EQUIPMENT_STAFF, Role.RECEPTIONIST, Role.FACILITY_ADMIN)
  @ApiOperation({ summary: 'Issue equipment to patient' })
  issueToPatient(
    @Body() dto: CreatePatientLeaseDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.equipmentService.issueToPatient(
      dto,
      user.facilityId!,
      user.sub,
    );
  }

  @Patch('leases/:id/return')
  @Roles(Role.EQUIPMENT_STAFF, Role.FACILITY_ADMIN)
  @ApiOperation({ summary: 'Return equipment from patient' })
  returnFromPatient(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReturnEquipmentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.equipmentService.returnFromPatient(id, dto, user.facilityId!);
  }

  @Post('maintenance')
  @Roles(Role.EQUIPMENT_STAFF, Role.FACILITY_ADMIN)
  @ApiOperation({ summary: 'Create maintenance log' })
  createMaintenanceLog(
    @Body() dto: CreateMaintenanceLogDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.equipmentService.createMaintenanceLog(dto, user.facilityId!);
  }

  @Get('maintenance/due')
  @Roles(Role.EQUIPMENT_STAFF, Role.FACILITY_ADMIN)
  @ApiOperation({ summary: 'Get equipment due for maintenance' })
  getMaintenanceDue(@CurrentUser() user: JwtPayload) {
    return this.equipmentService.getMaintenanceDue(user.facilityId!);
  }

  @Get(':id')
  @Roles(Role.EQUIPMENT_STAFF, Role.DOCTOR, Role.NURSE, Role.FACILITY_ADMIN)
  @ApiOperation({ summary: 'Get equipment by ID' })
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.equipmentService.findOne(id, user.facilityId!);
  }

  @Patch(':id')
  @Roles(Role.EQUIPMENT_STAFF, Role.FACILITY_ADMIN)
  @ApiOperation({ summary: 'Update equipment' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateEquipmentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.equipmentService.update(id, dto, user.facilityId!);
  }
}
