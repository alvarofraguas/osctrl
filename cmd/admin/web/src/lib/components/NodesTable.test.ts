import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/svelte';
import { QueryClient } from '@tanstack/svelte-query';
import NodesTable from './NodesTable.svelte';
import * as nodesApi from '$lib/api/nodes';

// The context key used internally by @tanstack/svelte-query.
// Confirmed from node_modules/@tanstack/svelte-query/dist/context.js.
const QUERY_CLIENT_CONTEXT_KEY = '$$_queryClient';

function renderWithClient(props: { env: string; target: 'all' | 'active' | 'inactive' }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
  });
  return render(NodesTable, {
    context: new Map([[QUERY_CLIENT_CONTEXT_KEY, client]]),
    props,
  });
}

const MOCK_ROWS = [
  {
    uuid: 'node-a',
    username: 'u1',
    localname: 'host-a',
    ip: '1.1.1.1',
    platform: 'linux',
    version: '1.0',
    osquery: '5.x',
    lastseen: { display: '1m ago', timestamp: '1' },
    firstseen: { display: '1d ago', timestamp: '0' },
    checkbox: '',
  },
  {
    uuid: 'node-b',
    username: 'u2',
    localname: 'host-b',
    ip: '2.2.2.2',
    platform: 'darwin',
    version: '1.0',
    osquery: '5.x',
    lastseen: { display: '5m ago', timestamp: '1' },
    firstseen: { display: '2d ago', timestamp: '0' },
    checkbox: '',
  },
];

beforeEach(() => {
  vi.spyOn(nodesApi, 'searchNodes').mockResolvedValue({
    totalRows: 2,
    filteredRows: 2,
    rows: MOCK_ROWS,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('NodesTable', () => {
  it('renders rows from queryFn data', async () => {
    renderWithClient({ env: 'dev', target: 'active' });
    await waitFor(() => {
      expect(screen.getByText('host-a')).toBeInTheDocument();
      expect(screen.getByText('host-b')).toBeInTheDocument();
    });
  });

  it('shows loading state initially', async () => {
    renderWithClient({ env: 'dev', target: 'active' });
    // Loading text should be visible before data arrives.
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
    await waitFor(() => expect(screen.queryByText(/loading/i)).toBeNull());
  });

  it('renders the correct number of rows', async () => {
    renderWithClient({ env: 'dev', target: 'all' });
    await waitFor(() => {
      expect(screen.getByText('host-a')).toBeInTheDocument();
    });
    // Both rows are in the DOM.
    const rows = screen.getAllByRole('row');
    // thead (1 row) + tbody (2 rows) = 3
    expect(rows.length).toBe(3);
  });

  it('shows "No nodes match" when rows are empty', async () => {
    vi.spyOn(nodesApi, 'searchNodes').mockResolvedValue({
      totalRows: 0,
      filteredRows: 0,
      rows: [],
    });
    renderWithClient({ env: 'dev', target: 'active' });
    await waitFor(() => {
      expect(screen.getByText(/no nodes match/i)).toBeInTheDocument();
    });
  });

  it('renders the search input', async () => {
    renderWithClient({ env: 'dev', target: 'active' });
    await waitFor(() => screen.getByPlaceholderText(/search/i));
    expect(screen.getByPlaceholderText(/search/i)).toBeInTheDocument();
  });

  it('updates the search query on input after debounce', async () => {
    renderWithClient({ env: 'dev', target: 'active' });

    // Wait for the component to load data first.
    await waitFor(() => screen.getByPlaceholderText(/search/i));

    const input = screen.getByPlaceholderText(/search/i) as HTMLInputElement;
    await fireEvent.input(input, { target: { value: 'web' } });

    // Wait longer than the 250ms debounce for the search to propagate.
    await new Promise((r) => setTimeout(r, 350));

    await waitFor(
      () => {
        const spy = nodesApi.searchNodes as unknown as ReturnType<typeof vi.fn>;
        const found = (spy.mock.calls as Parameters<typeof nodesApi.searchNodes>[]).some(
          (call) => call[2].search === 'web'
        );
        expect(found).toBe(true);
      },
      { timeout: 2000 }
    );
  });

  it('renders column headers', async () => {
    renderWithClient({ env: 'dev', target: 'active' });
    await waitFor(() => {
      expect(screen.getByText('Host')).toBeInTheDocument();
      expect(screen.getByText('IP')).toBeInTheDocument();
      expect(screen.getByText('Platform')).toBeInTheDocument();
      expect(screen.getByText('Last seen')).toBeInTheDocument();
    });
  });
});
