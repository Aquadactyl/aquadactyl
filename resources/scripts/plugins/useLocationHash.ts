import { useLocation } from "react-router";
import { useMemo } from "react";

export default () => {
  const location = useLocation();

  const getHashObject = (value: string): Record<string, string> =>
    Object.fromEntries(new URLSearchParams(value.replace(/^#/, "")));

  const pathTo = (params: Record<string, string | undefined>): string => {
    const current = getHashObject(location.hash);

    for (const key in params) {
      if (params[key]) {
        current[key] = params[key]!;
      } else {
        delete current[key];
      }
    }

    return new URLSearchParams(current).toString();
  };

  const hash = useMemo(
    (): Record<string, string> => getHashObject(location.hash),
    [location.hash],
  );

  return { hash, pathTo };
};
