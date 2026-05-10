<script lang="ts">
  import '../app.css';
  import { QueryClientProvider } from '@tanstack/svelte-query';
  import { createAppQueryClient } from '$lib/stores/query';
  import AppShell from '$lib/components/AppShell.svelte';

  let { children } = $props();
  const queryClient = createAppQueryClient();
</script>

<QueryClientProvider client={queryClient}>
  <AppShell>
    {@render children()}
  </AppShell>
</QueryClientProvider>
