import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class CreateTenantsAndUsers1700000000000 implements MigrationInterface {
  name = 'CreateTenantsAndUsers1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // A) Table tenants
    await queryRunner.createTable(
      new Table({
        name: 'tenants',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            isNullable: false,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'slug',
            type: 'varchar',
            length: '100',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'plan',
            type: 'enum',
            enum: ['FREE', 'PRO', 'ENTERPRISE'],
            default: `'FREE'`,
            isNullable: false,
          },
          {
            name: 'isActive',
            type: 'tinyint',
            length: '1',
            default: 1,
            isNullable: false,
          },
          {
            name: 'maxUsers',
            type: 'int',
            default: 5,
            isNullable: false,
          },
          {
            name: 'maxStorage',
            type: 'bigint',
            default: 5368709120,
            isNullable: false,
          },
          {
            name: 'metadata',
            type: 'json',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'datetime',
            precision: 6,
            default: 'CURRENT_TIMESTAMP(6)',
            isNullable: false,
          },
          {
            name: 'updatedAt',
            type: 'datetime',
            precision: 6,
            default: 'CURRENT_TIMESTAMP(6)',
            onUpdate: 'CURRENT_TIMESTAMP(6)',
            isNullable: false,
          },
        ],
        engine: 'InnoDB',
      }),
      true,
    );

    // B) Table users
    await queryRunner.createTable(
      new Table({
        name: 'users',
        columns: [
          {
            name: 'id',
            type: 'varchar',
            length: '36',
            isPrimary: true,
            isNullable: false,
          },
          {
            name: 'tenantId',
            type: 'varchar',
            length: '36',
            isNullable: false,
          },
          {
            name: 'email',
            type: 'varchar',
            length: '255',
            isNullable: false,
            isUnique: true,
          },
          {
            name: 'passwordHash',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'firstName',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'lastName',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'role',
            type: 'enum',
            enum: ['OWNER', 'ADMIN', 'EDITOR', 'VIEWER'],
            default: `'VIEWER'`,
            isNullable: false,
          },
          {
            name: 'isActive',
            type: 'tinyint',
            length: '1',
            default: 1,
            isNullable: false,
          },
          {
            name: 'lastLoginAt',
            type: 'datetime',
            isNullable: true,
          },
          {
            name: 'refreshToken',
            type: 'varchar',
            length: '500',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'datetime',
            precision: 6,
            default: 'CURRENT_TIMESTAMP(6)',
            isNullable: false,
          },
          {
            name: 'updatedAt',
            type: 'datetime',
            precision: 6,
            default: 'CURRENT_TIMESTAMP(6)',
            onUpdate: 'CURRENT_TIMESTAMP(6)',
            isNullable: false,
          },
        ],
        engine: 'InnoDB',
      }),
      true,
    );

    // C) Index supplémentaires

    // Index sur users(tenantId)
    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'idx_users_tenantId',
        columnNames: ['tenantId'],
      }),
    );

    // Index unique sur users(tenantId, email)
    await queryRunner.createIndex(
      'users',
      new TableIndex({
        name: 'idx_users_tenant_email',
        columnNames: ['tenantId', 'email'],
        isUnique: true,
      }),
    );

    // D) Foreign Key : users.tenantId → tenants.id
    await queryRunner.createForeignKey(
      'users',
      new TableForeignKey({
        name: 'fk_users_tenant',
        columnNames: ['tenantId'],
        referencedColumnNames: ['id'],
        referencedTableName: 'tenants',
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Supprimer la foreign key d'abord
    const usersTable = await queryRunner.getTable('users');
    if (usersTable) {
      const foreignKey = usersTable.foreignKeys.find((fk) => fk.name === 'fk_users_tenant');
      if (foreignKey) {
        await queryRunner.dropForeignKey('users', foreignKey);
      }
    }

    // Supprimer les index
    await queryRunner.dropIndex('users', 'idx_users_tenant_email').catch(() => {});
    await queryRunner.dropIndex('users', 'idx_users_tenantId').catch(() => {});

    // Supprimer les tables dans l'ordre inverse
    await queryRunner.dropTable('users', true);
    await queryRunner.dropTable('tenants', true);
  }
}
