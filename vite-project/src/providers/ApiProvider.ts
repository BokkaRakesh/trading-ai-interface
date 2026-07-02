// ============================================
// ApiProvider — REST + SSE client for the FastAPI backend (/api/v1).
// Same interface as MockProvider; see docs/architecture/06-api-contracts.md
// ============================================

import type {
  AssetSummary, CopilotApi, DataProvider, IntakeApi,
  IntakeState, MarketApi, PerformancePoint, PortfolioApi, PortfolioSummary,
} from './types';

interface ApiProviderOptions {
  baseUrl: string; // e.g. "/api/v1" (Vercel rewrite) or "http://localhost:8000/api/v1"
  getToken?: () => string | null;
}

class HttpClient {
  private opts: ApiProviderOptions;

  constructor(opts: ApiProviderOptions) {
    this.opts = opts;
  }

  private headers(json = true): HeadersInit {
    const h: Record<string, string> = {};
    if (json) h['Content-Type'] = 'application/json';
    const token = this.opts.getToken?.();
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }

  async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(`${this.opts.baseUrl}${path}`, {
      method,
      headers: this.headers(),
      credentials: 'include',
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!res.ok) {
      const problem = await res.json().catch(() => ({}));
      throw new ApiError(res.status, (problem as { title?: string }).title ?? res.statusText, problem);
    }
    return res.status === 204 ? (undefined as T) : ((await res.json()) as T);
  }

  /** POST that consumes a text/event-stream response. */
  async stream(path: string, body: unknown, onLine: (event: string, data: string) => void): Promise<void> {
    const res = await fetch(`${this.opts.baseUrl}${path}`, {
      method: 'POST',
      headers: { ...this.headers(), Accept: 'text/event-stream' },
      credentials: 'include',
      body: JSON.stringify(body),
    });
    if (!res.ok || !res.body) throw new ApiError(res.status, 'Stream failed');
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let event = 'message';
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (line.startsWith('event:')) event = line.slice(6).trim();
        else if (line.startsWith('data:')) onLine(event, line.slice(5).trim());
        else if (line === '') event = 'message';
      }
    }
  }
}

export class ApiError extends Error {
  status: number;
  problem?: unknown;

  constructor(status: number, message: string, problem?: unknown) {
    super(message);
    this.status = status;
    this.problem = problem;
  }
}

export function createApiProvider(opts: ApiProviderOptions): DataProvider {
  const http = new HttpClient(opts);

  const portfolio: PortfolioApi = {
    getSummary: () => http.request<PortfolioSummary>('GET', '/portfolio/summary'),
    getPerformance: (range) => http.request<PerformancePoint[]>('GET', `/portfolio/performance?range=${range}`),
    listAssets: (filter) => {
      const p = new URLSearchParams();
      if (filter?.type) p.set('type', filter.type);
      if (filter?.search) p.set('search', filter.search);
      const qs = p.toString();
      return http.request<AssetSummary[]>('GET', `/assets${qs ? `?${qs}` : ''}`);
    },
    createAsset: (payload) => http.request<AssetSummary>('POST', '/assets', payload),
    deleteAsset: (id) => http.request<void>('DELETE', `/assets/${id}`),
  };

  const copilot: CopilotApi = {
    async chat(conversationId, message, onEvent) {
      let convId = conversationId;
      if (!convId) {
        const created = await http.request<{ id: string }>('POST', '/copilot/conversations', {});
        convId = created.id;
      }
      await http.stream(`/copilot/conversations/${convId}/messages`, { message }, (event, data) => {
        try {
          const payload = JSON.parse(data) as Record<string, unknown>;
          if (event === 'delta') onEvent({ event: 'delta', blockId: String(payload.id), text: String(payload.text) });
          else if (event === 'block') onEvent({ event: 'block', block: payload as never });
          else if (event === 'done') onEvent({ event: 'done', conversationId: convId as string });
        } catch {
          onEvent({ event: 'error', message: 'Malformed stream event' });
        }
      });
      return { conversationId: convId };
    },
    confirm: (confirmToken, edits) => http.request<{ ok: boolean }>('POST', '/copilot/confirm', { confirm_token: confirmToken, edits }),
    suggestions: async (pageContext) => {
      const res = await http.request<{ prompts: string[] }>(
        'GET',
        `/copilot/suggestions${pageContext ? `?page_context=${encodeURIComponent(pageContext)}` : ''}`,
      );
      return res.prompts;
    },
  };

  const intake: IntakeApi = {
    start: (message) => http.request<IntakeState>('POST', '/intake/sessions', { message }),
    answer: (sessionId, field, value) =>
      http.request<IntakeState>('POST', `/intake/sessions/${sessionId}/answers`, { field, value }),
    confirm: (sessionId, edits) =>
      http.request<AssetSummary>('POST', `/intake/sessions/${sessionId}/confirm`, { edits }),
  };

  const market: MarketApi = {
    search: (query) => http.request('GET', `/market/search?q=${encodeURIComponent(query)}`),
    getQuotes: (symbols) => http.request('GET', `/market/quotes?symbols=${symbols.join(',')}`),
  };

  return {
    mode: 'api',
    async healthcheck() {
      try {
        const res = await fetch(`${opts.baseUrl.replace(/\/api\/v1$/, '')}/healthz`, { signal: AbortSignal.timeout(3000) });
        return res.ok;
      } catch {
        return false;
      }
    },
    portfolio,
    copilot,
    intake,
    market,
  };
}
