"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.USERS = exports.TENANTS = void 0;
require("reflect-metadata");
const typeorm_1 = require("typeorm");
const uuid_1 = require("uuid");
const dotenv_1 = require("dotenv");
const path_1 = require("path");
(0, dotenv_1.config)({ path: (0, path_1.resolve)(__dirname, '../.env.agents') });
const job_record_entity_1 = require("./agents/entities/job-record.entity");
const document_entity_1 = require("./documents/entities/document.entity");
const ocr_result_entity_1 = require("./documents/entities/ocr-result.entity");
const queue_names_enum_1 = require("./common/queues/queue-names.enum");
function randomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function randomDate(start, end) {
    return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}
function pickRandom(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}
exports.TENANTS = [
    { id: 't-1000001', name: 'Acme Corp' },
    { id: 't-1000002', name: 'Globex Inc' },
    { id: 't-1000003', name: 'Initech' },
];
exports.USERS = [
    { id: 'u-1000001', name: 'Alice Dupont', tenantId: 't-1000001' },
    { id: 'u-1000002', name: 'Bob Martin', tenantId: 't-1000001' },
    { id: 'u-1000003', name: 'Charlie Lee', tenantId: 't-1000002' },
    { id: 'u-1000004', name: 'Diana Rose', tenantId: 't-1000002' },
    { id: 'u-1000005', name: 'Eve Johnson', tenantId: 't-1000003' },
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
const STATUSES = [
    'RECEIVED', 'OCR_COMPLETED', 'CLASSIFIED', 'INDEXED', 'ARCHIVED',
];
const DOCUMENT_TYPES_LIST = [
    'INVOICE', 'CONTRACT', 'ID_CARD', 'RECEIPT', 'REPORT',
];
const MIME_TYPES = {
    'pdf': ['application/pdf'],
    'png': ['image/png'],
    'jpg': ['image/jpeg'],
    'tiff': ['image/tiff'],
};
function getMimeType(fileName) {
    const ext = fileName.split('.').pop()?.toLowerCase() ?? 'pdf';
    return pickRandom((MIME_TYPES[ext] ?? MIME_TYPES.pdf));
}
async function seed() {
    console.log('🚀 Démarrage du seed...\n');
    const dataSource = new typeorm_1.DataSource({
        type: 'mysql',
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '3306', 10),
        username: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'ged_db',
        entities: [document_entity_1.Document, ocr_result_entity_1.OcrResult, job_record_entity_1.JobRecord],
        synchronize: true,
        logging: false,
    });
    await dataSource.initialize();
    console.log('✅ Connexion MySQL établie\n');
    const docRepo = dataSource.getRepository(document_entity_1.Document);
    const ocrRepo = dataSource.getRepository(ocr_result_entity_1.OcrResult);
    const jobRepo = dataSource.getRepository(job_record_entity_1.JobRecord);
    const clean = process.argv.includes('--clean');
    if (clean) {
        console.log('🧹 Nettoyage des données existantes...');
        await ocrRepo.delete({});
        await jobRepo.delete({});
        await docRepo.delete({});
        console.log('✅ Base nettoyée\n');
    }
    const DOCUMENTS_COUNT = 50;
    const documents = [];
    console.log(`📄 Création de ${DOCUMENTS_COUNT} documents...`);
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    for (let i = 0; i < DOCUMENTS_COUNT; i++) {
        const docId = (0, uuid_1.v4)();
        const tenant = pickRandom(exports.TENANTS);
        const user = pickRandom(exports.USERS.filter((u) => u.tenantId === tenant.id));
        const fileName = pickRandom(FILE_NAMES);
        const mimeType = getMimeType(fileName);
        const docType = pickRandom(DOCUMENT_TYPES_LIST);
        const status = pickRandom(STATUSES);
        const createdAt = randomDate(thirtyDaysAgo, now);
        const isClassified = status === 'CLASSIFIED' || status === 'INDEXED' || status === 'ARCHIVED';
        const ext = fileName.split('.').pop() ?? 'pdf';
        documents.push({
            id: docId,
            tenantId: tenant.id,
            originalName: fileName,
            mimeType: mimeType,
            status: status,
            documentType: isClassified ? docType : undefined,
            filePath: `tenants/${tenant.id}/documents/${docId}/original.${ext}`,
            thumbnailPath: `tenants/${tenant.id}/documents/${docId}/thumbnail.webp`,
            classificationConfidence: isClassified ? parseFloat((0.75 + Math.random() * 0.24).toFixed(2)) : undefined,
            indexed: status === 'INDEXED' || status === 'ARCHIVED',
            metadata: JSON.stringify({
                department: pickRandom(['Comptabilité', 'RH', 'Juridique', 'Direction', 'IT']),
                reference: `REF-${randomInt(1000, 9999)}`,
            }),
            uploadedBy: user.id,
            createdAt: createdAt,
        });
    }
    await docRepo.insert(documents);
    console.log(`✅ ${DOCUMENTS_COUNT} documents insérés\n`);
    const INDEXED_DOCS = documents.filter((d) => d.status === 'INDEXED' || d.status === 'ARCHIVED' || d.status === 'CLASSIFIED');
    const ocrRows = [];
    console.log(`🔍 Création de résultats OCR pour ${INDEXED_DOCS.length} documents...`);
    const LOREM_IPSUM = 'Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor ' +
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
                tenantId: doc.tenantId,
                pageNumber: p,
                rawText: `--- Page ${p} ---\n${LOREM_IPSUM}\n\nDate: ${createdAt}\nMontant: ${randomInt(100, 9999)}.${randomInt(0, 99).toString().padStart(2, '0')} EUR`,
                hocrData: JSON.stringify({ confidence: parseFloat((0.85 + Math.random() * 0.14).toFixed(2)) }),
                language: 'fra',
            });
        }
    }
    if (ocrRows.length > 0) {
        await ocrRepo.insert(ocrRows);
        console.log(`✅ ${ocrRows.length} lignes OCR insérées\n`);
    }
    else {
        console.log('⚠️  Aucun document indexé, pas de données OCR\n');
    }
    const JOB_RECORDS_COUNT = 30;
    const jobRows = [];
    console.log(`📋 Création de ${JOB_RECORDS_COUNT} enregistrements de jobs...`);
    const QUEUE_NAMES = Object.values(queue_names_enum_1.QueueName);
    const JOB_STATUSES = ['completed', 'failed', 'delayed'];
    for (let i = 0; i < JOB_RECORDS_COUNT; i++) {
        const doc = pickRandom(documents);
        const queueName = pickRandom(QUEUE_NAMES);
        const status = pickRandom(JOB_STATUSES);
        const correlationId = (0, uuid_1.v4)();
        const createdAt = randomDate(thirtyDaysAgo, now);
        let jobName = 'unknown';
        switch (queueName) {
            case queue_names_enum_1.QueueName.DOCUMENT_INGESTION:
                jobName = 'ingest';
                break;
            case queue_names_enum_1.QueueName.OCR_EXTRACTION:
                jobName = 'extract';
                break;
            case queue_names_enum_1.QueueName.CLASSIFICATION:
                jobName = 'classify';
                break;
            case queue_names_enum_1.QueueName.INDEXING:
                jobName = 'index';
                break;
            case queue_names_enum_1.QueueName.NOTIFICATION:
                jobName = 'send';
                break;
            case queue_names_enum_1.QueueName.WORKFLOW_ENGINE:
                jobName = 'event';
                break;
            case queue_names_enum_1.QueueName.ARCHIVE:
                jobName = 'batch-archive';
                break;
        }
        const failedReasons = [
            'Timeout dépassé',
            'Fichier corrompu',
            'Service temporairement indisponible',
            'Erreur de conversion PDF',
            'Mémoire insuffisante',
        ];
        jobRows.push({
            jobId: `bull:${queueName}:${(0, uuid_1.v4)()}`,
            queueName: queueName,
            jobName: jobName,
            data: JSON.stringify({
                documentId: doc.id,
                tenantId: doc.tenantId,
                correlationId,
            }),
            status: status,
            attemptsMade: status === 'completed' ? randomInt(1, 3) : randomInt(1, 5),
            correlationId: correlationId,
            failedReason: status === 'failed' ? pickRandom(failedReasons) : undefined,
            returnValue: status === 'completed'
                ? JSON.stringify({ pageCount: randomInt(1, 10), duration: randomInt(500, 15000) })
                : undefined,
            createdAt: createdAt,
        });
    }
    await jobRepo.insert(jobRows);
    console.log(`✅ ${JOB_RECORDS_COUNT} enregistrements de jobs insérés\n`);
    console.log('═══════════════════════════════════════════');
    console.log('📊 RÉSUMÉ DU SEED');
    console.log('═══════════════════════════════════════════');
    console.log(`   Tenants          : ${exports.TENANTS.length}`);
    console.log(`   Utilisateurs     : ${exports.USERS.length}`);
    console.log(`   Documents        : ${documents.length}`);
    console.log(`   Résultats OCR    : ${ocrRows.length}`);
    console.log(`   Enregistrements  : ${jobRows.length}`);
    console.log('═══════════════════════════════════════════\n');
    await dataSource.destroy();
    console.log('👋 Seed terminé avec succès !');
}
seed().catch((err) => {
    console.error('❌ Erreur lors du seed :', err);
    process.exit(1);
});
//# sourceMappingURL=seed.js.map