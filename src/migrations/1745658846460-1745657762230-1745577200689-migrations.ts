import { MigrationInterface, QueryRunner } from "typeorm";

export class Migrations17456577622301745577200689 implements MigrationInterface {
    name = 'Migrations17456577622301745577200689';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "message_votes" DROP CONSTRAINT "message_votes_message_id_fkey"`);
        await queryRunner.query(`ALTER TABLE "message_votes" DROP CONSTRAINT "message_votes_vote_type_check"`);
        await queryRunner.query(`ALTER TABLE "message_votes" DROP CONSTRAINT "message_votes_message_id_user_provider_uid_key"`);
        await queryRunner.query(`ALTER TABLE "message_votes" ADD "messageId" uuid`);
        await queryRunner.query(`ALTER TABLE "message_votes" ALTER COLUMN "message_id" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "message_votes" ALTER COLUMN "created_at" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "message_votes" ALTER COLUMN "created_at" SET DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "message_votes" ADD CONSTRAINT "FK_76b70946e9aed86b2e805b0537f" FOREIGN KEY ("messageId") REFERENCES "conversation_messages"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "message_votes" DROP CONSTRAINT "FK_76b70946e9aed86b2e805b0537f"`);
        await queryRunner.query(`ALTER TABLE "message_votes" ALTER COLUMN "created_at" SET DEFAULT CURRENT_TIMESTAMP`);
        await queryRunner.query(`ALTER TABLE "message_votes" ALTER COLUMN "created_at" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "message_votes" ALTER COLUMN "message_id" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "message_votes" DROP COLUMN "messageId"`);
        await queryRunner.query(`ALTER TABLE "message_votes" ADD CONSTRAINT "message_votes_message_id_user_provider_uid_key" UNIQUE ("message_id", "user_provider_uid")`);
        await queryRunner.query(`ALTER TABLE "message_votes" ADD CONSTRAINT "message_votes_vote_type_check" CHECK (((vote_type)::text = ANY ((ARRAY['upvote'::character varying, 'downvote'::character varying])::text[])))`);
        await queryRunner.query(`ALTER TABLE "message_votes" ADD CONSTRAINT "message_votes_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "conversation_messages"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
