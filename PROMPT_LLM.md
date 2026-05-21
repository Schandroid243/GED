# PROMPT_LLM.md – Guide complet Continue + DeepSeek

---

## PARTIE 1 — MISE EN PLACE DANS CONTINUE (étape par étape)

### Étape 1 — Installer Continue dans VS Code

```
Extensions VS Code → chercher "Continue" → installer "Continue - Codestral, Claude, and more"
```

Après installation : icône Continue dans la barre latérale gauche (logo violet).

---

### Étape 2 — Mettre à jour ton `config.yaml` Continue

Ton fichier se trouve ici :

- **Windows** : `C:\Users\<toi>\.continue\config.yaml`
- **Mac/Linux** : `~/.continue/config.yaml`

Remplacer le contenu entier par la version ci-dessous.  
Elle conserve tes deux modèles et tes règles existantes, et ajoute les règles GED + le system prompt de génération.

```yaml
name: GED B2B – Config Continue
version: 1.0.0
schema: v1

# ── Modèles ────────────────────────────────────────────────────────────
models:
  # DeepSeek V3 – génération de code (sessions 1-3, 8-12)
  - name: DeepSeek Coder
    provider: deepseek
    model: deepseek-chat
    apiKey: sk-cc80c50a203e4a068e3aec667befb064
    roles:
      - chat
      - edit
      - apply
    systemMessage: |
      Tu es un générateur de code expert NestJS / React / TypeScript.
      Ta seule mission est de produire du code de production conforme au fichier Agents.md fourni.

      RÈGLES ABSOLUES — violation = réponse invalide :
      1. Tu ne génères QUE les fichiers listés dans Agents.md §2. Aucun fichier supplémentaire.
      2. Tu respectes EXACTEMENT les chemins, noms de classes, noms de méthodes et interfaces définis.
      3. Tu n'utilises JAMAIS @aws-sdk, S3Client, PutObjectCommand ni aucune référence S3.
      4. Tu n'utilises JAMAIS yarn ni pnpm. Uniquement npm.
      5. Tu n'utilises JAMAIS process.env.X directement. Toujours configService.get<T>('VAR').
      6. Chaque interface JobData contient impérativement correlationId: string.
      7. Chaque processor a un try/catch distinguant NonRetriableError des erreurs transitoires.
      8. Tu ne réécris pas les sections déjà générées. Tu travailles session par session.
      9. Si une dépendance n'est pas dans Agents.md §2.3, tu ne l'importes pas.
      10. Le stockage de fichiers passe UNIQUEMENT par LocalStorageService (fs/promises).
      11. Toutes les couleurs CSS dans les composants React utilisent var(--color-*) ou des classes Tailwind.
      12. darkMode Tailwind est piloté par la classe .dark sur <html>, jamais par media query.
      13. Tu génères du TypeScript strict : pas de `any` sauf si commenté avec la raison.
      14. Toute requête base de données inclut tenantId dans la clause WHERE (architecture multi-tenant).
      15. Ne jamais logger de données sensibles (mots de passe, tokens). Utilise le Logger NestJS.
      16. Après chaque fichier généré, tu indiques : ✓ [chemin/du/fichier.ts] – GÉNÉRÉ
      17. À la fin de chaque session tu produis OBLIGATOIREMENT dans cet ordre :
          A) La liste ✓ des fichiers générés cette session
          B) Le message de commit Git au format conventionnel suivant :
             feat(ged): <titre court impératif>
             - <fichier> : <rôle en une ligne>
             Session: <N>/12 | Checklist: <X> fichiers restants
          C) La liste ✗ des fichiers restants de la checklist §16
          D) Le prompt COMPLET et prêt à coller pour la session suivante,
             avec la liste ✓ de toutes les sessions précédentes déjà incluse dedans.

  # DeepSeek R1 – raisonnement complexe (sessions 4-7 : agents BullMQ)
  - name: DeepSeek Reasoner
    provider: deepseek
    model: deepseek-reasoner
    apiKey: sk-.....
    roles:
      - chat
    systemMessage: |
      Tu es un générateur de code expert NestJS / TypeScript spécialisé dans les architectures
      asynchrones BullMQ. Ta seule mission est de produire du code de production conforme au
      fichier Agents.md fourni. Applique toutes les règles absolues définies dans ce fichier.
      Après chaque session, fournis obligatoirement : ✓ liste, commit, ✗ restants, prompt suivant.

# ── Fournisseurs de contexte ───────────────────────────────────────────
context:
  - provider: code
  - provider: docs
  - provider: terminal
  - provider: diff
  - provider: folder
  - provider: codebase

# ── Règles globales (tes règles existantes + règles GED) ───────────────
rules:
  # ── Règles générales (tes règles originales) ──
  - name: Langue
    rule: "Réponds toujours en français, même si le code est en anglais."

  - name: Style de code
    rule: "Écris du code clair, bien commenté, et sans `any` TypeScript."

  - name: Tests
    rule: "Propose toujours un test unitaire avec chaque nouvelle fonction."

  - name: Cohérence architecture
    rule: "Respecter une architecture propre, maintenable et cohérente entre tous les fichiers."

  - name: Gestion des erreurs
    rule: "Inclure une gestion explicite des erreurs et des cas limites."

  - name: Sécurité
    rule: >
      Éviter les pratiques dangereuses ou non sécurisées dans le code généré.
      Ne jamais logger de données sensibles (mots de passe, tokens, données personnelles).
      Utilise le Logger NestJS du projet, jamais console.log.

  - name: Complétude des imports
    rule: "Tous les imports nécessaires doivent être présents et valides."

  - name: Compatibilité TypeScript
    rule: "Le code TypeScript doit être compatible avec le mode strict (`strict: true`)."

  - name: Projet complet
    rule: "Ne jamais laisser un projet incomplet. Fournir tous les éléments nécessaires au fonctionnement."

  - name: Exhaustivité des fichiers
    rule: "Ne jamais omettre un fichier nécessaire au projet, à la compilation ou à l'exécution."

  - name: Fichiers complets
    rule: "Chaque fichier fourni doit contenir un code complet, cohérent et directement exploitable."

  - name: Réponses concises
    rule: "Éviter toute divagation inutile. Répondre de manière précise, structurée et orientée exécution."

  - name: Typage strict
    rule: "Toutes les variables, fonctions, paramètres et retours doivent être correctement typés."

  - name: Documentation du code
    rule: "Ajouter des commentaires explicatifs clairs pour chaque fonctionnalité importante."

  - name: Production Ready
    rule: "Chaque fichier généré doit être prêt pour un environnement de production."

  - name: Interdiction du pseudo-code
    rule: "Ne jamais fournir de pseudo-code. Tout code doit être exécutable et complet."

  - name: Anti-hallucination
    rule: "Ne jamais inventer des API, bibliothèques, fichiers, fonctions ou comportements inexistants."

  - name: Multi-tenant obligatoire
    rule: >
      Toute requête base de données doit inclure tenantId dans la clause WHERE.
      Sans cette règle, on a une fuite de données cross-tenant.

  # ── Règles spécifiques GED B2B ──
  - name: GED – Stockage local uniquement
    rule: >
      Le stockage de fichiers est LOCAL (fs/promises). Interdiction absolue d'utiliser
      @aws-sdk/client-s3, S3Client, PutObjectCommand, GetObjectCommand ou toute référence S3/MinIO.
      Toujours passer par LocalStorageService (src/storage/storage.service.ts).

  - name: GED – Variables d'environnement
    rule: >
      Toutes les variables d'environnement backend sont lues via ConfigService.get<T>('VAR').
      Jamais process.env.X directement. Les vars frontend sont préfixées VITE_.

  - name: GED – Package manager
    rule: >
      Le package manager est npm EXCLUSIVEMENT. Jamais yarn, pnpm ou bun.
      Toute commande d'installation commence par npm install ou npm ci.

  - name: GED – BullMQ Redis
    rule: >
      La configuration Redis pour BullMQ doit toujours inclure :
      maxRetriesPerRequest: null et enableReadyCheck: false.
      Sans ces deux options, BullMQ ne fonctionne pas correctement.

  - name: GED – NonRetriableError
    rule: >
      Chaque processor BullMQ doit distinguer NonRetriableError (arrêt définitif)
      des erreurs transitoires (retry automatique). Le try/catch doit systématiquement
      vérifier instanceof NonRetriableError avant de relancer l'erreur.

  - name: GED – correlationId
    rule: >
      Chaque interface JobData doit contenir correlationId: string.
      Ce champ est obligatoire pour le tracing distribué entre agents.

  - name: GED – Point d'entrée workers
    rule: >
      Le fichier src/main.agents.ts utilise NestFactory.createApplicationContext (pas NestFactory.create).
      Les workers n'exposent aucun port HTTP. Handlers SIGTERM et SIGINT obligatoires.

  - name: GED – Thème frontend
    rule: >
      darkMode Tailwind = 'class' (jamais 'media'). Toutes les couleurs dans les composants
      React utilisent var(--color-*) ou des classes Tailwind. Zéro valeur hexadécimale
      codée en dur dans les composants. ThemeProvider de next-themes gère la classe .dark sur html.

  - name: GED – Suivi de session
    rule: >
      À la fin de chaque réponse de génération, produire obligatoirement dans cet ordre :
      A) Liste ✓ des fichiers générés (avec chemin complet)
      B) Message de commit Git au format : feat(ged): titre\n- fichier: rôle\nSession: N/12
      C) Liste ✗ des fichiers restants de la checklist Agents.md §16
      D) Prompt complet prêt à coller pour la session suivante
         (avec liste ✓ de toutes les sessions précédentes déjà incluse)
```

