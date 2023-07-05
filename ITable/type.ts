import type { ReactNode } from 'react';
import { ProTableProps } from '@pms/pro-components';

export interface IPagination {
  current: number;
  pageSize: number;
}

export const INIT_PAGINATION: IPagination = { current: 1, pageSize: 10 };

export interface ITableFilter {
  // 标签
  label: string;
  // form表单name字段
  name: string;
  // 显示的筛选项组件
  value: (filter: any, setFilter: any) => ReactNode;
}

export interface ITableRequestResult {
  total: number;
  data: any[];
}

export type SortType = 'ascend' | 'descend' | 'default';
export interface SortInfo {
  columnKey?: string;
  order?: SortType;
}

// antd属性直接在组件上使用
export const pickKeys = ['scroll', 'toolBarRender', 'search'];

export type ProTableType = ProTableProps<any, any>;
export type AntdProTable = Pick<
  ProTableType,
  // 组件上使用部分antdTable的属性的类型提示
  'scroll' | 'columns' | 'toolBarRender' | 'search'
>;

export interface TransformPagination {
  current: number;
  pageSize: number;
  pageStartIndex: number; // 当前页最小序号（从0开始）
  pageEndIndex: number; // 当前页最大序号
}
