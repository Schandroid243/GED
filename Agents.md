# Agents.md – Système d'agents de traitement asynchrone pour GED B2B

> **Document de référence LLM** – Ce fichier est la source de vérité pour la génération de code.  
> Respecter scrupuleusement chaque chemin de fichier, interface, enum et convention de nommage.  
> Ne jamais inventer de fichier non listé. Ne jamais omettre de fichier listé.

---

## SOMMAIRE

1. [Stack technique](#1-stack-technique)
2. [Structure complète du projet](#2-structure-complète-du-projet)
3. [Variables d'environnement](#3-variables-denvironnement)
4. [Enums et constantes partagées](#4-enums-et-constantes-partagées)
5. [Interfaces JobData (contrats de files)](#5-interfaces-jobdata-contrats-de-files)
6. [Configuration BullMQ](#6-configuration-bullmq)
7. [Entités TypeORM](#7-entités-typeorm)
8. [Stockage local (LocalStorageService)](#8-stockage-local-localstorageservice)
9. [Agents – implémentation fichier par fichier](#9-agents--implémentation-fichier-par-fichier)
10. [Module racine AgentsModule](#10-module-racine-agentsmodule)
11. [Point d'entrée agents](#11-point-dentrée-agents)
12. [Frontend – React / Tailwind UI Premium](#12-frontend--react--tailwind-ui-premium)
13. [Supervision et observabilité](#13-supervision-et-observabilité)
14. [Tests](#14-tests)
15. [Déploiement](#15-déploiement)
16. [Checklist de génération](#16-checklist-de-génération)

---

## 1. Stack technique

### Backend

| Couche | Technologie | Version cible |
|---|---|---|
| Runtime | Node.js | ≥ 20 LTS |
| Framework | NestJS | ^10.x |
| Langage | TypeScript | ^5.x |
| File de jobs | BullMQ + `@nestjs/bull` | bullmq ^5, @nestjs/bull ^10 |
| Broker | Redis | ≥ 7 |
| ORM | TypeORM | ^0.3.x |
| Base de données | MySQL | ≥ 8 |
| OCR | Tesseract v5 (CLI `tesseract`) | binaire système |
| Conversion PDF | Ghostscript / LibreOffice headless | binaires système |
| Antivirus | ClamAV ou API externe | binaire `clamdscan` |
| **Stockage fichiers** | **Système de fichiers local** (`fs/promises` + `path`) | Node.js natif |
| Package manager | **npm** | ≥ 10 |
| Config | `@nestjs/config` + `.env` | |
| Dashboard files | `@bull-board/api` + `@bull-board/express` | |
| Métriques | `prom-client` + `@willsoto/nestjs-prometheus` | |
| Verrous distribués | `redlock` | ^5.x |

### Frontend

| Couche | Technologie | Version cible |
|---|---|---|
| Framework UI | React | ^18.x |
| Langage | TypeScript | ^5.x |
| Build | Vite | ^5.x |
| Style | Tailwind CSS | ^3.x |
| Composants | Headless UI | ^2.x |
| Icônes | Heroicons | ^2.x |
| Routeur | React Router DOM | ^6.x |
| État global | Zustand | ^4.x |
| Data fetching | TanStack Query (React Query) | ^5.x |
| Formulaires | React Hook Form + Zod | ^7.x / ^3.x |
| Animations | Framer Motion | ^11.x |
| Tableaux | TanStack Table | ^8.x |
| Notifications toast | Sonner | ^1.x |
| Thème clair/sombre | `next-themes` adapté Vite | ^0.3.x |
| HTTP client | Axios | ^1.x |
| Dates | date-fns | ^3.x |

> **Règle absolue** : utiliser `npm` exclusivement. Ne jamais générer de commande `yarn` ou `pnpm`.

---

## 2. Structure complète du projet

> Générer **tous** les fichiers listés ci-dessous dans l'ordre indiqué.  
> Un fichier absent = build cassé.

```
project-root/
├── .env.agents                          ← variables d'env agents (voir §3)
├── .env.example                         ← copie de .env.agents avec valeurs vides
├── package.json                         ← scripts npm dédiés (voir §2.1)
├── tsconfig.json
├── tsconfig.build.json
│
├── frontend/                            ← Application React (voir §12)
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── postcss.config.js
│   ├── tsconfig.json
│   ├── package.json                     ← dépendances frontend séparées
│   └── src/
│       ├── main.tsx
│       ├── App.tsx                      ← Router + ThemeProvider + QueryClientProvider
│       ├── vite-env.d.ts
│       │
│       ├── assets/
│       │   └── fonts/                   ← polices locales (voir §12.2)
│       │
│       ├── styles/
│       │   ├── globals.css              ← @tailwind directives + CSS variables thème
│       │   └── themes.css               ← tokens design light / dark
│       │
│       ├── lib/
│       │   ├── axios.ts                 ← instance Axios configurée
│       │   ├── queryClient.ts           ← instance TanStack Query
│       │   └── utils.ts                 ← cn() + helpers
│       │
│       ├── stores/
│       │   ├── auth.store.ts            ← Zustand : session utilisateur
│       │   └── ui.store.ts              ← Zustand : sidebar, modales, theme
│       │
│       ├── hooks/
│       │   ├── useDocuments.ts          ← TanStack Query : CRUD documents
│       │   ├── useJobs.ts               ← TanStack Query : suivi jobs BullMQ
│       │   ├── useTheme.ts              ← toggle light / dark
│       │   └── useDebounce.ts
│       │
│       ├── components/
│       │   ├── ui/                      ← composants atomiques réutilisables
│       │   │   ├── Button.tsx
│       │   │   ├── Badge.tsx
│       │   │   ├── Card.tsx
│       │   │   ├── Input.tsx
│       │   │   ├── Select.tsx
│       │   │   ├── Modal.tsx
│       │   │   ├── Drawer.tsx
│       │   │   ├── Tooltip.tsx
│       │   │   ├── Spinner.tsx
│       │   │   ├── ProgressBar.tsx
│       │   │   ├── Avatar.tsx
│       │   │   ├── Divider.tsx
│       │   │   └── EmptyState.tsx
│       │   │
│       │   ├── layout/
│       │   │   ├── RootLayout.tsx       ← shell principal : sidebar + topbar + outlet
│       │   │   ├── Sidebar.tsx          ← navigation latérale collapsible
│       │   │   ├── Topbar.tsx           ← barre supérieure : recherche + user + theme toggle
│       │   │   └── PageHeader.tsx       ← titre + breadcrumb + actions par page
│       │   │
│       │   ├── documents/
│       │   │   ├── DocumentTable.tsx    ← TanStack Table : liste paginée
│       │   │   ├── DocumentCard.tsx     ← vue carte (grille)
│       │   │   ├── DocumentUpload.tsx   ← drag-and-drop + progress upload
│       │   │   ├── DocumentViewer.tsx   ← prévisualisation iframe / canvas
│       │   │   ├── DocumentStatusBadge.tsx
│       │   │   └── DocumentFilters.tsx  ← filtres : type, statut, date, tenant
│       │   │
│       │   ├── jobs/
│       │   │   ├── JobQueuePanel.tsx    ← tableau de bord files BullMQ temps réel
│       │   │   ├── JobProgressCard.tsx  ← job individuel avec barre progression
│       │   │   └── JobTimeline.tsx      ← historique étapes d'un document
│       │   │
│       │   └── charts/
│       │       ├── QueueDepthChart.tsx  ← courbe temps réel profondeur files
│       │       └── ProcessingStatsChart.tsx
│       │
│       ├── pages/
│       │   ├── LoginPage.tsx
│       │   ├── DashboardPage.tsx        ← KPIs + graphiques + activité récente
│       │   ├── DocumentsPage.tsx        ← liste + upload + filtres
│       │   ├── DocumentDetailPage.tsx   ← viewer + OCR + historique workflow
│       │   ├── JobsPage.tsx             ← monitoring files BullMQ
│       │   ├── SettingsPage.tsx         ← configuration tenant
│       │   └── NotFoundPage.tsx
│       │
│       └── types/
│           ├── document.types.ts
│           ├── job.types.ts
│           └── api.types.ts
│
└── src/                                 ← Backend NestJS (inchangé)
    ├── main.agents.ts
    ├── common/
    │   ├── queues/
    │   │   ├── queue-names.enum.ts
    │   │   └── all-queues.provider.ts
    │   ├── errors/
    │   │   └── non-retriable.error.ts
    │   └── filters/
    │       └── job-exception.filter.ts
    ├── config/
    │   ├── bull.config.ts
    │   ├── database.config.ts
    │   └── env.validation.ts
    ├── agents/
    │   ├── agents.module.ts
    │   ├── entities/
    │   │   └── job-record.entity.ts
    │   ├── listeners/
    │   │   └── job-lifecycle.listener.ts
    │   ├── document-ingestion/
    │   │   ├── document-ingestion.module.ts
    │   │   ├── document-ingestion.processor.ts
    │   │   ├── document-ingestion.service.ts
    │   │   └── interfaces/
    │   │       └── document-ingestion-job.interface.ts
    │   ├── ocr/
    │   │   ├── ocr.module.ts
    │   │   ├── ocr.processor.ts
    │   │   ├── ocr.service.ts
    │   │   └── interfaces/
    │   │       └── ocr-job.interface.ts
    │   ├── classification/
    │   │   ├── classification.module.ts
    │   │   ├── classification.processor.ts
    │   │   ├── classification.service.ts
    │   │   └── interfaces/
    │   │       └── classification-job.interface.ts
    │   ├── indexing/
    │   │   ├── indexing.module.ts
    │   │   ├── indexing.processor.ts
    │   │   ├── indexing.service.ts
    │   │   └── interfaces/
    │   │       └── indexing-job.interface.ts
    │   ├── workflow-engine/
    │   │   ├── workflow-engine.module.ts
    │   │   ├── workflow-engine.processor.ts
    │   │   ├── workflow-engine.service.ts
    │   │   └── interfaces/
    │   │       └── workflow-engine-job.interface.ts
    │   ├── notification/
    │   │   ├── notification.module.ts
    │   │   ├── notification.processor.ts
    │   │   ├── notification.service.ts
    │   │   └── interfaces/
    │   │       └── notification-job.interface.ts
    │   ├── archive/
    │   │   ├── archive.module.ts
    │   │   ├── archive.processor.ts
    │   │   ├── archive.service.ts
    │   │   └── interfaces/
    │   │       └── archive-job.interface.ts
    │   └── cleanup/
    │       ├── cleanup.module.ts
    │       └── cleanup.service.ts
    ├── documents/
    │   ├── document.module.ts
    │   ├── document.service.ts
    │   └── entities/
    │       ├── document.entity.ts
    │       └── ocr-result.entity.ts
    ├── tenants/
    │   ├── tenant.module.ts
    │   └── tenant.service.ts
    ├── storage/
    │   ├── storage.module.ts
    │   └── storage.service.ts           ← LocalStorageService (fs/promises)
    └── admin/
        └── queue-admin.module.ts
```

### 2.1 Scripts `package.json` (backend racine)

```json
{
  "scripts": {
    "build": "nest build",
    "start:agents": "node dist/main.agents.js",
    "start:agents:dev": "ts-node -r tsconfig-paths/register src/main.agents.ts",
    "test": "jest",
    "test:integration": "jest --config jest.integration.config.ts",
    "lint": "eslint \"{src,apps,libs,test}/**/*.ts\""
  }
}
```

### 2.2 Scripts `frontend/package.json`

```json
{
  "name": "ged-frontend",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "lint": "eslint src --ext ts,tsx"
  }
}
```

### 2.3 Dépendances npm à installer

```bash
# ── Backend (racine du projet) ──────────────────────────
npm install \
  @nestjs/common @nestjs/core @nestjs/config @nestjs/bull @nestjs/typeorm \
  bullmq reflect-metadata rxjs \
  typeorm mysql2 \
  @bull-board/api @bull-board/express \
  prom-client @willsoto/nestjs-prometheus \
  redlock \
  joi \
  class-validator class-transformer \
  multer @types/multer \
  mime-types @types/mime-types

npm install --save-dev \
  @nestjs/cli @nestjs/testing \
  @types/node typescript ts-node tsconfig-paths \
  jest ts-jest @types/jest \
  @testcontainers/redis @testcontainers/mysql \
  eslint @typescript-eslint/parser @typescript-eslint/eslint-plugin

# ── Frontend (dans frontend/) ───────────────────────────
cd frontend && npm install \
  react react-dom react-router-dom \
  @headlessui/react \
  @heroicons/react \
  zustand \
  @tanstack/react-query \
  @tanstack/react-table \
  react-hook-form zod @hookform/resolvers \
  framer-motion \
  axios \
  date-fns \
  sonner \
  clsx tailwind-merge \
  next-themes

npm install --save-dev \
  vite @vitejs/plugin-react \
  tailwindcss postcss autoprefixer \
  typescript @types/react @types/react-dom \
  eslint eslint-plugin-react-hooks @typescript-eslint/eslint-plugin
```

---

## 3. Variables d'environnement

### 3.1 Fichier `.env.agents` (fichier réel, ne pas commiter)

```dotenv
# ── Redis ──────────────────────────────────────────
REDIS_HOST=redis.prod.internal
REDIS_PORT=6379
REDIS_PASSWORD=changeme
REDIS_DB=1

# ── MySQL ──────────────────────────────────────────
DB_HOST=mysql.prod.internal
DB_PORT=3306
DB_USER=ged_user
DB_PASSWORD=changeme
DB_NAME=ged_db
DB_SYNCHRONIZE=false           # TOUJOURS false en production
DB_LOGGING=false

# ── Stockage local (système de fichiers) ───────────
LOCAL_STORAGE_ROOT=/var/ged/storage   # répertoire racine permanent
LOCAL_STORAGE_ARCHIVE=/var/ged/archive # répertoire archive froide
LOCAL_STORAGE_PUBLIC_URL=http://localhost:3000/files # URL publique pour le frontend

# ── Concurrency par agent ──────────────────────────
OCR_CONCURRENCY=1
CLASSIFICATION_CONCURRENCY=4
INDEXING_CONCURRENCY=2
WORKFLOW_CONCURRENCY=1
NOTIFICATION_CONCURRENCY=5
ARCHIVE_CONCURRENCY=2
INGESTION_CONCURRENCY=2

# ── Chemins système ────────────────────────────────
TESSERACT_PATH=/usr/bin/tesseract
LIBREOFFICE_PATH=/usr/bin/soffice
GHOSTSCRIPT_PATH=/usr/bin/gs
CLAMDSCAN_PATH=/usr/bin/clamdscan
UPLOAD_TEMP_DIR=/tmp/uploads

# ── Feature flags ──────────────────────────────────
AGENT_OCR_ENABLED=true
AGENT_ML_CLASSIFICATION=false   # active le classifieur ML (Transformers)
AGENT_ARCHIVE_ENABLED=true

# ── BullBoard (admin UI) ────────────────────────────
BULL_BOARD_USERNAME=admin
BULL_BOARD_PASSWORD=changeme

# ── Alertes ────────────────────────────────────────
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/xxx/yyy/zzz
QUEUE_DEPTH_ALERT_THRESHOLD=500

# ── API (utilisé par le frontend) ──────────────────
API_PORT=3000
API_PREFIX=api
CORS_ORIGIN=http://localhost:5173   # URL dev Vite
JWT_SECRET=changeme
JWT_EXPIRES_IN=8h
```

### 3.2 Fichier `.env.example` (à commiter dans le dépôt)

Copie identique de `.env.agents` avec toutes les valeurs remplacées par des chaînes vides ou des placeholders :

```dotenv
REDIS_HOST=
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=1
DB_HOST=
DB_PORT=3306
DB_USER=
DB_PASSWORD=
DB_NAME=
DB_SYNCHRONIZE=false
DB_LOGGING=false
LOCAL_STORAGE_ROOT=
LOCAL_STORAGE_ARCHIVE=
LOCAL_STORAGE_PUBLIC_URL=http://localhost:3000/files
OCR_CONCURRENCY=1
CLASSIFICATION_CONCURRENCY=4
INDEXING_CONCURRENCY=2
WORKFLOW_CONCURRENCY=1
NOTIFICATION_CONCURRENCY=5
ARCHIVE_CONCURRENCY=2
INGESTION_CONCURRENCY=2
TESSERACT_PATH=/usr/bin/tesseract
LIBREOFFICE_PATH=/usr/bin/soffice
GHOSTSCRIPT_PATH=/usr/bin/gs
CLAMDSCAN_PATH=/usr/bin/clamdscan
UPLOAD_TEMP_DIR=/tmp/uploads
AGENT_OCR_ENABLED=true
AGENT_ML_CLASSIFICATION=false
AGENT_ARCHIVE_ENABLED=true
BULL_BOARD_USERNAME=admin
BULL_BOARD_PASSWORD=
SLACK_WEBHOOK_URL=
QUEUE_DEPTH_ALERT_THRESHOLD=500
API_PORT=3000
API_PREFIX=api
CORS_ORIGIN=http://localhost:5173
JWT_SECRET=
JWT_EXPIRES_IN=8h
```

### 3.3 Validation du schéma `.env` (Joi)

Fichier : `src/config/env.validation.ts`

```typescript
import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  // Redis
  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').default(''),
  REDIS_DB: Joi.number().default(1),

  // MySQL
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().default(3306),
  DB_USER: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_NAME: Joi.string().required(),
  DB_SYNCHRONIZE: Joi.boolean().default(false),
  DB_LOGGING: Joi.boolean().default(false),

  // Stockage local
  LOCAL_STORAGE_ROOT:       Joi.string().required(),
  LOCAL_STORAGE_ARCHIVE:    Joi.string().required(),
  LOCAL_STORAGE_PUBLIC_URL: Joi.string().uri().required(),

  // Concurrency
  OCR_CONCURRENCY: Joi.number().min(1).default(1),
  CLASSIFICATION_CONCURRENCY: Joi.number().min(1).default(4),
  INDEXING_CONCURRENCY: Joi.number().min(1).default(2),
  WORKFLOW_CONCURRENCY: Joi.number().min(1).default(1),
  NOTIFICATION_CONCURRENCY: Joi.number().min(1).default(5),
  ARCHIVE_CONCURRENCY: Joi.number().min(1).default(2),
  INGESTION_CONCURRENCY: Joi.number().min(1).default(2),

  // Chemins système
  TESSERACT_PATH: Joi.string().default('/usr/bin/tesseract'),
  LIBREOFFICE_PATH: Joi.string().default('/usr/bin/soffice'),
  GHOSTSCRIPT_PATH: Joi.string().default('/usr/bin/gs'),
  CLAMDSCAN_PATH: Joi.string().default('/usr/bin/clamdscan'),
  UPLOAD_TEMP_DIR: Joi.string().default('/tmp/uploads'),

  // Feature flags
  AGENT_OCR_ENABLED: Joi.boolean().default(true),
  AGENT_ML_CLASSIFICATION: Joi.boolean().default(false),
  AGENT_ARCHIVE_ENABLED: Joi.boolean().default(true),

  // BullBoard
  BULL_BOARD_USERNAME: Joi.string().default('admin'),
  BULL_BOARD_PASSWORD: Joi.string().required(),

  // Alertes
  SLACK_WEBHOOK_URL:              Joi.string().uri().allow('').optional(),
  QUEUE_DEPTH_ALERT_THRESHOLD:    Joi.number().default(500),

  // API
  API_PORT:      Joi.number().default(3000),
  API_PREFIX:    Joi.string().default('api'),
  CORS_ORIGIN:   Joi.string().uri().required(),
  JWT_SECRET:    Joi.string().min(32).required(),
  JWT_EXPIRES_IN: Joi.string().default('8h'),
});
```

> **Règle** : `ConfigModule.forRoot()` reçoit `{ validationSchema: envValidationSchema, envFilePath: '.env.agents' }`.  
> Le démarrage échoue si une variable requise est absente.

---

## 4. Enums et constantes partagées

### 4.1 `src/common/queues/queue-names.enum.ts`

```typescript
export enum QueueName {
  DOCUMENT_INGESTION = 'document-ingestion',
  OCR_EXTRACTION     = 'ocr-extraction',
  CLASSIFICATION     = 'classification',
  INDEXING           = 'indexing',
  WORKFLOW_ENGINE    = 'workflow-engine',
  NOTIFICATION       = 'notification',
  ARCHIVE            = 'archive',
  DEAD_LETTER        = 'dead-letter',
}
```

> `DEAD_LETTER` est une file réelle BullMQ, pas un concept virtuel.

### 4.2 `src/common/errors/non-retriable.error.ts`

```typescript
export class NonRetriableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NonRetriableError';
    // Indispensable pour que instanceof fonctionne après transpilation TS
    Object.setPrototypeOf(this, NonRetriableError.prototype);
  }
}
```

### 4.3 Enums métier (dans `src/documents/`)

```typescript
// src/documents/enums/document-status.enum.ts
export enum DocumentStatus {
  UPLOADING         = 'UPLOADING',
  RECEIVED          = 'RECEIVED',
  SCANNING          = 'SCANNING',         // antivirus en cours
  SCAN_FAILED       = 'SCAN_FAILED',
  OCR_IN_PROGRESS   = 'OCR_IN_PROGRESS',
  OCR_COMPLETED     = 'OCR_COMPLETED',
  OCR_PARTIAL       = 'OCR_PARTIAL',      // pages partiellement extraites
  CLASSIFIED        = 'CLASSIFIED',
  INDEXED           = 'INDEXED',
  ARCHIVED          = 'ARCHIVED',
  DOCUMENT_ERROR    = 'DOCUMENT_ERROR',
}

// src/documents/enums/document-type.enum.ts
export enum DocumentType {
  INVOICE    = 'INVOICE',
  CONTRACT   = 'CONTRACT',
  ID_CARD    = 'ID_CARD',
  RECEIPT    = 'RECEIPT',
  REPORT     = 'REPORT',
  UNKNOWN    = 'UNKNOWN',
}
```

---

## 5. Interfaces JobData (contrats de files)

> Ces interfaces définissent le **payload exact** stocké dans Redis.  
> Ne jamais ajouter de secrets (mots de passe, tokens) dans ces structures.  
> Toujours passer des IDs, jamais d'objets hydratés.

### 5.1 `document-ingestion-job.interface.ts`

```typescript
export interface DocumentIngestionJobData {
  tenantId:      string;   // UUID
  documentId:    string;   // UUID
  filePath:      string;   // chemin temporaire upload (ex: /tmp/uploads/abc.pdf)
  mimeType:      string;   // ex: 'application/pdf', 'image/tiff'
  originalName:  string;   // nom de fichier original
  uploadedBy:    string;   // UUID de l'utilisateur
  correlationId: string;   // UUID pour le tracing distribué
  metadata?:     Record<string, string>; // métadonnées libres du tenant
}
```

### 5.2 `ocr-job.interface.ts`

```typescript
export interface OcrJobData {
  tenantId:      string;
  documentId:    string;
  filePath:      string;          // clé objet S3 (ex: tenants/uuid/documents/uuid/original.pdf)
  language:      string;          // code ISO 639-2 (fra, eng, deu, ...)
  correlationId: string;
  pageRange?:    [number, number]; // pages [début, fin] (1-indexé), undefined = toutes
  priority?:     1 | 2 | 3;       // 1=haute, 2=normale, 3=basse
}
```

### 5.3 `classification-job.interface.ts`

```typescript
export interface ClassificationJobData {
  tenantId:         string;
  documentId:       string;
  ocrText:          string;          // texte brut extrait par OCR
  existingMetadata: Record<string, string>;
  correlationId:    string;
  useMlModel?:      boolean;         // surchargé par AGENT_ML_CLASSIFICATION
}
```

### 5.4 `indexing-job.interface.ts`

```typescript
export interface IndexingJobData {
  tenantId:     string;
  documentId:   string;
  textContent:  string;
  metadata:     Record<string, string>;
  correlationId: string;
  language:     string;
}
```

### 5.5 `workflow-engine-job.interface.ts`

```typescript
export type WorkflowEventType =
  | 'DOCUMENT_RECEIVED'
  | 'DOCUMENT_CLASSIFIED'
  | 'APPROVAL_SUBMITTED'
  | 'APPROVAL_REJECTED'
  | 'ARCHIVE_TRIGGERED';

export interface WorkflowEngineJobData {
  tenantId:      string;
  documentId:    string;
  eventType:     WorkflowEventType;
  correlationId: string;
  context?:      Record<string, unknown>; // données métier contextuelles
}
```

### 5.6 `notification-job.interface.ts`

```typescript
export type NotificationChannel = 'email' | 'inapp' | 'webhook';

export interface NotificationJobData {
  tenantId:     string;
  userIds:      string[];             // UUIDs des destinataires
  channels:     NotificationChannel[];
  templateName: string;               // clé dans le catalogue de templates
  data:         Record<string, unknown>; // variables de template
  correlationId: string;
}
```

### 5.7 `archive-job.interface.ts`

```typescript
export interface ArchiveJobData {
  tenantId:       string;
  documentIds:    string[];    // batch d'IDs à archiver
  archiveProfile: string;      // ID du profil de rétention (en base)
  correlationId:  string;
  signElectronically?: boolean; // signature PAdES long terme
}
```

---

## 6. Configuration BullMQ

### 6.1 `src/config/bull.config.ts`

```typescript
import { BullModuleOptions } from '@nestjs/bull';
import { ConfigService } from '@nestjs/config';

export const bullConfigFactory = (config: ConfigService): BullModuleOptions => ({
  connection: {
    host:               config.get<string>('REDIS_HOST'),
    port:               config.get<number>('REDIS_PORT'),
    password:           config.get<string>('REDIS_PASSWORD') || undefined,
    db:                 config.get<number>('REDIS_DB'),
    maxRetriesPerRequest: null, // OBLIGATOIRE pour BullMQ
    enableReadyCheck:   false,  // OBLIGATOIRE pour BullMQ
  },
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type:  'exponential',
      delay: 1000,
    },
    removeOnComplete: {
      age:   7 * 24 * 3600, // 7 jours
      count: 1000,
    },
    removeOnFail: {
      age: 30 * 24 * 3600, // 30 jours
    },
  },
});
```

### 6.2 Paramètres de retry par agent

| Agent               | `attempts` | `backoff.type` | `backoff.delay` | Comportement échec final          |
|---------------------|-----------|----------------|-----------------|-----------------------------------|
| `document-ingestion`| 3         | exponential    | 1 000 ms        | `DOCUMENT_ERROR` + notification   |
| `ocr-extraction`    | 5         | exponential    | 2 000 ms        | `DOCUMENT_ERROR` + notification   |
| `classification`    | 3         | fixed          | 500 ms          | Classifier en `UNKNOWN`           |
| `indexing`          | 3         | exponential    | 1 000 ms        | Log + alerte Slack                |
| `workflow-engine`   | 3         | exponential    | 1 000 ms        | Log + escalade manuelle           |
| `notification`      | 3         | exponential    | 1 000 ms        | Dead Letter Queue                 |
| `archive`           | 2         | fixed          | 300 000 ms (5min)| Reprogrammer manuellement        |

> Ces options **surchargent** les `defaultJobOptions` et sont passées dans `BullModule.registerQueue({ name, defaultJobOptions: {...} })` pour chaque queue concernée.

### 6.3 Concurrency par agent (depuis .env)

| Variable env              | Agent               | Valeur défaut |
|---------------------------|---------------------|---------------|
| `INGESTION_CONCURRENCY`   | document-ingestion  | 2             |
| `OCR_CONCURRENCY`         | ocr-extraction      | 1             |
| `CLASSIFICATION_CONCURRENCY` | classification   | 4             |
| `INDEXING_CONCURRENCY`    | indexing            | 2             |
| `WORKFLOW_CONCURRENCY`    | workflow-engine     | 1             |
| `NOTIFICATION_CONCURRENCY`| notification        | 5             |
| `ARCHIVE_CONCURRENCY`     | archive             | 2             |

La valeur est injectée dans le décorateur `@Process({ concurrency: config.get('OCR_CONCURRENCY') })`.

---

## 7. Entités TypeORM

### 7.1 `src/agents/entities/job-record.entity.ts`

```typescript
import {
  Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index,
} from 'typeorm';
import { QueueName } from '../../common/queues/queue-names.enum';

export type JobStatus = 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'paused';

@Entity('job_records')
@Index(['queueName', 'status'])      // pour les requêtes d'administration
@Index(['createdAt'])                // pour le cleanup CRON
export class JobRecord {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  jobId: string;                     // ID BullMQ (string)

  @Column({ type: 'varchar', length: 50 })
  queueName: QueueName;

  @Column({ type: 'varchar', length: 50 })
  jobName: string;

  @Column({ type: 'json' })
  data: Record<string, unknown>;

  @Column({
    type: 'enum',
    enum: ['waiting', 'active', 'completed', 'failed', 'delayed', 'paused'],
    default: 'waiting',
  })
  status: JobStatus;

  @Column({ type: 'tinyint', default: 0 })
  attemptsMade: number;

  @Column({ type: 'varchar', length: 36, nullable: true })
  correlationId?: string;            // pour le tracing

  @Column({ type: 'text', nullable: true })
  failedReason?: string;

  @Column({ type: 'json', nullable: true })
  returnValue?: Record<string, unknown>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### 7.2 `src/documents/entities/document.entity.ts` (colonnes minimales requises par les agents)

```typescript
// Ne lister que les champs utilisés par les agents — l'entité complète est gérée par l'API
@Entity('documents')
export class Document {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id: string;                           // UUID

  @Column({ type: 'varchar', length: 36 })
  tenantId: string;

  @Column({ type: 'enum', enum: DocumentStatus, default: DocumentStatus.UPLOADING })
  status: DocumentStatus;

  @Column({ type: 'enum', enum: DocumentType, nullable: true })
  documentType?: DocumentType;

  @Column({ type: 'varchar', length: 255, nullable: true })
  s3Key?: string;                        // clé objet S3 du fichier permanent

  @Column({ type: 'varchar', length: 255, nullable: true })
  thumbnailKey?: string;

  @Column({ type: 'float', nullable: true })
  classificationConfidence?: number;

  @Column({ type: 'boolean', default: false })
  indexed: boolean;

  @Column({ type: 'json', nullable: true })
  metadata?: Record<string, string>;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### 7.3 `src/documents/entities/ocr-result.entity.ts`

```typescript
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

  @CreateDateColumn()
  createdAt: Date;
}
```

---

## 8. Stockage local (LocalStorageService)

> **Remplacement de S3** : tout stockage de fichier passe par `LocalStorageService`.  
> Aucune référence à `@aws-sdk/client-s3`, `S3Client`, `PutObjectCommand` ne doit apparaître dans le projet.

### 8.1 Convention de chemins

```
LOCAL_STORAGE_ROOT/
├── tenants/
│   └── {tenantId}/
│       └── documents/
│           └── {documentId}/
│               ├── original.{ext}      ← fichier source
│               ├── thumbnail.webp      ← miniature 300px
│               └── ocr/
│                   ├── page-001.txt
│                   └── page-001.hocr
LOCAL_STORAGE_ARCHIVE/
└── tenants/
    └── {tenantId}/
        └── {documentId}/
            └── archive.pdf             ← PDF/A signé
```

### 8.2 `src/storage/storage.service.ts`

```typescript
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

  /** Copie un fichier temporaire vers le stockage permanent */
  async store(
    tempPath:   string,
    tenantId:   string,
    documentId: string,
    fileName:   string,   // ex: 'original.pdf'
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

  /** Déplace un fichier vers le stockage d'archive */
  async moveToArchive(
    relativePath: string,
    tenantId:     string,
    documentId:   string,
    archiveName:  string, // ex: 'archive.pdf'
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

  /** Supprime tous les fichiers d'un document */
  async deleteDocument(tenantId: string, documentId: string): Promise<void> {
    const dir = path.join(this.root, 'tenants', tenantId, 'documents', documentId);
    await fs.rm(dir, { recursive: true, force: true });
  }

  /** Taille totale occupée par un tenant (bytes) */
  async tenantUsage(tenantId: string): Promise<number> {
    const dir = path.join(this.root, 'tenants', tenantId);
    return this.dirSize(dir);
  }

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
    } catch { /* répertoire absent */ }
    return total;
  }
}
```

### 8.3 `src/storage/storage.module.ts`

```typescript
import { Module, Global } from '@nestjs/common';
import { LocalStorageService } from './storage.service';

@Global()   // accessible sans import explicite dans tous les modules agents
@Module({
  providers: [LocalStorageService],
  exports:   [LocalStorageService],
})
export class StorageModule {}
```

### 8.4 Adaptation dans les agents

Partout où l'original mentionnait S3 :

| Ancienne API (S3) | Nouvelle API (LocalStorageService) |
|---|---|
| `storageService.upload(filePath, s3Key)` | `storageService.store(tempPath, tenantId, documentId, fileName)` |
| `storageService.download(s3Key)` → Buffer | `storageService.read(relativePath)` |
| `storageService.getAbsolutePath(s3Key)` | `storageService.absolutePath(relativePath)` |
| `storageService.moveToGlacier(s3Key)` | `storageService.moveToArchive(relativePath, ...)` |

> Dans les interfaces `JobData`, remplacer `filePath: string` (clé S3) par  
> `filePath: string` (chemin **relatif** depuis `LOCAL_STORAGE_ROOT`, ex. `tenants/uuid/documents/uuid/original.pdf`).  
> La sémantique du champ est identique ; seul le résolveur change.

### 8.5 Endpoint de service des fichiers (NestJS)

L'API doit servir les fichiers locaux via un endpoint statique protégé par JWT :

```typescript
// src/main.ts (API HTTP – pas les agents)
import { NestExpressApplication } from '@nestjs/platform-express';
// ...
app.useStaticAssets(config.get('LOCAL_STORAGE_ROOT'), {
  prefix: '/files',
  // Middleware JWT à appliquer AVANT ce mount
});
```

---

## 9. Agents – implémentation fichier par fichier

> Chaque sous-section décrit **exactement** les trois fichiers à générer par agent.  
> Respecter les noms de classes, de méthodes et les dépendances injectées.

---

### 8.1 Agent `document-ingestion`

#### `document-ingestion.module.ts`

```typescript
import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QueueName } from '../../common/queues/queue-names.enum';
import { DocumentIngestionProcessor } from './document-ingestion.processor';
import { DocumentIngestionService } from './document-ingestion.service';
import { DocumentModule } from '../../documents/document.module';
import { StorageModule } from '../../storage/storage.module';

@Module({
  imports: [
    BullModule.registerQueueAsync({
      name: QueueName.DOCUMENT_INGESTION,
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 1000 } },
      }),
      inject: [ConfigService],
    }),
    // Enregistrement de la file OCR pour pouvoir y pousser des jobs
    BullModule.registerQueue({ name: QueueName.OCR_EXTRACTION }),
    DocumentModule,
    StorageModule,
  ],
  providers: [DocumentIngestionService, DocumentIngestionProcessor],
})
export class DocumentIngestionModule {}
```

#### `document-ingestion.processor.ts`

```typescript
import { Processor, Process, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ConfigService } from '@nestjs/config';
import { QueueName } from '../../common/queues/queue-names.enum';
import { DocumentIngestionService } from './document-ingestion.service';
import { DocumentIngestionJobData } from './interfaces/document-ingestion-job.interface';
import { NonRetriableError } from '../../common/errors/non-retriable.error';

@Processor(QueueName.DOCUMENT_INGESTION)
export class DocumentIngestionProcessor {
  private readonly logger = new Logger(DocumentIngestionProcessor.name);

  constructor(
    private readonly ingestionService: DocumentIngestionService,
    private readonly config: ConfigService,
  ) {}

  @Process({ name: 'ingest', concurrency: /* injecté via factory */ 2 })
  async handleIngest(job: Job<DocumentIngestionJobData>): Promise<void> {
    const { documentId, tenantId, correlationId } = job.data;
    this.logger.log(`[${correlationId}] Ingestion démarrée : ${documentId}`);

    await job.updateProgress(0);
    try {
      await this.ingestionService.run(job.data, (p) => job.updateProgress(p));
      await job.updateProgress(100);
    } catch (error) {
      if (error instanceof NonRetriableError) {
        this.logger.error(`[${correlationId}] Erreur non-retriable : ${error.message}`);
        throw error; // BullMQ ne réessaiera pas si NonRetriableError
      }
      this.logger.warn(`[${correlationId}] Échec transitoire, retry planifié : ${error.message}`);
      throw error;
    }
  }

  @OnQueueFailed()
  async onFailed(job: Job<DocumentIngestionJobData>, error: Error): Promise<void> {
    this.logger.error(
      `[${job.data.correlationId}] Job ${job.id} échoué définitivement : ${error.message}`,
    );
    await this.ingestionService.markDocumentError(job.data.documentId, error.message);
  }
}
```

#### `document-ingestion.service.ts`

```typescript
// Responsabilités (à implémenter dans le corps de chaque méthode) :
// 1. Antivirus : exec `clamdscan <filePath>` via child_process.execFile
// 2. Copie S3  : this.storageService.upload(filePath, s3Key)
// 3. Miniature : sharp ou imagemagick CLI
// 4. Mise à jour statut document : RECEIVED
// 5. Enqueue OCR si mimeType ∈ ['application/pdf', 'image/tiff', 'image/png', 'image/jpeg']
//    → this.ocrQueue.add('extract', ocrJobData, { jobId: `ocr-${documentId}`, priority: 2 })

@Injectable()
export class DocumentIngestionService {
  constructor(
    private readonly storageService: StorageService,
    private readonly documentService: DocumentService,
    @InjectQueue(QueueName.OCR_EXTRACTION) private readonly ocrQueue: Queue,
    private readonly config: ConfigService,
  ) {}

  async run(data: DocumentIngestionJobData, onProgress: (p: number) => void): Promise<void> { /* ... */ }
  async markDocumentError(documentId: string, reason: string): Promise<void> { /* ... */ }
}
```

---

### 8.2 Agent `ocr-extraction`

#### `ocr.module.ts`

```typescript
@Module({
  imports: [
    BullModule.registerQueueAsync({
      name: QueueName.OCR_EXTRACTION,
      imports: [ConfigModule],
      useFactory: () => ({
        defaultJobOptions: { attempts: 5, backoff: { type: 'exponential', delay: 2000 } },
      }),
    }),
    BullModule.registerQueue({ name: QueueName.CLASSIFICATION }),
    DocumentModule,
  ],
  providers: [OcrService, OcrProcessor],
  exports: [OcrService],
})
export class OcrModule {}
```

#### `ocr.processor.ts`

```typescript
@Processor(QueueName.OCR_EXTRACTION)
export class OcrProcessor {
  private readonly logger = new Logger(OcrProcessor.name);

  constructor(
    private readonly ocrService: OcrService,
    private readonly config: ConfigService,
  ) {}

  // concurrency lue depuis .env via ConfigService dans le module factory
  @Process({ name: 'extract', concurrency: 1 })
  async handleExtract(job: Job<OcrJobData>): Promise<{ pageCount: number }> {
    const { documentId, correlationId } = job.data;
    this.logger.log(`[${correlationId}] OCR démarré : ${documentId}`);
    await job.updateProgress(0);
    const result = await this.ocrService.processDocument(job.data, (p) => job.updateProgress(p));
    await job.updateProgress(100);
    return result;
  }

  @OnQueueFailed()
  async onFailed(job: Job<OcrJobData>, error: Error): Promise<void> {
    await this.ocrService.handleFailure(job.data, error);
  }
}
```

#### `ocr.service.ts`

```typescript
// Responsabilités :
// 1. Télécharger le fichier depuis S3 vers un répertoire temporaire UPLOAD_TEMP_DIR
// 2. Invoquer Tesseract v5 via child_process.execFile(TESSERACT_PATH, args)
//    args: [inputFile, outputBase, '--oem', '3', '--psm', '3', '-l', language, 'tsv', 'hocr']
// 3. Parser la sortie TSV et hOCR
// 4. Insérer dans OcrResult (une entrée par page)
// 5. Mettre à jour Document.status → OCR_COMPLETED ou OCR_PARTIAL
// 6. Enqueue classification : classificationQueue.add('classify', classificationJobData,
//      { jobId: `classify-${documentId}` })
// 7. Nettoyer le fichier temporaire

@Injectable()
export class OcrService {
  constructor(
    private readonly storageService: StorageService,
    private readonly documentService: DocumentService,
    @InjectRepository(OcrResult) private readonly ocrRepo: Repository<OcrResult>,
    @InjectQueue(QueueName.CLASSIFICATION) private readonly classificationQueue: Queue,
    private readonly config: ConfigService,
  ) {}

  async processDocument(
    data: OcrJobData,
    onProgress: (p: number) => void,
  ): Promise<{ pageCount: number }> { /* ... */ }

  async handleFailure(data: OcrJobData, error: Error): Promise<void> { /* ... */ }
}
```

---

### 8.3 Agent `classification`

#### Responsabilités de `ClassificationService`

1. Règles heuristiques : expressions régulières et mots-clés sur `ocrText`.
2. Si `AGENT_ML_CLASSIFICATION=true` et `data.useMlModel`, appel HTTP vers le service ML interne.
3. Attribution de `documentType` (enum `DocumentType`) et `classificationConfidence` (0.0–1.0).
4. Mise à jour de `Document` : type + confidence + statut `CLASSIFIED`.
5. Enqueue `indexing` : `indexingQueue.add('index', indexingJobData, { jobId: 'index-{documentId}' })`.
6. Enqueue `workflow-engine` : event `DOCUMENT_CLASSIFIED`.

#### Options de file

```typescript
defaultJobOptions: { attempts: 3, backoff: { type: 'fixed', delay: 500 } }
```

#### Fallback échec définitif

Si les 3 tentatives échouent : `Document.documentType = DocumentType.UNKNOWN`, statut `CLASSIFIED`, log erreur, **pas** de Dead Letter.

---

### 8.4 Agent `indexing`

#### Responsabilités de `IndexingService`

1. Tokenisation, suppression stop-words (français/anglais), stemming via bibliothèque `natural` ou appel MySQL FULLTEXT.
2. Insertion / mise à jour dans la table `document_index` (colonne FULLTEXT MySQL).
3. `Document.indexed = true`.

#### Options de file

```typescript
defaultJobOptions: { attempts: 3, backoff: { type: 'exponential', delay: 1000 } }
```

---

### 8.5 Agent `workflow-engine`

#### Responsabilités de `WorkflowEngineService`

1. Charger la définition BPMN-JSON du tenant depuis la base (`workflow_definitions` table, filtre `tenantId + isActive`).
2. Évaluer l'événement (`eventType`) contre les transitions définies.
3. Actions possibles : enqueue `notification`, créer une tâche en base, mettre à jour le statut document.
4. Persister l'historique dans `workflow_history` table.
5. Programmer des jobs différés pour les timeouts (ex. relance après 48h) : `workflowQueue.add('event', data, { delay: 48 * 3600 * 1000 })`.

#### Contrainte d'ordre

`concurrency: 1` est **obligatoire** pour garantir l'ordre des événements métier par tenant.  
Si la scalabilité requiert plusieurs workers, utiliser le partitionnement par `tenantId` avec BullMQ Pro `group`.

---

### 8.6 Agent `notification`

#### Responsabilités de `NotificationService`

1. Résoudre le template depuis la base (`notification_templates` table, filtre `name + locale`).
2. Interpoler les variables `data` dans le template (moteur simple : remplacer `{{key}}`).
3. Dispatch par canal :
   - `email` : SMTP via `nodemailer`, config SMTP depuis `.env` (à ajouter si nécessaire).
   - `inapp` : insérer dans `notifications` table (lu par l'API).
   - `webhook` : HTTP POST vers l'URL enregistrée pour le tenant.
4. Logger dans `notification_logs` table avec statut (`sent` / `failed`).

#### Dead Letter après échec définitif

```typescript
@OnQueueFailed()
async onFailed(job: Job<NotificationJobData>, error: Error): Promise<void> {
  if (job.attemptsMade >= (job.opts.attempts ?? 3)) {
    await this.deadLetterQueue.add('failed-notification', {
      originalQueue: QueueName.NOTIFICATION,
      jobId: job.id,
      data: job.data,
      error: error.message,
      failedAt: new Date().toISOString(),
    });
  }
}
```

---

### 8.7 Agent `archive`

#### Responsabilités de `ArchiveService`

1. Pour chaque `documentId` : récupérer fichier depuis S3.
2. Convertir en PDF/A via LibreOffice headless ou Ghostscript (selon MIME d'origine).
3. Si `signElectronically`, appliquer signature PAdES (bibliothèque ou API externe).
4. Uploader vers bucket/tier froid (`S3_BUCKET/archive/...`).
5. Mettre à jour `Document.status = ARCHIVED`, nettoyer fichiers temporaires.
6. Programmer la destruction : `archiveQueue.add('destroy', { documentId }, { delay: retentionMs, jobId: 'destroy-{documentId}' })`.

#### Options de file

```typescript
defaultJobOptions: { attempts: 2, backoff: { type: 'fixed', delay: 300_000 } } // 5 min
```

#### Déclenchement CRON

Un job répétable BullMQ (`repeatable`) déclenche le batch quotidien :

```typescript
await archiveQueue.add(
  'batch-archive',
  {},
  { repeat: { cron: '0 2 * * *' } },   // 02h00 UTC chaque nuit
);
```

---

### 8.8 Agent `cleanup`

> Pas de processor dédié. `CleanupService` enregistre lui-même un job `repeatable` au démarrage.

#### `cleanup.service.ts`

```typescript
@Injectable()
export class CleanupService implements OnApplicationBootstrap {
  constructor(
    @InjectQueue(QueueName.ARCHIVE) private readonly archiveQueue: Queue,
    private readonly jobRecordRepo: Repository<JobRecord>,
    private readonly config: ConfigService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    // Enregistrer le CRON toutes les 6h
    await this.archiveQueue.add(
      'cleanup',
      {},
      {
        repeat: { cron: '0 */6 * * *' },
        jobId: 'recurring-cleanup',
      },
    );
  }

  // Méthode appelée par un processor dans ArchiveModule qui écoute le job 'cleanup'
  async performCleanup(): Promise<void> {
    // 1. Supprimer fichiers dans UPLOAD_TEMP_DIR plus vieux que 24h
    // 2. Purger JobRecord en état final (completed/failed) créés il y a > 30 jours
    // 3. Libérer les verrous Redis orphelins via redlock.release()
  }
}
```

---

## 10. Module racine AgentsModule

### `src/agents/agents.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { envValidationSchema } from '../config/env.validation';
import { bullConfigFactory } from '../config/bull.config';
import { QueueName } from '../common/queues/queue-names.enum';

// Modules agents
import { DocumentIngestionModule } from './document-ingestion/document-ingestion.module';
import { OcrModule }               from './ocr/ocr.module';
import { ClassificationModule }    from './classification/classification.module';
import { IndexingModule }          from './indexing/indexing.module';
import { WorkflowEngineModule }    from './workflow-engine/workflow-engine.module';
import { NotificationModule }      from './notification/notification.module';
import { ArchiveModule }           from './archive/archive.module';
import { CleanupModule }           from './cleanup/cleanup.module';

// Modules partagés
import { DocumentModule } from '../documents/document.module';
import { TenantModule }   from '../tenants/tenant.module';
import { StorageModule }  from '../storage/storage.module';

// Entités
import { JobRecord } from './entities/job-record.entity';
import { Document }  from '../documents/entities/document.entity';
import { OcrResult } from '../documents/entities/ocr-result.entity';

// Listeners et admin
import { JobLifecycleListener } from './listeners/job-lifecycle.listener';
import { QueueAdminModule }     from '../admin/queue-admin.module';

@Module({
  imports: [
    // Config global – charge .env.agents, valide le schéma Joi
    ConfigModule.forRoot({
      isGlobal:         true,
      envFilePath:      '.env.agents',
      validationSchema: envValidationSchema,
    }),

    // TypeORM
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        type:        'mysql',
        host:        config.get<string>('DB_HOST'),
        port:        config.get<number>('DB_PORT'),
        username:    config.get<string>('DB_USER'),
        password:    config.get<string>('DB_PASSWORD'),
        database:    config.get<string>('DB_NAME'),
        entities:    [JobRecord, Document, OcrResult],
        synchronize: config.get<boolean>('DB_SYNCHRONIZE'), // false en prod
        logging:     config.get<boolean>('DB_LOGGING'),
      }),
      inject: [ConfigService],
    }),
    TypeOrmModule.forFeature([JobRecord]),

    // BullMQ global
    BullModule.forRootAsync({
      imports:    [ConfigModule],
      useFactory: bullConfigFactory,
      inject:     [ConfigService],
    }),

    // Enregistrement DEAD_LETTER (utilisé dans plusieurs agents)
    BullModule.registerQueue({ name: QueueName.DEAD_LETTER }),

    // Modules métier partagés
    DocumentModule,
    TenantModule,
    StorageModule,

    // Modules agents
    DocumentIngestionModule,
    OcrModule,
    ClassificationModule,
    IndexingModule,
    WorkflowEngineModule,
    NotificationModule,
    ArchiveModule,
    CleanupModule,

    // Dashboard
    QueueAdminModule,
  ],
  providers: [JobLifecycleListener],
})
export class AgentsModule {}
```

### `src/agents/listeners/job-lifecycle.listener.ts`

```typescript
import { Injectable, Logger } from '@nestjs/common';
import { OnQueueEvent, QueueEventsHost } from '@nestjs/bull';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobRecord, JobStatus } from '../entities/job-record.entity';

@Injectable()
export class JobLifecycleListener extends QueueEventsHost {
  private readonly logger = new Logger(JobLifecycleListener.name);

  constructor(
    @InjectRepository(JobRecord)
    private readonly jobRecordRepo: Repository<JobRecord>,
  ) {
    super();
  }

  @OnQueueEvent('active')
  async onActive({ jobId }: { jobId: string }): Promise<void> {
    await this.jobRecordRepo.update(jobId, { status: 'active' });
  }

  @OnQueueEvent('completed')
  async onCompleted({ jobId, returnvalue }: { jobId: string; returnvalue: string }): Promise<void> {
    await this.jobRecordRepo.update(jobId, {
      status:      'completed',
      returnValue: JSON.parse(returnvalue || 'null'),
    });
  }

  @OnQueueEvent('failed')
  async onFailed({ jobId, failedReason }: { jobId: string; failedReason: string }): Promise<void> {
    await this.jobRecordRepo.update(jobId, { status: 'failed', failedReason });
    this.logger.error(`Job ${jobId} échoué : ${failedReason}`);
  }

  @OnQueueEvent('delayed')
  async onDelayed({ jobId }: { jobId: string }): Promise<void> {
    await this.jobRecordRepo.update(jobId, { status: 'delayed' });
  }
}
```

---

## 11. Point d'entrée agents

### `src/main.agents.ts`

```typescript
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { AgentsModule } from './agents/agents.module';

async function bootstrap(): Promise<void> {
  const logger = new Logger('AgentsBootstrap');

  // createApplicationContext : pas de serveur HTTP
  const app = await NestFactory.createApplicationContext(AgentsModule, {
    logger: ['log', 'warn', 'error', 'debug'],
  });

  await app.init();
  logger.log('Agents workers démarrés et en écoute des files BullMQ.');

  // Graceful shutdown
  process.on('SIGTERM', async () => {
    logger.log('SIGTERM reçu, arrêt graceful...');
    await app.close();
    process.exit(0);
  });
  process.on('SIGINT', async () => {
    logger.log('SIGINT reçu, arrêt graceful...');
    await app.close();
    process.exit(0);
  });
}

bootstrap().catch((err) => {
  console.error('Échec du démarrage des agents :', err);
  process.exit(1);
});
```

---

## 12. Frontend – React / Tailwind UI Premium

> Générer **tous** les fichiers listés dans l'arborescence `frontend/` (voir §2).  
> Le frontend est une SPA standalone qui consomme l'API NestJS via Axios.

---

### 12.1 Design System – tokens et thèmes

#### `frontend/tailwind.config.ts`

```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',   // piloté par next-themes via classe sur <html>
  theme: {
    extend: {
      // ── Palette sobre et premium ───────────────────────
      colors: {
        // Neutres (base des surfaces)
        neutral: {
          0:    '#ffffff',
          50:   '#f8f8f7',
          100:  '#f0efee',
          200:  '#e4e2e0',
          300:  '#cbc8c4',
          400:  '#a09c97',
          500:  '#78746f',
          600:  '#5a5651',
          700:  '#3f3c39',
          800:  '#282624',
          900:  '#161513',
          950:  '#0d0c0b',
        },
        // Accent principal : vert ardoise (sobre, B2B)
        accent: {
          50:  '#f0f4f0',
          100: '#dce8dc',
          200: '#b9d1b9',
          300: '#8fb38f',
          400: '#638f63',
          500: '#426e42',   // ← couleur principale
          600: '#325432',
          700: '#253e25',
          800: '#192a19',
          900: '#0e180e',
        },
        // Statuts sémantiques
        success:  { DEFAULT: '#2d6a4f', light: '#d8f3dc', dark: '#1b4332' },
        warning:  { DEFAULT: '#b5621a', light: '#fde8d0', dark: '#7c3f0f' },
        danger:   { DEFAULT: '#9b1c1c', light: '#fde8e8', dark: '#641e16' },
        info:     { DEFAULT: '#1e4d78', light: '#dbeafe', dark: '#1e3a5f' },
      },

      // ── Typographie ─────────────────────────────────────
      fontFamily: {
        // Display : titres, KPIs, headings
        display: ['"DM Serif Display"', 'Georgia', 'serif'],
        // Corps : UI, labels, paragraphes
        body:    ['"DM Sans"', 'system-ui', 'sans-serif'],
        // Mono : code, hashes, identifiants
        mono:    ['"JetBrains Mono"', 'monospace'],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },

      // ── Ombres raffinées ────────────────────────────────
      boxShadow: {
        'card-light': '0 1px 3px 0 rgba(0,0,0,.06), 0 1px 2px -1px rgba(0,0,0,.04)',
        'card-dark':  '0 1px 3px 0 rgba(0,0,0,.40), 0 1px 2px -1px rgba(0,0,0,.30)',
        'modal':      '0 20px 60px -10px rgba(0,0,0,.25)',
        'dropdown':   '0 4px 24px -4px rgba(0,0,0,.18)',
      },

      // ── Animations ──────────────────────────────────────
      keyframes: {
        'fade-in':    { from: { opacity: '0', transform: 'translateY(6px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'slide-left': { from: { opacity: '0', transform: 'translateX(16px)' }, to: { opacity: '1', transform: 'translateX(0)' } },
        'pulse-dot':  { '0%,100%': { opacity: '1' }, '50%': { opacity: '.4' } },
      },
      animation: {
        'fade-in':    'fade-in 0.2s ease-out both',
        'slide-left': 'slide-left 0.25s ease-out both',
        'pulse-dot':  'pulse-dot 1.4s ease-in-out infinite',
      },

      borderRadius: {
        DEFAULT: '0.5rem',
        'xl': '0.875rem',
        '2xl': '1.25rem',
      },
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
};

export default config;
```

#### `frontend/src/styles/themes.css`

```css
/* ── Variables CSS – Thème CLAIR ──────────────────── */
:root,
.light {
  --color-bg-base:       #f8f8f7;   /* page background */
  --color-bg-surface:    #ffffff;   /* cards, panels */
  --color-bg-subtle:     #f0efee;   /* lignes alternées, hover */
  --color-bg-overlay:    rgba(0,0,0,.04);

  --color-border:        #e4e2e0;
  --color-border-strong: #cbc8c4;

  --color-text-primary:  #161513;
  --color-text-secondary:#5a5651;
  --color-text-muted:    #a09c97;
  --color-text-inverse:  #ffffff;

  --color-accent:        #426e42;
  --color-accent-hover:  #325432;
  --color-accent-muted:  #dce8dc;
  --color-accent-text:   #193019;

  --color-sidebar-bg:    #ffffff;
  --color-sidebar-item-hover: #f0efee;
  --color-sidebar-item-active: #dce8dc;
  --color-sidebar-item-active-text: #253e25;

  --shadow-card:   0 1px 3px 0 rgba(0,0,0,.06), 0 1px 2px -1px rgba(0,0,0,.04);
  --shadow-modal:  0 20px 60px -10px rgba(0,0,0,.18);
  --radius:        0.5rem;
  --radius-lg:     0.875rem;
}

/* ── Variables CSS – Thème SOMBRE ────────────────── */
.dark {
  --color-bg-base:       #0d0c0b;
  --color-bg-surface:    #161513;
  --color-bg-subtle:     #1e1c1a;
  --color-bg-overlay:    rgba(255,255,255,.04);

  --color-border:        #282624;
  --color-border-strong: #3f3c39;

  --color-text-primary:  #f0efee;
  --color-text-secondary:#a09c97;
  --color-text-muted:    #5a5651;
  --color-text-inverse:  #0d0c0b;

  --color-accent:        #8fb38f;   /* accent éclairci pour fond sombre */
  --color-accent-hover:  #b9d1b9;
  --color-accent-muted:  #1b4332;
  --color-accent-text:   #dce8dc;

  --color-sidebar-bg:    #0d0c0b;
  --color-sidebar-item-hover:  #1e1c1a;
  --color-sidebar-item-active: #1b4332;
  --color-sidebar-item-active-text: #b9d1b9;

  --shadow-card:   0 1px 3px 0 rgba(0,0,0,.5), 0 1px 2px -1px rgba(0,0,0,.4);
  --shadow-modal:  0 20px 60px -10px rgba(0,0,0,.6);
}
```

#### `frontend/src/styles/globals.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@import './themes.css';

@layer base {
  html { @apply font-body antialiased; }
  body {
    background-color: var(--color-bg-base);
    color: var(--color-text-primary);
    transition: background-color 0.2s ease, color 0.2s ease;
  }
  h1, h2, h3 { @apply font-display; }
  code, pre   { @apply font-mono; }
}

@layer components {
  /* Carte standard */
  .card {
    background-color: var(--color-bg-surface);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-card);
  }

  /* Bouton primary */
  .btn-primary {
    @apply inline-flex items-center gap-2 px-4 py-2 text-sm font-medium
           rounded-lg transition-colors duration-150 focus-visible:outline-none
           focus-visible:ring-2 focus-visible:ring-offset-2;
    background-color: var(--color-accent);
    color:            var(--color-text-inverse);
  }
  .btn-primary:hover { background-color: var(--color-accent-hover); }

  /* Bouton ghost */
  .btn-ghost {
    @apply inline-flex items-center gap-2 px-4 py-2 text-sm font-medium
           rounded-lg transition-colors duration-150;
    color: var(--color-text-secondary);
  }
  .btn-ghost:hover { background-color: var(--color-bg-subtle); }

  /* Input standard */
  .input-base {
    @apply w-full rounded-lg px-3 py-2 text-sm transition-shadow duration-150
           focus:outline-none focus:ring-2;
    background-color: var(--color-bg-surface);
    border: 1px solid var(--color-border);
    color: var(--color-text-primary);
  }
  .input-base::placeholder { color: var(--color-text-muted); }
  .input-base:focus { border-color: var(--color-accent); }
}
```

---

### 12.2 Polices

Télécharger et placer dans `frontend/src/assets/fonts/` :

- **DM Serif Display** (Regular 400) – [fonts.google.com/specimen/DM+Serif+Display](https://fonts.google.com/specimen/DM+Serif+Display)
- **DM Sans** (300, 400, 500, 600) – [fonts.google.com/specimen/DM+Sans](https://fonts.google.com/specimen/DM+Sans)
- **JetBrains Mono** (400, 500) – [fonts.google.com/specimen/JetBrains+Mono](https://fonts.google.com/specimen/JetBrains+Mono)

Référencer via `@font-face` dans `globals.css` (auto-hébergé) ou via balise `<link>` dans `index.html`.

---

### 12.3 `frontend/src/App.tsx`

```tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';
import { queryClient } from './lib/queryClient';
import { RootLayout }    from './components/layout/RootLayout';
import { LoginPage }     from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { DocumentDetailPage } from './pages/DocumentDetailPage';
import { JobsPage }      from './pages/JobsPage';
import { SettingsPage }  from './pages/SettingsPage';
import { NotFoundPage }  from './pages/NotFoundPage';
import { useAuthStore }  from './stores/auth.store';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const token = useAuthStore((s) => s.token);
  return token ? <>{children}</> : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <QueryClientProvider client={queryClient}>
        <Toaster richColors position="top-right" />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/" element={<PrivateRoute><RootLayout /></PrivateRoute>}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard"           element={<DashboardPage />} />
              <Route path="documents"           element={<DocumentsPage />} />
              <Route path="documents/:id"       element={<DocumentDetailPage />} />
              <Route path="jobs"                element={<JobsPage />} />
              <Route path="settings"            element={<SettingsPage />} />
              <Route path="*"                   element={<NotFoundPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
```

---

### 12.4 Layout principal

#### `frontend/src/components/layout/RootLayout.tsx`

```tsx
import { Outlet } from 'react-router-dom';
import { Sidebar }   from './Sidebar';
import { Topbar }    from './Topbar';
import { useUIStore } from '../../stores/ui.store';
import { clsx } from 'clsx';

export function RootLayout() {
  const sidebarCollapsed = useUIStore((s) => s.sidebarCollapsed);

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--color-bg-base)' }}>
      <Sidebar />
      <div className={clsx(
        'flex flex-col flex-1 min-w-0 transition-all duration-200',
        sidebarCollapsed ? 'ml-16' : 'ml-60',
      )}>
        <Topbar />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
```

#### `frontend/src/components/layout/Sidebar.tsx`

Navigation latérale avec items actifs, icônes Heroicons, collapse, badge de statut des files.

Items de navigation :

```typescript
const NAV_ITEMS = [
  { label: 'Tableau de bord', href: '/dashboard', icon: HomeIcon       },
  { label: 'Documents',       href: '/documents',  icon: DocumentIcon   },
  { label: 'Files de jobs',   href: '/jobs',       icon: QueueListIcon  },
  { label: 'Paramètres',      href: '/settings',   icon: Cog6ToothIcon  },
];
```

Comportement :
- Icône hamburger pour toggle collapse.
- Logo GED en haut (texte ou SVG).
- Avatar + nom utilisateur en bas (depuis `useAuthStore`).
- Lien actif : fond `var(--color-sidebar-item-active)`, texte `var(--color-sidebar-item-active-text)`.

#### `frontend/src/components/layout/Topbar.tsx`

- Champ de recherche globale (debounce 300ms).
- Bouton bascule thème light/dark avec icônes `SunIcon` / `MoonIcon`.
- Menu utilisateur (dropdown Headless UI) : profil, déconnexion.

---

### 12.5 Composants UI atomiques

#### `frontend/src/components/ui/Badge.tsx`

```tsx
import { clsx } from 'clsx';

type Variant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'accent';

const variants: Record<Variant, string> = {
  default: 'bg-[var(--color-bg-subtle)] text-[var(--color-text-secondary)]',
  success: 'bg-[color:var(--color-bg-subtle)] text-emerald-700 dark:text-emerald-400',
  warning: 'bg-amber-50   text-amber-700   dark:bg-amber-900/30  dark:text-amber-400',
  danger:  'bg-red-50     text-red-700     dark:bg-red-900/30    dark:text-red-400',
  info:    'bg-blue-50    text-blue-700    dark:bg-blue-900/30   dark:text-blue-400',
  accent:  'bg-[var(--color-accent-muted)] text-[var(--color-accent-text)]',
};

interface BadgeProps { variant?: Variant; children: React.ReactNode; className?: string; }

export function Badge({ variant = 'default', children, className }: BadgeProps) {
  return (
    <span className={clsx(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-medium',
      variants[variant], className,
    )}>
      {children}
    </span>
  );
}
```

#### `frontend/src/components/ui/ProgressBar.tsx`

```tsx
interface ProgressBarProps { value: number; max?: number; label?: string; }

export function ProgressBar({ value, max = 100, label }: ProgressBarProps) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="space-y-1">
      {label && <span className="text-2xs text-[var(--color-text-muted)]">{label} – {pct}%</span>}
      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--color-bg-subtle)' }}>
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${pct}%`, background: 'var(--color-accent)' }}
        />
      </div>
    </div>
  );
}
```

---

### 12.6 Composants documents

#### `DocumentStatusBadge.tsx`

Mapping `DocumentStatus` → `Badge variant` :

```typescript
const STATUS_VARIANT: Record<DocumentStatus, BadgeVariant> = {
  UPLOADING:       'default',
  RECEIVED:        'info',
  SCANNING:        'info',
  SCAN_FAILED:     'danger',
  OCR_IN_PROGRESS: 'warning',
  OCR_COMPLETED:   'success',
  OCR_PARTIAL:     'warning',
  CLASSIFIED:      'accent',
  INDEXED:         'success',
  ARCHIVED:        'default',
  DOCUMENT_ERROR:  'danger',
};
```

#### `DocumentUpload.tsx`

- Zone drag-and-drop (`onDragOver`, `onDrop`).
- Accepte : `application/pdf`, `image/tiff`, `image/png`, `image/jpeg`.
- Taille max : 50 Mo (validation côté client avant upload).
- Affiche une `ProgressBar` pendant le POST multipart.
- Endpoint cible : `POST /api/documents/upload` (multipart/form-data).

#### `DocumentTable.tsx`

TanStack Table v8 avec :
- Colonnes : nom, type, statut (`DocumentStatusBadge`), tenant, date, actions.
- Tri côté serveur (paramètres `sort`, `order` envoyés à l'API).
- Pagination côté serveur (`page`, `limit`).
- Sélection multiple (checkbox) pour actions bulk.
- Skeleton loader pendant le chargement (via `isLoading`).

---

### 12.7 Monitoring des jobs

#### `frontend/src/components/jobs/JobQueuePanel.tsx`

Tableau temps réel des files BullMQ. Rafraîchissement toutes les **5 secondes** via `useQuery` avec `refetchInterval: 5000`.

Endpoint : `GET /api/jobs/queues` → retourne :

```typescript
interface QueueStats {
  name:      string;   // QueueName
  waiting:   number;
  active:    number;
  completed: number;
  failed:    number;
  delayed:   number;
}
```

Affichage : tableau avec une ligne par file, badges colorés pour chaque compteur.

#### `frontend/src/components/jobs/JobProgressCard.tsx`

Carte pour un job actif :
- Nom du job + `correlationId` (tronqué).
- `ProgressBar` animée.
- Temps écoulé (date-fns `formatDistanceToNow`).
- Badge statut.

---

### 12.8 Stores Zustand

#### `frontend/src/stores/auth.store.ts`

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  token:    string | null;
  user:     { id: string; name: string; email: string; tenantId: string } | null;
  setAuth:  (token: string, user: AuthState['user']) => void;
  logout:   () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token:   null,
      user:    null,
      setAuth: (token, user) => set({ token, user }),
      logout:  () => set({ token: null, user: null }),
    }),
    { name: 'ged-auth' },
  ),
);
```

#### `frontend/src/stores/ui.store.ts`

```typescript
import { create } from 'zustand';

interface UIState {
  sidebarCollapsed: boolean;
  toggleSidebar:    () => void;
  activeModal:      string | null;
  openModal:        (name: string) => void;
  closeModal:       () => void;
}

export const useUIStore = create<UIState>()((set) => ({
  sidebarCollapsed: false,
  toggleSidebar:    () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  activeModal:      null,
  openModal:        (name) => set({ activeModal: name }),
  closeModal:       () => set({ activeModal: null }),
}));
```

---

### 12.9 Hooks TanStack Query

#### `frontend/src/hooks/useDocuments.ts`

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/axios';

export interface DocumentListParams {
  page:     number;
  limit:    number;
  status?:  string;
  type?:    string;
  search?:  string;
  tenantId?: string;
}

export function useDocuments(params: DocumentListParams) {
  return useQuery({
    queryKey: ['documents', params],
    queryFn:  () => api.get('/documents', { params }).then((r) => r.data),
    placeholderData: (prev) => prev,   // évite le flash de skeleton au changement de page
  });
}

export function useDocument(id: string) {
  return useQuery({
    queryKey: ['documents', id],
    queryFn:  () => api.get(`/documents/${id}`).then((r) => r.data),
    enabled:  !!id,
  });
}

export function useDeleteDocument() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/documents/${id}`),
    onSuccess:  () => qc.invalidateQueries({ queryKey: ['documents'] }),
  });
}
```

#### `frontend/src/hooks/useJobs.ts`

```typescript
export function useQueueStats() {
  return useQuery({
    queryKey:        ['jobs', 'queues'],
    queryFn:         () => api.get('/jobs/queues').then((r) => r.data),
    refetchInterval: 5_000,   // polling 5s
  });
}
```

---

### 12.10 Pages

#### `DashboardPage.tsx` – KPIs et activité

Afficher en haut 4 **cartes KPI** :
- Documents traités aujourd'hui
- Jobs en attente (total toutes files)
- Taux de réussite OCR (7 jours)
- Stockage utilisé (local, `GET /api/stats/storage`)

Sous les KPIs : tableau `JobQueuePanel` + activité récente (derniers 10 documents).

Palette et typographie :
- Valeurs chiffrées en `font-display` taille `text-3xl`.
- Labels en `font-body text-sm text-[var(--color-text-secondary)]`.
- Bordure supérieure de chaque carte en `var(--color-accent)` (4px, accent-colored top border).

#### `DocumentsPage.tsx` – Gestion documentaire

- `DocumentFilters` en haut (type, statut, date range, recherche).
- Toggle vue liste / grille (icônes `ListBulletIcon` / `Squares2X2Icon`).
- Vue liste : `DocumentTable`.
- Vue grille : grille 3 colonnes de `DocumentCard`.
- Bouton "Déposer un document" → `DocumentUpload` dans un `Drawer`.

#### `DocumentDetailPage.tsx` – Détail document

Layout 2 colonnes :
- Gauche (60%) : `DocumentViewer` (iframe pour PDF, `<img>` pour images).
- Droite (40%) : onglets Headless UI :
  - **Informations** : métadonnées, statut, type, confidence.
  - **Texte OCR** : texte brut paginé par pages.
  - **Historique** : `JobTimeline` (étapes du workflow).

#### `JobsPage.tsx` – Monitoring

- `JobQueuePanel` (tableau des files).
- Sélecteur de file → liste des jobs actifs/failed.
- Bouton "Vider la file" (DELETE `/api/jobs/queues/{name}`, admin only).

---

### 12.11 `frontend/src/lib/axios.ts`

```typescript
import axios from 'axios';
import { useAuthStore } from '../stores/auth.store';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api',
  timeout: 30_000,
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);
```

---

### 12.12 Variables d'environnement frontend

Fichier `frontend/.env` (non commité) :

```dotenv
VITE_API_URL=http://localhost:3000/api
```

Fichier `frontend/.env.example` (commité) :

```dotenv
VITE_API_URL=
```

> Toute variable exposée au frontend **doit** être préfixée `VITE_`.  
> Ne jamais placer de secrets dans ce fichier.

---

### 12.13 `frontend/vite.config.ts`

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
  build: {
    outDir: '../dist/frontend',  // servi par NestJS en production
  },
});
```

---

## 13. Supervision et observabilité

### 11.1 `src/admin/queue-admin.module.ts`

```typescript
import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bullmq';
import { ExpressAdapter } from '@bull-board/express';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { createBullBoard } from '@bull-board/api';
import { QueueName } from '../common/queues/queue-names.enum';

// Le module expose le middleware Bull Board sur /admin/queues
// Protégé par BasicAuth utilisant BULL_BOARD_USERNAME / BULL_BOARD_PASSWORD

@Module({})
export class QueueAdminModule implements NestModule {
  constructor(
    @InjectQueue(QueueName.DOCUMENT_INGESTION) private q1: Queue,
    @InjectQueue(QueueName.OCR_EXTRACTION)     private q2: Queue,
    @InjectQueue(QueueName.CLASSIFICATION)     private q3: Queue,
    @InjectQueue(QueueName.INDEXING)           private q4: Queue,
    @InjectQueue(QueueName.WORKFLOW_ENGINE)    private q5: Queue,
    @InjectQueue(QueueName.NOTIFICATION)       private q6: Queue,
    @InjectQueue(QueueName.ARCHIVE)            private q7: Queue,
    @InjectQueue(QueueName.DEAD_LETTER)        private q8: Queue,
    private readonly config: ConfigService,
  ) {}

  configure(consumer: MiddlewareConsumer): void {
    const serverAdapter = new ExpressAdapter();
    serverAdapter.setBasePath('/admin/queues');

    createBullBoard({
      queues: [
        this.q1, this.q2, this.q3, this.q4,
        this.q5, this.q6, this.q7, this.q8,
      ].map((q) => new BullMQAdapter(q)),
      serverAdapter,
    });

    // BasicAuth middleware – à implémenter avant d'exposer
    consumer.apply(/* BasicAuthMiddleware */, serverAdapter.getRouter()).forRoutes('/admin/queues');
  }
}
```

### 11.2 Métriques Prometheus

Exposer via `/metrics` (endpoint HTTP sur un port dédié, ex. 9090) :

| Métrique | Labels |
|---|---|
| `bullmq_jobs_waiting_total` | `queue` |
| `bullmq_jobs_active_total` | `queue` |
| `bullmq_jobs_completed_total` | `queue` |
| `bullmq_jobs_failed_total` | `queue` |
| `bullmq_jobs_duration_seconds` | `queue`, `quantile` |

### 11.3 Logs structurés

Chaque log doit contenir `correlationId` issu de `job.data.correlationId`.  
Format recommandé (JSON) :

```json
{
  "level": "log",
  "context": "OcrProcessor",
  "correlationId": "uuid-v4",
  "documentId": "uuid-v4",
  "tenantId": "uuid-v4",
  "message": "OCR terminé",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 11.4 Alertes

Conditions déclenchant une alerte Slack (`SLACK_WEBHOOK_URL`) :

- Profondeur d'une file > `QUEUE_DEPTH_ALERT_THRESHOLD` (défaut : 500).
- Taux d'échec > 5 % sur une fenêtre glissante de 5 minutes.
- Job en état `failed` sur la file `dead-letter`.

---

## 14. Tests

### 12.1 Tests unitaires (jest)

Fichier type : `src/agents/ocr/ocr.processor.spec.ts`

```typescript
describe('OcrProcessor', () => {
  let processor: OcrProcessor;
  let ocrService: jest.Mocked<OcrService>;
  let mockJob: Partial<Job<OcrJobData>>;

  beforeEach(() => {
    ocrService = { processDocument: jest.fn(), handleFailure: jest.fn() } as any;
    processor  = new OcrProcessor(ocrService, {} as ConfigService);
    mockJob    = {
      data:           { documentId: 'doc-1', tenantId: 'tenant-1', correlationId: 'corr-1',
                        filePath: 's3/key', language: 'fra' },
      updateProgress: jest.fn(),
      opts:           { attempts: 5 },
      attemptsMade:   0,
    };
  });

  it('doit appeler ocrService.processDocument et retourner le résultat', async () => {
    ocrService.processDocument.mockResolvedValue({ pageCount: 3 });
    const result = await processor.handleExtract(mockJob as Job<OcrJobData>);
    expect(result).toEqual({ pageCount: 3 });
    expect(mockJob.updateProgress).toHaveBeenCalledWith(100);
  });

  it('doit propager l\'erreur pour déclencher le retry BullMQ', async () => {
    ocrService.processDocument.mockRejectedValue(new Error('timeout'));
    await expect(processor.handleExtract(mockJob as Job<OcrJobData>)).rejects.toThrow('timeout');
  });

  it('doit stopper les retries sur NonRetriableError', async () => {
    ocrService.processDocument.mockRejectedValue(new NonRetriableError('fichier corrompu'));
    await expect(processor.handleExtract(mockJob as Job<OcrJobData>))
      .rejects.toBeInstanceOf(NonRetriableError);
  });
});
```

### 12.2 Tests d'intégration

Utiliser `@testcontainers/redis` et `@testcontainers/mysql` :

```typescript
// jest.integration.config.ts : timeout 60s, testEnvironment node
it('doit traiter un job OCR de bout en bout', async () => {
  const job = await ocrQueue.add('extract', validOcrJobData, { jobId: 'test-ocr-1' });
  const result = await job.waitUntilFinished(queueEvents, 30_000);
  expect(result.pageCount).toBeGreaterThan(0);
  const ocrResults = await ocrResultRepo.find({ where: { documentId: validOcrJobData.documentId } });
  expect(ocrResults.length).toBeGreaterThan(0);
});
```

### 12.3 Test de charge

```bash
# Simuler 1000 jobs OCR simultanés
npm run test:load -- --jobs=1000 --queue=ocr-extraction
```

---

## 15. Déploiement

### 13.1 Démarrage

```bash
# Build
npm run build

# Démarrer les workers (sans serveur HTTP)
npm run start:agents
```

### 13.2 Dockerfile (multi-stage)

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
# Dépendances système
RUN apk add --no-cache \
    tesseract-ocr tesseract-ocr-data-fra tesseract-ocr-data-eng \
    ghostscript \
    libreoffice \
    clamav clamav-daemon

WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY .env.agents .env.agents

ENV NODE_ENV=production
CMD ["node", "dist/main.agents.js"]
```

### 13.3 Scalabilité horizontale (KEDA)

```yaml
# ScaledObject Kubernetes – scaler basé sur la profondeur de file Redis
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: ged-agents-scaler
spec:
  scaleTargetRef:
    name: ged-agents
  minReplicaCount: 1
  maxReplicaCount: 10
  triggers:
    - type: redis
      metadata:
        address: redis.prod.internal:6379
        listName: bull:ocr-extraction:wait
        listLength: "50"
```

### 13.4 Garanties de traitement unique

- `jobId` basé sur l'identifiant métier (ex. `ocr-{documentId}`) → `add()` idempotent.
- Verrous distribués `redlock` pour les opérations critiques (archivage).
- `workflow-engine` : `concurrency: 1` pour l'ordre des événements.

---

## 16. Checklist de génération

> Le LLM doit cocher chaque élément avant de considérer le projet complet.

### Fichiers backend obligatoires

- [ ] `.env.agents`
- [ ] `.env.example`
- [ ] `src/main.agents.ts`
- [ ] `src/config/bull.config.ts`
- [ ] `src/config/database.config.ts`
- [ ] `src/config/env.validation.ts`
- [ ] `src/common/queues/queue-names.enum.ts` — contient `DEAD_LETTER`
- [ ] `src/common/errors/non-retriable.error.ts`
- [ ] `src/agents/agents.module.ts`
- [ ] `src/agents/entities/job-record.entity.ts`
- [ ] `src/agents/listeners/job-lifecycle.listener.ts`
- [ ] `src/documents/entities/document.entity.ts`
- [ ] `src/documents/entities/ocr-result.entity.ts`
- [ ] `src/documents/enums/document-status.enum.ts`
- [ ] `src/documents/enums/document-type.enum.ts`
- [ ] `src/storage/storage.module.ts`
- [ ] `src/storage/storage.service.ts` — **LocalStorageService** (pas S3)
- [ ] Pour chaque agent (`document-ingestion`, `ocr`, `classification`, `indexing`, `workflow-engine`, `notification`, `archive`, `cleanup`) :
  - [ ] `*.module.ts`
  - [ ] `*.processor.ts` (sauf `cleanup`)
  - [ ] `*.service.ts`
  - [ ] `interfaces/*-job.interface.ts` (sauf `cleanup`)
- [ ] `src/admin/queue-admin.module.ts`

### Fichiers frontend obligatoires

- [ ] `frontend/package.json`
- [ ] `frontend/vite.config.ts`
- [ ] `frontend/tailwind.config.ts`
- [ ] `frontend/postcss.config.js`
- [ ] `frontend/tsconfig.json`
- [ ] `frontend/.env.example`
- [ ] `frontend/index.html`
- [ ] `frontend/src/main.tsx`
- [ ] `frontend/src/App.tsx`
- [ ] `frontend/src/vite-env.d.ts`
- [ ] `frontend/src/styles/globals.css`
- [ ] `frontend/src/styles/themes.css`
- [ ] `frontend/src/lib/axios.ts`
- [ ] `frontend/src/lib/queryClient.ts`
- [ ] `frontend/src/lib/utils.ts`
- [ ] `frontend/src/stores/auth.store.ts`
- [ ] `frontend/src/stores/ui.store.ts`
- [ ] `frontend/src/hooks/useDocuments.ts`
- [ ] `frontend/src/hooks/useJobs.ts`
- [ ] `frontend/src/hooks/useTheme.ts`
- [ ] `frontend/src/hooks/useDebounce.ts`
- [ ] Composants `ui/` : `Button`, `Badge`, `Card`, `Input`, `Select`, `Modal`, `Drawer`, `Tooltip`, `Spinner`, `ProgressBar`, `Avatar`, `Divider`, `EmptyState`
- [ ] Composants `layout/` : `RootLayout`, `Sidebar`, `Topbar`, `PageHeader`
- [ ] Composants `documents/` : `DocumentTable`, `DocumentCard`, `DocumentUpload`, `DocumentViewer`, `DocumentStatusBadge`, `DocumentFilters`
- [ ] Composants `jobs/` : `JobQueuePanel`, `JobProgressCard`, `JobTimeline`
- [ ] Pages : `LoginPage`, `DashboardPage`, `DocumentsPage`, `DocumentDetailPage`, `JobsPage`, `SettingsPage`, `NotFoundPage`
- [ ] `frontend/src/types/document.types.ts`
- [ ] `frontend/src/types/job.types.ts`
- [ ] `frontend/src/types/api.types.ts`

### Contraintes critiques à vérifier

- [ ] `maxRetriesPerRequest: null` dans la config Redis BullMQ
- [ ] `enableReadyCheck: false` dans la config Redis BullMQ
- [ ] `DB_SYNCHRONIZE=false` dans `.env.agents` (prod)
- [ ] `QueueName.DEAD_LETTER` enregistré dans `AgentsModule`
- [ ] `NonRetriableError` utilise `Object.setPrototypeOf`
- [ ] **Aucune référence à S3, `@aws-sdk/client-s3`, `S3Client`** dans le projet
- [ ] `LocalStorageService` utilise `fs/promises` (Node.js natif), marqué `@Global()`
- [ ] `LOCAL_STORAGE_ROOT` et `LOCAL_STORAGE_ARCHIVE` créés au démarrage (`onModuleInit`)
- [ ] Aucun secret dans les interfaces `JobData`
- [ ] `correlationId` présent dans toutes les interfaces `JobData`
- [ ] `NestFactory.createApplicationContext` (pas `create`) dans `main.agents.ts`
- [ ] Graceful shutdown (`SIGTERM`, `SIGINT`) dans `main.agents.ts`
- [ ] Package manager : **npm uniquement**
- [ ] Tout accès `.env` backend passe par `ConfigService` (jamais `process.env` direct)
- [ ] Toute variable frontend préfixée `VITE_` dans `frontend/.env`
- [ ] `darkMode: 'class'` dans `tailwind.config.ts`
- [ ] CSS variables `--color-*` définies dans `themes.css` pour BOTH `:root` et `.dark`
- [ ] Thème géré par `ThemeProvider` de `next-themes` avec `attribute="class"` sur `<html>`
- [ ] `useAuthStore` avec `persist` (localStorage) pour conserver le token
- [ ] `refetchInterval: 5000` dans `useQueueStats` pour le polling temps réel
- [ ] Aucune route frontend n'est accessible sans token (guard `PrivateRoute`)
- [ ] Proxy Vite configuré : `/api` → `http://localhost:3000`

---

## 17. Types TypeScript frontend

### `frontend/src/types/document.types.ts`

```typescript
export type DocumentStatus =
  | 'UPLOADING' | 'RECEIVED' | 'SCANNING' | 'SCAN_FAILED'
  | 'OCR_IN_PROGRESS' | 'OCR_COMPLETED' | 'OCR_PARTIAL'
  | 'CLASSIFIED' | 'INDEXED' | 'ARCHIVED' | 'DOCUMENT_ERROR';

export type DocumentType =
  | 'INVOICE' | 'CONTRACT' | 'ID_CARD' | 'RECEIPT' | 'REPORT' | 'UNKNOWN';

export interface Document {
  id:                       string;
  tenantId:                 string;
  originalName:             string;
  mimeType:                 string;
  status:                   DocumentStatus;
  documentType:             DocumentType | null;
  classificationConfidence: number | null;   // 0.0 – 1.0
  indexed:                  boolean;
  filePath:                 string;          // chemin relatif LOCAL_STORAGE_ROOT
  thumbnailKey:             string | null;
  metadata:                 Record<string, string>;
  uploadedBy:               string;          // UUID utilisateur
  createdAt:                string;          // ISO 8601
  updatedAt:                string;
}

export interface DocumentListResponse {
  data:  Document[];
  total: number;
  page:  number;
  limit: number;
}

export interface OcrPage {
  pageNumber: number;
  rawText:    string;
}
```

### `frontend/src/types/job.types.ts`

```typescript
export type JobStatus = 'waiting' | 'active' | 'completed' | 'failed' | 'delayed' | 'paused';

export type QueueName =
  | 'document-ingestion' | 'ocr-extraction' | 'classification'
  | 'indexing' | 'workflow-engine' | 'notification' | 'archive' | 'dead-letter';

export interface QueueStats {
  name:      QueueName;
  waiting:   number;
  active:    number;
  completed: number;
  failed:    number;
  delayed:   number;
}

export interface JobRecord {
  jobId:         string;
  queueName:     QueueName;
  jobName:       string;
  status:        JobStatus;
  attemptsMade:  number;
  correlationId: string | null;
  failedReason:  string | null;
  returnValue:   Record<string, unknown> | null;
  createdAt:     string;
  updatedAt:     string;
}

export interface WorkflowStep {
  step:      string;        // ex: 'OCR_COMPLETED'
  status:    JobStatus;
  timestamp: string;
  details?:  string;
}
```

### `frontend/src/types/api.types.ts`

```typescript
export interface ApiError {
  statusCode: number;
  message:    string | string[];
  error:      string;
}

export interface PaginatedResponse<T> {
  data:  T[];
  total: number;
  page:  number;
  limit: number;
}

export interface KpiStats {
  documentsToday:  number;
  jobsWaiting:     number;
  ocrSuccessRate:  number;   // pourcentage 0–100
  storageUsedBytes: number;
}
```

---

## 18. Configuration TypeScript frontend

### `frontend/tsconfig.json`

```json
{
  "compilerOptions": {
    "target":          "ES2020",
    "useDefineForClassFields": true,
    "lib":             ["ES2020", "DOM", "DOM.Iterable"],
    "module":          "ESNext",
    "skipLibCheck":    true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit":          true,
    "jsx":             "react-jsx",
    "strict":          true,
    "noUnusedLocals":  true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl":         ".",
    "paths":           { "@/*": ["src/*"] }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

### `frontend/postcss.config.js`

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

### `frontend/src/lib/utils.ts`

```typescript
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Fusionne les classes Tailwind sans conflits */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** Formate une taille en bytes vers Ko / Mo / Go */
export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return '0 o';
  const k    = 1024;
  const dm   = decimals < 0 ? 0 : decimals;
  const sizes = ['o', 'Ko', 'Mo', 'Go', 'To'];
  const i    = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

/** Tronque un UUID pour l'affichage : "3f2a…b9c1" */
export function shortId(id: string): string {
  return `${id.slice(0, 4)}…${id.slice(-4)}`;
}
```

### `frontend/src/lib/queryClient.ts`

```typescript
import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:        30_000,        // 30 secondes
      retry:            1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});
```

---

## 19. Pages – implémentation détaillée

### `frontend/src/pages/LoginPage.tsx`

```tsx
// Layout : centré, fond var(--color-bg-base)
// Card centrale 400px max : logo GED + titre "Connexion" (font-display)
// Formulaire React Hook Form + Zod :
//   - champ email (type="email", requis)
//   - champ mot de passe (type="password", requis, min 8 car)
// Bouton "Se connecter" (btn-primary, pleine largeur)
// onSubmit → POST /api/auth/login → { access_token, user }
//          → useAuthStore.setAuth(token, user)
//          → navigate('/dashboard')
// Erreur 401 → toast.error('Identifiants incorrects')
// Pas de lien "inscription" (B2B : comptes créés par admin)
```

### `frontend/src/pages/DashboardPage.tsx`

```tsx
// Structure :
// <PageHeader title="Tableau de bord" />
// Grille 2×2 de KpiCard (GET /api/stats/kpi)
//   KpiCard { label, value, unit?, trend?, icon: HeroIcon }
//   - "Documents traités" (aujourd'hui, icône DocumentIcon)
//   - "Jobs en attente"   (total, icône QueueListIcon, danger si > QUEUE_DEPTH_ALERT_THRESHOLD)
//   - "Réussite OCR"      (%, 7 jours, success si > 95%)
//   - "Stockage utilisé"  (formatBytes, icône ArchiveBoxIcon)
// Séparateur
// <JobQueuePanel /> (tableau files)
// Titre "Activité récente"
// useDocuments({ page:1, limit:10, sort:'createdAt', order:'desc' })
// Tableau léger 5 colonnes : nom, type, statut, date, lien →
```

### `frontend/src/pages/DocumentDetailPage.tsx`

```tsx
// Récupérer l'ID via useParams()
// useDocument(id) → data: Document
// Layout 2 colonnes (60/40) :
//
// COL GAUCHE :
//   <DocumentViewer filePath={data.filePath} mimeType={data.mimeType} />
//   → si PDF : <iframe src={`${VITE_API_URL}/files/${filePath}`} className="w-full h-full" />
//   → si image : <img src={...} className="max-w-full object-contain" />
//
// COL DROITE :
//   <Tab.Group> (Headless UI)
//     Tab "Informations"
//       - Nom original, taille, MIME
//       - <DocumentStatusBadge status={data.status} />
//       - Type document + confidence (ProgressBar 0–100%)
//       - Métadonnées (tableau clé/valeur)
//     Tab "Texte OCR"
//       - GET /api/documents/:id/ocr → OcrPage[]
//       - Sélecteur page (si multi-pages)
//       - <pre className="font-mono text-sm whitespace-pre-wrap">{page.rawText}</pre>
//     Tab "Historique"
//       - GET /api/documents/:id/workflow → WorkflowStep[]
//       - <JobTimeline steps={steps} />
```

---

## 20. Règles de génération absolues (rappel final LLM)

> Ces règles prévalent sur toute inférence ou convention implicite.

1. **Un fichier = une responsabilité.** Ne jamais fusionner deux modules dans un seul fichier.
2. **Aucune importation circulaire.** `StorageModule` est `@Global()` ; les agents l'utilisent sans l'importer explicitement dans leur propre module.
3. **Jamais `process.env.X` directement.** Toujours `configService.get<T>('VAR')`.
4. **Jamais `@aws-sdk/*`.** Le stockage est exclusivement local (`fs/promises`).
5. **`npm` uniquement.** Toute commande de package commence par `npm`.
6. **CSS variables pour les couleurs.** Pas de valeur hexadécimale codée en dur dans les composants React. Utiliser `var(--color-*)` ou les classes Tailwind qui les référencent.
7. **Pas de `any` TypeScript** sauf si inévitable et commenté.
8. **Chaque processor BullMQ** doit avoir un bloc `try/catch` distinguant `NonRetriableError` des erreurs transitoires.
9. **Chaque interface `JobData`** doit contenir `correlationId: string`.
10. **Le thème sombre** ne modifie jamais les propriétés de layout (margin, padding, flex) — uniquement `color`, `background-color`, `border-color`, `box-shadow`.
