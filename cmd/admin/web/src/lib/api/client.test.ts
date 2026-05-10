import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiJSON, AuthError, ApiError } from './client';

beforeEach(() => {
  vi.unstubAllGlobals();
  // location.href is read-only; mock it via a writable stub.
  Object.defineProperty(window, 'location', {
    value: { pathname: '/ui/nodes', search: '?env=dev', href: '' },
    writable: true,
    configurable: true
  });
});

describe('apiJSON', () => {
  it('returns parsed JSON on 200', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(JSON.stringify({ ok: true }), { status: 200 })
    ));
    const out = await apiJSON<{ ok: boolean }>({ path: '/foo', method: 'GET' });
    expect(out.ok).toBe(true);
  });

  it('throws AuthError on 401 and redirects to /login', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 401 })));
    await expect(apiJSON({ path: '/foo', method: 'GET' })).rejects.toBeInstanceOf(AuthError);
    expect(window.location.href).toContain('/login?next=');
  });

  it('throws AuthError on opaque-redirect (redirect:manual surfacing a 302) and redirects to /login', async () => {
    // Response does not normally allow status 0; use a stub that satisfies
    // the parts of Response our code inspects.
    const opaqueResponse = {
      type: 'opaqueredirect',
      status: 0,
      ok: false,
      text: async () => '',
      json: async () => ({}),
    } as unknown as Response;
    vi.stubGlobal('fetch', vi.fn(async () => opaqueResponse));
    await expect(apiJSON({ path: '/foo', method: 'GET' })).rejects.toBeInstanceOf(AuthError);
    expect(window.location.href).toContain('/login?next=');
  });

  it('throws ApiError with status on 500', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('boom', { status: 500 })));
    const err = await apiJSON({ path: '/foo', method: 'GET' }).catch(e => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(500);
  });
});
