import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from './entities/user.entity';
import { Facility } from './entities/facility.entity';
import { FacilitySettings } from './entities/facility-settings.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateFacilityDto } from './dto/create-facility.dto';
import { Role } from '../common/enums/role.enum';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Facility) private facilityRepo: Repository<Facility>,
    @InjectRepository(FacilitySettings) private settingsRepo: Repository<FacilitySettings>,
  ) {}

  // ── Users ────────────────────────────────────────────────────
  async createUser(dto: CreateUserDto, facilityId: string): Promise<User> {
    const exists = await this.userRepo.findOne({ where: { email: dto.email } });
    if (exists) throw new ConflictException('Email already in use');
    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = this.userRepo.create({ ...dto, passwordHash, facilityId });
    return this.userRepo.save(user);
  }

  async findAllUsers(facilityId: string): Promise<User[]> {
    return this.userRepo.find({ where: { facilityId } });
  }

  async findUserById(id: string, facilityId: string): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id, facilityId } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findUserByEmail(email: string): Promise<User | null> {
    return this.userRepo.findOne({ where: { email } });
  }

  async updateUser(id: string, dto: UpdateUserDto, facilityId: string): Promise<User> {
    const user = await this.findUserById(id, facilityId);
    Object.assign(user, dto);
    return this.userRepo.save(user);
  }

  async removeUser(id: string, facilityId: string): Promise<void> {
    const user = await this.findUserById(id, facilityId);
    await this.userRepo.softRemove(user);
  }

  async getDoctors(facilityId: string): Promise<User[]> {
    return this.userRepo.find({ where: { facilityId, role: Role.DOCTOR, isActive: true } });
  }

  async updateLastLogin(id: string): Promise<void> {
    await this.userRepo.update(id, { lastLoginAt: new Date() });
  }

  // ── Facilities ───────────────────────────────────────────────
  async createFacility(dto: CreateFacilityDto): Promise<Facility> {
    const facility = this.facilityRepo.create(dto);
    const saved = await this.facilityRepo.save(facility);
    // auto-create default settings
    const settings = this.settingsRepo.create({ facilityId: saved.id });
    await this.settingsRepo.save(settings);
    return saved;
  }

  async findAllFacilities(): Promise<Facility[]> {
    return this.facilityRepo.find({ where: { isActive: true } });
  }

  async findFacilityById(id: string): Promise<Facility> {
    const f = await this.facilityRepo.findOne({ where: { id } });
    if (!f) throw new NotFoundException('Facility not found');
    return f;
  }

  async getFacilitySettings(facilityId: string): Promise<FacilitySettings> {
    let settings = await this.settingsRepo.findOne({ where: { facilityId } });
    if (!settings) {
      settings = this.settingsRepo.create({ facilityId });
      settings = await this.settingsRepo.save(settings);
    }
    return settings;
  }

  async updateFacilitySettings(facilityId: string, dto: Partial<FacilitySettings>): Promise<FacilitySettings> {
    let settings = await this.getFacilitySettings(facilityId);
    Object.assign(settings, dto);
    return this.settingsRepo.save(settings);
  }
}
