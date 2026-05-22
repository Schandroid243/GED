import { OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
export interface StoredFile {
    absolutePath: string;
    relativePath: string;
    publicUrl: string;
    sizeBytes: number;
    checksum: string;
}
export declare class LocalStorageService implements OnModuleInit {
    private readonly config;
    private readonly logger;
    private readonly root;
    private readonly archive;
    private readonly publicUrl;
    constructor(config: ConfigService);
    onModuleInit(): Promise<void>;
    store(tempPath: string, tenantId: string, documentId: string, fileName: string): Promise<StoredFile>;
    read(relativePath: string): Promise<Buffer>;
    absolutePath(relativePath: string): string;
    moveToArchive(relativePath: string, tenantId: string, documentId: string, archiveName: string): Promise<string>;
    delete(relativePath: string): Promise<void>;
    deleteDocument(tenantId: string, documentId: string): Promise<void>;
    tenantUsage(tenantId: string): Promise<number>;
    private dirSize;
}
