import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  BadRequestException,
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
import { Role } from '../common/enums/role.enum';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { PharmacyService } from './pharmacy.service';
import { DispenseDto } from './dto/dispense.dto';
import { CreateInventoryDto } from './dto/create-inventory.dto';

@ApiTags('Pharmacy')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('pharmacy')
export class PharmacyController {
  constructor(private readonly pharmacyService: PharmacyService) {}

  @Get('queue')
  @Roles(Role.PHARMACIST, Role.DOCTOR, Role.NURSE, Role.FACILITY_ADMIN)
  @ApiOperation({ summary: 'Get dispense queue' })
  getDispenseQueue(@CurrentUser() user: JwtPayload) {
    return this.pharmacyService.getDispenseQueue(user.facilityId!);
  }

  @Post('dispense')
  @Roles(Role.PHARMACIST, Role.FACILITY_ADMIN)
  @ApiOperation({ summary: 'Dispense medication' })
  dispense(@Body() dto: DispenseDto, @CurrentUser() user: JwtPayload) {
    return this.pharmacyService.dispense(dto, user.facilityId!, user.sub);
  }

  @Get('allergy-check')
  @Roles(Role.PHARMACIST, Role.DOCTOR, Role.NURSE, Role.FACILITY_ADMIN)
  @ApiOperation({
    summary:
      'Check patient allergy against a drug — looks up patient allergy record',
  })
  @ApiQuery({ name: 'patientId', required: true })
  @ApiQuery({ name: 'drugName', required: true })
  checkAllergy(
    @Query('patientId') patientId: string,
    @Query('drugName') drugName: string,
    @CurrentUser() user: JwtPayload,
  ) {
    if (!patientId) throw new BadRequestException('patientId is required');
    if (!drugName) throw new BadRequestException('drugName is required');
    return this.pharmacyService.checkAllergy(
      patientId,
      drugName,
      user.facilityId!,
    );
  }

  @Get('drug-interactions')
  @Roles(Role.PHARMACIST, Role.DOCTOR, Role.FACILITY_ADMIN)
  @ApiOperation({
    summary:
      'Check drug-drug interactions via OpenFDA — pass comma-separated drug names',
  })
  @ApiQuery({
    name: 'drugs',
    required: true,
    description: 'Comma-separated drug names',
    example: 'warfarin,aspirin',
  })
  checkInteractions(
    @Query('drugs') drugs: string,
    @CurrentUser() user: JwtPayload,
  ) {
    if (!drugs) throw new BadRequestException('drugs param is required');
    const drugList = drugs
      .split(',')
      .map((d) => d.trim())
      .filter(Boolean);
    return this.pharmacyService.checkDrugInteractions(
      drugList,
      user.facilityId!,
    );
  }

  @Get('inventory')
  @Roles(Role.PHARMACIST, Role.FACILITY_ADMIN)
  @ApiOperation({ summary: 'Get pharmacy inventory' })
  @ApiQuery({ name: 'drugName', required: false })
  getInventory(
    @CurrentUser() user: JwtPayload,
    @Query('drugName') drugName?: string,
  ) {
    return this.pharmacyService.getInventory(user.facilityId!, { drugName });
  }

  @Post('inventory')
  @Roles(Role.PHARMACIST, Role.FACILITY_ADMIN)
  @ApiOperation({ summary: 'Add inventory item' })
  addInventory(
    @Body() dto: CreateInventoryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.pharmacyService.addInventory(dto, user.facilityId!);
  }

  @Get('inventory/low-stock')
  @Roles(Role.PHARMACIST, Role.FACILITY_ADMIN)
  @ApiOperation({ summary: 'Get low stock items' })
  getLowStock(@CurrentUser() user: JwtPayload) {
    return this.pharmacyService.getLowStock(user.facilityId!);
  }

  @Get('inventory/expiring')
  @Roles(Role.PHARMACIST, Role.FACILITY_ADMIN)
  @ApiOperation({ summary: 'Get expiring stock' })
  @ApiQuery({ name: 'days', required: false })
  getExpiringStock(
    @CurrentUser() user: JwtPayload,
    @Query('days') days?: number,
  ) {
    return this.pharmacyService.getExpiringStock(user.facilityId!, days);
  }

  @Get('history')
  @Roles(Role.PHARMACIST, Role.FACILITY_ADMIN)
  @ApiOperation({ summary: 'Get dispense history' })
  @ApiQuery({ name: 'patientId', required: false })
  @ApiQuery({ name: 'prescriptionId', required: false })
  getDispenseHistory(
    @CurrentUser() user: JwtPayload,
    @Query('patientId') patientId?: string,
    @Query('prescriptionId') prescriptionId?: string,
  ) {
    return this.pharmacyService.getDispenseHistory(user.facilityId!, {
      patientId,
      prescriptionId,
    });
  }
}
