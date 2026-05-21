import {
  Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index,
} from 'typeorm';

@Entity('ocr_results')
@Index(['documentId'])
export class OcrResult {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 36 })
  documentId: string;

  @Column({ type: 'varchar', length: 36 })
  tenantId: string;

  @Column({ type: 'int' })
  pageNumber: number;

  @Column({ type: 'longtext' })
  rawText: string;

  @Column({ type: 'json', nullable: true })
  hocrData?: Record<string, unknown>;  // structure hOCR (positions des mots)

  @Column({ type: 'varchar', length: 10, default: 'fra' })
  language: string;                     // code ISO 639-2

  @CreateDateColumn()
  createdAt: Date;
}
