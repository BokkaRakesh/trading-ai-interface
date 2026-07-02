// ============================================
// Provider factory — selects Mock vs Api at boot, with
// health-based fallback to demo mode.
//
//   VITE_DATA_MODE=mock | api      (default: mock)
//   VITE_API_BASE=/api/v1          (default shown)
// ============================================

import { createApiProvider } from './ApiProvider';
import { createMockProvider } from './MockProvider';
import type { DataProvider } from './types';

export * from './types';
export { createMockProvider } from './MockProvider';
export { createApiProvider, ApiError } from './ApiProvider';

export interface ProviderInitResult {
  provider: DataProvider;
  /** True when api mode was requested but the backend was unreachable. */
  fellBackToMock: boolean;
}

export async function initDataProvider(): Promise<ProviderInitResult> {
  const mode = (import.meta.env.VITE_DATA_MODE as string | undefined) ?? 'mock';

  if (mode !== 'api') {
    return { provider: createMockProvider(), fellBackToMock: false };
  }

  const api = createApiProvider({
    baseUrl: (import.meta.env.VITE_API_BASE as string | undefined) ?? '/api/v1',
    getToken: () => localStorage.getItem('tradingai.token'),
  });

  if (await api.healthcheck()) {
    return { provider: api, fellBackToMock: false };
  }

  // Backend unreachable → demo mode with a visible banner (see uiStore).
  return { provider: createMockProvider(), fellBackToMock: true };
}
