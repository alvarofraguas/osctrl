<script lang="ts">
  import type { NodeTarget } from '$lib/api/types';
  let { lastseenDisplay, target }: { lastseenDisplay: string; target: NodeTarget } = $props();

  const cls = $derived(
    target === 'active' ? 'bg-green-100 text-green-700' :
    target === 'inactive' ? 'bg-red-100 text-red-700' :
    'bg-gray-100 text-gray-700'
  );
  const label = $derived(
    target === 'active' ? 'active' :
    target === 'inactive' ? 'inactive' :
    'mixed'
  );
</script>

<span class="inline-block px-2 py-0.5 rounded text-xs {cls}" title={lastseenDisplay}>
  {label}
</span>
