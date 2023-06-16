import type { ReactNode } from 'react';

export interface IPagination {
  current: number;
  pageSize: number;
}

export const INIT_PAGINATION: IPagination = { current: 1, pageSize: 10 };

export interface ITableFilter {
  label: string;
  name: string;
  value: (filter: any, setFilter: any) => ReactNode;
  effect?: string[];
}

export interface ITableRequestResult {
  total: number;
  data: any[];
}
