/**
 * Script de seed pour initialiser la base de données MySQL avec des données de test.
 *
 * Utilisation :
 *   npm run seed           # seed normal
 *   npm run seed:clean     # seed avec nettoyage préalable
 *
 * Prérequis :
 *   - Un fichier .env.agents à la racine avec les identifiants MySQL
 *   - La base de données MySQL doit exister et être accessible
 *   - Redis n'est pas nécessaire (pas de workers BullMQ ici)
 */

import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { randomBytes, createHash } from 'crypto';
import { config } from 'dotenv';
import { resolve } from 'path';

// Charger .env.agents
config({ path: resolve(__dirname, '../.env.agents') });

import { JobRecord } from './agents/entities/job-record.entity';
import { Document }  from './documents/entities/document.entity';
import { OcrResult } from './documents/entities/ocr-result.entity';

import { DocumentStatus } from './documents/enums/document-status.enum';
import { DocumentType } from './documents/enums/document-type.enum';
import { QueueName } from './common/queues/queue-names.enum';

// ── Helpers ───────────────────────────────────────────────

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

// ── Constants ─────────────────────────────────────────────

export const TENANTS = [
  { id: 't-1000001', name: 'Acme Corp' },
  { id: 't-1000002', name: 'Globex Inc' },
  { id: 't-1000003', name: 'Initech' },
];

export const USERS = [
  { id: 'u-1000001', name: 'Alice Dupont', tenantId: 't-1000001' },
  { id: 'u-1000002', name: 'Bob Martin',   tenantId: 't-1000001' },
  { id: 'u-1000003', name: 'Charlie Lee',  tenantId: 't-1000002' },
  { id: 'u-1000004', name: 'Diana Rose',   tenantId: 't-1000002' },
  { id: 'u-1000005', name: 'Eve Johnson',  tenantId: 't-1000003' },
];

const FILE_NAMES = [
  'facture-fournisseur.pdf',
  'contrat-prestation.pdf',
  'cni-jean-durand.png',
  'devis-travaux.pdf',
  'rapport-audit-2025.pdf',
  'facture-energie.pdf',
  'bulletinsalaire-mars.pdf',
  'attestation-assurance.pdf',
  'document-identite.png',
  'bon-commande-1245.pdf',
  'facture-telecom.pdf',
  'contrat-location.pdf',
  'certificat-scolaire.pdf',
  'releve-bancaire.pdf',
  'devis-informatique.pdf',
];

const STATUSES = <const>[
  'RECEIVED', 'OCR_COMPLETED', 'CLASSIFIED', 'INDEXED', 'ARCHIVED',
];

const DOCUMENT_TYPES_LIST = <const>[
  'INVOICE', 'CONTRACT', 'ID_CARD', 'RECEIPT', 'REPORT',
];

const MIME_TYPES: Record<string, string[]> = {
  'pdf': ['application/pdf'],
  'png': ['image/png'],
  'jpg': ['image/jpeg'],
  'tiff': ['image/tiff'],
};

function getMimeType(fileName: string): string {
  const ext = fileName.split('.').pop()?.toLowerCase() ?? 'pdf';
  return pickRandom((MIME_TYPES[ext] ?? MIME_TYPES.pdf) as string[]);
}

// ── Main ──────────────────────────────────────────────────

