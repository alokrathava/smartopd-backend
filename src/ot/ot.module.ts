import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OtBooking } from './entities/ot-booking.entity';
import { OtService } from './ot.service';
import { OtController } from './ot.controller';

@Module({
  imports: [TypeOrmModule.forFeature([OtBooking])],
  controllers: [OtController],
  providers: [OtService],
  exports: [OtService],
})
export class OtModule {}
