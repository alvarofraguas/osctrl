<script lang="ts">
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
  import NodesTable from './NodesTable.svelte';
  import type { NodeTarget } from '$lib/api/types';
  import type { NodeSortColumn } from '$lib/api/nodes';

  let { env, target, initialSortColumn, initialSortDir }: {
    env: string;
    target: NodeTarget;
    initialSortColumn?: NodeSortColumn;
    initialSortDir?: 'asc' | 'desc';
  } = $props();

  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
  });
</script>

<QueryClientProvider {client}>
  <NodesTable {env} {target} {initialSortColumn} {initialSortDir} />
</QueryClientProvider>
