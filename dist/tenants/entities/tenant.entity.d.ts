import { TenantPlan } from '../enums/tenant-plan.enum';
export declare class Tenant {
    id: string;
    name: string;
    slug: string;
    plan: TenantPlan;
    isActive: boolean;
    maxUsers: number;
    maxStorage: number;
    metadata?: Record<string, unknown>;
    createdAt: Date;
    updatedAt: Date;
}
