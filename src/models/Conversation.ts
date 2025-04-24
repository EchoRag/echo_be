import { Entity, PrimaryGeneratedColumn, Column, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ConversationMessage } from './ConversationMessage';

@Entity('conversations',{ synchronize: false })
export class Conversation {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('varchar', { length: 255 })
    user_provider_uid: string;

    @CreateDateColumn({ type: 'timestamp with time zone' })
    created_at: Date;

    @UpdateDateColumn({ type: 'timestamp with time zone' })
    updated_at: Date;

    @OneToMany(() => ConversationMessage, message => message.conversation)
    messages: ConversationMessage[];
} 