import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { v4 as uuidv4 } from 'uuid';
import { Visit } from '../visits/entities/visit.entity';
import { Consultation } from '../doctor/entities/consultation.entity';
import { Prescription } from '../doctor/entities/prescription.entity';
import { Patient } from '../patients/entities/patient.entity';
import { Admission } from '../admission/entities/admission.entity';
import { DischargeSummary } from '../admission/entities/discharge-summary.entity';

@Injectable()
export class FhirService {
  private readonly logger = new Logger(FhirService.name);

  constructor(
    @InjectRepository(Visit) private readonly visitRepo: Repository<Visit>,
    @InjectRepository(Consultation)
    private readonly consultRepo: Repository<Consultation>,
    @InjectRepository(Prescription)
    private readonly prescriptionRepo: Repository<Prescription>,
    @InjectRepository(Patient)
    private readonly patientRepo: Repository<Patient>,
    @InjectRepository(Admission)
    private readonly admissionRepo: Repository<Admission>,
    @InjectRepository(DischargeSummary)
    private readonly dischargeRepo: Repository<DischargeSummary>,
    private readonly httpService: HttpService,
    private readonly config: ConfigService,
  ) {}

  private buildPatientResource(patient: Patient) {
    return {
      resourceType: 'Patient',
      id: patient.id,
      identifier: [
        { system: 'https://smartopd.in/patient', value: patient.id },
      ],
      name: [{ family: patient.lastName, given: [patient.firstName] }],
      telecom: [{ system: 'phone', value: patient.phone }],
      gender: patient.gender?.toLowerCase?.() ?? undefined,
      birthDate: patient.dateOfBirth
        ? new Date(patient.dateOfBirth).toISOString().split('T')[0]
        : undefined,
    } as any;
  }

