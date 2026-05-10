<script lang="ts">
  import { QueryClient, QueryClientProvider } from '@tanstack/svelte-query';
  import NodesTable from './NodesTable.svelte';
  import type { NodeTarget } from '$lib/api/types';

  let { env, target }: { env: string; target: NodeTarget } = $props();

  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
  });
</script>

<QueryClientProvider {client}>
  <NodesTable {env} {target} />
</QueryClientProvider>
