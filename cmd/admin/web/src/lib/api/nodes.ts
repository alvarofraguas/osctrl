import { apiJSON } from './client';
import type { DataTablesPayload, NodeJSON, NodesPage, NodeTarget } from './types';

export interface SearchNodesParams {
  page: number;            // 0-indexed
  pageSize: number;
  search: string;
  sortColumn?: string;     // column name as expected by mapDTColumnToDB on the Go side
  sortDir?: 'asc' | 'desc';
}

/**
 * Calls GET /paginated-json/environment/{env}/{target} with DataTables-shaped
 * query string and adapts the response to a clean shape.
 *
 * This is the ONE place in the SPA that touches the legacy DataTables format.
 * If the backend payload is ever cleaned up, only this function changes.
 */
export async function searchNodes(
  env: string,
  target: NodeTarget,
  params: SearchNodesParams
): Promise<NodesPage> {
  const qs = new URLSearchParams();
  qs.set('draw', '1');
  qs.set('start', String(params.page * params.pageSize));
  qs.set('length', String(params.pageSize));
  qs.set('search', params.search);
  if (params.sortColumn !== undefined) {
    qs.set('order[0][column]', params.sortColumn);
    qs.set('order[0][dir]', params.sortDir ?? 'asc');
  }
  const path = `/paginated-json/environment/${encodeURIComponent(env)}/${encodeURIComponent(target)}?${qs.toString()}`;
  const payload = await apiJSON<DataTablesPayload<NodeJSON>>({ path, method: 'GET' });
  return {
    rows: payload.data ?? [],
    totalRows: payload.recordsTotal ?? 0,
    filteredRows: payload.recordsFiltered ?? 0
  };
}