> **Note sur les modèles :**
>
> - **DeepSeek Coder** (`deepseek-chat`) → sessions 1-3 et 8-12 : génération de code pur.
> - **DeepSeek Reasoner** (`deepseek-reasoner`) → sessions 4-7 : logique BullMQ complexe, flux entre agents, gestion des erreurs.
> - Pour changer de modèle dans Continue : menu déroulant en haut du panneau chat.

---

### Étape 3 — Placer les fichiers dans le projet

```
votre-projet/
├── Agents.md          ← racine du projet
├── PROMPT_LLM.md      ← racine du projet
├── .continue/
│   └── config.yaml    ← remplacé à l'étape 2
├── src/               ← sera créé par DeepSeek
└── frontend/          ← sera créé par DeepSeek
```

**Ouvrir le dossier `votre-projet/` dans VS Code** avant de commencer.  
Continue indexe automatiquement les fichiers du workspace via le provider `codebase`.

> ⚠️ **Important** : après avoir modifié `config.yaml`, redémarre VS Code (ou recharge la fenêtre `Ctrl+Shift+P` → _Reload Window_) pour que Continue prenne en compte les nouvelles règles et le system message.

---

### Étape 4 — Initialiser Git avant la session 1

```bash
cd votre-projet
git init
git add Agents.md PROMPT_LLM.md .continue/config.yaml
git commit -m "chore(ged): initialisation projet – ajout Agents.md et config Continue"
```