async function seed(): Promise<void> {
  console.log('🚀 Démarrage du seed...\n');

  // 1. Connexion à MySQL
  const dataSource = new DataSource({
    type: 'mysql',
    host:     process.env.DB_HOST || 'localhost',
    port:     parseInt(process.env.DB_PORT || '3306', 10),
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ged_db',
    entities: [Document, OcrResult, JobRecord],
    synchronize: true, // Crée les tables si elles n'existent pas
    logging: false,
  });

  await dataSource.initialize();
  console.log('✅ Connexion MySQL établie\n');

  const docRepo = dataSource.getRepository(Document);
  const ocrRepo = dataSource.getRepository(OcrResult);
  const jobRepo = dataSource.getRepository(JobRecord);

  // Nettoyage des données existantes (optionnel)
  const clean = process.argv.includes('--clean');
  if (clean) {
    console.log('🧹 Nettoyage des données existantes...');
    await ocrRepo.delete({});
    await jobRepo.delete({});
    await docRepo.delete({});
    console.log('✅ Base nettoyée\n');
  }

  // ── 2. Documents ──────────────────────────────────────

  const DOCUMENTS_COUNT = 50;
  const documents: Record<string, unknown>[] = [];

  console.log(`📄 Création de ${DOCUMENTS_COUNT} documents...`);

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  for (let i = 0; i < DOCUMENTS_COUNT; i++) {
    const docId   = uuidv4();
    const tenant  = pickRandom(TENANTS);
    const user    = pickRandom(USERS.filter((u) => u.tenantId === tenant.id));
    const fileName = pickRandom(FILE_NAMES);
    const mimeType = getMimeType(fileName);
    const docType  = pickRandom(DOCUMENT_TYPES_LIST);
    const status   = pickRandom(STATUSES);
    const createdAt = randomDate(thirtyDaysAgo, now);

    const isClassified = status === 'CLASSIFIED' || status === 'INDEXED' || status === 'ARCHIVED';
    const ext = fileName.split('.').pop() ?? 'pdf';

    documents.push({
      id:                       docId,
      tenantId:                 tenant.id,
      originalName:             fileName,
      mimeType:                 mimeType,
      status:                   status,
      documentType:              isClassified ? docType : undefined,
      filePath:                 `tenants/${tenant.id}/documents/${docId}/original.${ext}`,
      thumbnailPath:            `tenants/${tenant.id}/documents/${docId}/thumbnail.webp`,
      classificationConfidence: isClassified ? parseFloat((0.75 + Math.random() * 0.24).toFixed(2)) : undefined,
      indexed:                  status === 'INDEXED' || status === 'ARCHIVED',
      metadata:                 JSON.stringify({
        department: pickRandom(['Comptabilité', 'RH', 'Juridique', 'Direction', 'IT']),
        reference:  `REF-${randomInt(1000, 9999)}`,
      }),
      uploadedBy: user.id,
      createdAt:  createdAt,
    });
  }

  await docRepo.insert(documents);
  console.log(`✅ ${DOCUMENTS_COUNT} documents insérés\n`);

  // ── 3. OCR Results ────────────────────────────────────

  const INDEXED_DOCS = documents.filter(
    (d) => d.status === 'INDEXED' || d.status === 'ARCHIVED' || d.status === 'CLASSIFIED',
  );

  const ocrRows: Record<string, unknown>[] = [];

  console.log(`🔍 Création de résultats OCR pour ${INDEXED_DOCS.length} documents...`);

  const LOREM_IPSUM =
    'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor ' +
    'incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam quis nostrud ' +
    'exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.';

  for (const doc of INDEXED_DOCS) {
    const pageCount = randomInt(1, 5);
    for (let p = 1; p <= pageCount; p++) {
      const createdAt = doc.createdAt instanceof Date
        ? doc.createdAt.toISOString().split('T')[0]
        : '2025-01-01';
      ocrRows.push({
        documentId: doc.id,
        tenantId:   doc.tenantId,
        pageNumber: p,
        rawText:    `--- Page ${p} ---\n${LOREM_IPSUM}\n\nDate: ${createdAt}\nMontant: ${randomInt(100, 9999)}.${randomInt(0, 99).toString().padStart(2, '0')} EUR`,
        hocrData:   JSON.stringify({ confidence: parseFloat((0.85 + Math.random() * 0.14).toFixed(2)) }),
        language:   'fra',
      });
    }
  }

  if (ocrRows.length > 0) {
    await ocrRepo.insert(ocrRows);
    console.log(`✅ ${ocrRows.length} lignes OCR insérées\n`);
  } else {
    console.log('⚠️  Aucun document indexé, pas de données OCR\n');
  }

  // ── 4. Job Records ────────────────────────────────────

  const JOB_RECORDS_COUNT = 30;
  const jobRows: Record<string, unknown>[] = [];

  console.log(`📋 Création de ${JOB_RECORDS_COUNT} enregistrements de jobs...`);

  const QUEUE_NAMES = Object.values(QueueName);
  const JOB_STATUSES = <const>['completed', 'failed', 'delayed'];

  for (let i = 0; i < JOB_RECORDS_COUNT; i++) {
    const doc           = pickRandom(documents);
    const queueName     = pickRandom(QUEUE_NAMES);
    const status        = pickRandom(JOB_STATUSES);
    const correlationId = uuidv4();
    const createdAt     = randomDate(thirtyDaysAgo, now);

    let jobName = 'unknown';
    switch (queueName) {
      case QueueName.DOCUMENT_INGESTION: jobName = 'ingest'; break;
      case QueueName.OCR_EXTRACTION:     jobName = 'extract'; break;
      case QueueName.CLASSIFICATION:     jobName = 'classify'; break;
      case QueueName.INDEXING:           jobName = 'index'; break;
      case QueueName.NOTIFICATION:       jobName = 'send'; break;
      case QueueName.WORKFLOW_ENGINE:    jobName = 'event'; break;
      case QueueName.ARCHIVE:            jobName = 'batch-archive'; break;
    }

    const failedReasons = [
      'Timeout dépassé',
      'Fichier corrompu',
      'Service temporairement indisponible',
      'Erreur de conversion PDF',
      'Mémoire insuffisante',
    ];

    jobRows.push({
      jobId:         `bull:${queueName}:${uuidv4()}`,
      queueName:     queueName,
      jobName:       jobName,
      data:          JSON.stringify({
        documentId:    doc.id,
        tenantId:      doc.tenantId,
        correlationId,
      }),
      status:        status,
      attemptsMade:  status === 'completed' ? randomInt(1, 3) : randomInt(1, 5),
      correlationId: correlationId,
      failedReason:  status === 'failed' ? pickRandom(failedReasons) : undefined,
      returnValue:   status === 'completed'
        ? JSON.stringify({ pageCount: randomInt(1, 10), duration: randomInt(500, 15000) })
        : undefined,
      createdAt:     createdAt,
    });
  }

  await jobRepo.insert(jobRows);
  console.log(`✅ ${JOB_RECORDS_COUNT} enregistrements de jobs insérés\n`);

  // ── Résumé ────────────────────────────────────────────

  console.log('═══════════════════════════════════════════');
  console.log('📊 RÉSUMÉ DU SEED');
  console.log('═══════════════════════════════════════════');
  console.log(`   Tenants          : ${TENANTS.length}`);
  console.log(`   Utilisateurs     : ${USERS.length}`);
  console.log(`   Documents        : ${documents.length}`);
  console.log(`   Résultats OCR    : ${ocrRows.length}`);
  console.log(`   Enregistrements  : ${jobRows.length}`);
  console.log('═══════════════════════════════════════════\n');

  // ── Fermeture ─────────────────────────────────────────

  await dataSource.destroy();
  console.log('👋 Seed terminé avec succès !');
}

seed().catch((err) => {
  console.error('❌ Erreur lors du seed :', err);
  process.exit(1);
});
