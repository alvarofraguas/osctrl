<script lang="ts">
  import NodesTable from '$lib/components/NodesTable.svelte';
  import { getSelectedEnv } from '$lib/stores/env.svelte';
  import { page } from '$app/stores';
  import type { NodeTarget } from '$lib/api/types';

  const TARGETS: NodeTarget[] = ['all', 'active', 'inactive'];

  const env = $derived(getSelectedEnv());
  const target = $derived.by((): NodeTarget => {
    const raw = $page.url.searchParams.get('target') ?? 'all';
    return TARGETS.includes(raw as NodeTarget) ? (raw as NodeTarget) : 'all';
  });
</script>

<div class="space-y-4">
  <h1 class="text-2xl font-semibold">Nodes</h1>
  {#if env}
    <NodesTable {env} {target} />
  {:else}
    <p class="text-sm text-gray-500">Select an environment to see nodes.</p>
  {/if}
</div>
