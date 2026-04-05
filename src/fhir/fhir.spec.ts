import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { FhirService } from './fhir.service';
import { Visit } from '../visits/entities/visit.entity';
import { Consultation } from '../doctor/entities/consultation.entity';
import { Prescription } from '../doctor/entities/prescription.entity';
import { Patient } from '../patients/entities/patient.entity';
import { Admission } from '../admission/entities/admission.entity';
import { DischargeSummary } from '../admission/entities/discharge-summary.entity';

// ─── Fixture factories ────────────────────────────────────────────────────────

const buildVisit = (overrides: Record<string, any> = {}): Partial<Visit> => ({
  id: 'visit-1',
  facilityId: 'fac-1',
  patientId: 'pat-1',
  checkedInAt: new Date('2025-07-01T08:00:00Z'),
  completedAt: new Date('2025-07-01T09:00:00Z'),
  ...overrides,
});

const buildPatient = (
  overrides: Record<string, any> = {},
): Partial<Patient> => ({
  id: 'pat-1',
  facilityId: 'fac-1',
  firstName: 'Raj',
  lastName: 'Kumar',
  phone: '+919876543210',
  gender: 'Male',
  dateOfBirth: '1990-05-15' as any,
  ...overrides,
});

const buildConsultation = (
  overrides: Record<string, any> = {},
): Partial<Consultation> => ({
  id: 'consult-1',
  visitId: 'visit-1',
  facilityId: 'fac-1',
  patientId: 'pat-1',
  doctorId: 'doc-1',
  isComplete: true,
  clinicalNotes: 'Patient presents with fever.',
  chiefComplaint: 'Fever',
  createdAt: new Date('2025-07-01T08:30:00Z'),
  ...overrides,
});

const buildPrescription = (
  overrides: Record<string, any> = {},
): Partial<Prescription> => ({
  id: 'rx-1',
  visitId: 'visit-1',
  facilityId: 'fac-1',
  patientId: 'pat-1',
  prescribedById: 'doc-1',
  status: 'FINALIZED',
  prescriptionDate: new Date('2025-07-01T08:45:00Z'),
  ...overrides,
});

const buildAdmission = (
  overrides: Record<string, any> = {},
): Partial<Admission> => ({
  id: 'adm-1',
  facilityId: 'fac-1',
  patientId: 'pat-1',
  admittedAt: new Date('2025-06-01T10:00:00Z'),
  dischargedAt: new Date('2025-06-05T12:00:00Z'),
  dischargeSummaryId: 'ds-1',
  ...overrides,
});

const buildDischargeSummary = (
  overrides: Record<string, any> = {},
): Partial<DischargeSummary> => ({
  id: 'ds-1',
  patientId: 'pat-1',
  summaryText: 'Patient recovered well.',
  createdAt: new Date('2025-06-05T11:00:00Z'),
  ...overrides,
});

// ─── Repository mock factory ──────────────────────────────────────────────────

const makeRepoMock = () => ({
  findOne: jest.fn(),
  find: jest.fn().mockResolvedValue([]),
  update: jest.fn().mockResolvedValue({ affected: 1 }),
  save: jest.fn(),
});

// ─── HttpService mock ─────────────────────────────────────────────────────────

const mockHttpPost = jest.fn();
const mockHttpService = {
  post: mockHttpPost,
};

// ─── ConfigService factory ────────────────────────────────────────────────────

const makeConfigService = (fhirBase = '', fhirToken = '') => ({
  get: jest.fn((key: string, defaultValue = '') => {
    if (key === 'FHIR_BASE_URL') return fhirBase;
    if (key === 'FHIR_AUTH_TOKEN') return fhirToken;
    return defaultValue;
  }),
});

