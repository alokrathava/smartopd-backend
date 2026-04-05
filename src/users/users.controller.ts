import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
  ApiOperation,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateFacilityDto } from './dto/create-facility.dto';
import { UpdateFacilitySettingsDto } from './dto/update-facility-settings.dto';
import { UpdateFacilityDto } from './dto/update-facility.dto';
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
  findFacility(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    // FACILITY_ADMIN may only access their own facility; SUPER_ADMIN is unrestricted
    if (user.role !== Role.SUPER_ADMIN && id !== user.facilityId) {
      throw new ForbiddenException('Access to this facility is not permitted');
    }
    return this.usersService.findFacilityById(id);
  }

  @Patch('facilities/:id')
  @Roles(Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Update facility details (SUPER_ADMIN)' })
  updateFacility(@Param('id') id: string, @Body() dto: UpdateFacilityDto) {
    return this.usersService.updateFacility(id, dto);
  }

  @Post('facilities/:id/activate')
  @Roles(Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Activate a pending facility (SUPER_ADMIN)' })
  activateFacility(@Param('id') id: string) {
    return this.usersService.activateFacility(id);
  }

  @Post('facilities/:id/suspend')
  @Roles(Role.SUPER_ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Suspend a facility (SUPER_ADMIN)' })
  suspendFacility(@Param('id') id: string) {
    return this.usersService.suspendFacility(id);
  }

  @Get('facilities/:id/settings')
  @Roles(Role.SUPER_ADMIN, Role.FACILITY_ADMIN)
  getFacilitySettings(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    if (user.role !== Role.SUPER_ADMIN && id !== user.facilityId) {
      throw new ForbiddenException('Access to this facility is not permitted');
    }
    return this.usersService.getFacilitySettings(id);
  }

  @Patch('facilities/:id/settings')
  @Roles(Role.SUPER_ADMIN, Role.FACILITY_ADMIN)
  updateFacilitySettings(
    @Param('id') id: string,
    @Body() dto: UpdateFacilitySettingsDto,
    @CurrentUser() user: JwtPayload,
  ) {
    if (user.role !== Role.SUPER_ADMIN && id !== user.facilityId) {
      throw new ForbiddenException('Access to this facility is not permitted');
    }
    return this.usersService.updateFacilitySettings(id, dto);
  }

  @Post('facilities/:id/upload-logo')
  @Roles(Role.SUPER_ADMIN, Role.FACILITY_ADMIN)
  @ApiOperation({
    summary: 'Upload facility logo',
    description: 'Accepts PNG/JPG/SVG. Max 2MB.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { logo: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(
    FileInterceptor('logo', {
      storage: diskStorage({
        destination: './uploads/logos',
        filename: (req, file, cb) =>
          cb(null, `logo-${Date.now()}${extname(file.originalname)}`),
      }),
      limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
      fileFilter: (req, file, cb) => {
        const allowed = ['.png', '.jpg', '.jpeg', '.svg', '.webp'];
        if (!allowed.includes(extname(file.originalname).toLowerCase())) {
          return cb(
            new BadRequestException('Only PNG, JPG, SVG, WEBP allowed'),
            false,
          );
        }
        cb(null, true);
      },
    }),
  )
  async uploadFacilityLogo(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    const logoUrl = `/uploads/logos/${file.filename}`;
    return this.usersService.uploadFacilityLogo(id, logoUrl);
  }

  @Post('facilities/:id/settings/upload-logo')
  @Roles(Role.SUPER_ADMIN, Role.FACILITY_ADMIN)
  @ApiOperation({ summary: 'Upload branding logo for white-label kit' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { logo: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(
    FileInterceptor('logo', {
      storage: diskStorage({
        destination: './uploads/logos',
        filename: (req, file, cb) =>
          cb(null, `brand-logo-${Date.now()}${extname(file.originalname)}`),
      }),
      limits: { fileSize: 2 * 1024 * 1024 },
      fileFilter: (req, file, cb) => {
        const allowed = ['.png', '.jpg', '.jpeg', '.svg', '.webp'];
        if (!allowed.includes(extname(file.originalname).toLowerCase()))
          return cb(new BadRequestException('Invalid file type'), false);
        cb(null, true);
      },
    }),
  )
  async uploadSettingsLogo(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    return this.usersService.uploadSettingsAsset(
      id,
      'logoUrl',
      `/uploads/logos/${file.filename}`,
    );
  }

  @Post('facilities/:id/settings/upload-favicon')
  @Roles(Role.SUPER_ADMIN, Role.FACILITY_ADMIN)
  @ApiOperation({ summary: 'Upload favicon for white-label kit' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { favicon: { type: 'string', format: 'binary' } },
    },
  })
  @UseInterceptors(
    FileInterceptor('favicon', {
      storage: diskStorage({
        destination: './uploads/logos',
        filename: (req, file, cb) =>
          cb(null, `favicon-${Date.now()}${extname(file.originalname)}`),
      }),
      limits: { fileSize: 512 * 1024 }, // 512KB for favicon
      fileFilter: (req, file, cb) => {
        const allowed = ['.png', '.ico', '.svg'];
        if (!allowed.includes(extname(file.originalname).toLowerCase()))
          return cb(new BadRequestException('Invalid file type'), false);
        cb(null, true);
      },
    }),
  )
  async uploadFavicon(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    return this.usersService.uploadSettingsAsset(
      id,
      'faviconUrl',
      `/uploads/logos/${file.filename}`,
    );
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
  updateUser(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.usersService.updateUser(id, dto, user.facilityId!);
  }

  @Delete('users/:id')
  @Roles(Role.SUPER_ADMIN, Role.FACILITY_ADMIN)
  removeUser(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.usersService.removeUser(id, user.facilityId!);
  }
}
