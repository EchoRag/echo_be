import { AppDataSource } from '../config/database';
import { MessageVote } from '../models/MessageVote';
import { ConversationMessage } from '../models/ConversationMessage';

export class VoteService {
    private voteRepository = AppDataSource.getRepository(MessageVote);

    async voteMessage(messageId: string, userProviderUid: string, voteType: 'upvote' | 'downvote'): Promise<{ upvotes: number; downvotes: number }> {
        const queryRunner = AppDataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            const existingVote = await this.voteRepository.findOne({
                where: { message_id: messageId, user_provider_uid: userProviderUid }
            });

            if (existingVote) {
                if (existingVote.vote_type === voteType) {
                    // Remove vote
                    await queryRunner.manager.remove(existingVote);
                    await queryRunner.manager.update(ConversationMessage, messageId, {
                        [voteType === 'upvote' ? 'upvotes' : 'downvotes']: () => `${voteType === 'upvote' ? 'upvotes' : 'downvotes'} - 1`
                    });
                } else {
                    // Change vote
                    existingVote.vote_type = voteType;
                    await queryRunner.manager.save(existingVote);
                    await queryRunner.manager.update(ConversationMessage, messageId, {
                        upvotes: () => voteType === 'upvote' ? 'upvotes + 1' : 'upvotes - 1',
                        downvotes: () => voteType === 'downvote' ? 'downvotes + 1' : 'downvotes - 1'
                    });
                }
            } else {
                // New vote
                const newVote = this.voteRepository.create({
                    message_id: messageId,
                    user_provider_uid: userProviderUid,
                    vote_type: voteType
                });
                await queryRunner.manager.save(newVote);
                await queryRunner.manager.update(ConversationMessage, messageId, {
                    [voteType === 'upvote' ? 'upvotes' : 'downvotes']: () => `${voteType === 'upvote' ? 'upvotes' : 'downvotes'} + 1`
                });
            }

            const updatedMessage = await queryRunner.manager.findOne(ConversationMessage, {
                where: { id: messageId }
            });

            await queryRunner.commitTransaction();

            return {
                upvotes: updatedMessage?.upvotes || 0,
                downvotes: updatedMessage?.downvotes || 0
            };
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }
} 