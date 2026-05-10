<script lang="ts">
  import type { NodeTarget } from '$lib/api/types';

  let { lastseenDisplay, target }: { lastseenDisplay: string; target: NodeTarget } = $props();
  // The Go side classifies active/inactive at query time via the InactiveHours setting.
  // For the badge color we use the target the user requested.
  const isActive = $derived(target === 'active');
  const cls = $derived(
    isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
  );
  const label = $derived(
    target === 'active' ? 'active' : target === 'inactive' ? 'inactive' : 'mixed'
  );
</script>

<span class="inline-block px-2 py-0.5 rounded text-xs {cls}" title={lastseenDisplay}>
  {label}
</span>
