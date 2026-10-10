export const isSensitiveProperty = (key: string, value: unknown): boolean => {
  const normalized = key.replace(/([a-z])([A-Z])/g, "$1_$2").toLowerCase();
  if (
    /(?:^|[._-])(?:email|ip|address|password|token|secret|authorization|credential|identifier|connection)(?:$|[._-])/.test(
      normalized,
    )
  )
    return true;
  if (typeof value !== "string") return false;
  return (
    /\b[^\s<>@]+@[^\s<>@]+\.[a-z]{2,}\b/i.test(value) ||
    /\b(?:\d{1,3}\.){3}\d{1,3}\b/.test(value) ||
    /[a-f\d]*::[a-f\d:]+/i.test(value) ||
    /\bptl[ac]_\w+/i.test(value)
  );
};
