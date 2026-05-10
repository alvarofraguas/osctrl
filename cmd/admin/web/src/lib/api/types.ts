// Mirrors Go types in cmd/admin/handlers/json-nodes.go and json-bootstrap.go.
// Source of truth for these shapes is the Go side; keep this file in sync
// when the Go structs change.

export interface CreationTimes {
  display: string;
  // Unix epoch seconds, serialised as a string by Go's TimeTimestamp helper
  // (see pkg/utils/time-utils.go). Parse with parseInt() at use sites.
  timestamp: string;
}

export interface NodeJSON {
  checkbox: string;
  uuid: string;
  username: string;
  localname: string;
  ip: string;
  platform: string;
  version: string;
  osquery: string;
  lastseen: CreationTimes;
  firstseen: CreationTimes;
}

export interface DataTablesPayload<T> {
  draw: number;
  recordsTotal: number;
  recordsFiltered: number;
  data: T[];
}

export interface NodesPage {
  rows: NodeJSON[];
  totalRows: number;
  filteredRows: number;
}

export type NodeTarget = 'all' | 'active' | 'inactive';

export interface BootstrapResponse {
  user: string;
  envs: string[];
}
