import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiOkResponse,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { Role } from '../common/enums/role.enum';
import { NotificationService } from './notification.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { NotificationChannel } from './entities/notification-log.entity';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class SendNotificationDto {
  @ApiProperty({ enum: NotificationChannel })
  @IsEnum(NotificationChannel)
  channel: NotificationChannel;
  @ApiProperty({ example: '+919876543210 or email@example.com' })
  @IsNotEmpty()
  @IsString()
  recipient: string;
  @ApiProperty() @IsNotEmpty() @IsString() body: string;
  @ApiPropertyOptional() @IsOptional() @IsString() templateCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() relatedEntityType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() relatedEntityId?: string;
}

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('send')
  @Roles(Role.FACILITY_ADMIN, Role.SUPER_ADMIN, Role.DOCTOR, Role.NURSE)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send a notification (SMS/WhatsApp/Email/Push)' })
  send(@Body() dto: SendNotificationDto, @CurrentUser() user: JwtPayload) {
    return this.notificationService.send(
      dto.channel,
      dto.recipient,
      dto.body,
      user.facilityId ?? undefined,
      dto.templateCode,
      dto.relatedEntityType,
      dto.relatedEntityId,
    );
  }

  @Get('logs')
  @Roles(Role.FACILITY_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Get notification logs for facility' })
  @ApiQuery({ name: 'channel', required: false, enum: NotificationChannel })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  getLogs(
    @CurrentUser() user: JwtPayload,
    @Query('channel') channel?: NotificationChannel,
    @Query('limit') limit = 50,
  ) {
    return this.notificationService.getLogs(
      user.facilityId!,
      channel,
      Number(limit),
    );
  }

  @Post('templates')
  @Roles(Role.FACILITY_ADMIN, Role.SUPER_ADMIN)
  @ApiOperation({ summary: 'Create notification template' })
  @ApiCreatedResponse({ description: 'Template created' })
  createTemplate(
    @Body() dto: CreateTemplateDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.notificationService.createTemplate(dto, user.facilityId!);
  }

  @Get('templates')
  @Roles(Role.FACILITY_ADMIN, Role.SUPER_ADMIN, Role.DOCTOR, Role.NURSE)
  @ApiOperation({ summary: 'Get notification templates for facility' })
  getTemplates(@CurrentUser() user: JwtPayload) {
    return this.notificationService.getTemplates(user.facilityId!);
  }
}
