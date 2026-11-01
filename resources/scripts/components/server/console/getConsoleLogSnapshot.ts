import type { Terminal } from "@xterm/xterm";

export const MAX_CONSOLE_LOG_BYTES = 131072;

export default (terminal: Pick<Terminal, "buffer">): string => {
  const buffer = terminal.buffer.active;
  const lines: string[] = [];
  let skipWrapped = true;
  for (
    let index = Math.max(0, buffer.length - 1000);
    index < buffer.length;
    index++
  ) {
    const line = buffer.getLine(index);
    if (!line) continue;
    // Never include a partial first line: a wrapped secret could otherwise leak.
    if (skipWrapped && line.isWrapped) continue;
    skipWrapped = false;
    const text = line.translateToString(!buffer.getLine(index + 1)?.isWrapped);
    if (line.isWrapped) lines[lines.length - 1] += text;
    else lines.push(text);
  }
  const encoder = new TextEncoder();
  const tail: string[] = [];
  let bytes = 0;
  for (const line of lines.reverse()) {
    if (!line.trim() && tail.length === 0) continue;
    const length = encoder.encode(line).length + (tail.length ? 1 : 0);
    if (bytes + length > MAX_CONSOLE_LOG_BYTES) break;
    tail.push(line);
    bytes += length;
  }
  return tail.reverse().join("\n");
};
