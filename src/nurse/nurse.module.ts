import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vitals } from './entities/vitals.entity';
import { Triage } from './entities/triage.entity';
import { Mar } from './entities/mar.entity';
import { NurseService } from './nurse.service';
import { NurseController } from './nurse.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Vitals, Triage, Mar])],
  controllers: [NurseController],
  providers: [NurseService],
  exports: [NurseService],
})
export class NurseModule {}
