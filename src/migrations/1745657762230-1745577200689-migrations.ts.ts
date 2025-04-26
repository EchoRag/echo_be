import { MigrationInterface, QueryRunner } from "typeorm";

export class Migration1745577200689 implements MigrationInterface {
    name = '1745577200689Migrations.ts1745657762230'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."documents_status_enum" RENAME TO "documents_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."documents_status_enum" AS ENUM('pending', 'processing', 'processed', 'error', 'failed')`);
        await queryRunner.query(`ALTER TABLE "documents" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "documents" ALTER COLUMN "status" TYPE "public"."documents_status_enum" USING "status"::"text"::"public"."documents_status_enum"`);
        await queryRunner.query(`ALTER TABLE "documents" ALTER COLUMN "status" SET DEFAULT 'pending'`);
        await queryRunner.query(`DROP TYPE "public"."documents_status_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."documents_status_enum_old" AS ENUM('pending', 'processed', 'error')`);
        await queryRunner.query(`ALTER TABLE "documents" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "documents" ALTER COLUMN "status" TYPE "public"."documents_status_enum_old" USING "status"::"text"::"public"."documents_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "documents" ALTER COLUMN "status" SET DEFAULT 'pending'`);
        await queryRunner.query(`DROP TYPE "public"."documents_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."documents_status_enum_old" RENAME TO "documents_status_enum"`);
    }

}
