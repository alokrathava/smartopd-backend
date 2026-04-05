import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import {
  LabOrder,
  LabOrderStatus,
  LabPartner,
} from './entities/lab-order.entity';
import { LabResult, ResultStatus } from './entities/lab-result.entity';
import { Patient } from '../patients/entities/patient.entity';
import { NotificationService } from '../notification/notification.service';
import { NotificationChannel } from '../notification/entities/notification-log.entity';
import {
  CreateLabOrderDto,
  AddLabResultDto,
  LabOrderFilterDto,
} from './dto/lab.dto';

@Injectable()
export class LabService {
  private readonly logger = new Logger(LabService.name);

  constructor(
    @InjectRepository(LabOrder)
    private readonly orderRepo: Repository<LabOrder>,
    @InjectRepository(LabResult)
    private readonly resultRepo: Repository<LabResult>,
    @InjectRepository(Patient)
    private readonly patientRepo: Repository<Patient>,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly notificationService: NotificationService,
  ) {}

  async createOrder(
    dto: CreateLabOrderDto,
    facilityId: string,
    doctorId: string,
  ): Promise<LabOrder> {
    const patient = await this.patientRepo.findOne({
      where: { id: dto.patientId, facilityId },
    });
    if (!patient) throw new NotFoundException('Patient not found');

    const fhirServiceRequest = this.buildFhirServiceRequest(
      dto,
      patient,
      facilityId,
      doctorId,
    );

    const order = this.orderRepo.create({
      ...dto,
      facilityId,
      orderedById: doctorId,
      partner: dto.partner || LabPartner.IN_HOUSE,
      urgency: dto.urgency || 'ROUTINE',
      fhirServiceRequest: JSON.stringify(fhirServiceRequest),
      status: LabOrderStatus.ORDERED,
    });

    const saved = await this.orderRepo.save(order);

    // Auto-route to external partner if configured
    if (dto.partner && dto.partner !== LabPartner.IN_HOUSE) {
      await this.routeToPartner(saved, patient);
    }

    return saved;
  }

  async getOrders(
    facilityId: string,
    filters: LabOrderFilterDto,
  ): Promise<LabOrder[]> {
    const qb = this.orderRepo
      .createQueryBuilder('o')
      .where('o.facilityId = :facilityId', { facilityId })
      .orderBy('o.createdAt', 'DESC');

    if (filters.status)
      qb.andWhere('o.status = :status', { status: filters.status });
    if (filters.patientId)
      qb.andWhere('o.patientId = :patientId', { patientId: filters.patientId });
    if (filters.visitId)
      qb.andWhere('o.visitId = :visitId', { visitId: filters.visitId });

    return qb.getMany();
  }

