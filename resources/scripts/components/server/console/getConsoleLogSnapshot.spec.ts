import getConsoleLogSnapshot, {
  MAX_CONSOLE_LOG_BYTES,
} from "./getConsoleLogSnapshot";
import type { Terminal } from "@xterm/xterm";

const terminal = (lines: { text: string; wrapped?: boolean }[]) =>
  ({
    buffer: {
      active: {
        length: lines.length,
        getLine: (index: number) =>
          lines[index]
            ? {
                isWrapped: lines[index].wrapped === true,
                translateToString: (trim: boolean) =>
                  trim ? lines[index].text.trimEnd() : lines[index].text,
              }
            : undefined,
      },
    },
  }) as unknown as Pick<Terminal, "buffer">;

it("restores wrapped log lines so redaction sees complete secrets", () => {
  expect(
    getConsoleLogSnapshot(
      terminal([
        { text: "password=credential-" },
        { text: "value", wrapped: true },
        { text: "Server ready   " },
        { text: "" },
      ]),
    ),
  ).toBe("password=credential-value\nServer ready");
});

it("drops a partial first line at the scrollback boundary", () => {
  expect(
    getConsoleLogSnapshot(
      terminal([
        ...Array.from({ length: 2 }, () => ({ text: "old log" })),
        { text: "unlabelled-secret-fragment", wrapped: true },
        ...Array.from({ length: 999 }, () => ({ text: "safe entry" })),
      ]),
    ),
  ).not.toContain("secret-fragment");
});

it("limits UTF-8 bytes and keeps recent complete lines", () => {
  const longLine = "é".repeat(MAX_CONSOLE_LOG_BYTES / 2);
  const logs = getConsoleLogSnapshot(
    terminal([{ text: longLine }, { text: "Latest entry" }]),
  );
  expect(logs).toBe("Latest entry");
  expect(new TextEncoder().encode(logs).length).toBeLessThanOrEqual(
    MAX_CONSOLE_LOG_BYTES,
  );
});

it("returns an empty snapshot for an empty console", () => {
  expect(getConsoleLogSnapshot(terminal([{ text: "  " }, { text: "" }]))).toBe(
    "",
  );
});

it("skips undefined lines in the buffer", () => {
  const customTerminal = {
    buffer: {
      active: {
        length: 2,
        getLine: (index: number) =>
          index === 0
            ? undefined
            : {
                isWrapped: false,
                translateToString: () => "valid line",
              },
      },
    },
  } as unknown as Pick<Terminal, "buffer">;

  expect(getConsoleLogSnapshot(customTerminal)).toBe("valid line");
});
