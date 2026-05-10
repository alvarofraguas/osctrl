<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';

  onMount(() => {
    goto(`${base}/nodes`, { replaceState: true });
  });
</script>

<p class="p-8">Redirecting…</p>
