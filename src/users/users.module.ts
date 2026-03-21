import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './entities/user.entity';
import { Facility } from './entities/facility.entity';
import { FacilitySettings } from './entities/facility-settings.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, Facility, FacilitySettings])],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
