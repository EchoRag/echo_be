import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Project } from './project.model';

export enum DocumentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  PROCESSED = 'processed',
  ERROR = 'error',
  FAILED = 'failed'
}

@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  fileName: string;

  @Column()
  filePath: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ name: 'is_call_recording', default: false })
  isCallRecording: boolean;

  @Column({ name: 'is_call_transcript', default: false })
  isCallTranscript: boolean;

  @Column({
    type: 'enum',
    enum: DocumentStatus,
    default: DocumentStatus.PENDING
  })
  status: DocumentStatus;

  @Column({ name: 'error_description', type: 'text', nullable: true })
  errorDescription: string;

  @ManyToOne(() => Project, (project) => project.documents)
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
} 