---

### Étape 5 — Ouvrir Continue et référencer Agents.md

1. Appuyer sur `Ctrl+L` (ou `Cmd+L` Mac) → le panneau Continue s'ouvre à droite
2. **Sélectionner le modèle** "DeepSeek GED" dans le menu déroulant en haut du panneau
3. Dans le champ de message, taper `@` → sélectionner **"Files"** → choisir `Agents.md`
4. `Agents.md` apparaît comme contexte attaché (puce bleue dans le champ)
5. **Garder cet onglet Continue ouvert pour toutes les sessions**

> ⚠️ **Important** : ne pas fermer l'onglet Continue entre les sessions.  
> Si vous le fermez, retaper `@Agents.md` dans la nouvelle conversation.  
> Le contexte `Agents.md` doit être présent dans **chaque** message de session.

---

### Étape 6 — Workflow par session (répéter pour les 12 sessions)

```
┌─────────────────────────────────────────────────────────┐
│  DÉBUT DE SESSION N                                      │
│                                                          │
│  1. Ctrl+L → vérifier que @Agents.md est dans le chat   │
│  2. Coller le PROMPT DE SESSION N (voir Partie 2)        │
│  3. Lire la réponse complète SANS accepter encore        │
│  4. Vérifier : aucun anti-pattern (voir Partie 4)        │
│  5. Accepter les fichiers : clic "Apply" sur chaque bloc │
│  6. Lancer les commandes de vérification (voir Partie 3) │
│  7. Corriger les erreurs TypeScript si besoin             │
│  8. git add . && git commit -m "<message fourni par IA>" │
│  9. Copier le PROMPT SESSION N+1 fourni par l'IA         │
│  10. Répéter                                             │
└─────────────────────────────────────────────────────────┘
```

---

## PARTIE 2 — LES 12 PROMPTS DE SESSION

> Chaque prompt est **prêt à coller** dans Continue.  
> `@Agents.md` doit déjà être dans le contexte (étape 5).

---

### SESSION 1 — Fondations communes

```
@Agents.md

SESSION 1/12 — Fondations communes (§4, §3, §6 de Agents.md)

Génère ces fichiers dans l'ordre exact :
1. src/common/queues/queue-names.enum.ts          → §4.1, DOIT contenir DEAD_LETTER
2. src/common/errors/non-retriable.error.ts       → §4.2, DOIT utiliser Object.setPrototypeOf
3. src/common/filters/job-exception.filter.ts
4. src/config/env.validation.ts                   → §3.3, schéma Joi COMPLET avec toutes les vars
5. src/config/bull.config.ts                      → §6.1, maxRetriesPerRequest:null OBLIGATOIRE
6. src/config/database.config.ts
7. src/documents/enums/document-status.enum.ts    → §4.3
8. src/documents/enums/document-type.enum.ts      → §4.3

Aucun fichier des sessions précédentes à exclure (session 1).

Quand tu as fini, produis dans cet ordre :
A) Liste ✓ des fichiers générés
B) Message de commit Git au format conventionnel
C) Liste ✗ des fichiers restants de la checklist §16
D) Le prompt complet prêt à coller pour la SESSION 2
```

---

### SESSION 2 — Entités TypeORM + Stockage local

