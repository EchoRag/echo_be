import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Notification } from './notification.model';

@Entity('notification_receipts')
export class NotificationReceipt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'notification_id' })
  notificationId: string;

  @Column({ name: 'user_provider_uid' })
  userProviderUid: string;

  @Column({ default: false })
  isRead: boolean;

  @ManyToOne(() => Notification, notification => notification.receipts)
  @JoinColumn({ name: 'notification_id' })
  notification: Notification;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'read_at', nullable: true })
  readAt: Date;
} 