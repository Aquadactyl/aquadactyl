type Listener = (...args: any[]) => void;

export class Websocket {
  private listeners: Map<string, Set<Listener>> = new Map();
  private socket: WebSocket | null = null;
  private url: string | null = null;
  private token = "";
  private attempts = 0;
  private maxAttempts = 20;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private manualClose = false;

  on(event: string, listener: Listener): this {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
    return this;
  }

  addListener(event: string, listener: Listener): this {
    return this.on(event, listener);
  }

  off(event: string, listener: Listener): this {
    const set = this.listeners.get(event);
    if (set) {
      set.delete(listener);
      if (set.size === 0) {
        this.listeners.delete(event);
      }
    }
    return this;
  }

  removeListener(event: string, listener: Listener): this {
    return this.off(event, listener);
  }

  removeAllListeners(event?: string): this {
    if (event) {
      this.listeners.delete(event);
    } else {
      this.listeners.clear();
    }
    return this;
  }

  emit(event: string, ...args: any[]): boolean {
    const set = this.listeners.get(event);
    if (!set || set.size === 0) return false;
    for (const listener of Array.from(set)) {
      listener(...args);
    }
    return true;
  }

  connect(url: string): this {
    this.url = url;
    this.manualClose = false;
    this.attempts = 0;
    this.initSocket();
    return this;
  }

  private initSocket() {
    if (!this.url || this.manualClose) return;

    this.clearReconnectTimeout();

    try {
      this.socket = new WebSocket(this.url);
    } catch (error) {
      this.emit("SOCKET_ERROR", error);
      this.handleReconnect();
      return;
    }

    this.socket.onopen = () => {
      this.attempts = 0;
      this.emit("SOCKET_OPEN");
      this.authenticate();
    };

    this.socket.onmessage = (e) => {
      try {
        const { event, args } = JSON.parse(e.data);
        args ? this.emit(event, ...args) : this.emit(event);
      } catch (ex) {
        console.warn("Failed to parse incoming websocket message.", ex);
      }
    };

    this.socket.onerror = (error) => {
      this.emit("SOCKET_ERROR", error);
    };

    this.socket.onclose = (evt) => {
      this.emit("SOCKET_CLOSE");

      if (this.manualClose) return;

      if (evt.code === 4409 || evt.code === 4400) {
        this.close(1000);
        return;
      }

      this.handleReconnect();
    };
  }

  private handleReconnect() {
    if (this.manualClose) return;

    if (this.attempts >= this.maxAttempts) {
      this.emit("SOCKET_CONNECT_ERROR");
      return;
    }

    this.attempts++;
    this.emit("SOCKET_RECONNECT");

    this.clearReconnectTimeout();
    this.reconnectTimeout = setTimeout(() => {
      this.initSocket();
    }, 1000);
  }

  private clearReconnectTimeout() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  setToken(token: string, isUpdate = false): this {
    this.token = token;

    if (isUpdate) {
      this.authenticate();
    }

    return this;
  }

  authenticate() {
    if (this.url && this.token) {
      this.send("auth", this.token);
    }
  }

  close(code?: number, reason?: string) {
    this.manualClose = true;
    this.clearReconnectTimeout();
    this.url = null;
    this.token = "";
    if (this.socket) {
      this.socket.close(code, reason);
      this.socket = null;
    }
  }

  open() {
    this.manualClose = false;
    this.initSocket();
  }

  reconnect() {
    this.close();
    this.open();
  }

  send(event: string, payload?: string | string[]) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(
        JSON.stringify({
          event,
          args: Array.isArray(payload) ? payload : [payload],
        }),
      );
    }
  }
}