```
@Agents.md

SESSION 2/12 — Entités TypeORM (§7) + LocalStorageService (§8)

Génère ces fichiers :
1. src/agents/entities/job-record.entity.ts     → §7.1, index sur [queueName+status] ET [createdAt]
2. src/documents/entities/document.entity.ts    → §7.2
3. src/documents/entities/ocr-result.entity.ts  → §7.3
4. src/storage/storage.service.ts               → §8.2, fs/promises UNIQUEMENT, marqué @Global()
5. src/storage/storage.module.ts                → §8.3

RAPPEL CRITIQUE : zéro référence à S3 ou @aws-sdk dans ces fichiers.
Le service storage utilise fs/promises de Node.js natif.

Fichiers déjà générés (ne pas réécrire) :
[COLLER ICI LA LISTE ✓ DE LA SESSION 1 — fournie par l'IA]

Quand tu as fini : A) ✓ générés B) commit C) ✗ restants D) prompt session 3
```

---

### SESSION 3 — Interfaces JobData

```
@Agents.md

SESSION 3/12 — Interfaces JobData (§5 de Agents.md)

Génère ces fichiers :
1. src/agents/document-ingestion/interfaces/document-ingestion-job.interface.ts
2. src/agents/ocr/interfaces/ocr-job.interface.ts
3. src/agents/classification/interfaces/classification-job.interface.ts
4. src/agents/indexing/interfaces/indexing-job.interface.ts
5. src/agents/workflow-engine/interfaces/workflow-engine-job.interface.ts
6. src/agents/notification/interfaces/notification-job.interface.ts
7. src/agents/archive/interfaces/archive-job.interface.ts

RÈGLES POUR CES FICHIERS :
- Chaque interface DOIT avoir correlationId: string
- filePath = chemin RELATIF depuis LOCAL_STORAGE_ROOT (ex: tenants/uuid/documents/uuid/original.pdf)
- Aucun secret (mot de passe, token) dans ces interfaces
- Respecter exactement les types définis en §5

Fichiers déjà générés (ne pas réécrire) :
[COLLER ICI LA LISTE ✓ DES SESSIONS 1+2]

Quand tu as fini : A) ✓ générés B) commit C) ✗ restants D) prompt session 4
```

---

### SESSION 4 — Agents document-ingestion + ocr

```
@Agents.md

SESSION 4/12 — Agents document-ingestion et ocr (§9.1 et §9.2)

Génère ces fichiers :
1. src/agents/document-ingestion/document-ingestion.module.ts
2. src/agents/document-ingestion/document-ingestion.processor.ts
3. src/agents/document-ingestion/document-ingestion.service.ts
4. src/agents/ocr/ocr.module.ts
5. src/agents/ocr/ocr.processor.ts
6. src/agents/ocr/ocr.service.ts

RÈGLES POUR CES FICHIERS :
- Chaque processor : try/catch distinguant NonRetriableError vs erreur transitoire
- service stockage : appeler LocalStorageService (jamais S3)
- ocr.module.ts : enregistrer aussi QueueName.CLASSIFICATION pour l'enqueue suivant
- document-ingestion.module.ts : enregistrer QueueName.OCR_EXTRACTION pour l'enqueue
- Les méthodes de service ont la signature décrite en §9.1 et §9.2

Fichiers déjà générés (ne pas réécrire) :
[COLLER ICI LA LISTE ✓ DES SESSIONS 1+2+3]

Quand tu as fini : A) ✓ générés B) commit C) ✗ restants D) prompt session 5
```

---

### SESSION 5 — Agents classification + indexing + workflow-engine

```
@Agents.md

SESSION 5/12 — Agents classification, indexing, workflow-engine (§9.3, §9.4, §9.5)

Génère ces fichiers :
1. src/agents/classification/classification.module.ts
2. src/agents/classification/classification.processor.ts
3. src/agents/classification/classification.service.ts
4. src/agents/indexing/indexing.module.ts
5. src/agents/indexing/indexing.processor.ts
6. src/agents/indexing/indexing.service.ts
7. src/agents/workflow-engine/workflow-engine.module.ts
8. src/agents/workflow-engine/workflow-engine.processor.ts
9. src/agents/workflow-engine/workflow-engine.service.ts

RÈGLES SPÉCIFIQUES :
- classification.service.ts : fallback DocumentType.UNKNOWN si 3 tentatives échouent
- workflow-engine : concurrency: 1 OBLIGATOIRE (ordre des événements métier)
- classification backoff : fixed 500ms (§6.2)
- Chaque processor : try/catch NonRetriableError

Fichiers déjà générés (ne pas réécrire) :
[COLLER ICI LA LISTE ✓ DES SESSIONS 1 À 4]

Quand tu as fini : A) ✓ générés B) commit C) ✗ restants D) prompt session 6
```

---

### SESSION 6 — Agents notification + archive + cleanup + listeners

