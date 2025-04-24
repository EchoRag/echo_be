import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn } from 'typeorm';
import { Conversation } from './Conversation';
import { MessageVote } from './MessageVote';

@Entity('conversation_messages',{ synchronize: false })
export class ConversationMessage {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('uuid')
    conversation_id: string;

    @Column('varchar', { length: 10 })
    role: string;

    @Column('text')
    content: string;

    @Column('integer', { default: 0 })
    upvotes: number;

    @Column('integer', { default: 0 })
    downvotes: number;

    @CreateDateColumn({ type: 'timestamp with time zone' })
    created_at: Date;

    @ManyToOne(() => Conversation, conversation => conversation.messages)
    conversation: Conversation;

    @OneToMany(() => MessageVote, vote => vote.message)
    votes: MessageVote[];
} 