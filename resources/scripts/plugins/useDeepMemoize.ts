import { DependencyList, useRef } from "react";
import { dequal as isEqual } from "dequal";

export const useDeepMemoize = <T = DependencyList>(value: T): T => {
  const ref = useRef<T | undefined>(undefined);

  if (!isEqual(value, ref.current)) {
    ref.current = value;
  }

  return ref.current as T;
};
