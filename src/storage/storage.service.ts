import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

export interface StoredFile {
  absolutePath: string;   // chemin absolu sur le disque
  relativePath: string;   // chemin relatif depuis LOCAL_STORAGE_ROOT (utilisé comme "clé")
  publicUrl:    string;   // URL servie par l'API pour le frontend
  sizeBytes:    number;
  checksum:     string;   // SHA-256 hex
}

@Injectable()
export class LocalStorageService implements OnModuleInit {
  private readonly logger = new Logger(LocalStorageService.name);
  private readonly root:      string;
  private readonly archive:   string;
  private readonly publicUrl: string;

  constructor(private readonly config: ConfigService) {
    this.root      = config.get<string>('LOCAL_STORAGE_ROOT')!;
    this.archive   = config.get<string>('LOCAL_STORAGE_ARCHIVE')!;
    this.publicUrl = config.get<string>('LOCAL_STORAGE_PUBLIC_URL')!;
  }

  /** Crée les répertoires racines au démarrage si absents */
  async onModuleInit(): Promise<void> {
    await fs.mkdir(this.root,    { recursive: true });
    await fs.mkdir(this.archive, { recursive: true });
    this.logger.log(`Stockage local initialisé : ${this.root}`);
  }

  /**
   * Copie un fichier temporaire vers le stockage permanent.
   * @param tempPath  Chemin absolu du fichier temporaire (ex: /tmp/uploads/abc.pdf)
   * @param tenantId  UUID du tenant
   * @param documentId UUID du document
   * @param fileName  Nom du fichier de destination (ex: 'original.pdf')
   */
  async store(
    tempPath:   string,
    tenantId:   string,
    documentId: string,
    fileName:   string,
  ): Promise<StoredFile> {
    const relativePath = path.join('tenants', tenantId, 'documents', documentId, fileName);
    const absolutePath = path.join(this.root, relativePath);

    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.copyFile(tempPath, absolutePath);

    const stats    = await fs.stat(absolutePath);
    const buffer   = await fs.readFile(absolutePath);
    const checksum = crypto.createHash('sha256').update(buffer).digest('hex');

    return {
      absolutePath,
      relativePath,
      publicUrl: `${this.publicUrl}/${relativePath.replace(/\\/g, '/')}`,
      sizeBytes: stats.size,
      checksum,
    };
  }

  /** Lit un fichier et retourne son contenu en Buffer */
  async read(relativePath: string): Promise<Buffer> {
    const absolutePath = path.join(this.root, relativePath);
    return fs.readFile(absolutePath);
  }

  /** Retourne le chemin absolu (pour les traitements CLI : Tesseract, Ghostscript) */
  absolutePath(relativePath: string): string {
    return path.join(this.root, relativePath);
  }

  /**
   * Déplace un fichier vers le stockage d'archive.
   * @param relativePath Chemin relatif depuis LOCAL_STORAGE_ROOT
   * @param tenantId     UUID du tenant
   * @param documentId   UUID du document
   * @param archiveName  Nom du fichier archivé (ex: 'archive.pdf')
   * @returns Le chemin absolu de destination
   */
  async moveToArchive(
    relativePath: string,
    tenantId:     string,
    documentId:   string,
    archiveName:  string,
  ): Promise<string> {
    const src  = path.join(this.root, relativePath);
    const dest = path.join(this.archive, 'tenants', tenantId, documentId, archiveName);

    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.rename(src, dest);
    return dest;
  }

  /** Supprime un fichier du stockage permanent */
  async delete(relativePath: string): Promise<void> {
    const absolutePath = path.join(this.root, relativePath);
    await fs.unlink(absolutePath).catch(() => {
      this.logger.warn(`Fichier déjà absent : ${absolutePath}`);
    });
  }

  /** Supprime tous les fichiers d'un document (dossier récursif) */
  async deleteDocument(tenantId: string, documentId: string): Promise<void> {
    const dir = path.join(this.root, 'tenants', tenantId, 'documents', documentId);
    await fs.rm(dir, { recursive: true, force: true });
  }

  /** Taille totale occupée par un tenant (bytes) */
  async tenantUsage(tenantId: string): Promise<number> {
    const dir = path.join(this.root, 'tenants', tenantId);
    return this.dirSize(dir);
  }

  /** Calcule récursivement la taille d'un répertoire en bytes */
  private async dirSize(dir: string): Promise<number> {
    let total = 0;
    try {
      for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
        const entryPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          total += await this.dirSize(entryPath);
        } else {
          const stat = await fs.stat(entryPath);
          total += stat.size;
        }
      }
    } catch {
      // Répertoire absent = taille 0
    }
    return total;
  }
}
