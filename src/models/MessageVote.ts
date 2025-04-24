import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { ConversationMessage } from './ConversationMessage';

@Entity('message_votes',{ synchronize: false })
export class MessageVote {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column('uuid')
    message_id: string;

    @Column('varchar', { length: 255 })
    user_provider_uid: string;

    @Column('varchar', { length: 10 })
    vote_type: 'upvote' | 'downvote';

    @CreateDateColumn({ type: 'timestamp with time zone' })
    created_at: Date;

    @ManyToOne(() => ConversationMessage, message => message.votes)
    message: ConversationMessage;
} 