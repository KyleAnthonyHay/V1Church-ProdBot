import { useCallback, useState } from "react";

export function usePersistedState<T extends string>(
  storageKey: string,
  initial: T,
) {
  const [value, setValue] = useState<T>(() => {
    try {
      return (localStorage.getItem(storageKey) as T | null) ?? initial;
    } catch {
      return initial;
    }
  });
  const set = useCallback(
    (v: T) => {
      try {
        localStorage.setItem(storageKey, v);
      } catch {
        /* storage may be disabled */
      }
      setValue(v);
    },
    [storageKey],
  );
  return [value, set] as const;
}
