import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { NurseService } from './nurse.service';
import { CreateVitalsDto } from './dto/create-vitals.dto';
import { CreateTriageDto } from './dto/create-triage.dto';
import { CreateMarDto } from './dto/create-mar.dto';
import { MarStatus } from './entities/mar.entity';
import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class UpdateMarStatusDto {
  @ApiProperty({ enum: MarStatus })
  @IsEnum(MarStatus)
  status: MarStatus;
}

@ApiTags('Nurse')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('nurse')
export class NurseController {
  constructor(private readonly nurseService: NurseService) {}

  @Post('vitals')
  @Roles(Role.NURSE, Role.FACILITY_ADMIN)
  @ApiOperation({ summary: 'Record patient vitals' })
  recordVitals(@Body() dto: CreateVitalsDto, @CurrentUser() user: JwtPayload) {
    return this.nurseService.recordVitals(dto, user.facilityId!, user.sub);
  }

  @Get('vitals/:visitId')
  @Roles(Role.NURSE, Role.DOCTOR, Role.FACILITY_ADMIN)
  @ApiOperation({ summary: 'Get vitals for a visit' })
  getVitals(
    @Param('visitId', ParseUUIDPipe) visitId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.nurseService.getVitals(visitId, user.facilityId!);
  }

  @Post('triage')
  @Roles(Role.NURSE, Role.FACILITY_ADMIN)
  @ApiOperation({ summary: 'Create triage assessment' })
  createTriage(@Body() dto: CreateTriageDto, @CurrentUser() user: JwtPayload) {
    return this.nurseService.createTriage(dto, user.facilityId!, user.sub);
  }

  @Get('triage/:visitId')
  @Roles(Role.NURSE, Role.DOCTOR, Role.FACILITY_ADMIN)
  @ApiOperation({ summary: 'Get triage for a visit' })
  getTriage(
    @Param('visitId', ParseUUIDPipe) visitId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.nurseService.getTriage(visitId, user.facilityId!);
  }

  @Post('mar')
  @Roles(Role.NURSE, Role.FACILITY_ADMIN)
  @ApiOperation({ summary: 'Create MAR entry' })
  createMar(@Body() dto: CreateMarDto, @CurrentUser() user: JwtPayload) {
    return this.nurseService.createMar(dto, user.facilityId!, user.sub);
  }

  @Patch('mar/:id/status')
  @Roles(Role.NURSE, Role.FACILITY_ADMIN)
  @ApiOperation({ summary: 'Update MAR status' })
  updateMarStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMarStatusDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.nurseService.updateMarStatus(id, dto.status, user.facilityId!);
  }

  @Get('mar/:visitId')
  @Roles(Role.NURSE, Role.DOCTOR, Role.FACILITY_ADMIN)
  @ApiOperation({ summary: 'Get MAR records for a visit' })
  getMarByVisit(
    @Param('visitId', ParseUUIDPipe) visitId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.nurseService.getMarByVisit(visitId, user.facilityId!);
  }
}
