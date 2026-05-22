import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Tab } from '@headlessui/react';
import { useQuery } from '@tanstack/react-query';
import { cn } from '../lib/utils';
import { api } from '../lib/axios';
import { PageHeader } from '../components/layout/PageHeader';
import { DocumentViewer } from '../components/documents/DocumentViewer';
import { DocumentStatusBadge } from '../components/documents/DocumentStatusBadge';
import { JobTimeline } from '../components/jobs/JobTimeline';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Spinner } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { useDocument } from '../hooks/useDocuments';
import type { OcrPage } from '../types/document.types';
import type { WorkflowStep } from '../types/job.types';

export function DocumentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data: doc, isLoading: docLoading } = useDocument(id ?? '');

  const [selectedTab, setSelectedTab] = useState(0);
  const [selectedOcrPage, setSelectedOcrPage] = useState(0);

  const { data: ocrPages, isLoading: ocrLoading } = useQuery<OcrPage[]>({
    queryKey: ['documents', id, 'ocr'],
    queryFn: () => api.get(`/documents/${id}/ocr`).then((r) => r.data),
    enabled: !!id && selectedTab === 1,
  });

  const { data: workflowSteps, isLoading: workflowLoading } = useQuery<WorkflowStep[]>({
    queryKey: ['documents', id, 'workflow'],
    queryFn: () => api.get(`/documents/${id}/workflow`).then((r) => r.data),
    enabled: !!id && selectedTab === 2,
  });

  if (docLoading) {
    return (
      <div>
        <PageHeader title="Chargement..." />
        <div className="flex items-center justify-center py-20">
          <Spinner />
        </div>
      </div>
    );
  }

  if (!doc) {
    return (
      <div>
        <PageHeader title="Document introuvable" />
        <EmptyState
          title="Document introuvable"
          description="Ce document n'existe pas ou a été supprimé."
        />
      </div>
    );
  }

  const TABS = ['Informations', 'Texte OCR', 'Historique'];

  return (
    <div className="space-y-5">
      <PageHeader title={doc.originalName} />

      {/* Layout 2 colonnes : 60/40 */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* COL GAUCHE (60%) */}
        <div className="lg:col-span-3">
          <div className="rounded-xl overflow-hidden" style={{ background: 'var(--color-bg-subtle)' }}>
            <DocumentViewer filePath={doc.filePath} mimeType={doc.mimeType} />
          </div>
        </div>

        {/* COL DROITE (40%) */}
        <div className="lg:col-span-2">
          <div className="card overflow-hidden">
            <Tab.Group selectedIndex={selectedTab} onChange={setSelectedTab}>
              <Tab.List className="flex border-b border-[var(--color-border)]">
                {TABS.map((tab) => (
                  <Tab
                    key={tab}
                    className={({ selected }) =>
                      cn(
                        'flex-1 px-4 py-3 text-sm font-medium transition-colors duration-100',
                        'focus:outline-none',
                        selected
                          ? 'text-[var(--color-accent)] border-b-2 border-[var(--color-accent)]'
                          : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]',
                      )
                    }
                  >
                    {tab}
                  </Tab>
                ))}
              </Tab.List>

              <Tab.Panels className="p-5">
                {/* TAB 1 : Informations */}
                <Tab.Panel className="space-y-4">
                  <div className="space-y-3">
                    {/* Statut */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--color-text-secondary)]">Statut</span>
                      <DocumentStatusBadge status={doc.status} />
                    </div>

                    {/* Type */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--color-text-secondary)]">Type</span>
                      <span className="text-sm font-medium text-[var(--color-text-primary)]">
                        {doc.documentType ?? 'Non classifié'}
                      </span>
                    </div>

                    {/* Confiance */}
                    {doc.classificationConfidence !== null && (
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-sm text-[var(--color-text-secondary)]">Confiance</span>
                          <span className="text-sm text-[var(--color-text-primary)]">
                            {(doc.classificationConfidence * 100).toFixed(0)}%
                          </span>
                        </div>
                        <ProgressBar value={doc.classificationConfidence * 100} />
                      </div>
                    )}

                    {/* Indexé */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[var(--color-text-secondary)]">Indexé</span>
                      <span className="text-sm text-[var(--color-text-primary)]">
                        {doc.indexed ? 'Oui' : 'Non'}
                      </span>
                    </div>

                    <div className="border-t border-[var(--color-border)]" />

                    {/* Métadonnées */}
                    <h4 className="text-sm font-medium text-[var(--color-text-primary)]">
                      Métadonnées
                    </h4>
                    {doc.metadata && Object.keys(doc.metadata).length > 0 ? (
                      <div className="space-y-2">
                        {Object.entries(doc.metadata).map(([key, value]) => (
                          <div key={key} className="flex items-start justify-between gap-2">
                            <span className="text-2xs text-[var(--color-text-muted)] uppercase tracking-wider">
                              {key}
                            </span>
                            <span className="text-sm text-[var(--color-text-primary)] text-right break-all max-w-[60%]">
                              {String(value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-[var(--color-text-muted)]">Aucune métadonnée</p>
                    )}
                  </div>
                </Tab.Panel>

                {/* TAB 2 : Texte OCR */}
                <Tab.Panel className="space-y-4">
                  {ocrLoading ? (
                    <div className="flex justify-center py-8">
                      <Spinner />
                    </div>
                  ) : ocrPages && ocrPages.length > 0 ? (
                    <>
                      {/* Sélecteur de page */}
                      {ocrPages.length > 1 && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-[var(--color-text-muted)]">Page</span>
                          <select
                            className="input-base w-auto"
                            value={selectedOcrPage}
                            onChange={(e) => setSelectedOcrPage(Number(e.target.value))}
                          >
                            {ocrPages.map((page, idx) => (
                              <option key={page.pageNumber} value={idx}>
                                {page.pageNumber}
                              </option>
                            ))}
                          </select>
                          <span className="text-2xs text-[var(--color-text-muted)]">
                            sur {ocrPages.length} page{ocrPages.length > 1 ? 's' : ''}
                          </span>
                        </div>
                      )}

                      {/* Texte brut */}
                      <pre
                        className="font-mono text-sm whitespace-pre-wrap rounded-lg p-4 overflow-auto max-h-[400px]"
                        style={{
                          background: 'var(--color-bg-subtle)',
                          color: 'var(--color-text-primary)',
                        }}
                      >
                        {ocrPages[selectedOcrPage]?.rawText ?? 'Aucun texte extrait'}
                      </pre>
                    </>
                  ) : (
                    <p className="text-sm text-[var(--color-text-muted)] text-center py-8">
                      Aucun texte OCR disponible
                    </p>
                  )}
                </Tab.Panel>

                {/* TAB 3 : Historique */}
                <Tab.Panel>
                  {workflowLoading ? (
                    <div className="flex justify-center py-8">
                      <Spinner />
                    </div>
                  ) : workflowSteps && workflowSteps.length > 0 ? (
                    <JobTimeline steps={workflowSteps} />
                  ) : (
                    <p className="text-sm text-[var(--color-text-muted)] text-center py-8">
                      Aucun historique disponible
                    </p>
                  )}
                </Tab.Panel>
              </Tab.Panels>
            </Tab.Group>
          </div>
        </div>
      </div>
    </div>
  );
}
