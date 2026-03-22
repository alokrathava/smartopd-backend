import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

export enum PaymentMode {
  CASH = 'CASH',
  UPI = 'UPI',
  CARD = 'CARD',
  NEFT = 'NEFT',
  INSURANCE = 'INSURANCE',
  WAIVED = 'WAIVED',
}

export enum TransactionStatus {
  INITIATED = 'INITIATED',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

@Entity('payment_transactions')
export class PaymentTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', name: 'facility_id' })
  facilityId: string;

  @Column({ type: 'varchar', name: 'bill_id' })
  billId: string;

  @Column({ type: 'varchar', name: 'patient_id' })
  patientId: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'enum', enum: PaymentMode, name: 'payment_mode' })
  paymentMode: PaymentMode;

  @Column({ type: 'varchar', nullable: true, name: 'upi_transaction_id' })
  upiTransactionId: string;

  @Column({ type: 'varchar', nullable: true, name: 'upi_ref_number' })
  upiRefNumber: string;

  @Column({ type: 'varchar', nullable: true, name: 'card_last4' })
  cardLast4: string;

  @Column({ type: 'varchar', nullable: true, name: 'payment_gateway' })
  paymentGateway: string;

  @Column({ type: 'varchar', nullable: true, name: 'gateway_transaction_id' })
  gatewayTransactionId: string;

  @Column({ type: 'text', nullable: true, name: 'gateway_response' })
  gatewayResponse: string;

  @Column({
    type: 'enum',
    enum: TransactionStatus,
    default: TransactionStatus.INITIATED,
  })
  status: TransactionStatus;

  @Column({ type: 'datetime', nullable: true, name: 'paid_at' })
  paidAt: Date;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'varchar', name: 'received_by_id' })
  receivedById: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
