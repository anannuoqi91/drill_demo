export type TimeRange = { start?: string; end?: string };

export type QueryRequest = {
  group_by: string[];
  metrics: string[];
  filters: Record<string, any>;
  time_range?: TimeRange;
  time_grain?: "minute" | "hour" | "day";
  limit?: number;
};

export type QueryResponse = {
  group_keys: string[];
  rows: Record<string, any>[];
};

export type DetailRequest = {
  filters: Record<string, any>;
  time_range?: TimeRange;
  limit?: number;
  offset?: number;
};

export type DetailResponse = {
  rows: Record<string, any>[];
  limit: number;
  offset: number;
};
