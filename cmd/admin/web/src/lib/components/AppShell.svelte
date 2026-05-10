<script lang="ts">
  import { createQuery } from '@tanstack/svelte-query';
  import { fetchBootstrap } from '$lib/api/bootstrap';
  import { getSelectedEnv, setSelectedEnv } from '$lib/stores/env.svelte';

  let { children } = $props();

  const bootstrap = createQuery({
    queryKey: ['bootstrap'],
    queryFn: fetchBootstrap,
    staleTime: 60_000
  });

  $effect(() => {
    const data = $bootstrap.data;
    if (data && getSelectedEnv() === null && data.envs.length > 0) {
      setSelectedEnv(data.envs[0]);
    }
  });

  function handleEnvChange(e: Event) {
    const target = e.target as HTMLSelectElement;
    setSelectedEnv(target.value);
  }
</script>

<header class="border-b border-gray-200 bg-white px-6 py-3 flex items-center justify-between">
  <div class="flex items-center gap-4">
    <span class="font-semibold tracking-tight">osctrl</span>
    {#if $bootstrap.data}
      <select
        class="border border-gray-300 rounded px-2 py-1 text-sm"
        value={getSelectedEnv() ?? ''}
        onchange={handleEnvChange}
        aria-label="Environment"
      >
        {#each $bootstrap.data.envs as env}
          <option value={env}>{env}</option>
        {/each}
      </select>
    {/if}
  </div>
  <div class="text-sm text-gray-600">
    {#if $bootstrap.data}
      <span>{$bootstrap.data.user}</span>
      <a href="/logout" class="ml-3 text-blue-600 hover:underline">Sign out</a>
    {/if}
  </div>
</header>

<main class="p-6">
  {@render children()}
</main>
