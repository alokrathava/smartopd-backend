import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { NotificationLog } from './entities/notification-log.entity';
import { NotificationTemplate } from './entities/notification-template.entity';
import { NotificationService } from './notification.service';

@Module({
  imports: [TypeOrmModule.forFeature([NotificationLog, NotificationTemplate])],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
