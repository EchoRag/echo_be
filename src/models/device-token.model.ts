import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('device_tokens')
export class DeviceToken {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_provider_uid' })
  userProviderUid: string;

  @Column({ name: 'fcm_token' })
  fcmToken: string;

  @Column({ name: 'device_type', nullable: true })
  deviceType?: string;

  @Column({ name: 'device_id', nullable: true })
  deviceId?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
} 