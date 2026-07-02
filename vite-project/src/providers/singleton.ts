// Lazy singleton DataProvider. Mock by default; swap to
// initDataProvider() (async, health-checked) when the backend is live.

import { createMockProvider } from './MockProvider';
import type { DataProvider } from './types';

let provider: DataProvider | null = null;

export function getProvider(): DataProvider {
  if (!provider) provider = createMockProvider();
  return provider;
}
