import { RefObject, useEffect, useState } from "react";

export default function useViewportVisibility<T extends Element>(
  ref: RefObject<T | null>,
): boolean {
  const supported = typeof IntersectionObserver !== "undefined";
  const [visible, setVisible] = useState(!supported);

  useEffect(() => {
    if (!supported || !ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { rootMargin: "200px" },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref, supported]);

  return visible;
}
