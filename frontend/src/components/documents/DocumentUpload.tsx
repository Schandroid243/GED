import { useState, useCallback, useRef, type DragEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ArrowUpTrayIcon,
  DocumentIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';
import { ProgressBar } from '../ui/ProgressBar';
import { api } from '../../lib/axios';

interface DocumentUploadProps {
  onUploadComplete?: () => void;
  className?: string;
}

const ACCEPTED_TYPES = [
  'application/pdf',
  'image/tiff',
  'image/png',
  'image/jpeg',
];
const ACCEPTED_EXTENSIONS = '.pdf,.tiff,.tif,.png,.jpg,.jpeg';
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 Mo

interface FileStatus {
  file: File;
  progress: number;
  status: 'pending' | 'uploading' | 'success' | 'error';
  error?: string;
}

export function DocumentUpload({ onUploadComplete, className }: DocumentUploadProps) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [files, setFiles] = useState<FileStatus[]>([]);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);

      const response = await api.post('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setFiles((prev) =>
              prev.map((f) =>
                f.file === file ? { ...f, progress: pct } : f,
              ),
            );
          }
        },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      toast.success('Document déposé avec succès');
      onUploadComplete?.();
    },
    onError: (error: Error) => {
      toast.error(`Échec du dépôt : ${error.message}`);
    },
  });

  const validateFile = useCallback((file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type) && !file.name.match(/\.(pdf|tiff?|png|jpe?g)$/i)) {
      return 'Type de fichier non supporté. Accepté : PDF, TIFF, PNG, JPEG.';
    }
    if (file.size > MAX_FILE_SIZE) {
      return `Fichier trop volumineux (max 50 Mo). Taille : ${(file.size / 1024 / 1024).toFixed(1)} Mo.`;
    }
    return null;
  }, []);

  const addFiles = useCallback((newFiles: FileList | File[]) => {
    const fileStatuses: FileStatus[] = [];
    for (const file of Array.from(newFiles)) {
      const error = validateFile(file);
      fileStatuses.push({
        file,
        progress: 0,
        status: error ? 'error' : 'pending',
        error: error ?? undefined,
      });
    }
    setFiles((prev) => [...prev, ...fileStatuses]);
  }, [validateFile]);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragOver(false);
      if (e.dataTransfer.files.length > 0) {
        addFiles(e.dataTransfer.files);
      }
    },
    [addFiles],
  );

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        addFiles(e.target.files);
      }
      e.target.value = '';
    },
    [addFiles],
  );

  const handleUpload = useCallback(() => {
    const pendingFiles = files.filter((f) => f.status === 'pending');
    pendingFiles.forEach((fileStatus) => {
      setFiles((prev) =>
        prev.map((f) =>
          f.file === fileStatus.file ? { ...f, status: 'uploading' } : f,
        ),
      );
      uploadMutation.mutate(fileStatus.file);
    });
  }, [files, uploadMutation]);

  const removeFile = useCallback((fileToRemove: File) => {
    setFiles((prev) => prev.filter((f) => f.file !== fileToRemove));
  }, []);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        className={cn(
          'border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-150',
          'hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-muted)]',
          isDragOver && 'border-[var(--color-accent)] bg-[var(--color-accent-muted)] scale-[1.02]',
          'border-[var(--color-border)]',
        )}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          multiple
          accept={ACCEPTED_EXTENSIONS}
          onChange={handleFileSelect}
        />
        <ArrowUpTrayIcon
          className="h-10 w-10 mx-auto mb-3"
          style={{ color: 'var(--color-text-muted)' }}
        />
        <p className="text-sm font-medium text-[var(--color-text-primary)] mb-1">
          Déposez vos fichiers ici
        </p>
        <p className="text-2xs text-[var(--color-text-muted)]">
          ou cliquez pour sélectionner — PDF, TIFF, PNG, JPEG (max 50 Mo)
        </p>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((fileStatus, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 p-3 rounded-xl card"
            >
              <DocumentIcon
                className="h-6 w-6 shrink-0"
                style={{ color: 'var(--color-text-muted)' }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[var(--color-text-primary)] truncate">
                  {fileStatus.file.name}
                </p>
                <p className="text-2xs text-[var(--color-text-muted)]">
                  {(fileStatus.file.size / 1024 / 1024).toFixed(1)} Mo
                </p>
                {fileStatus.status === 'uploading' && (
                  <ProgressBar
                    value={fileStatus.progress}
                    label="Upload"
                    className="mt-1"
                  />
                )}
                {fileStatus.status === 'error' && fileStatus.error && (
                  <p className="text-2xs text-danger mt-0.5">{fileStatus.error}</p>
                )}
                {fileStatus.status === 'success' && (
                  <p className="text-2xs" style={{ color: 'var(--color-accent)' }}>Déposé</p>
                )}
              </div>
              <button
                onClick={() => removeFile(fileStatus.file)}
                className="btn-ghost p-1 rounded-lg shrink-0"
                disabled={fileStatus.status === 'uploading'}
              >
                <XMarkIcon className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      {files.some((f) => f.status === 'pending') && (
        <Button
          onClick={handleUpload}
          className="w-full"
          isLoading={files.some((f) => f.status === 'uploading')}
        >
          Déposer {files.filter((f) => f.status === 'pending').length} fichier(s)
        </Button>
      )}
    </div>
  );
}
