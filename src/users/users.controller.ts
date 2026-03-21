import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateFacilityDto } from './dto/create-facility.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Role } from '../common/enums/role.enum';
import { JwtPayload } from '../common/interfaces/jwt-payload.interface';

@ApiTags('Users & Facilities')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ── Facilities ─────────────────────────────────────────────
  @Post('facilities')
  @Roles(Role.SUPER_ADMIN)
  createFacility(@Body() dto: CreateFacilityDto) {
    return this.usersService.createFacility(dto);
  }

  @Get('facilities')
  @Roles(Role.SUPER_ADMIN)
  findAllFacilities() {
    return this.usersService.findAllFacilities();
  }

  @Get('facilities/:id')
  @Roles(Role.SUPER_ADMIN, Role.FACILITY_ADMIN)
  findFacility(@Param('id') id: string) {
    return this.usersService.findFacilityById(id);
  }

  @Get('facilities/:id/settings')
  @Roles(Role.SUPER_ADMIN, Role.FACILITY_ADMIN)
  getFacilitySettings(@Param('id') id: string) {
    return this.usersService.getFacilitySettings(id);
  }

  @Patch('facilities/:id/settings')
  @Roles(Role.SUPER_ADMIN, Role.FACILITY_ADMIN)
  updateFacilitySettings(@Param('id') id: string, @Body() dto: any) {
    return this.usersService.updateFacilitySettings(id, dto);
  }

  // ── Users ─────────────────────────────────────────────────
  @Post('users')
  @Roles(Role.SUPER_ADMIN, Role.FACILITY_ADMIN)
  createUser(@Body() dto: CreateUserDto, @CurrentUser() user: JwtPayload) {
    return this.usersService.createUser(dto, user.facilityId!);
  }

  @Get('users')
  @Roles(Role.SUPER_ADMIN, Role.FACILITY_ADMIN)
  findAllUsers(@CurrentUser() user: JwtPayload) {
    return this.usersService.findAllUsers(user.facilityId!);
  }

  @Get('users/me')
  getMe(@CurrentUser() user: JwtPayload) {
    return this.usersService.findUserById(user.sub, user.facilityId!);
  }

  @Get('users/doctors')
  @Roles(Role.SUPER_ADMIN, Role.FACILITY_ADMIN, Role.RECEPTIONIST, Role.NURSE)
  getDoctors(@CurrentUser() user: JwtPayload) {
    return this.usersService.getDoctors(user.facilityId!);
  }

  @Get('users/:id')
  @Roles(Role.SUPER_ADMIN, Role.FACILITY_ADMIN)
  findUser(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.usersService.findUserById(id, user.facilityId!);
  }

  @Patch('users/:id')
  @Roles(Role.SUPER_ADMIN, Role.FACILITY_ADMIN)
  updateUser(@Param('id') id: string, @Body() dto: UpdateUserDto, @CurrentUser() user: JwtPayload) {
    return this.usersService.updateUser(id, dto, user.facilityId!);
  }

  @Delete('users/:id')
  @Roles(Role.SUPER_ADMIN, Role.FACILITY_ADMIN)
  removeUser(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.usersService.removeUser(id, user.facilityId!);
  }
}
