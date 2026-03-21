import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Equipment } from './entities/equipment.entity';
import { EquipmentLease } from './entities/equipment-lease.entity';
import { MaintenanceLog } from './entities/maintenance-log.entity';
import { EquipmentService } from './equipment.service';
import { EquipmentController } from './equipment.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Equipment, EquipmentLease, MaintenanceLog])],
  controllers: [EquipmentController],
  providers: [EquipmentService],
  exports: [EquipmentService],
})
export class EquipmentModule {}
