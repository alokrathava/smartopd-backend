import {
  Controller,
  Get,
  Post,
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
import { PaymentService } from './payment.service';
import { CreateBillDto } from './dto/create-bill.dto';
import { AddBillItemDto } from './dto/add-bill-item.dto';
import { RecordPaymentDto } from './dto/record-payment.dto';

@ApiTags('Payment')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('bills')
  @Roles(Role.RECEPTIONIST, Role.PHARMACIST, Role.FACILITY_ADMIN)
  @ApiOperation({ summary: 'Create bill' })
  createBill(@Body() dto: CreateBillDto, @CurrentUser() user: JwtPayload) {
    return this.paymentService.createBill(dto, user.facilityId!, user.sub);
  }

  @Get('bills/patient/:patientId')
  @Roles(Role.RECEPTIONIST, Role.PHARMACIST, Role.FACILITY_ADMIN)
  @ApiOperation({ summary: 'Get bills for patient' })
  getPatientBills(
    @Param('patientId', ParseUUIDPipe) patientId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.paymentService.getPatientBills(patientId, user.facilityId!);
  }

  @Get('bills/:id')
  @Roles(Role.RECEPTIONIST, Role.PHARMACIST, Role.FACILITY_ADMIN)
  @ApiOperation({ summary: 'Get bill by ID' })
  getBill(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.paymentService.getBill(id, user.facilityId!);
  }

  @Post('bills/:id/items')
  @Roles(Role.RECEPTIONIST, Role.PHARMACIST, Role.FACILITY_ADMIN)
  @ApiOperation({ summary: 'Add item to bill' })
  addItem(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddBillItemDto,
    @CurrentUser() user: JwtPayload,
  ) {
    dto.billId = id;
    return this.paymentService.addItem(dto, user.facilityId!);
  }

  @Post('bills/:id/finalize')
  @Roles(Role.RECEPTIONIST, Role.PHARMACIST, Role.FACILITY_ADMIN)
  @ApiOperation({ summary: 'Finalize bill' })
  finalizeBill(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.paymentService.finalizeBill(id, user.facilityId!);
  }

  @Post('bills/:id/pay')
  @Roles(Role.RECEPTIONIST, Role.PHARMACIST, Role.FACILITY_ADMIN)
  @ApiOperation({ summary: 'Record payment for bill' })
  recordPayment(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RecordPaymentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    dto.billId = id;
    return this.paymentService.recordPayment(dto, user.facilityId!, user.sub);
  }

  @Get('reports/daily')
  @Roles(Role.FACILITY_ADMIN)
  @ApiOperation({ summary: 'Get daily revenue report' })
  @ApiQuery({ name: 'date', required: false })
  getDailyRevenue(
    @CurrentUser() user: JwtPayload,
    @Query('date') date?: string,
  ) {
    return this.paymentService.getDailyRevenue(
      user.facilityId!,
      date || new Date().toISOString().slice(0, 10),
    );
  }
}
