import { apiJSON } from './client';
import type { BootstrapResponse } from './types';

export async function fetchBootstrap(): Promise<BootstrapResponse> {
  return apiJSON<BootstrapResponse>({ path: '/ui/api/bootstrap', method: 'GET' });
}