```
@Agents.md

SESSION 6/12 — Agents notification, archive, cleanup et listener (§9.6, §9.7, §9.8)

Génère ces fichiers :
1. src/agents/notification/notification.module.ts
2. src/agents/notification/notification.processor.ts
3. src/agents/notification/notification.service.ts
4. src/agents/archive/archive.module.ts
5. src/agents/archive/archive.processor.ts
6. src/agents/archive/archive.service.ts
7. src/agents/cleanup/cleanup.module.ts
8. src/agents/cleanup/cleanup.service.ts
9. src/agents/listeners/job-lifecycle.listener.ts

RÈGLES SPÉCIFIQUES :
- notification : Dead Letter Queue après 3 échecs (§9.6)
- archive : job CRON repeatable '0 2 * * *' pour le batch nocturne
- cleanup : implémente OnApplicationBootstrap, CRON '0 */6 * * *'
- archive.service.ts : utiliser LocalStorageService.moveToArchive() (jamais S3)
- listener : étend QueueEventsHost, met à jour JobRecord pour active/completed/failed/delayed

Fichiers déjà générés (ne pas réécrire) :
[COLLER ICI LA LISTE ✓ DES SESSIONS 1 À 5]

Quand tu as fini : A) ✓ générés B) commit C) ✗ restants D) prompt session 7
```

---

### SESSION 7 — Module racine + point d'entrée + admin + .env

```
@Agents.md

SESSION 7/12 — Module racine, point d'entrée, admin, fichiers .env (§10, §11, §13.1)

Génère ces fichiers :
1. src/agents/agents.module.ts
2. src/main.agents.ts
3. src/admin/queue-admin.module.ts
4. src/common/queues/all-queues.provider.ts
5. .env.agents
6. .env.example

VÉRIFICATIONS CRITIQUES avant de valider :

agents.module.ts :
- BullModule.registerQueue DOIT inclure { name: QueueName.DEAD_LETTER }
- ConfigModule.forRoot : envFilePath: '.env.agents', validationSchema: envValidationSchema
- TypeOrmModule entities : [JobRecord, Document, OcrResult]
- Tous les modules agents importés : DocumentIngestionModule, OcrModule,
  ClassificationModule, IndexingModule, WorkflowEngineModule,
  NotificationModule, ArchiveModule, CleanupModule

main.agents.ts :
- NestFactory.createApplicationContext (PAS NestFactory.create)
- Handlers SIGTERM et SIGINT avec await app.close()

.env.agents :
- Contient LOCAL_STORAGE_ROOT, LOCAL_STORAGE_ARCHIVE, LOCAL_STORAGE_PUBLIC_URL
- PAS de variable S3_* ni AWS_*

Fichiers déjà générés (ne pas réécrire) :
[COLLER ICI LA LISTE ✓ DES SESSIONS 1 À 6]

Quand tu as fini : A) ✓ générés B) commit C) ✗ restants D) prompt session 8
```

---

### SESSION 8 — Frontend : config + design system

```
@Agents.md

SESSION 8/12 — Frontend config et design system (§12.1, §12.2, §18)

Génère ces fichiers :
1. frontend/package.json
2. frontend/vite.config.ts          → proxy /api → http://localhost:3000
3. frontend/tailwind.config.ts      → §12.1 COMPLET avec toute la palette
4. frontend/postcss.config.js
5. frontend/tsconfig.json           → §18 avec paths @/*
6. frontend/index.html              → lien polices Google Fonts
7. frontend/.env.example            → VITE_API_URL= (vide)
8. frontend/src/vite-env.d.ts
9. frontend/src/styles/globals.css  → §12.1 COMPLET
10. frontend/src/styles/themes.css  → §12.1 COMPLET variables :root ET .dark

VÉRIFICATIONS CRITIQUES :
- darkMode: 'class' dans tailwind.config.ts (PAS 'media')
- themes.css : toutes les variables --color-* présentes dans :root ET dans .dark
- Polices : DM Serif Display, DM Sans, JetBrains Mono
- Palette neutres warm-gray (neutral-0 à neutral-950) + accent vert ardoise

Fichiers déjà générés (ne pas réécrire) :
[COLLER ICI LA LISTE ✓ DES SESSIONS 1 À 7]

Quand tu as fini : A) ✓ générés B) commit C) ✗ restants D) prompt session 9
```

---

### SESSION 9 — Frontend : lib + stores + hooks + types

