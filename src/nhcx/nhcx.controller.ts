import {
  Controller, Post, Get, Patch, Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { NhcxService } from './nhcx.service';
import { CreateClaimDto, UpdateClaimStatusDto, ClaimQueryDto } from './dto/nhcx.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { Role } from '../common/enums/role.enum';

@ApiTags('NHCX')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('nhcx')
export class NhcxController {
  constructor(private readonly nhcxService: NhcxService) {}

  @Post('claims')
  @Roles(Role.RECEPTIONIST, Role.FACILITY_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create an insurance claim (draft)' })
  createClaim(@Body() dto: CreateClaimDto, @CurrentUser() user: JwtPayload) {
    return this.nhcxService.createClaim(dto, user.facilityId!, user.sub);
  }

  @Post('claims/:id/submit')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.FACILITY_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Submit claim to NHCX gateway' })
  submitClaim(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.nhcxService.submitClaim(id, user.facilityId!);
  }

  @Patch('claims/:id/status')
  @Roles(Role.FACILITY_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update claim status (approval, denial, payment)' })
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateClaimStatusDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.nhcxService.updateClaimStatus(id, dto, user.facilityId!);
  }

  @Get('claims')
  @Roles(Role.RECEPTIONIST, Role.FACILITY_ADMIN, Role.SUPER_ADMIN, Role.DOCTOR)
  @ApiOperation({ summary: 'List claims with optional filters' })
  getClaims(@Query() query: ClaimQueryDto, @CurrentUser() user: JwtPayload) {
    return this.nhcxService.getClaims(user.facilityId!, query);
  }

  @Get('claims/:id')
  @Roles(Role.RECEPTIONIST, Role.FACILITY_ADMIN, Role.SUPER_ADMIN, Role.DOCTOR)
  @ApiOperation({ summary: 'Get claim details' })
  getClaim(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.nhcxService.getClaim(id, user.facilityId!);
  }

  @Public()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'NHCX webhook: claim status updates from insurer' })
  handleWebhook(@Body() body: any) {
    const facilityId = body?.context?.hfr_id || body?.facilityId;
    if (facilityId) {
      return this.nhcxService.handleNhcxWebhook(body, facilityId);
    }
    return { received: true };
  }
}
