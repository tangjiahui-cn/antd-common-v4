import React, { useEffect, useImperativeHandle, useRef, useState } from 'react';
import { ActionType, ProFormInstance, ProTableProps, Search } from '@pms/pro-components';
import { useUpdateEffect } from 'react-use';
import { PmsComponents } from '@pms/console';
import { IPagination, INIT_PAGINATION, ITableFilter, ITableRequestResult } from './type';
import { pick } from './utils';
type ProTableType = ProTableProps<any, any>;

export type TableRef = {
  reset: () => void;
  reload: (pageIndex?: number) => void;
  resetAndReload: () => void;
  setPagination: (pagination: { current: number; pageSize: number }) => void;
};

// antd属性直接在组件上使用
const pickKeys = ['scroll', 'toolBarRender', 'search'];

type AntdProTable = Pick<
  ProTableType,
  // 组件上使用部分antdTable的属性的类型提示
  'scroll' | 'columns' | 'toolBarRender' | 'search'
>;

export type ITableProps = {
  // 初始筛选项值
  initFilter?: {
    [k: string]: any;
  };
  // 筛选项
  filter?: ITableFilter[];
  // 默认排序
  defaultSort?: 'ascend' | 'descend' | 'default';
  // 默认排序列
  defaultSortColumnKey?: string;
  // 启用本地排序的 columnKeys。 （true: 全部本地排序 、false: 全部调用 request、数组：数组内存在的调用本地排序）
  localSortColumnsKeys?: string[] | boolean;
  // 请求列表的函数
  request?: (params?: any, sortInfo?: any) => Promise<ITableRequestResult>;
  // 是否显示搜索表单
  search?: false | Search<any, any>;
  // 使用antd默认属性强制覆盖
  extAntdProps?: ProTableType;
} & AntdProTable;

/**
 * 封装的ProTable
 *
 * 简单即可使用：关联筛选项、查询列表、排序。
 *
 * At 2023.06.15
 * By TangJiaHui
 */
const ITable = React.forwardRef((props: ITableProps, ref) => {
  const { columns = [], filter = [], extAntdProps = {} } = props;

  useImperativeHandle(ref, () => ({
    reload,
    reset,
    reloadAndReset,
    setPagination,
  }));

  const antdProps = pick(props, pickKeys);
  const INIT_SORT_INFO = {
    columnKey: props?.defaultSortColumnKey,
    order: props?.defaultSort,
  };

  // 使用 values 触发筛选项的更新（每次手动修改formRef.current，都需要setValues一次）
  const [_, setValues] = useState<any>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [pagination, setPagination] = useState<IPagination>({ ...INIT_PAGINATION });
  const [total, setTotal] = useState<number>(0);
  const [dataSource, setDataSource] = useState<any[]>([]);
  const [sortInfo, setSortInfo] = useState<any>({ ...INIT_SORT_INFO });
  const formRef = useRef<ProFormInstance>();

  function formatColumns(columns: any[]) {
    return columns.map((column) =>
      Object.assign(column, {
        search: false,
        sortOrder:
          sortInfo.columnKey === (column?.dataIndex || column?.key) ? sortInfo.order : null,
      }),
    );
  }

  function formatFilter(columns: ITableFilter[]) {
    return columns.map((column: ITableFilter) => {
      return {
        hideInTable: true,
        title: column?.label,
        formItemProps: () => ({ name: column.name }),
        renderFormItem: (_, __, form) => {
          return column?.value?.(form?.getFieldsValue(), handleSetFilter);
        },
      };
    });
  }

  function handleSetFilter(filter: any) {
    formRef.current?.setFieldsValue(filter);
    setValues(filter); // 触发筛选项更新（如果未）
  }

  function query() {
    const params = {
      ...formRef.current?.getFieldsValue(),
      ...pagination,
    };

    setLoading(true);
    props?.request?.(params, sortInfo)?.then((res: ITableRequestResult) => {
      setDataSource(res.data);
      setTotal(res.total);
      setLoading(false);
    });
  }

  // 重新载入当前页
  function reload(pageIndex?: number) {
    setPagination((pagination) => {
      pagination.current = pageIndex ?? pagination.current;
      return { ...pagination };
    });
  }

  // 重置筛选项（不请求列表接口）
  function reset() {
    formRef.current?.resetFields();
    setValues({});
    setSortInfo({ ...INIT_SORT_INFO });
  }

  // 重置，并且重新请求
  function reloadAndReset() {
    formRef.current?.resetFields();
    setValues({});
    setSortInfo({ ...INIT_SORT_INFO });
    setPagination({ ...INIT_PAGINATION });
  }

  // 利用分页触发列表请求查询
  useUpdateEffect(() => {
    query?.();
  }, [pagination]);

  useEffect(() => {
    if (props?.initFilter && typeof props?.initFilter === 'object') {
      formRef.current?.setFieldsValue(props?.initFilter);
    }
    setPagination({ ...pagination });
  }, []);

  return (
    <PmsComponents.Table
      loading={loading}
      form={{
        initialValues: props?.initFilter
      }}
      dataSource={dataSource}
      formRef={formRef}
      columns={[...formatColumns(columns), ...formatFilter(filter)]}
      onChange={(...args: any[]) => {
        const isSort = args?.[3]?.action === 'sort';
        if (isSort) {
          const sortInfo = args?.[2];
          const isLocalSort =
            typeof props?.localSortColumnsKeys === 'boolean'
              ? props?.localSortColumnsKeys
              : Array.isArray(props?.localSortColumnsKeys)
              ? props?.localSortColumnsKeys?.includes(sortInfo.columnKey)
              : true;

          setSortInfo(sortInfo);

          if (!isLocalSort) {
            setPagination({ ...pagination });
          }
        }
      }}
      pagination={{
        total,
        showQuickJumper: true,
        showSizeChanger: true,
        current: pagination.current,
        pageSize: pagination.pageSize,
        onChange(current = INIT_PAGINATION.current, pageSize = INIT_PAGINATION.pageSize) {
          if (current !== pagination.current || pageSize !== pagination.pageSize) {
            setPagination({ current, pageSize });
          }
        },
      }}
      onReset={() => {
        formRef.current?.resetFields();
        setPagination({ ...INIT_PAGINATION });
      }}
      onSubmit={() => {
        setPagination({ ...pagination });
      }}
      {...antdProps}
      {...extAntdProps}
    />
  );
});

export default ITable;
