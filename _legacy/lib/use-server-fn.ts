/** No-op stub — replaces TanStack useServerFn during migration. */
export function useServerFn<T extends (...args: never[]) => unknown>(fn: T): T {
  return fn;
}
