// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// api.ts holds a module-level `refreshInFlight` promise. Each test that
// depends on that single-flight state re-imports the module after
// vi.resetModules() so it starts from a clean slate.
async function importApi() {
  return await import('./api');
}

function mockResponse(status: number, body: unknown = {}): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as unknown as Response;
}

function lastFetchCall(fetchMock: ReturnType<typeof vi.fn>, index: number) {
  const [url, init] = fetchMock.mock.calls[index];
  return { url: url as string, init: (init || {}) as RequestInit };
}

function headerValue(init: RequestInit, name: string): string | undefined {
  const headers = (init.headers || {}) as Record<string, string>;
  return headers[name];
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.resetModules();
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  // clear any cookie state between tests
  document.cookie = 'hl_csrf=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('apiFetch — CSRF token injection', () => {
  it('injects X-CSRF-Token on POST (mutation) reading the hl_csrf cookie', async () => {
    document.cookie = 'hl_csrf=token-abc';
    fetchMock.mockResolvedValueOnce(mockResponse(200));
    const { apiFetch } = await importApi();

    await apiFetch('/deploy', { method: 'POST' });

    const { init } = lastFetchCall(fetchMock, 0);
    expect(headerValue(init, 'X-CSRF-Token')).toBe('token-abc');
  });

  it.each(['POST', 'PUT', 'PATCH', 'DELETE'])(
    'injects X-CSRF-Token on %s mutations',
    async (method) => {
      document.cookie = 'hl_csrf=tok-' + method;
      fetchMock.mockResolvedValueOnce(mockResponse(200));
      const { apiFetch } = await importApi();

      await apiFetch('/thing', { method });

      const { init } = lastFetchCall(fetchMock, 0);
      expect(headerValue(init, 'X-CSRF-Token')).toBe('tok-' + method);
    }
  );

  it('does NOT inject X-CSRF-Token on GET requests', async () => {
    document.cookie = 'hl_csrf=token-abc';
    fetchMock.mockResolvedValueOnce(mockResponse(200));
    const { apiFetch } = await importApi();

    await apiFetch('/containers');

    const { init } = lastFetchCall(fetchMock, 0);
    expect(headerValue(init, 'X-CSRF-Token')).toBeUndefined();
  });
});

describe('apiFetch — 401 refresh interceptor', () => {
  it('a 401 triggers exactly one /auth/refresh then retries the original request', async () => {
    fetchMock
      .mockResolvedValueOnce(mockResponse(401)) // original request
      .mockResolvedValueOnce(mockResponse(200)) // /auth/refresh
      .mockResolvedValueOnce(mockResponse(200, { ok: true })); // retry
    const { apiFetch } = await importApi();

    const res = await apiFetch('/containers');

    expect(res.status).toBe(200);
    // 3 calls: original, refresh, retry
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const refreshCall = lastFetchCall(fetchMock, 1);
    expect(refreshCall.url).toContain('/auth/refresh');
    expect((refreshCall.init.method || '').toUpperCase()).toBe('POST');
    // exactly one refresh call
    const refreshCalls = fetchMock.mock.calls.filter(([u]) =>
      String(u).includes('/auth/refresh')
    );
    expect(refreshCalls).toHaveLength(1);
  });

  it('concurrent 401s coalesce to ONE /auth/refresh (single-flight)', async () => {
    // The FIRST hit on each path returns 401, subsequent hits (retries) return
    // 200. The shared /auth/refresh always resolves OK. If single-flight works,
    // both concurrent 401s share ONE refresh call.
    const seen: Record<string, number> = {};
    fetchMock.mockImplementation((url: string) => {
      const u = String(url);
      if (u.includes('/auth/refresh')) return Promise.resolve(mockResponse(200));
      seen[u] = (seen[u] || 0) + 1;
      return Promise.resolve(mockResponse(seen[u] === 1 ? 401 : 200));
    });

    const { apiFetch } = await importApi();

    const [a, b] = await Promise.all([apiFetch('/a'), apiFetch('/b')]);

    expect(a.status).toBe(200);
    expect(b.status).toBe(200);
    const refreshCalls = fetchMock.mock.calls.filter(([u]) =>
      String(u).includes('/auth/refresh')
    );
    expect(refreshCalls).toHaveLength(1);
  });

  it('does NOT run the interceptor for /auth/login', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(401));
    const { apiFetch } = await importApi();

    const res = await apiFetch('/auth/login', { method: 'POST' });

    expect(res.status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(1); // no refresh attempt
    const refreshCalls = fetchMock.mock.calls.filter(([u]) =>
      String(u).includes('/auth/refresh')
    );
    expect(refreshCalls).toHaveLength(0);
  });

  it('does NOT run the interceptor for /auth/refresh itself', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(401));
    const { apiFetch } = await importApi();

    const res = await apiFetch('/auth/refresh', { method: 'POST' });

    expect(res.status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(1); // no recursive refresh
  });

  it('a failed refresh dispatches the hl-session-dead event', async () => {
    fetchMock
      .mockResolvedValueOnce(mockResponse(401)) // original
      .mockResolvedValueOnce(mockResponse(401)); // failed refresh
    const { apiFetch } = await importApi();

    const listener = vi.fn();
    window.addEventListener('hl-session-dead', listener);

    const res = await apiFetch('/containers');

    expect(listener).toHaveBeenCalledTimes(1);
    // original 401 is returned (refresh failed, no successful retry)
    expect(res.status).toBe(401);
    window.removeEventListener('hl-session-dead', listener);
  });
});

describe('apiFetchRaw — regression: NEVER calls /auth/refresh', () => {
  it('returns a 401 directly without any refresh attempt', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(401));
    const { apiFetchRaw } = await importApi();

    const res = await apiFetchRaw('/auth/me');

    expect(res.status).toBe(401);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const refreshCalls = fetchMock.mock.calls.filter(([u]) =>
      String(u).includes('/auth/refresh')
    );
    expect(refreshCalls).toHaveLength(0);
  });

  it('does not dispatch hl-session-dead on a 401', async () => {
    fetchMock.mockResolvedValueOnce(mockResponse(401));
    const { apiFetchRaw } = await importApi();

    const listener = vi.fn();
    window.addEventListener('hl-session-dead', listener);

    await apiFetchRaw('/auth/me');

    expect(listener).not.toHaveBeenCalled();
    window.removeEventListener('hl-session-dead', listener);
  });
});
