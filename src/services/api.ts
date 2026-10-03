import { getApiUrl } from '../lib/env';

export const apiBaseUrl = getApiUrl();

export const apiRoutes = {
  health: getApiUrl('/health'),
  ready: getApiUrl('/ready'),
  auth: {
    login: getApiUrl('/api/v1/auth/login'),
    register: getApiUrl('/api/v1/auth/register'),
    me: getApiUrl('/api/v1/auth/me'),
  },
  users: getApiUrl('/api/v1/users'),
  companies: getApiUrl('/api/v1/companies'),
  customers: getApiUrl('/api/v1/customers'),
  branches: getApiUrl('/api/v1/branches'),
  products: getApiUrl('/api/v1/products'),
  sales: getApiUrl('/api/v1/sales'),
  inventory: getApiUrl('/api/v1/inventory'),
  reports: getApiUrl('/api/v1/reports'),
  statistics: {
    analytics: getApiUrl('/api/v1/statistics/analytics'),
    mean: getApiUrl('/api/v1/statistics/mean'),
    median: getApiUrl('/api/v1/statistics/median'),
    compare: getApiUrl('/api/v1/statistics/compare'),
    bayes: getApiUrl('/api/v1/statistics/bayes'),
    randomVariable: getApiUrl('/api/v1/statistics/random-variables/analyze'),
    datasetAnalysis: (datasetId: number, variableId: number) => getApiUrl(`/api/v1/statistics/datasets/${datasetId}/variables/${variableId}/analyze`),
    history: getApiUrl('/api/v1/statistics/history'),
  },
  audit: getApiUrl('/api/v1/audit'),
  resources: getApiUrl('/api/v1/resources'),
};

export async function apiRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window === 'undefined' ? null : localStorage.getItem('salesia_token');
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.detail ?? `Error de API (${response.status})`);
  }
  return body as T;
}
