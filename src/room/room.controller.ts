import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { Role } from '../common/enums/role.enum';
import { RoomService } from './room.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { CreateBedDto } from './dto/create-bed.dto';
import { UpdateBedStatusDto } from './dto/update-bed-status.dto';
import { RoomType } from './entities/room.entity';

@ApiTags('Rooms & Beds')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class RoomController {
  constructor(private readonly roomService: RoomService) {}

  // ── Rooms ─────────────────────────────────────────────────────────────
  @Post('rooms')
  @Roles(Role.FACILITY_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create a room' })
  createRoom(@Body() dto: CreateRoomDto, @CurrentUser() user: JwtPayload) {
    return this.roomService.createRoom(dto, user.facilityId!);
  }

  @Get('rooms')
  @ApiOperation({ summary: 'List rooms with optional filters' })
  @ApiQuery({ name: 'type', required: false, enum: RoomType })
  @ApiQuery({ name: 'floor', required: false })
  @ApiQuery({ name: 'ward', required: false })
  findRooms(
    @CurrentUser() user: JwtPayload,
    @Query('type') type?: RoomType,
    @Query('floor') floor?: string,
    @Query('ward') ward?: string,
  ) {
    return this.roomService.findRooms(user.facilityId!, { type, floor, ward });
  }

  @Get('rooms/:id/beds')
  @ApiOperation({ summary: 'Get all beds in a room' })
  getBedsForRoom(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.roomService.getBedsForRoom(id, user.facilityId!);
  }

  // ── Beds ──────────────────────────────────────────────────────────────
  @Post('beds')
  @Roles(Role.FACILITY_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Add a bed to a room' })
  createBed(@Body() dto: CreateBedDto, @CurrentUser() user: JwtPayload) {
    return this.roomService.createBed(dto, user.facilityId!);
  }

  @Get('beds/board')
  @ApiOperation({ summary: 'Live bed occupancy board — all beds with status' })
  getBedBoard(@CurrentUser() user: JwtPayload) {
    return this.roomService.getBedBoard(user.facilityId!);
  }

  @Get('beds/available')
  @Roles(Role.RECEPTIONIST, Role.NURSE, Role.FACILITY_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Available beds — optionally filtered by room type' })
  @ApiQuery({ name: 'roomType', required: false, enum: RoomType })
  getAvailableBeds(@CurrentUser() user: JwtPayload, @Query('roomType') roomType?: RoomType) {
    return this.roomService.getAvailableBeds(user.facilityId!, roomType);
  }

  @Patch('beds/:id/status')
  @Roles(Role.NURSE, Role.FACILITY_ADMIN, Role.SUPER_ADMIN, Role.RECEPTIONIST)
  @ApiOperation({ summary: 'Update bed status (enforces state machine transitions)' })
  updateBedStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBedStatusDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.roomService.updateBedStatus(id, dto, user.facilityId!, user.sub);
  }

  @Post('beds/:id/housekeeping')
  @Roles(Role.NURSE, Role.FACILITY_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Trigger housekeeping/cleaning job for a bed' })
  startHousekeeping(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.roomService.startHousekeeping(id, user.facilityId!);
  }

  @Patch('beds/:id/housekeeping/complete')
  @Roles(Role.NURSE, Role.FACILITY_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Mark housekeeping complete for a bed' })
  completeHousekeeping(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('notes') notes: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.roomService.completeHousekeeping(id, user.facilityId!, user.sub, notes);
  }

  @Get('beds/:id/housekeeping-history')
  @Roles(Role.NURSE, Role.FACILITY_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Cleaning turnaround history for a bed' })
  getHousekeepingHistory(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: JwtPayload) {
    return this.roomService.getHousekeepingHistory(id, user.facilityId!);
  }

  @Get('wards/:ward/occupancy')
  @Roles(Role.FACILITY_ADMIN, Role.SUPER_ADMIN, Role.NURSE)
  @ApiOperation({ summary: 'Ward occupancy metrics' })
  getWardOccupancy(@Param('ward') ward: string, @CurrentUser() user: JwtPayload) {
    return this.roomService.getWardOccupancy(ward, user.facilityId!);
  }

  @Get('facilities/occupancy-dashboard')
  @Roles(Role.FACILITY_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Full facility occupancy dashboard' })
  getOccupancyDashboard(@CurrentUser() user: JwtPayload) {
    return this.roomService.getOccupancyDashboard(user.facilityId!);
  }
}
