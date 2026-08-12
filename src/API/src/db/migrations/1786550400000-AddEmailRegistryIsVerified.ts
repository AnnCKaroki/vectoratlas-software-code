import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEmailRegistryIsVerified1786550400000
  implements MigrationInterface
{
  name = 'AddEmailRegistryIsVerified1786550400000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "email_registry" ADD "is_verified" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "email_registry" DROP COLUMN "is_verified"`,
    );
  }
}
