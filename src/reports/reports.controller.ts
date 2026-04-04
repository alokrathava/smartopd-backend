import { Controller, Get, Query, UseGuards, BadRequestException } from '@nestjs/common';
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
import { ReportsService } from './reports.service';
import dayjs from 'dayjs';

@ApiTags('Reports & Analytics')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  private defaultRange() {
    return {
      from: dayjs().startOf('month').format('YYYY-MM-DD'),
      to: dayjs().format('YYYY-MM-DD'),
    };
  }

  @Get('visits')
  @Roles(Role.FACILITY_ADMIN, Role.SUPER_ADMIN, Role.DOCTOR)
  @ApiOperation({ summary: 'Visit statistics for date range' })
  @ApiQuery({ name: 'from', required: false, example: '2025-01-01' })
  @ApiQuery({ name: 'to', required: false, example: '2025-01-31' })
  getVisitStats(
    @CurrentUser() user: JwtPayload,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const range = this.defaultRange();
    const resolvedFrom = from || range.from;
    const resolvedTo = to || range.to;
    if (from && isNaN(new Date(from).getTime()))
      throw new BadRequestException('Invalid from date');
    if (to && isNaN(new Date(to).getTime()))
      throw new BadRequestException('Invalid to date');
    return this.reportsService.getVisitStats(
      user.facilityId!,
      resolvedFrom,
      resolvedTo,
    );
  }

  @Get('revenue')
  @Roles(Role.FACILITY_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Revenue summary for date range' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  getRevenueSummary(
    @CurrentUser() user: JwtPayload,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const range = this.defaultRange();
    return this.reportsService.getRevenueSummary(
      user.facilityId!,
      from || range.from,
      to || range.to,
    );
  }

  @Get('equipment')
  @Roles(Role.FACILITY_ADMIN, Role.SUPER_ADMIN, Role.EQUIPMENT_STAFF)
  @ApiOperation({ summary: 'Equipment utilisation summary' })
  getEquipmentUtilisation(@CurrentUser() user: JwtPayload) {
    return this.reportsService.getEquipmentUtilisation(user.facilityId!);
  }

  @Get('patients')
  @Roles(Role.FACILITY_ADMIN, Role.SUPER_ADMIN, Role.CRM_ANALYST)
  @ApiOperation({ summary: 'Patient statistics for date range' })
  @ApiQuery({ name: 'from', required: false })
  @ApiQuery({ name: 'to', required: false })
  getPatientStats(
    @CurrentUser() user: JwtPayload,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const range = this.defaultRange();
    return this.reportsService.getPatientStats(
      user.facilityId!,
      from || range.from,
      to || range.to,
    );
  }

  @Get('dhis')
  @Roles(Role.FACILITY_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({
    summary: 'DHIS incentive dashboard (requires ABDM integration)',
    description:
      'Returns ABDM linkage stats and estimated DHIS incentive income. Requires ABDM M2 integration to be active.',
  })
  getDhisDashboard(@CurrentUser() user: JwtPayload) {
    return this.reportsService.getDhisDashboard(user.facilityId!);
  }
}
