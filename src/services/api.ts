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
  branches: getApiUrl('/api/v1/branches'),
  products: getApiUrl('/api/v1/products'),
  sales: getApiUrl('/api/v1/sales'),
  inventory: getApiUrl('/api/v1/inventory'),
  vectors: getApiUrl('/api/v1/vectors'),
  matrices: getApiUrl('/api/v1/matrices'),
  operations: getApiUrl('/api/v1/operations'),
  reports: getApiUrl('/api/v1/reports'),
  audit: getApiUrl('/api/v1/audit'),
  resources: getApiUrl('/api/v1/resources'),
};

export async function apiRequest<T>(url: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window === 'undefined' ? null : localStorage.getItem('matrixflow_token');
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
