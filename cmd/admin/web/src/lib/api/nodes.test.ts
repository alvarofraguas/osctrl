import { describe, it, expect, vi, beforeEach } from 'vitest';
import { searchNodes } from './nodes';

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe('searchNodes adapter', () => {
  it('translates DataTables payload to clean shape', async () => {
    vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo) => {
      const url = String(input);
      expect(url).toContain('/paginated-json/environment/dev/active');
      return new Response(JSON.stringify({
        draw: 1,
        recordsTotal: 100,
        recordsFiltered: 80,
        data: [
          { uuid: 'a', username: 'u1', localname: 'host1', ip: '1.1.1.1',
            platform: 'linux', version: '1.0', osquery: '5.x',
            lastseen: { display: '1m ago', timestamp: 1 }, firstseen: { display: '1d', timestamp: 0 },
            checkbox: '' }
        ]
      }), { status: 200, headers: { 'Content-Type': 'application/json' } });
    }));

    const result = await searchNodes('dev', 'active', { page: 0, pageSize: 50, search: '' });

    expect(result.totalRows).toBe(100);
    expect(result.filteredRows).toBe(80);
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].uuid).toBe('a');
    expect(result.rows[0].lastseen.display).toBe('1m ago');
  });

  it('handles empty result set', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(JSON.stringify({ draw: 1, recordsTotal: 0, recordsFiltered: 0, data: [] }), { status: 200 })
    ));
    const result = await searchNodes('dev', 'active', { page: 0, pageSize: 50, search: '' });
    expect(result.rows).toEqual([]);
    expect(result.totalRows).toBe(0);
  });

  it('passes sort and search to the query string', async () => {
    const fetchSpy = vi.fn(async () =>
      new Response(JSON.stringify({ draw: 0, recordsTotal: 0, recordsFiltered: 0, data: [] }), { status: 200 })
    );
    vi.stubGlobal('fetch', fetchSpy);

    await searchNodes('prod', 'all', {
      page: 2, pageSize: 25, search: 'web',
      sortColumn: 'uuid', sortDir: 'desc'
    });

    const url = String((fetchSpy.mock.calls as unknown[][])[0][0]);
    expect(url).toContain('start=50');
    expect(url).toContain('length=25');
    expect(url).toContain('search=web');
    expect(url).toContain('order%5B0%5D%5Bdir%5D=desc');
  });

  it('throws AuthError on 401', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('', { status: 401 })));
    await expect(searchNodes('dev', 'all', { page: 0, pageSize: 50, search: '' }))
      .rejects.toThrow(/auth/i);
  });

  it('throws on non-2xx other than 401', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('boom', { status: 500 })));
    await expect(searchNodes('dev', 'all', { page: 0, pageSize: 50, search: '' }))
      .rejects.toThrow();
  });

  it('preserves recordsFiltered=0 with non-zero recordsTotal', async () => {
    vi.stubGlobal('fetch', vi.fn(async () =>
      new Response(JSON.stringify({ draw: 1, recordsTotal: 42, recordsFiltered: 0, data: [] }), { status: 200 })
    ));
    const result = await searchNodes('dev', 'all', { page: 0, pageSize: 50, search: 'no-match' });
    expect(result.totalRows).toBe(42);
    expect(result.filteredRows).toBe(0);
  });
});
