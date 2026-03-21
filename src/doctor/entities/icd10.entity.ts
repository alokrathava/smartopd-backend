import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from 'typeorm';

@Entity('icd10')
export class Icd10 {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', unique: true })
  code: string;

  @Column({ type: 'varchar' })
  description: string;

  @Column({ type: 'varchar', nullable: true, name: 'category_code' })
  categoryCode: string;

  @Column({ type: 'varchar', nullable: true, name: 'category_description' })
  categoryDescription: string;

  @Column({ type: 'boolean', default: false, name: 'is_common' })
  isCommon: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
