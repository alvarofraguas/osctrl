<script lang="ts">
  import { goto } from '$app/navigation';
  import { base } from '$app/paths';

  $effect(() => {
    goto(`${base}/nodes`, { replaceState: true });
  });
</script>

<p class="p-8">Redirecting…</p>
