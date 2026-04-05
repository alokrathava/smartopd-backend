import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { LabService } from './lab.service';
import {
  CreateLabOrderDto,
  AddLabResultDto,
  LabOrderFilterDto,
} from './dto/lab.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { Role } from '../common/enums/role.enum';
import { IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

class AddResultsDto {
  @ApiProperty({ type: [AddLabResultDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddLabResultDto)
  results: AddLabResultDto[];
}

@ApiTags('Lab')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('lab')
export class LabController {
  constructor(private readonly labService: LabService) {}

  @Post('orders')
  @Roles(Role.DOCTOR, Role.FACILITY_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a lab order from a consultation' })
  createOrder(@Body() dto: CreateLabOrderDto, @CurrentUser() user: JwtPayload) {
    return this.labService.createOrder(dto, user.facilityId!, user.sub);
  }

  @Get('orders')
  @Roles(
    Role.DOCTOR,
    Role.NURSE,
    Role.RECEPTIONIST,
    Role.FACILITY_ADMIN,
    Role.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'List lab orders with filters' })
  getOrders(
    @Query() filters: LabOrderFilterDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.labService.getOrders(user.facilityId!, filters);
  }

  @Get('orders/:id')
  @Roles(
    Role.DOCTOR,
    Role.NURSE,
    Role.RECEPTIONIST,
    Role.FACILITY_ADMIN,
    Role.SUPER_ADMIN,
  )
  @ApiOperation({ summary: 'Get lab order details' })
  getOrder(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.labService.getOrder(id, user.facilityId!);
  }

  @Get('orders/:id/results')
  @Roles(Role.DOCTOR, Role.NURSE, Role.FACILITY_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get results for a lab order' })
  getResults(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.labService.getOrderResults(id, user.facilityId!);
  }

  @Post('orders/:id/results')
  @Roles(Role.NURSE, Role.FACILITY_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Add results to a lab order (manual entry)' })
  addResults(
    @Param('id') id: string,
    @Body() dto: AddResultsDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.labService.addResults(id, dto.results, user.facilityId!);
  }

  @Delete('orders/:id')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.DOCTOR, Role.FACILITY_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Cancel a lab order' })
  cancelOrder(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.labService.cancelOrder(id, user.facilityId!);
  }

  /** Lab partner webhook — receives results from SRL, Thyrocare, Dr. Lal */
  @Public()
  @Post('webhook/:facilityId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Lab partner webhook: receive results from external lab',
  })
  handleWebhook(
    @Param('facilityId') facilityId: string,
    @Body() body: { externalOrderId: string; results: AddLabResultDto[] },
  ) {
    return this.labService.handlePartnerWebhook(
      body.externalOrderId,
      body.results,
      facilityId,
    );
  }
}
