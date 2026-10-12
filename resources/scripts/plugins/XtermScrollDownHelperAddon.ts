import { Terminal, ITerminalAddon, IDisposable } from "@xterm/xterm";
import { ArrowDown } from "lucide-react";
import { createElement } from "react";
import { createRoot, Root } from "react-dom/client";

export class ScrollDownHelperAddon implements ITerminalAddon {
  private terminal!: Terminal;
  private element?: HTMLButtonElement;
  private iconRoot?: Root;
  private listeners: IDisposable[] = [];
  private label = "Scroll to latest output";

  activate(terminal: Terminal): void {
    this.terminal = terminal;

    const updateVisibility = () => {
      if (this.isScrolledDown()) this.hide();
      else this.show();
    };
    this.listeners.push(
      this.terminal.onScroll(updateVisibility),
      this.terminal.onLineFeed(updateVisibility),
    );
    updateVisibility();
  }

  dispose(): void {
    this.listeners.forEach((listener) => listener.dispose());
    this.listeners = [];
    this.iconRoot?.unmount();
    this.iconRoot = undefined;
    this.element?.remove();
    this.element = undefined;
  }

  setLabel(label: string): void {
    this.label = label;
    if (this.element) {
      this.element.title = label;
      this.element.setAttribute("aria-label", label);
    }
  }

  show(): void {
    if (!this.terminal || !this.terminal.element) {
      return;
    }
    if (this.element) {
      this.element.style.visibility = "visible";
      return;
    }

    this.terminal.element.style.position = "relative";

    this.element = document.createElement("button");
    this.element.type = "button";
    this.element.className =
      "absolute right-6 bottom-2 z-10 flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border border-gray-600 bg-gray-800 text-gray-100 shadow-lg transition-colors hover:bg-gray-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-400";
    this.setLabel(this.label);
    this.iconRoot = createRoot(this.element);
    this.iconRoot.render(
      createElement(ArrowDown, { size: 20, "aria-hidden": true }),
    );

    this.element.addEventListener("click", () => {
      this.terminal.scrollToBottom();
      this.hide();
    });

    this.terminal.element.appendChild(this.element);
  }

  hide(): void {
    if (this.element) {
      this.element.style.visibility = "hidden";
    }
  }

  isScrolledDown(): boolean {
    return (
      this.terminal.buffer.active.viewportY ===
      this.terminal.buffer.active.baseY
    );
  }
}
