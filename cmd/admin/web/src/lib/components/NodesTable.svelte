<script lang="ts">
  import { derived, writable } from 'svelte/store';
  import { createQuery } from '@tanstack/svelte-query';
  import { searchNodes, type NodeSortColumn } from '$lib/api/nodes';
  import type { NodeTarget, NodesPage } from '$lib/api/types';
  import NodeStatusBadge from './NodeStatusBadge.svelte';
  import { goto } from '$app/navigation';

  let { env, target = 'all' as NodeTarget }: { env: string; target?: NodeTarget } = $props();

  let pageIndex = $state(0);
  const pageSize = 50;
  let searchInput = $state('');
  let debouncedSearch = $state('');
  let sortColumn = $state<NodeSortColumn | undefined>(undefined);
  let sortDir = $state<'asc' | 'desc'>('asc');

  const COLUMNS = [
    { key: 'uuid' as const, label: 'UUID' },
    { key: 'localname' as const, label: 'Host' },
    { key: 'ip' as const, label: 'IP' },
    { key: 'platform' as const, label: 'Platform' },
    { key: 'osquery' as const, label: 'osquery' },
    { key: 'lastseen' as const, label: 'Last seen' },
  ] satisfies ReadonlyArray<{ key: NodeSortColumn; label: string }>;

  // Debounce the search input.
  let debounceTimer: ReturnType<typeof setTimeout> | undefined = undefined;
  $effect(() => {
    const v = searchInput;
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      debouncedSearch = v;
      pageIndex = 0;
    }, 250);
    return () => clearTimeout(debounceTimer);
  });

  // Use a writable trigger store to bridge Svelte 5 runes → Svelte store world.
  // The $effect writes to it whenever any reactive dependency changes;
  // the derived queryOptions store picks up each tick and feeds createQuery.
  const trigger = writable(0);
  $effect(() => {
    // Reference all reactive deps so the effect re-runs on changes.
    void [env, target, pageIndex, debouncedSearch, sortColumn, sortDir];
    trigger.update((n) => n + 1);
  });

  const queryOptions = derived(trigger, () => ({
    queryKey: ['nodes', env, target, pageIndex, pageSize, debouncedSearch, sortColumn, sortDir] as const,
    queryFn: () =>
      searchNodes(env, target, {
        page: pageIndex,
        pageSize,
        search: debouncedSearch,
        sortColumn,
        sortDir,
      }),
    refetchInterval: 30_000,
    placeholderData: (prev: NodesPage | undefined) => prev,
  }));

  const query = createQuery(queryOptions);

  function toggleSort(col: NodeSortColumn) {
    if (sortColumn === col) {
      sortDir = sortDir === 'asc' ? 'desc' : 'asc';
    } else {
      sortColumn = col;
      sortDir = 'asc';
    }
    // Reflect in URL so it's bookmarkable / back-button-friendly.
    const url = new URL(window.location.href);
    url.searchParams.set('sort', col);
    url.searchParams.set('dir', sortDir);
    goto(url.toString(), { replaceState: true, noScroll: true, keepFocus: true });
  }
</script>

<div class="space-y-4">
  <div class="flex items-center gap-3">
    <input
      type="search"
      placeholder="Search hosts…"
      class="border border-gray-300 rounded px-3 py-1.5 text-sm w-64"
      bind:value={searchInput}
    />
    {#if $query.isFetching}
      <span class="text-xs text-gray-500">refreshing…</span>
    {/if}
    {#if $query.error}
      <span class="text-xs text-red-600">error: {String($query.error)}</span>
    {/if}
  </div>

  {#if $query.isLoading}
    <p class="text-sm text-gray-500">Loading nodes…</p>
  {:else if $query.data}
    <table class="w-full text-sm border border-gray-200">
      <thead class="bg-gray-50">
        <tr>
          {#each COLUMNS as { key, label }}
            <th
              class="text-left px-3 py-2 font-medium border-b cursor-pointer select-none"
              onclick={() => toggleSort(key)}
            >
              {label}
              {#if sortColumn === key}
                <span aria-hidden="true">{sortDir === 'asc' ? '▲' : '▼'}</span>
              {/if}
            </th>
          {/each}
          <th class="text-left px-3 py-2 font-medium border-b">Status</th>
        </tr>
      </thead>
      <tbody>
        {#each $query.data.rows as row (row.uuid)}
          <tr class="border-b last:border-b-0 hover:bg-gray-50">
            <td class="px-3 py-2 font-mono text-xs">{row.uuid.slice(0, 8)}…</td>
            <td class="px-3 py-2">{row.localname}</td>
            <td class="px-3 py-2 font-mono text-xs">{row.ip}</td>
            <td class="px-3 py-2">{row.platform}</td>
            <td class="px-3 py-2 text-xs">{row.osquery}</td>
            <td class="px-3 py-2 text-xs">{row.lastseen.display}</td>
            <td class="px-3 py-2">
              <NodeStatusBadge lastseenDisplay={row.lastseen.display} {target} />
            </td>
          </tr>
        {/each}
        {#if $query.data.rows.length === 0}
          <tr>
            <td colspan="7" class="px-3 py-6 text-center text-gray-500">No nodes match.</td>
          </tr>
        {/if}
      </tbody>
    </table>

    <div class="flex items-center justify-between text-sm text-gray-600">
      <span>{$query.data.filteredRows} of {$query.data.totalRows}</span>
      <div class="flex gap-2">
        <button
          class="px-3 py-1 border rounded disabled:opacity-50"
          disabled={pageIndex === 0}
          onclick={() => (pageIndex = Math.max(0, pageIndex - 1))}
        >Prev</button>
        <span>page {pageIndex + 1}</span>
        <button
          class="px-3 py-1 border rounded disabled:opacity-50"
          disabled={(pageIndex + 1) * pageSize >= $query.data.filteredRows}
          onclick={() => (pageIndex += 1)}
        >Next</button>
      </div>
    </div>
  {/if}
</div>
