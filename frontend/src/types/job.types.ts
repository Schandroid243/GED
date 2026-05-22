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
  step:      string;   // ex: 'OCR_COMPLETED'
  status:    JobStatus;
  timestamp: string;
  details?:  string;
}
