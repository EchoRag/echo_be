import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Project } from './project.model';

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

  @ManyToOne(() => Project, (project) => project.documents)
  @JoinColumn({ name: 'project_id' })
  project: Project;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
} 