```
@Agents.md

SESSION 9/12 — Frontend lib, stores, hooks et types (§12.8, §12.9, §17, §18)

Génère ces fichiers :
1. frontend/src/main.tsx
2. frontend/src/App.tsx             → §12.3, ThemeProvider + QueryClientProvider + PrivateRoute
3. frontend/src/lib/axios.ts        → §12.11, intercepteurs JWT + logout 401
4. frontend/src/lib/queryClient.ts  → §18, staleTime 30s
5. frontend/src/lib/utils.ts        → §18, cn(), formatBytes(), shortId()
6. frontend/src/stores/auth.store.ts → §12.8, Zustand persist
7. frontend/src/stores/ui.store.ts   → §12.8, sidebarCollapsed + activeModal
8. frontend/src/hooks/useDocuments.ts → §12.9
9. frontend/src/hooks/useJobs.ts      → §12.9, refetchInterval: 5000
10. frontend/src/hooks/useTheme.ts
11. frontend/src/hooks/useDebounce.ts
12. frontend/src/types/document.types.ts → §17
13. frontend/src/types/job.types.ts      → §17
14. frontend/src/types/api.types.ts      → §17

VÉRIFICATION App.tsx :
- ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}
- PrivateRoute protège toutes les routes sauf /login
- Toutes les pages importées et routées

Fichiers déjà générés (ne pas réécrire) :
[COLLER ICI LA LISTE ✓ DES SESSIONS 1 À 8]

Quand tu as fini : A) ✓ générés B) commit C) ✗ restants D) prompt session 10
```

---

### SESSION 10 — Frontend : composants UI atomiques + layout

```
@Agents.md

SESSION 10/12 — Composants UI atomiques et layout (§12.4, §12.5)

Génère ces fichiers :
1. frontend/src/components/ui/Button.tsx
2. frontend/src/components/ui/Badge.tsx       → §12.5, 6 variants
3. frontend/src/components/ui/Card.tsx
4. frontend/src/components/ui/Input.tsx
5. frontend/src/components/ui/Select.tsx
6. frontend/src/components/ui/Modal.tsx       → Headless UI Dialog
7. frontend/src/components/ui/Drawer.tsx      → Headless UI Dialog glissant
8. frontend/src/components/ui/Tooltip.tsx
9. frontend/src/components/ui/Spinner.tsx
10. frontend/src/components/ui/ProgressBar.tsx → §12.5
11. frontend/src/components/ui/Avatar.tsx
12. frontend/src/components/ui/Divider.tsx
13. frontend/src/components/ui/EmptyState.tsx
14. frontend/src/components/layout/RootLayout.tsx → §12.4
15. frontend/src/components/layout/Sidebar.tsx    → §12.4, NAV_ITEMS, collapse
16. frontend/src/components/layout/Topbar.tsx     → §12.4, recherche + theme toggle
17. frontend/src/components/layout/PageHeader.tsx

VÉRIFICATIONS CRITIQUES :
- Zéro valeur hexadécimale codée en dur dans les composants
- Toutes les couleurs via var(--color-*) ou classes Tailwind
- Badge : variants default/success/warning/danger/info/accent
- ProgressBar : barre colorée en var(--color-accent)
- Sidebar : items actifs avec var(--color-sidebar-item-active)

Fichiers déjà générés (ne pas réécrire) :
[COLLER ICI LA LISTE ✓ DES SESSIONS 1 À 9]

Quand tu as fini : A) ✓ générés B) commit C) ✗ restants D) prompt session 11
```

---

### SESSION 11 — Frontend : composants documents + jobs + charts

```
@Agents.md

SESSION 11/12 — Composants documents, jobs et charts (§12.6, §12.7)

Génère ces fichiers :
1. frontend/src/components/documents/DocumentTable.tsx   → TanStack Table v8, pagination serveur
2. frontend/src/components/documents/DocumentCard.tsx
3. frontend/src/components/documents/DocumentUpload.tsx  → drag-drop, 50Mo max, multipart
4. frontend/src/components/documents/DocumentViewer.tsx  → iframe PDF + img image
5. frontend/src/components/documents/DocumentStatusBadge.tsx → mapping STATUS_VARIANT §12.6
6. frontend/src/components/documents/DocumentFilters.tsx
7. frontend/src/components/jobs/JobQueuePanel.tsx        → refetchInterval:5000, GET /api/jobs/queues
8. frontend/src/components/jobs/JobProgressCard.tsx      → ProgressBar + formatDistanceToNow
9. frontend/src/components/jobs/JobTimeline.tsx
10. frontend/src/components/charts/QueueDepthChart.tsx
11. frontend/src/components/charts/ProcessingStatsChart.tsx

VÉRIFICATIONS :
- DocumentUpload : accepte uniquement application/pdf, image/tiff, image/png, image/jpeg
- DocumentUpload : validation taille < 50Mo AVANT envoi (côté client)
- JobQueuePanel : refetchInterval: 5_000 dans le hook

Fichiers déjà générés (ne pas réécrire) :
[COLLER ICI LA LISTE ✓ DES SESSIONS 1 À 10]

Quand tu as fini : A) ✓ générés B) commit C) ✗ restants D) prompt session 12
```

---

### SESSION 12 — Frontend : pages + audit final

