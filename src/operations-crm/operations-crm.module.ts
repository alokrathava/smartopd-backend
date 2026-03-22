import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StaffRoster } from './entities/staff-roster.entity';
import { InsurancePreAuth } from './entities/insurance-pre-auth.entity';
import { ConsumableItem } from './entities/consumable-item.entity';
import { WardInventory } from './entities/ward-inventory.entity';
import { ConsumableConsumption } from './entities/consumable-consumption.entity';
import { OperationsCrmService } from './operations-crm.service';
import { OperationsCrmController } from './operations-crm.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StaffRoster,
      InsurancePreAuth,
      ConsumableItem,
      WardInventory,
      ConsumableConsumption,
    ]),
  ],
  controllers: [OperationsCrmController],
  providers: [OperationsCrmService],
  exports: [OperationsCrmService],
})
export class OperationsCrmModule {}
