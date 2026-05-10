import { QueryClient } from '@tanstack/svelte-query';
import { AuthError } from '$lib/api/client';

export function createAppQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 10_000,
        refetchOnWindowFocus: true,
        retry: (failureCount, err: unknown) => {
          // Don't retry on auth failures; the wrapper has already redirected.
          if (err instanceof AuthError) return false;
          return failureCount < 2;
        }
      }
    }
  });
}
