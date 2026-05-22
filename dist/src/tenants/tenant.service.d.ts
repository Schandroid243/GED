export interface TenantConfig {
    id: string;
    name: string;
    locale: string;
    timezone: string;
    features: {
        ocrEnabled: boolean;
        mlClassification: boolean;
        archiveEnabled: boolean;
    };
    retentionDays: number;
}
export declare class TenantService {
    private readonly logger;
    getConfig(tenantId: string): Promise<TenantConfig | null>;
    isActive(tenantId: string): Promise<boolean>;
}
