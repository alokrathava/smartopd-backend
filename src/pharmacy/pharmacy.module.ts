import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DispenseRecord } from './entities/dispense-record.entity';
import { PharmacyInventory } from './entities/pharmacy-inventory.entity';
import { PharmacyService } from './pharmacy.service';
import { PharmacyController } from './pharmacy.controller';

@Module({
  imports: [TypeOrmModule.forFeature([DispenseRecord, PharmacyInventory])],
  controllers: [PharmacyController],
  providers: [PharmacyService],
  exports: [PharmacyService],
})
export class PharmacyModule {}