```
@Agents.md

SESSION 12/12 — Pages frontend et audit final (§12.10, §19)

Génère ces fichiers :
1. frontend/src/pages/LoginPage.tsx        → §19, React Hook Form + Zod + POST /api/auth/login
2. frontend/src/pages/DashboardPage.tsx    → §19, 4 KpiCard + JobQueuePanel + activité récente
3. frontend/src/pages/DocumentsPage.tsx    → §19, toggle liste/grille + Drawer upload
4. frontend/src/pages/DocumentDetailPage.tsx → §19, 2 colonnes viewer + onglets Headless UI
5. frontend/src/pages/JobsPage.tsx         → §19, JobQueuePanel + liste jobs par file
6. frontend/src/pages/SettingsPage.tsx
7. frontend/src/pages/NotFoundPage.tsx

APRÈS AVOIR GÉNÉRÉ LES PAGES, effectue l'audit complet :

Parcours la checklist §16 de Agents.md et pour CHAQUE entrée :
✓ si le fichier a été généré dans une session précédente ou celle-ci
✗ si le fichier est manquant

Pour chaque ✗ : génère immédiatement le fichier manquant, puis marque ✓.

Termine par :
A) Tableau récapitulatif : Session | Fichiers | Commit
B) Message de commit final de la session 12
C) Message de commit de merge/release : "feat(ged): projet GED B2B complet – backend agents + frontend"
D) Commandes de vérification finales à lancer

Fichiers déjà générés (ne pas réécrire) :
[COLLER ICI LA LISTE ✓ DES SESSIONS 1 À 11]
```

---

## PARTIE 3 — VÉRIFICATIONS ENTRE CHAQUE SESSION

Lancer ces commandes **après avoir appliqué les fichiers** et **avant le git commit** :

```bash
# ── Vérifications backend ──────────────────────────────────────────

# 1. TypeScript sans erreur
npx tsc --noEmit
# Résultat attendu : aucune sortie (silence = succès)

# 2. Zéro référence S3
grep -r "aws-sdk\|S3Client\|PutObject\|GetObject\|S3_" src/ \
  && echo "❌ RÉFÉRENCE S3 TROUVÉE — rejeter la session" \
  || echo "✓ Aucune référence S3"

# 3. Zéro process.env direct (hors tests)
grep -rn "process\.env\." src/ | grep -v "\.spec\.ts" \
  && echo "❌ process.env direct — utiliser ConfigService" \
  || echo "✓ Pas de process.env direct"

# 4. correlationId présent dans toutes les interfaces JobData
grep -rL "correlationId" src/agents/*/interfaces/ \
  && echo "❌ Interface sans correlationId" \
  || echo "✓ correlationId présent partout"

# 5. NonRetriableError importé dans tous les processors
grep -rL "NonRetriableError" src/agents/*/  \
  --include="*.processor.ts" \
  && echo "❌ Processor sans NonRetriableError" \
  || echo "✓ NonRetriableError présent"

# ── Vérifications frontend ─────────────────────────────────────────

# 6. Zéro hex codé en dur dans les composants
grep -rn "#[0-9a-fA-F]\{3,6\}" frontend/src/components/ \
  && echo "⚠️ Couleurs hex dans composants — utiliser var(--color-*)" \
  || echo "✓ Pas de hex dans les composants"

# 7. darkMode = 'class' (pas 'media')
grep "darkMode" frontend/tailwind.config.ts | grep -q "class" \
  && echo "✓ darkMode: 'class'" \
  || echo "❌ darkMode incorrect"

# 8. VITE_ prefix sur toutes les vars frontend
grep -rn "import\.meta\.env\." frontend/src/ | grep -v "VITE_" \
  && echo "❌ Variable env sans préfixe VITE_" \
  || echo "✓ Préfixes VITE_ corrects"

# 9. Build frontend sans erreur
cd frontend && npm run build && cd ..
# Résultat attendu : "built in X.Xs"

# ── Vérification rapide post-build ────────────────────────────────

# 10. Résumé en une commande
echo "=== AUDIT SESSION ===" && \
  npx tsc --noEmit && echo "✓ TS backend OK" && \
  grep -rq "aws-sdk" src/ && echo "❌ S3!" || echo "✓ No S3" && \
  cd frontend && npm run build 2>&1 | tail -3 && cd ..
```

---

## PARTIE 4 — ANTI-PATTERNS ET CORRECTIFS IMMÉDIATS

Quand l'IA produit un de ces patterns, **ne pas accepter le fichier**.  
Copier le correctif dans Continue et renvoyer.

