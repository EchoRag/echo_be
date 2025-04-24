import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('echo_configs')
export class EchoConfig {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'llm_server_url', nullable: false })
  llmServerUrl: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
} 