  async getOrder(orderId: string, facilityId: string): Promise<LabOrder> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId, facilityId },
    });
    if (!order) throw new NotFoundException('Lab order not found');
    return order;
  }

  async getOrderResults(
    orderId: string,
    facilityId: string,
  ): Promise<LabResult[]> {
    return this.resultRepo.find({
      where: { labOrderId: orderId, facilityId },
      order: { createdAt: 'ASC' },
    });
  }

  /** Called when results come in (manually or via webhook from partner) */
  async addResults(
    orderId: string,
    results: AddLabResultDto[],
    facilityId: string,
  ): Promise<LabResult[]> {
    const order = await this.orderRepo.findOne({
      where: { id: orderId, facilityId },
    });
    if (!order) throw new NotFoundException('Lab order not found');

    const patient = await this.patientRepo.findOne({
      where: { id: order.patientId, facilityId },
    });

    const savedResults: LabResult[] = [];
    let hasCritical = false;

    for (const r of results) {
      const fhirObs = this.buildFhirObservation(r, order, facilityId);
      const result = this.resultRepo.create({
        ...r,
        labOrderId: orderId,
        patientId: order.patientId,
        facilityId,
        fhirObservation: JSON.stringify(fhirObs),
      });
      savedResults.push(await this.resultRepo.save(result));

      if (
        r.status === ResultStatus.CRITICAL_HIGH ||
        r.status === ResultStatus.CRITICAL_LOW
      ) {
        hasCritical = true;
      }
    }

    // Mark order as resulted
    await this.orderRepo.update(orderId, {
      status: LabOrderStatus.RESULTED,
      resultedAt: new Date(),
    });

    // Notify patient + flag critical values
    if (patient?.phone) {
      const criticalNote = hasCritical
        ? ' ⚠️ Critical values detected — please contact your doctor immediately.'
        : '';
      await this.notificationService.send(
        NotificationChannel.SMS,
        patient.phone,
        `SmartOPD: Your ${order.testName} results are ready.${criticalNote}`,
        facilityId,
        'LAB_RESULT_READY',
        'LabOrder',
        orderId,
      );
    }

    return savedResults;
  }

  async cancelOrder(orderId: string, facilityId: string) {
    const order = await this.orderRepo.findOne({
      where: { id: orderId, facilityId },
    });
    if (!order) throw new NotFoundException('Lab order not found');
    await this.orderRepo.update(orderId, { status: LabOrderStatus.CANCELLED });
    return { message: 'Lab order cancelled' };
  }

  /** Webhook from lab partners (SRL / Thyrocare / Dr. Lal) */
  async handlePartnerWebhook(
    externalOrderId: string,
    results: AddLabResultDto[],
    facilityId: string,
  ) {
    const order = await this.orderRepo.findOne({
      where: { externalOrderId, facilityId },
    });
    if (!order) {
      this.logger.warn(
        `Lab webhook: order ${externalOrderId} not found for facility ${facilityId}`,
      );
      return;
    }
    return this.addResults(order.id, results, facilityId);
  }

  // ─── Private: Partner Routing ──────────────────────────────────────────────

  private async routeToPartner(order: LabOrder, patient: Patient) {
    const partner = order.partner;
    const apiKey = this.configService.get<string>(`LAB_${partner}_API_KEY`, '');

    if (!apiKey) {
      this.logger.debug(`[LAB MOCK] Routing order ${order.id} to ${partner}`);
      await this.orderRepo.update(order.id, {
        status: LabOrderStatus.SENT_TO_LAB,
        externalOrderId: `${partner}-MOCK-${Date.now()}`,
        sentToLabAt: new Date(),
      });
      return;
    }

    // Real routing — partner-specific APIs
    const partnerUrls: Record<string, string> = {
      [LabPartner.SRL]: 'https://api.srl.in/orders',
      [LabPartner.THYROCARE]:
        'https://velso.thyrocare.cloud/api/OrderMaster/RouteOrder',
      [LabPartner.DR_LAL]: 'https://api.lalpathlabs.com/v1/orders',
      [LabPartner.METROPOLIS]: 'https://api.metropolisindia.com/v1/orders',
    };

    const url = partnerUrls[partner];
    if (!url) return;

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          url,
          {
            orderId: order.id,
            testName: order.testName,
            loincCode: order.loincCode,
            urgency: order.urgency,
            patient: {
              name: `${patient.firstName} ${patient.lastName}`,
              phone: patient.phone,
              dob: patient.dateOfBirth,
              gender: patient.gender,
            },
          },
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      await this.orderRepo.update(order.id, {
        status: LabOrderStatus.SENT_TO_LAB,
        externalOrderId: response.data?.orderId || response.data?.id,
        sentToLabAt: new Date(),
      });
    } catch (err: any) {
      this.logger.error(
        `Failed to route order ${order.id} to ${partner}: ${err.message}`,
      );
    }
  }

  // ─── FHIR R4 Builders ─────────────────────────────────────────────────────

  private buildFhirServiceRequest(
    dto: CreateLabOrderDto,
    patient: Patient,
    facilityId: string,
    doctorId: string,
  ) {
    return {
      resourceType: 'ServiceRequest',
      id: uuidv4(),
      status: 'active',
      intent: 'order',
      code: {
        coding: [
          ...(dto.loincCode
            ? [
                {
                  system: 'http://loinc.org',
                  code: dto.loincCode,
                  display: dto.testName,
                },
              ]
            : []),
          { system: 'https://smartopd.in/lab-tests', display: dto.testName },
        ],
        text: dto.testName,
      },
      priority: (dto.urgency || 'routine').toLowerCase(),
      subject: { reference: `Patient/${patient.id}` },
      requester: { reference: `Practitioner/${doctorId}` },
      performer: [{ identifier: { value: facilityId } }],
      note: dto.notes ? [{ text: dto.notes }] : [],
      authoredOn: new Date().toISOString(),
    };
  }

  private buildFhirObservation(
    result: AddLabResultDto,
    order: LabOrder,
    facilityId: string,
  ) {
    const statusMap: Record<ResultStatus, string> = {
      [ResultStatus.NORMAL]: 'final',
      [ResultStatus.ABNORMAL_HIGH]: 'final',
      [ResultStatus.ABNORMAL_LOW]: 'final',
      [ResultStatus.CRITICAL_HIGH]: 'final',
      [ResultStatus.CRITICAL_LOW]: 'final',
      [ResultStatus.PENDING]: 'preliminary',
    };

    return {
      resourceType: 'Observation',
      id: uuidv4(),
      status: statusMap[result.status || ResultStatus.PENDING],
      code: {
        coding: [
          ...(result.loincCode
            ? [
                {
                  system: 'http://loinc.org',
                  code: result.loincCode,
                  display: result.componentName,
                },
              ]
            : []),
          {
            system: 'https://smartopd.in/lab-tests',
            display: result.componentName,
          },
        ],
        text: result.componentName,
      },
      subject: { reference: `Patient/${order.patientId}` },
      basedOn: [{ reference: `ServiceRequest/${order.id}` }],
      valueQuantity: {
        value: parseFloat(result.value) || result.value,
        unit: result.unit,
      },
      referenceRange: result.referenceRange
        ? [{ text: result.referenceRange }]
        : undefined,
      interpretation: result.status
        ? [
            {
              coding: [
                {
                  system:
                    'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
                  code: result.status
                    .replace('ABNORMAL_', 'A')
                    .replace('CRITICAL_', 'AA'),
                },
              ],
            },
          ]
        : undefined,
      note: result.interpretation
        ? [{ text: result.interpretation }]
        : undefined,
      effectiveDateTime: new Date().toISOString(),
    };
  }
}
