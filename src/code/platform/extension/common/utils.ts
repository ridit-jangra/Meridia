type ApiPart = { [key: string]: any };

function isObject(item: any): item is object {
  return item && typeof item === "object" && !Array.isArray(item);
}

export function _merge<T extends ApiPart[]>(...apis: T): MergeObjects<T> {
  const result: ApiPart = {};

  for (const api of apis) {
    for (const [key, value] of Object.entries(api)) {
      if (key in result && isObject(result[key]) && isObject(value)) {
        result[key] = _merge(result[key], value);
      } else {
        result[key] = value;
      }
    }
  }

  return result as MergeObjects<T>;
}

type MergeObjects<T extends any[]> = T extends [infer First, ...infer Rest]
  ? Rest extends any[]
    ? MergeTwoObjects<First & {}, MergeObjects<Rest>>
    : First
  : {};

type MergeTwoObjects<A, B> = {
  [K in keyof A | keyof B]: K extends keyof B
    ? K extends keyof A
      ? A[K] extends object
        ? B[K] extends object
          ? MergeTwoObjects<A[K], B[K]>
          : B[K]
        : B[K]
      : B[K]
    : K extends keyof A
    ? A[K]
    : never;
};
