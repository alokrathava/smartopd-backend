import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

interface AuditLogData {
  facilityId?: string;
  userId: string;
  userRole?: string;
  action: string;
  resource: string;
  resourceId?: string;
  payload?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  statusCode?: number;
  duration?: number;
}

const SENSITIVE_KEYS = ['password', 'passwordHash', 'token', 'otp', 'code'];

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditRepo: Repository<AuditLog>,
  ) {}

  private sanitizePayload(payload?: Record<string, any>): string | undefined {
    if (!payload) return undefined;
    const sanitized = { ...payload };
    for (const key of SENSITIVE_KEYS) {
      if (key in sanitized) sanitized[key] = '[REDACTED]';
    }
    try {
      return JSON.stringify(sanitized);
    } catch {
      return undefined;
    }
  }

  async log(data: AuditLogData): Promise<void> {
    const entry = this.auditRepo.create({
      facilityId: data.facilityId,
      userId: data.userId,
      userRole: data.userRole,
      action: data.action,
      resource: data.resource,
      resourceId: data.resourceId,
      payload: this.sanitizePayload(data.payload),
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      statusCode: data.statusCode,
      duration: data.duration,
      timestamp: new Date(),
    });
    await this.auditRepo.save(entry);
  }

  async findAll(
    facilityId: string,
    filters: {
      userId?: string;
      resource?: string;
      startDate?: string;
      endDate?: string;
    },
    pagination: { page?: number; limit?: number } = {},
  ) {
    const { page = 1, limit = 50 } = pagination;
    const skip = (page - 1) * limit;

    const qb = this.auditRepo
      .createQueryBuilder('a')
      .where('a.facilityId = :facilityId', { facilityId })
      .orderBy('a.timestamp', 'DESC')
      .skip(skip)
      .take(limit);

    if (filters.userId)
      qb.andWhere('a.userId = :userId', { userId: filters.userId });
    if (filters.resource)
      qb.andWhere('a.resource = :resource', { resource: filters.resource });
    if (filters.startDate)
      qb.andWhere('a.timestamp >= :startDate', {
        startDate: new Date(filters.startDate),
      });
    if (filters.endDate)
      qb.andWhere('a.timestamp <= :endDate', {
        endDate: new Date(filters.endDate),
      });

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }
}