describe('FhirService', () => {
  let service: FhirService;
  let visitRepo: ReturnType<typeof makeRepoMock>;
  let consultRepo: ReturnType<typeof makeRepoMock>;
  let prescriptionRepo: ReturnType<typeof makeRepoMock>;
  let patientRepo: ReturnType<typeof makeRepoMock>;
  let admissionRepo: ReturnType<typeof makeRepoMock>;
  let dischargeRepo: ReturnType<typeof makeRepoMock>;
  let configService: ReturnType<typeof makeConfigService>;

  const buildModule = async (fhirBase = '', fhirToken = '') => {
    visitRepo = makeRepoMock();
    consultRepo = makeRepoMock();
    prescriptionRepo = makeRepoMock();
    patientRepo = makeRepoMock();
    admissionRepo = makeRepoMock();
    dischargeRepo = makeRepoMock();
    configService = makeConfigService(fhirBase, fhirToken);
    mockHttpPost.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FhirService,
        { provide: getRepositoryToken(Visit), useValue: visitRepo },
        { provide: getRepositoryToken(Consultation), useValue: consultRepo },
        {
          provide: getRepositoryToken(Prescription),
          useValue: prescriptionRepo,
        },
        { provide: getRepositoryToken(Patient), useValue: patientRepo },
        { provide: getRepositoryToken(Admission), useValue: admissionRepo },
        {
          provide: getRepositoryToken(DischargeSummary),
          useValue: dischargeRepo,
        },
        { provide: HttpService, useValue: mockHttpService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    service = module.get<FhirService>(FhirService);
  };

  beforeEach(() => buildModule());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  // ─── publishConsultation ─────────────────────────────────────────────────────

  describe('publishConsultation()', () => {
    it('throws when the visit is not found', async () => {
      visitRepo.findOne.mockResolvedValueOnce(null);

      await expect(
        service.publishConsultation('v-999', 'fac-1'),
      ).rejects.toThrow('Visit not found');
    });

    it('returns a FHIR Bundle of type "collection"', async () => {
      visitRepo.findOne.mockResolvedValueOnce(buildVisit());
      patientRepo.findOne.mockResolvedValueOnce(buildPatient());
      consultRepo.findOne.mockResolvedValueOnce(buildConsultation());
      prescriptionRepo.find.mockResolvedValueOnce([buildPrescription()]);

      const bundle = await service.publishConsultation('visit-1', 'fac-1');

      expect(bundle.resourceType).toBe('Bundle');
      expect(bundle.type).toBe('collection');
    });

    it('includes Patient, Encounter, Composition, and MedicationRequest entries', async () => {
      visitRepo.findOne.mockResolvedValueOnce(buildVisit());
      patientRepo.findOne.mockResolvedValueOnce(buildPatient());
      consultRepo.findOne.mockResolvedValueOnce(buildConsultation());
      prescriptionRepo.find.mockResolvedValueOnce([buildPrescription()]);

      const bundle = await service.publishConsultation('visit-1', 'fac-1');
      const types: string[] = bundle.entry.map(
        (e: any) => e.resource.resourceType,
      );

      expect(types).toContain('Patient');
      expect(types).toContain('Encounter');
      expect(types).toContain('Composition');
      expect(types).toContain('MedicationRequest');
    });

    it('builds the Encounter entry referencing the correct patient', async () => {
      visitRepo.findOne.mockResolvedValueOnce(buildVisit());
      patientRepo.findOne.mockResolvedValueOnce(buildPatient());
      consultRepo.findOne.mockResolvedValueOnce(null); // no consultation
      prescriptionRepo.find.mockResolvedValueOnce([]);

      const bundle = await service.publishConsultation('visit-1', 'fac-1');
      const encounter = bundle.entry.find(
        (e: any) => e.resource.resourceType === 'Encounter',
      );

      expect(encounter).toBeDefined();
      expect(encounter.resource.subject.reference).toBe('Patient/pat-1');
      expect(encounter.resource.status).toBe('finished');
    });

    it('sets MedicationRequest status to "active" for FINALIZED prescriptions', async () => {
      visitRepo.findOne.mockResolvedValueOnce(buildVisit());
      patientRepo.findOne.mockResolvedValueOnce(buildPatient());
      consultRepo.findOne.mockResolvedValueOnce(null);
      prescriptionRepo.find.mockResolvedValueOnce([
        buildPrescription({ status: 'FINALIZED' }),
      ]);

      const bundle = await service.publishConsultation('visit-1', 'fac-1');
      const medReq = bundle.entry.find(
        (e: any) => e.resource.resourceType === 'MedicationRequest',
      );

      expect(medReq.resource.status).toBe('active');
    });

    it('sets MedicationRequest status to "draft" for non-FINALIZED prescriptions', async () => {
      visitRepo.findOne.mockResolvedValueOnce(buildVisit());
      patientRepo.findOne.mockResolvedValueOnce(buildPatient());
      consultRepo.findOne.mockResolvedValueOnce(null);
      prescriptionRepo.find.mockResolvedValueOnce([
        buildPrescription({ status: 'DRAFT' }),
      ]);

      const bundle = await service.publishConsultation('visit-1', 'fac-1');
      const medReq = bundle.entry.find(
        (e: any) => e.resource.resourceType === 'MedicationRequest',
      );

      expect(medReq.resource.status).toBe('draft');
    });

    it('does NOT call HttpService when FHIR_BASE_URL is empty', async () => {
      visitRepo.findOne.mockResolvedValueOnce(buildVisit());
      patientRepo.findOne.mockResolvedValueOnce(buildPatient());
      consultRepo.findOne.mockResolvedValueOnce(buildConsultation());
      prescriptionRepo.find.mockResolvedValueOnce([]);

      await service.publishConsultation('visit-1', 'fac-1');

      expect(mockHttpPost).not.toHaveBeenCalled();
    });

    it('POSTs to FHIR_BASE_URL/Bundle when FHIR_BASE_URL is set', async () => {
      await buildModule('https://fhir.example.com', 'my-token');

      visitRepo.findOne.mockResolvedValueOnce(buildVisit());
      patientRepo.findOne.mockResolvedValueOnce(buildPatient());
      consultRepo.findOne.mockResolvedValueOnce(null);
      prescriptionRepo.find.mockResolvedValueOnce([]);

      mockHttpPost.mockReturnValueOnce(
        of({ data: { resourceType: 'Bundle' } }),
      );

      await service.publishConsultation('visit-1', 'fac-1');

      expect(mockHttpPost).toHaveBeenCalledTimes(1);
      const [url, , options] = mockHttpPost.mock.calls[0] as [
        string,
        any,
        { headers: Record<string, string> },
      ];
      expect(url).toBe('https://fhir.example.com/Bundle');
      expect(options.headers['Content-Type']).toBe('application/fhir+json');
      expect(options.headers['Authorization']).toBe('Bearer my-token');
    });

    it('does NOT include Authorization header when FHIR_AUTH_TOKEN is empty', async () => {
      await buildModule('https://fhir.example.com', '');

      visitRepo.findOne.mockResolvedValueOnce(buildVisit());
      patientRepo.findOne.mockResolvedValueOnce(buildPatient());
      consultRepo.findOne.mockResolvedValueOnce(null);
      prescriptionRepo.find.mockResolvedValueOnce([]);

      mockHttpPost.mockReturnValueOnce(of({ data: {} }));

      await service.publishConsultation('visit-1', 'fac-1');

      const [, , options] = mockHttpPost.mock.calls[0] as [
        string,
        any,
        { headers: Record<string, string> },
      ];
      expect(options.headers['Authorization']).toBeUndefined();
    });

    it('still returns the bundle even when the HTTP push fails', async () => {
      await buildModule('https://fhir.example.com', '');

      visitRepo.findOne.mockResolvedValueOnce(buildVisit());
      patientRepo.findOne.mockResolvedValueOnce(buildPatient());
      consultRepo.findOne.mockResolvedValueOnce(null);
      prescriptionRepo.find.mockResolvedValueOnce([]);

      mockHttpPost.mockReturnValueOnce(
        throwError(() => new Error('Network error')),
      );

      const bundle = await service.publishConsultation('visit-1', 'fac-1');

      expect(bundle.resourceType).toBe('Bundle');
    });
  });

  // ─── publishDischarge ─────────────────────────────────────────────────────────

  describe('publishDischarge()', () => {
    it('throws when the admission is not found', async () => {
      admissionRepo.findOne.mockResolvedValueOnce(null);

      await expect(
        service.publishDischarge('adm-999', 'fac-1'),
      ).rejects.toThrow('Admission not found');
    });

    it('returns a FHIR Bundle containing Patient and Encounter entries', async () => {
      admissionRepo.findOne.mockResolvedValueOnce(buildAdmission());
      patientRepo.findOne.mockResolvedValueOnce(buildPatient());
      dischargeRepo.findOne.mockResolvedValueOnce(buildDischargeSummary());

      const bundle = await service.publishDischarge('adm-1', 'fac-1');
      const types: string[] = bundle.entry.map(
        (e: any) => e.resource.resourceType,
      );

      expect(bundle.resourceType).toBe('Bundle');
      expect(types).toContain('Patient');
      expect(types).toContain('Encounter');
    });

    it('includes a Composition entry when a discharge summary exists', async () => {
      admissionRepo.findOne.mockResolvedValueOnce(buildAdmission());
      patientRepo.findOne.mockResolvedValueOnce(buildPatient());
      dischargeRepo.findOne.mockResolvedValueOnce(buildDischargeSummary());

      const bundle = await service.publishDischarge('adm-1', 'fac-1');
      const types: string[] = bundle.entry.map(
        (e: any) => e.resource.resourceType,
      );

      expect(types).toContain('Composition');
    });

    it('omits Composition when no discharge summary exists', async () => {
      admissionRepo.findOne.mockResolvedValueOnce(buildAdmission());
      patientRepo.findOne.mockResolvedValueOnce(buildPatient());
      dischargeRepo.findOne.mockResolvedValueOnce(null);

      const bundle = await service.publishDischarge('adm-1', 'fac-1');
      const types: string[] = bundle.entry.map(
        (e: any) => e.resource.resourceType,
      );

      expect(types).not.toContain('Composition');
    });

    it('does NOT call HttpService when FHIR_BASE_URL is empty', async () => {
      admissionRepo.findOne.mockResolvedValueOnce(buildAdmission());
      patientRepo.findOne.mockResolvedValueOnce(buildPatient());
      dischargeRepo.findOne.mockResolvedValueOnce(null);

      await service.publishDischarge('adm-1', 'fac-1');

      expect(mockHttpPost).not.toHaveBeenCalled();
    });

    it('POSTs the bundle when FHIR_BASE_URL is configured', async () => {
      await buildModule('https://fhir.example.com', '');

      admissionRepo.findOne.mockResolvedValueOnce(buildAdmission());
      patientRepo.findOne.mockResolvedValueOnce(buildPatient());
      dischargeRepo.findOne.mockResolvedValueOnce(null);

      mockHttpPost.mockReturnValueOnce(of({ data: {} }));

      await service.publishDischarge('adm-1', 'fac-1');

      expect(mockHttpPost).toHaveBeenCalledTimes(1);
      const [url] = mockHttpPost.mock.calls[0] as [string, ...any[]];
      expect(url).toBe('https://fhir.example.com/Bundle');
    });
  });

  // ─── publishPrescription ──────────────────────────────────────────────────────

  describe('publishPrescription()', () => {
    it('throws when the prescription is not found', async () => {
      prescriptionRepo.findOne.mockResolvedValueOnce(null);

      await expect(
        service.publishPrescription('rx-999', 'fac-1'),
      ).rejects.toThrow('Prescription not found');
    });

    it('returns a Bundle containing a MedicationRequest resource', async () => {
      prescriptionRepo.findOne.mockResolvedValueOnce(buildPrescription());
      patientRepo.findOne.mockResolvedValueOnce(buildPatient());

      const bundle = await service.publishPrescription('rx-1', 'fac-1');
      const types: string[] = bundle.entry.map(
        (e: any) => e.resource.resourceType,
      );

      expect(bundle.resourceType).toBe('Bundle');
      expect(types).toContain('MedicationRequest');
    });

    it('includes the Patient resource when a patient is found', async () => {
      prescriptionRepo.findOne.mockResolvedValueOnce(buildPrescription());
      patientRepo.findOne.mockResolvedValueOnce(buildPatient());

      const bundle = await service.publishPrescription('rx-1', 'fac-1');
      const types: string[] = bundle.entry.map(
        (e: any) => e.resource.resourceType,
      );

      expect(types).toContain('Patient');
    });

    it('omits Patient resource when patient is not found', async () => {
      prescriptionRepo.findOne.mockResolvedValueOnce(buildPrescription());
      patientRepo.findOne.mockResolvedValueOnce(null);

      const bundle = await service.publishPrescription('rx-1', 'fac-1');
      const types: string[] = bundle.entry.map(
        (e: any) => e.resource.resourceType,
      );

      expect(types).not.toContain('Patient');
      expect(types).toContain('MedicationRequest');
    });

    it('sets MedicationRequest status "active" for FINALIZED prescription', async () => {
      prescriptionRepo.findOne.mockResolvedValueOnce(
        buildPrescription({ status: 'FINALIZED' }),
      );
      patientRepo.findOne.mockResolvedValueOnce(buildPatient());

      const bundle = await service.publishPrescription('rx-1', 'fac-1');
      const medReq = bundle.entry.find(
        (e: any) => e.resource.resourceType === 'MedicationRequest',
      );

      expect(medReq.resource.status).toBe('active');
    });

    it('sets MedicationRequest status "draft" for non-FINALIZED prescription', async () => {
      prescriptionRepo.findOne.mockResolvedValueOnce(
        buildPrescription({ status: 'PENDING' }),
      );
      patientRepo.findOne.mockResolvedValueOnce(buildPatient());

      const bundle = await service.publishPrescription('rx-1', 'fac-1');
      const medReq = bundle.entry.find(
        (e: any) => e.resource.resourceType === 'MedicationRequest',
      );

      expect(medReq.resource.status).toBe('draft');
    });

    it('does NOT call HttpService when FHIR_BASE_URL is empty', async () => {
      prescriptionRepo.findOne.mockResolvedValueOnce(buildPrescription());
      patientRepo.findOne.mockResolvedValueOnce(buildPatient());

      await service.publishPrescription('rx-1', 'fac-1');

      expect(mockHttpPost).not.toHaveBeenCalled();
    });

    it('persists the FHIR JSON back to the prescription repo', async () => {
      prescriptionRepo.findOne.mockResolvedValueOnce(buildPrescription());
      patientRepo.findOne.mockResolvedValueOnce(buildPatient());

      await service.publishPrescription('rx-1', 'fac-1');

      expect(prescriptionRepo.update).toHaveBeenCalledTimes(1);
      const [id, patch] = prescriptionRepo.update.mock.calls[0] as [
        string,
        Record<string, any>,
      ];
      expect(id).toBe('rx-1');
      expect(patch.fhirMedicationRequestJson).toBeDefined();
      const parsed = JSON.parse(patch.fhirMedicationRequestJson);
      expect(parsed.resourceType).toBe('MedicationRequest');
    });

    it('POSTs to FHIR server and includes Authorization header when token is set', async () => {
      await buildModule('https://fhir.example.com', 'bearer-token');

      prescriptionRepo.findOne.mockResolvedValueOnce(buildPrescription());
      patientRepo.findOne.mockResolvedValueOnce(buildPatient());

      mockHttpPost.mockReturnValueOnce(of({ data: {} }));

      await service.publishPrescription('rx-1', 'fac-1');

      expect(mockHttpPost).toHaveBeenCalledTimes(1);
      const [url, , options] = mockHttpPost.mock.calls[0] as [
        string,
        any,
        { headers: Record<string, string> },
      ];
      expect(url).toContain('/Bundle');
      expect(options.headers['Authorization']).toBe('Bearer bearer-token');
    });
  });

  // ─── buildPatientResource (via bundle entry inspection) ───────────────────────

  describe('Patient resource shape', () => {
    it('includes name, identifier, telecom and birthDate in the Patient entry', async () => {
      visitRepo.findOne.mockResolvedValueOnce(buildVisit());
      patientRepo.findOne.mockResolvedValueOnce(
        buildPatient({ dateOfBirth: '1990-05-15' as any }),
      );
      consultRepo.findOne.mockResolvedValueOnce(null);
      prescriptionRepo.find.mockResolvedValueOnce([]);

      const bundle = await service.publishConsultation('visit-1', 'fac-1');
      const patientEntry = bundle.entry.find(
        (e: any) => e.resource.resourceType === 'Patient',
      );

      expect(patientEntry).toBeDefined();
      const p = patientEntry.resource;
      expect(p.name[0].family).toBe('Kumar');
      expect(p.name[0].given).toContain('Raj');
      expect(p.telecom[0].value).toBe('+919876543210');
      expect(p.birthDate).toBe('1990-05-15');
    });
  });
});
