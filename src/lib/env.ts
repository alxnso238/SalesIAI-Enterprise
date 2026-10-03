export const appConfig = {
  appName: import.meta.env.VITE_APP_NAME ?? 'SalesIA Enterprise',
  apiUrl: (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000',
  environment: (import.meta.env.VITE_ENV as string | undefined) ?? 'development',
};

export const getApiUrl = (path = ''): string => {
  const base = appConfig.apiUrl.replace(/\/+$/, '').replace(/\/api$/i, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;

  return `${base}${normalizedPath}`;
};
