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
import { CrmService } from './crm.service';
import { CreateFollowUpDto } from './dto/create-follow-up.dto';
import { CreateSegmentDto } from './dto/create-segment.dto';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { FollowUpStatus } from './entities/follow-up.entity';

@ApiTags('CRM')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('crm')
export class CrmController {
  constructor(private readonly crmService: CrmService) {}

  @Post('follow-ups')
  @Roles(Role.CRM_ANALYST, Role.FACILITY_ADMIN, Role.DOCTOR)
  @ApiOperation({ summary: 'Create follow-up' })
  createFollowUp(
    @Body() dto: CreateFollowUpDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.crmService.createFollowUp(dto, user.facilityId!);
  }

  @Get('follow-ups/today')
  @Roles(Role.CRM_ANALYST, Role.FACILITY_ADMIN, Role.DOCTOR)
  @ApiOperation({ summary: "Get today's follow-ups" })
  getTodaysFollowUps(@CurrentUser() user: JwtPayload) {
    return this.crmService.getTodaysFollowUps(user.facilityId!);
  }

  @Get('follow-ups')
  @Roles(Role.CRM_ANALYST, Role.FACILITY_ADMIN, Role.DOCTOR)
  @ApiOperation({ summary: 'Get follow-ups with filters' })
  @ApiQuery({ name: 'date', required: false })
  @ApiQuery({ name: 'status', required: false, enum: FollowUpStatus })
  @ApiQuery({ name: 'patientId', required: false })
  getFollowUps(
    @CurrentUser() user: JwtPayload,
    @Query('date') date?: string,
    @Query('status') status?: FollowUpStatus,
    @Query('patientId') patientId?: string,
  ) {
    return this.crmService.getFollowUps(user.facilityId!, {
      date,
      status,
      patientId,
    });
  }

  @Patch('follow-ups/:id')
  @Roles(Role.CRM_ANALYST, Role.FACILITY_ADMIN, Role.DOCTOR)
  @ApiOperation({ summary: 'Update follow-up' })
  updateFollowUp(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: any,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.crmService.updateFollowUp(id, dto, user.facilityId!);
  }

  @Post('segments')
  @Roles(Role.CRM_ANALYST, Role.FACILITY_ADMIN)
  @ApiOperation({ summary: 'Create patient segment' })
  createSegment(
    @Body() dto: CreateSegmentDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.crmService.createSegment(dto, user.facilityId!);
  }

  @Get('segments')
  @Roles(Role.CRM_ANALYST, Role.FACILITY_ADMIN)
  @ApiOperation({ summary: 'Get segments' })
  getSegments(@CurrentUser() user: JwtPayload) {
    return this.crmService.getSegments(user.facilityId!);
  }

  @Post('campaigns')
  @Roles(Role.CRM_ANALYST, Role.FACILITY_ADMIN)
  @ApiOperation({ summary: 'Create campaign' })
  createCampaign(
    @Body() dto: CreateCampaignDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.crmService.createCampaign(dto, user.facilityId!);
  }

  @Get('campaigns')
  @Roles(Role.CRM_ANALYST, Role.FACILITY_ADMIN)
  @ApiOperation({ summary: 'Get campaigns' })
  getCampaigns(@CurrentUser() user: JwtPayload) {
    return this.crmService.getCampaigns(user.facilityId!);
  }
}
