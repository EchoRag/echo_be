import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { User } from './user.model';
import { ConversationMessage } from './conversation-message.model';

@Entity('conversations', { synchronize: false })
export class Conversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_provider_uid' })
  userProviderUid: string;

  @ManyToOne(() => User, (user) => user.conversations)
  @JoinColumn({ name: 'user_provider_uid', referencedColumnName: 'providerUid' })
  user: User;

  @OneToMany(() => ConversationMessage, (message) => message.conversation)
  messages: ConversationMessage[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
} 