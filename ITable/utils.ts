export function omit(o: any, excludeKeys: string[]) {
  return Object.keys(o)
    .filter((x) => !excludeKeys.includes(x))
    .reduce((result: any, key: string) => Object.assign(result, { [key]: o[key] }), {});
}

export function pick(o: any, includeKeys: string[]) {
  return Object.keys(o)
    .filter((x) => includeKeys.includes(x))
    .reduce((result: any, key: string) => Object.assign(result, { [key]: o[key] }), {});
}

export const LOCAL_COLUMN_TRANSFORM = (dataSource, sortInfo, pagination) => {
  // 对列表排序，并保持index始终从大到小
  if (sortInfo.order === 'default') return dataSource;
  return dataSource
    .sort((x: any, y: any) => {
      const k = sortInfo.columnKey || '';
      return sortInfo.order === 'ascend' ? x?.[k] - y[k] : y[k] - x[k];
    })
    .map((x, index) => {
      return Object.assign(x, { index: index + 1 + pagination.pageStartIndex });
    });
};
