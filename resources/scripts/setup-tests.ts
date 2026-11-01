(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;

if (typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (event) => {
    if (
      event.reason?.name === "AbortError" ||
      event.reason?.message?.includes("The animation was canceled")
    ) {
      event.preventDefault();
    }
  });
}

process.on("unhandledRejection", (reason: any) => {
  if (
    reason?.name === "AbortError" ||
    reason?.message?.includes("The animation was canceled")
  ) {
    return;
  }
});
