import React, { useEffect, useImperativeHandle, useRef, useState } from 'react';
import { ProFormInstance, Search } from '@pms/pro-components';
import { useUpdateEffect } from 'react-use';
import { PmsComponents } from '@pms/console';
import {
  IPagination,
  INIT_PAGINATION,
  ITableFilter,
  ITableRequestResult,
  pickKeys,
  SortInfo,
  AntdProTable,
  TransformPagination,
  ProTableType,
  SortType,
} from './type';
import { LOCAL_COLUMN_TRANSFORM, pick } from '@/common/ITable/utils';
import { cloneDeep } from 'lodash';
import { hooks } from '@pms/qysmz-react';

export { LOCAL_COLUMN_TRANSFORM } from './utils';

// 组件ref实例类型
export type TableRef = {
  // 仅重置筛选项（不触发请求）
  reset: () => void;
  // 重新刷新当前页 (触发请求)
  reload: (pageIndex?: number) => void;
  // 重置筛选项与刷新（触发请求）
  resetAndReload: () => void;
  // 重置分页（触发请求）
  resetPagination: () => void;
  // 仅设置分页（触发请求）
  setPagination: (pagination: { current: number; pageSize: number }) => void;
};

// 组件类型
export type ITableProps = {
  // 是否取消第一次查询
  isNotFirstRequest?: boolean;
  // 初始筛选项值
  initFilter?: {
    [k: string]: any;
  };
  // 筛选项
  filter?: ITableFilter[];
  // 请求列表的函数
  request?: (params?: any & IPagination, sortInfo?: SortInfo) => Promise<ITableRequestResult>;
  // 是否显示搜索表单
  search?: false | Search<any, any>;

  // 默认排序（必须与 defaultSortColumnKey 一起出现）
  defaultSort?: SortType;
  // 默认排序列
  defaultSortColumnKey?: string;
  // 启用本地排序的 columnKeys （true: 全部本地排序 、false: 全部调用 request、数组：数组内存在的调用本地排序）
  localSortColumnsKeys?: string[] | boolean;
  // 本地排序转换函数（默认启用，如果想使用Table组件自带的sort排序属性，请设置为false）
  // (注：使用此属性，则组件内接管排序而非Table组件。会强制：sort：true，以消除Table组件和当前组件的本地排序逻辑冲突问题)
  localSortTransform?: (
    dataSource: any[],
    sortInfo: SortInfo,
    pagination: TransformPagination,
  ) => any[] | false;

  // 使用antdProTable的属性
  extAntdProps?: ProTableType;
} & AntdProTable;

/**
 * 封装的ProTable
 *
 * 简单即可使用：关联筛选项、查询列表、排序。
 * （解决了原有ProTable组件筛选项、排序一起走request属性不好区分本地还是远程的问题，封装后的组件，请求接口的时机与参数是确定的）
 *
 * At 2023.06.15
 * By TangJiaHui
 */
const ITable = React.forwardRef((props: ITableProps, ref) => {
  const {
    columns = [],
    filter = [],
    extAntdProps = {},
    localSortTransform = LOCAL_COLUMN_TRANSFORM,
  } = props;

  useImperativeHandle(ref, () => ({
    reload,
    reset,
    reloadAndReset,
    setPagination,
    resetPagination,
  }));

  const antdProps = pick(props, pickKeys);
  const INIT_SORT_INFO: SortInfo = {
    columnKey: props?.defaultSortColumnKey,
    order: props?.defaultSort,
  };

  // 使用 values 触发筛选项的更新（每次手动修改formRef.current，都需要setValues一次）
  const [_, setValues] = useState<any>({});
  const [loading, setLoading] = useState<boolean>(false);
  const [pagination, setPagination, paginationRef] = hooks.useStateWithRef<IPagination>({
    ...INIT_PAGINATION,
  });
  const [total, setTotal] = useState<number>(0);
  const [dataSource, setDataSource] = useState<any[]>([]);
  const originDataSourceRef = useRef<any[]>([]);
  const [sortInfo, setSortInfo] = useState<SortInfo>({
    ...INIT_SORT_INFO,
  });
  const formRef = useRef<ProFormInstance>();

  // 当前查询本地排序
  const isLocalSort =
    props?.localSortColumnsKeys === true ||
    (sortInfo?.columnKey &&
      Array.isArray(props?.localSortColumnsKeys) &&
      props?.localSortColumnsKeys?.includes(sortInfo.columnKey));

  const isDisableLocalSortTransform = (localSortTransform as any) === false;

  function formatColumns(columns: any[]) {
    return columns.map((column) =>
      Object.assign(
        column,
        {
          search: false,
          sortOrder:
            sortInfo.columnKey === (column?.dataIndex || column?.key) ? sortInfo.order : null,
        },
        column?.sorter
          ? {
              sorter: isDisableLocalSortTransform ? column?.sorter : true,
            }
          : {},
      ),
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

  function getPaginationInfo(pagination: IPagination): TransformPagination {
    const pageStartIndex = (pagination.current - 1) * pagination.pageSize;
    return {
      ...pagination,
      pageStartIndex,
      pageEndIndex: pageStartIndex + pagination.pageSize,
    };
  }

  function handleLocalSort(dataSource: any[], sortInfo: SortInfo) {
    const _sortInfo: SortInfo = {
      ...sortInfo,
      order: sortInfo.order || 'default',
    };

    // 进行dataSource转换
    localSortTransform &&
      setDataSource(
        localSortTransform?.(
          cloneDeep(dataSource),
          _sortInfo,
          getPaginationInfo(paginationRef.current as any),
        ) || [],
      );
  }

  function query() {
    const params = {
      ...formRef.current?.getFieldsValue(),
      ...pagination,
    };

    setLoading(true);
    props?.request?.(params, sortInfo)?.then((res: ITableRequestResult) => {
      setDataSource(res.data);
      originDataSourceRef.current = cloneDeep(res?.data);

      // 只要是本地排序，都在每次查询接口时调用一次转换函数
      // （远程排序，已经在request函数中传过去参数了）
      if (isLocalSort) {
        handleLocalSort(cloneDeep(originDataSourceRef.current), sortInfo);
      }

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

  // 仅仅重置分页
  function resetPagination() {
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

    if (!props?.isNotFirstRequest) {
      setPagination({ ...pagination });
    }
  }, []);

  return (
    <PmsComponents.Table
      loading={loading}
      form={{
        initialValues: props?.initFilter,
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
          if (isLocalSort) {
            // 本地排序
            handleLocalSort(cloneDeep(originDataSourceRef.current), sortInfo);
          } else {
            // 远程请求接口
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
