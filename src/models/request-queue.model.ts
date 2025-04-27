import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('request_queues')
export class RequestQueue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_provider_uid' })
  userProviderUid: string;

  @Column({ type: 'jsonb' })
  request: {
    prompt: string;
    model: string;
    max_tokens: number;
    temperature: number;
    conversation_id: string;
  };

  @Column({ name: 'auth_header' })
  authHeader: string;

  @Column({ name: 'status', default: 'pending' })
  status: 'pending' | 'processing' | 'completed' | 'failed';

  @Column({ name: 'retry_count', default: 0 })
  retryCount: number;

  @Column({ name: 'last_error', nullable: true })
  lastError: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
} 