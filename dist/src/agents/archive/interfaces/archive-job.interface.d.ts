export interface ArchiveJobData {
    tenantId: string;
    documentIds: string[];
    archiveProfile: string;
    correlationId: string;
    signElectronically?: boolean;
}