| ❌ Pattern détecté                                | ✅ Correctif à coller dans Continue                                                                                                |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `import { S3Client } from '@aws-sdk/client-s3'`   | `STOP. Le stockage est LOCAL uniquement. Utilise LocalStorageService avec fs/promises. Voir §8 de Agents.md. Régénère le fichier.` |
| `process.env.REDIS_HOST`                          | `STOP. Utilise this.config.get<string>('REDIS_HOST') via ConfigService. Jamais process.env direct. Régénère.`                      |
| `yarn add` ou `pnpm install`                      | `STOP. Package manager = npm UNIQUEMENT. Remplace par npm install.`                                                                |
| Interface JobData sans `correlationId`            | `STOP. Ajoute correlationId: string à cette interface. C'est obligatoire (§5 Agents.md). Régénère.`                                |
| Processor sans bloc `NonRetriableError`           | `STOP. Le processor doit distinguer NonRetriableError des erreurs transitoires (§9 Agents.md). Ajoute le try/catch complet.`       |
| `NestFactory.create(AgentsModule)`                | `STOP. Les workers n'ont pas de serveur HTTP. Utilise NestFactory.createApplicationContext(AgentsModule). Voir §11.`               |
| Couleur hex `#426e42` dans un composant           | `STOP. Utilise var(--color-accent) ou bg-[color:var(--color-accent)]. Zéro hex dans les composants.`                               |
| `darkMode: 'media'` dans tailwind.config          | `STOP. darkMode doit être 'class'. ThemeProvider gère la classe .dark sur <html>. Corrige.`                                        |
| `BullModule.registerQueue` sans `DEAD_LETTER`     | `STOP. AgentsModule doit enregistrer QueueName.DEAD_LETTER. Voir §10 Agents.md.`                                                   |
| `enableReadyCheck` absent de la config Redis      | `STOP. Ajoute enableReadyCheck: false ET maxRetriesPerRequest: null. Obligatoire pour BullMQ. Voir §6.1.`                          |
| `createApplicationContext` sans graceful shutdown | `STOP. Ajoute les handlers SIGTERM et SIGINT avec await app.close(). Voir §11.`                                                    |
| `refetchInterval` absent dans `useQueueStats`     | `STOP. Ajoute refetchInterval: 5_000 dans useQueueStats. Voir §12.9.`                                                              |

---

## PARTIE 5 — FORMAT DE COMMIT ATTENDU PAR L'IA

L'IA doit produire ce format exact à la fin de chaque session.  
Tu n'as qu'à copier-coller dans le terminal.

**Exemple session 1 :**

```
feat(ged): fondations communes – enums, config BullMQ et validation env

- src/common/queues/queue-names.enum.ts : enum QueueName avec DEAD_LETTER
- src/common/errors/non-retriable.error.ts : classe d'erreur non-retriable
- src/common/filters/job-exception.filter.ts : filtre global exceptions jobs
- src/config/env.validation.ts : schéma Joi complet validation .env.agents
- src/config/bull.config.ts : factory BullMQ avec maxRetriesPerRequest:null
- src/config/database.config.ts : factory TypeORM MySQL
- src/documents/enums/document-status.enum.ts : 11 statuts documentaires
- src/documents/enums/document-type.enum.ts : 6 types de documents

Session: 1/12 | Checklist: 68 fichiers restants
```

**Commande git correspondante :**

```bash
git add .
git commit -m "feat(ged): fondations communes – enums, config BullMQ et validation env

- src/common/queues/queue-names.enum.ts : enum QueueName avec DEAD_LETTER
- src/common/errors/non-retriable.error.ts : classe d'erreur non-retriable
- src/common/filters/job-exception.filter.ts : filtre global exceptions jobs
- src/config/env.validation.ts : schéma Joi complet validation .env.agents
- src/config/bull.config.ts : factory BullMQ avec maxRetriesPerRequest:null
- src/config/database.config.ts : factory TypeORM MySQL
- src/documents/enums/document-status.enum.ts : 11 statuts documentaires
- src/documents/enums/document-type.enum.ts : 6 types de documents

Session: 1/12 | Checklist: 68 fichiers restants"
```

---

## RÉCAPITULATIF VISUEL DU WORKFLOW

```
VS Code ouvert sur /votre-projet
         │
         ▼
Ctrl+L → Continue s'ouvre
         │
         ▼
Taper @Agents.md → fichier indexé dans le contexte
         │
         ▼
┌────────────────────────────────────────────────┐
│  Boucle × 12 sessions                          │
│                                                │
│  1. Coller PROMPT SESSION N (Partie 2)         │
│  2. Lire la réponse complète                   │
│  3. Vérifier anti-patterns (Partie 4)          │
│     └─ Si détecté → coller correctif → retour │
│  4. Cliquer "Apply" sur chaque fichier         │
│  5. Lancer audit (Partie 3)                    │
│     └─ Si erreur → corriger → retour          │
│  6. git add . && git commit -m "..." (Partie 5)│
│  7. Copier PROMPT SESSION N+1 fourni par l'IA  │
│     (il est dans la réponse, section D)        │
└────────────────────────────────────────────────┘
         │
         ▼
Session 12 terminée
         │
         ▼
git tag v1.0.0
git push origin main
```

> **Astuce clé** : le prompt de la session suivante (section D de chaque réponse) est  
> pré-rempli par l'IA avec la liste ✓ des fichiers déjà générés.  
> Tu n'as **jamais** à recopier manuellement cette liste.
