import { createServer } from "node:net";

export const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

export async function findFreePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const port = server.address().port;
  await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  return port;
}

export async function readTargets(port) {
  const response = await fetch("http://127.0.0.1:" + port + "/json");
  if (!response.ok) throw new Error("WebView2 /json returned HTTP " + response.status);
  return await response.json();
}

export class CdpClient {
  constructor(target) {
    if (typeof WebSocket !== "function") {
      throw new Error("Node WebSocket is unavailable. Run Node with --experimental-websocket.");
    }
    this.target = target;
    this.socket = new WebSocket(target.webSocketDebuggerUrl);
    this.nextId = 0;
    this.pending = new Map();
    this.closed = false;
    this.socket.addEventListener("message", event => {
      let message;
      try { message = JSON.parse(String(event.data)); } catch { return; }
      if (!message.id || !this.pending.has(message.id)) return;
      const pending = this.pending.get(message.id);
      this.pending.delete(message.id);
      clearTimeout(pending.timer);
      pending.resolve(message);
    });
    this.socket.addEventListener("close", () => {
      this.closed = true;
      for (const pending of this.pending.values()) {
        clearTimeout(pending.timer);
        pending.reject(new Error("CDP connection closed before the response arrived."));
      }
      this.pending.clear();
    });
  }

  async open() {
    if (this.socket.readyState === WebSocket.OPEN) return this;
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Timed out connecting to the WebView2 CDP target.")), 10000);
      this.socket.addEventListener("open", () => { clearTimeout(timer); resolve(); }, { once: true });
      this.socket.addEventListener("error", () => { clearTimeout(timer); reject(new Error("Could not connect to the WebView2 CDP target.")); }, { once: true });
    });
    await this.send("Runtime.enable");
    return this;
  }

  send(method, params = {}, timeoutMilliseconds = 15000) {
    if (this.closed || this.socket.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error("CDP connection is not open."));
    }
    const id = ++this.nextId;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error("CDP call timed out: " + method));
      }, timeoutMilliseconds);
      this.pending.set(id, { resolve, reject, timer });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression, options = {}) {
    const response = await this.send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
      userGesture: true,
      ...options,
    }, options.timeoutMilliseconds || 30000);
    if (response.error) throw new Error(response.error.message || "CDP Runtime.evaluate failed.");
    const result = response.result?.result;
    if (response.result?.exceptionDetails) {
      const detail = response.result.exceptionDetails.exception?.description
        || response.result.exceptionDetails.text
        || "JavaScript evaluation failed.";
      throw new Error(detail);
    }
    return result?.value;
  }

  async waitFor(expression, options = {}) {
    const timeoutMilliseconds = options.timeoutMilliseconds || 30000;
    const intervalMilliseconds = options.intervalMilliseconds || 250;
    const started = Date.now();
    let lastValue;
    while (Date.now() - started < timeoutMilliseconds) {
      lastValue = await this.evaluate(expression).catch(() => undefined);
      if (lastValue) return lastValue;
      await sleep(intervalMilliseconds);
    }
    throw new Error("Timed out waiting for page state: " + expression + "; last value=" + String(lastValue));
  }

  async close() {
    if (this.closed) return;
    this.closed = true;
    try { this.socket.close(); } catch {}
  }
}

export async function connectToPort(port, options = {}) {
  const timeoutMilliseconds = options.timeoutMilliseconds || 60000;
  const started = Date.now();
  let lastError;
  while (Date.now() - started < timeoutMilliseconds) {
    try {
      const targets = await readTargets(port);
      const pages = targets.filter(target => target.type === "page");
      // The app page can still be about:blank (or a DevTools page can be listed first) right after launch. Wait for the
      // real localhost page and only settle for another page near the end of the time budget; connecting to the wrong
      // target made ~1 in 20 automated launches look "stuck" (04/10/2026).
      const appPage = pages.find(page => /127\.0\.0\.1|localhost/.test(page.url || ""));
      const nearDeadline = Date.now() - started > timeoutMilliseconds * 0.8;
      const target = options.targetId
        ? pages.find(page => page.id === options.targetId)
        : appPage || (nearDeadline ? pages[0] : undefined);
      if (target) return await new CdpClient(target).open();
    } catch (error) {
      lastError = error;
    }
    await sleep(250);
  }
  throw new Error("No WebView2 page became available on port " + port + (lastError ? ": " + lastError.message : ""));
}
