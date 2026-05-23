import { UserRole } from '../enums/user-role.enum';
import { Tenant } from '../../tenants/entities/tenant.entity';
export declare class User {
    id: string;
    tenantId: string;
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    role: UserRole;
    isActive: boolean;
    lastLoginAt?: Date;
    refreshToken?: string;
    createdAt: Date;
    updatedAt: Date;
    tenant: Promise<Tenant>;
    toPublic(): Omit<User, 'passwordHash' | 'refreshToken' | 'tenant' | 'toPublic'>;
}