  async publishConsultation(visitId: string, facilityId: string) {
    const visit = await this.visitRepo.findOne({
      where: { id: visitId, facilityId },
    });
    if (!visit) throw new Error('Visit not found');

    const patient = await this.patientRepo.findOne({
      where: { id: visit.patientId, facilityId },
    });
    const consultation = await this.consultRepo.findOne({
      where: { visitId: visit.id, facilityId },
    });
    const prescriptions = await this.prescriptionRepo.find({
      where: { visitId: visit.id, facilityId },
    });

    const now = new Date().toISOString();

    const entries: any[] = [];

    if (patient) {
      entries.push({
        fullUrl: `urn:uuid:${uuidv4()}`,
        resource: this.buildPatientResource(patient),
      });
    }

    // Encounter (basic)
    entries.push({
      fullUrl: `urn:uuid:${uuidv4()}`,
      resource: {
        resourceType: 'Encounter',
        id: visit.id,
        status: 'finished',
        subject: { reference: `Patient/${visit.patientId}` },
        period: {
          start: visit.checkedInAt?.toISOString?.(),
          end: visit.completedAt?.toISOString?.() || now,
        },
      },
    });

    if (consultation) {
      entries.push({
        fullUrl: `urn:uuid:${uuidv4()}`,
        resource: {
          resourceType: 'Composition',
          id: consultation.id,
          status: consultation.isComplete ? 'final' : 'preliminary',
          date: consultation.createdAt?.toISOString?.() || now,
          title: 'Consultation notes',
          subject: { reference: `Patient/${consultation.patientId}` },
          author: [{ reference: `Practitioner/${consultation.doctorId}` }],
          section: [
            {
              text: {
                div:
                  consultation.clinicalNotes ||
                  consultation.chiefComplaint ||
                  '',
              },
            },
          ],
        },
      });
    }

    // MedicationRequests for prescriptions
    for (const p of prescriptions) {
      const medReq = {
        resourceType: 'MedicationRequest',
        id: p.id,
        status: p.status === 'FINALIZED' ? 'active' : 'draft',
        intent: 'order',
        subject: { reference: `Patient/${p.patientId}` },
        authoredOn: p.prescriptionDate?.toISOString?.() || now,
        requester: { reference: `Practitioner/${p.prescribedById}` },
      } as any;

      entries.push({ fullUrl: `urn:uuid:${uuidv4()}`, resource: medReq });

      // persist lightweight representation on prescription
      try {
        await this.prescriptionRepo.update(p.id, {
          fhirMedicationRequestJson: JSON.stringify(medReq),
        } as any);
      } catch (e) {
        // ignore persistence failures
      }
    }

    const bundle = {
      resourceType: 'Bundle',
      id: uuidv4(),
      type: 'collection',
      timestamp: now,
      entry: entries,
    };

    // Persist encounter/composition back to DB where applicable
    try {
      await this.visitRepo.update(visit.id, {
        fhirEncounterJson: JSON.stringify(
          entries.find((e) => e.resource.resourceType === 'Encounter')
            ?.resource,
        ),
      } as any);
      if (consultation) {
        await this.consultRepo.update(consultation.id, {
          fhirCompositionJson: JSON.stringify(
            entries.find((e) => e.resource.resourceType === 'Composition')
              ?.resource,
          ),
        } as any);
      }
    } catch (e) {
      // ignore persistence errors
    }

    // Optionally push to external FHIR server
    const fhirBase = this.config.get<string>('FHIR_BASE_URL', '');
    const fhirToken = this.config.get<string>('FHIR_AUTH_TOKEN', '');
    if (fhirBase) {
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/fhir+json',
        };
        if (fhirToken) headers.Authorization = `Bearer ${fhirToken}`;
        await firstValueFrom(
          this.httpService.post(`${fhirBase}/Bundle`, bundle, { headers }),
        );
        this.logger.log(
          `Published consultation FHIR bundle for visit ${visitId}`,
        );
      } catch (err: any) {
        this.logger.error(
          `Failed to publish FHIR bundle for visit ${visitId}: ${err?.message || err}`,
        );
      }
    }

    return bundle;
  }

  async publishDischarge(admissionId: string, facilityId: string) {
    const admission = await this.admissionRepo.findOne({
      where: { id: admissionId, facilityId },
    });
    if (!admission) throw new Error('Admission not found');

    const patient = await this.patientRepo.findOne({
      where: { id: admission.patientId, facilityId },
    });
    const discharge = await this.dischargeRepo.findOne({
      where: { admissionId: admission.id },
    });

    const now = new Date().toISOString();
    const entries: any[] = [];
    if (patient)
      entries.push({
        fullUrl: `urn:uuid:${uuidv4()}`,
        resource: this.buildPatientResource(patient),
      });
    entries.push({
      fullUrl: `urn:uuid:${uuidv4()}`,
      resource: {
        resourceType: 'Encounter',
        id: admission.id,
        subject: { reference: `Patient/${admission.patientId}` },
        period: {
          start: admission.admittedAt?.toISOString?.(),
          end: admission.dischargedAt?.toISOString?.() || now,
        },
      },
    });

    if (discharge) {
      entries.push({
        fullUrl: `urn:uuid:${uuidv4()}`,
        resource: {
          resourceType: 'Composition',
          id: discharge.id,
          status: 'final',
          title: 'Discharge Summary',
          subject: { reference: `Patient/${discharge.patientId}` },
          date: discharge.createdAt?.toISOString?.(),
          section: [{ text: { div: discharge.finalDiagnosis || '' } }],
        },
      });
    }

    const bundle = {
      resourceType: 'Bundle',
      id: uuidv4(),
      type: 'collection',
      timestamp: now,
      entry: entries,
    };

    try {
      await this.admissionRepo.update(admission.id, {
        fhirDischargePublishedAt: new Date(),
      } as any);
    } catch {}

    const fhirBase = this.config.get<string>('FHIR_BASE_URL', '');
    const fhirToken = this.config.get<string>('FHIR_AUTH_TOKEN', '');
    if (fhirBase) {
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/fhir+json',
        };
        if (fhirToken) headers.Authorization = `Bearer ${fhirToken}`;
        await firstValueFrom(
          this.httpService.post(`${fhirBase}/Bundle`, bundle, { headers }),
        );
        this.logger.log(
          `Published discharge FHIR bundle for admission ${admissionId}`,
        );
      } catch (err: any) {
        this.logger.error(
          `Failed to publish FHIR discharge bundle for admission ${admissionId}: ${err?.message || err}`,
        );
      }
    }

    return bundle;
  }

  async publishPrescription(prescriptionId: string, facilityId: string) {
    const prescription = await this.prescriptionRepo.findOne({
      where: { id: prescriptionId, facilityId },
    });
    if (!prescription) throw new Error('Prescription not found');

    const patient = await this.patientRepo.findOne({
      where: { id: prescription.patientId, facilityId },
    });

    const now = new Date().toISOString();
    const entries: any[] = [];
    if (patient)
      entries.push({
        fullUrl: `urn:uuid:${uuidv4()}`,
        resource: this.buildPatientResource(patient),
      });

    const medReq = {
      resourceType: 'MedicationRequest',
      id: prescription.id,
      status: prescription.status === 'FINALIZED' ? 'active' : 'draft',
      subject: { reference: `Patient/${prescription.patientId}` },
      authoredOn: prescription.prescriptionDate?.toISOString?.() || now,
      requester: { reference: `Practitioner/${prescription.prescribedById}` },
    } as any;

    entries.push({ fullUrl: `urn:uuid:${uuidv4()}`, resource: medReq });

    try {
      await this.prescriptionRepo.update(prescription.id, {
        fhirMedicationRequestJson: JSON.stringify(medReq),
      } as any);
    } catch {}

    const bundle = {
      resourceType: 'Bundle',
      id: uuidv4(),
      type: 'collection',
      timestamp: now,
      entry: entries,
    };

    const fhirBase = this.config.get<string>('FHIR_BASE_URL', '');
    const fhirToken = this.config.get<string>('FHIR_AUTH_TOKEN', '');
    if (fhirBase) {
      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/fhir+json',
        };
        if (fhirToken) headers.Authorization = `Bearer ${fhirToken}`;
        await firstValueFrom(
          this.httpService.post(`${fhirBase}/Bundle`, bundle, { headers }),
        );
        this.logger.log(
          `Published prescription FHIR bundle for prescription ${prescriptionId}`,
        );
      } catch (err: any) {
        this.logger.error(
          `Failed to publish FHIR prescription bundle for ${prescriptionId}: ${err?.message || err}`,
        );
      }
    }

    return bundle;
  }
}
