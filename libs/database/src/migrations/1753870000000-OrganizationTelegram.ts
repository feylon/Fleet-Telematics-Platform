import { MigrationInterface, QueryRunner } from 'typeorm';

export class OrganizationTelegram1753870000000 implements MigrationInterface {
  name = 'OrganizationTelegram1753870000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "telegramChatId" varchar(64)`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "organizations" DROP COLUMN IF EXISTS "telegramChatId"`);
  }
}
