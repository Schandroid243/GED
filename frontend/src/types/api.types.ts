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
  documentsToday:   number;
  jobsWaiting:      number;
  ocrSuccessRate:   number;  // pourcentage 0–100
  storageUsedBytes: number;
}
