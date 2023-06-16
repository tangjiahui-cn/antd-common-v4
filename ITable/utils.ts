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
