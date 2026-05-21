import {
  Entity, PrimaryColumn, Column, UpdateDateColumn, Index,
} from 'typeorm';
import { DocumentStatus } from '../enums/document-status.enum';
import { DocumentType } from '../enums/document-type.enum';

// Ne lister que les champs utilisés par les agents — l'entité complète est gérée par l'API
@Entity('documents')
export class Document {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string;                           // UUID

  @Column({ type: 'varchar', length: 36 })
  tenantId: string;

  @Column({ type: 'varchar', length: 255 })
  originalName: string;

  @Column({ type: 'varchar', length: 100 })
  mimeType: string;

  @Column({
    type: 'enum',
    enum: DocumentStatus,
    default: DocumentStatus.UPLOADING,
  })
  status: DocumentStatus;

  @Column({
    type: 'enum',
    enum: DocumentType,
    nullable: true,
  })
  documentType?: DocumentType;

  @Column({ type: 'varchar', length: 255, nullable: true })
  filePath?: string;                    // chemin relatif depuis LOCAL_STORAGE_ROOT

  @Column({ type: 'varchar', length: 255, nullable: true })
  thumbnailPath?: string;

  @Column({ type: 'float', nullable: true })
  classificationConfidence?: number;

  @Column({ type: 'boolean', default: false })
  indexed: boolean;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, string>;

  @Column({ type: 'varchar', length: 36 })
  uploadedBy: string;                   // UUID utilisateur

  @Column({ type: 'datetime', nullable: true })
  createdAt?: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
