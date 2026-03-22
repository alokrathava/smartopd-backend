import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../common/base/base.entity';

@Entity('discharge_summaries')
export class DischargeSummary extends BaseEntity {
  @Column() admissionId: string;
  @Column() patientId: string;
  @Column() dischargedById: string;
  @Column({ type: 'text', nullable: true }) finalDiagnosis?: string;
  @Column({ type: 'text', nullable: true }) hospitalCourse?: string;
  @Column({ type: 'text', nullable: true }) proceduresPerformed?: string;
  @Column({ type: 'text', nullable: true }) medicationsOnDischarge?: string;
  @Column({ type: 'text', nullable: true }) dischargeInstructions?: string;
  @Column({ nullable: true }) followUpDate?: string;
  @Column({ nullable: true }) followUpDoctor?: string;
  @Column({ nullable: true }) followUpNotes?: string;
  @Column({ type: 'text', nullable: true }) fhirSummaryJson?: string;
  @Column({ type: 'smallint', nullable: true }) lengthOfStayDays?: number;
}
