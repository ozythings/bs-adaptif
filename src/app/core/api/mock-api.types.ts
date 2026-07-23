export interface MockApiOptions {
  delay?: number;
  errorRate?: number;
  authRequired?: boolean;
  conflictCheck?: boolean;
  currentVersion?: number;
  retry?: RetryConfig | boolean;
}

export interface MockApiResponse<T> {
  data: T;
  status: number;
  version?: number;
  message?: string;
}

export interface StreamEvent<T> {
  type: 'data' | 'error' | 'complete';
  data?: T;
  error?: string;
}

export interface PageRequest {
  page: number;
  pageSize: number;
  sortColumn?: string;
  sortDirection?: 'asc' | 'desc';
  filters?: Record<string, unknown>;
  search?: string;
}

export interface PageResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
}

export const DEFAULT_RETRY: RetryConfig = {
  maxRetries: 3,
  baseDelay: 300,
  maxDelay: 5000
};
