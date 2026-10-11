import process from "node:process";

function readArgs(argv) {
  const result = {};
  for (let index = 0; index < argv.length; index += 1) {
    const key = argv[index];
    if (key.startsWith("--")) result[key.slice(2).replaceAll("-", "_")] = argv[++index];
  }
  return result;
}

const options = readArgs(process.argv.slice(2));
const port = Number(options.port);
const timeoutMs = Math.max(1000, Number(options.timeout_seconds || 120) * 1000);
const documentTitle = String(options.document_title || "");
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

if (!Number.isInteger(port) || !documentTitle || !["wait-open", "close"].includes(options.mode)) {
  throw new Error("Usage: node --experimental-websocket cdp-single-instance-control.mjs --port <port> --mode <wait-open|close> --document-title <name>");
}
if (typeof WebSocket === "undefined") {
  throw new Error("Node 20 WebSocket support is unavailable; run with --experimental-websocket.");
}

async function listPages() {
  const response = await fetch(`http://127.0.0.1:${port}/json/list`, { signal: AbortSignal.timeout(1000) });
  if (!response.ok) throw new Error(`CDP returned HTTP ${response.status}`);
  return (await response.json()).filter(target => target.type === "page" && target.webSocketDebuggerUrl);
}

class CdpClient {
  constructor(socket) {
    this.socket = socket;
    this.nextId = 1;
    this.pending = new Map();
    socket.addEventListener("message", event => {
      let message;
      try { message = JSON.parse(String(event.data)); } catch { return; }
      if (!message.id) return;
      const pending = this.pending.get(message.id);
      if (!pending) return;
      this.pending.delete(message.id);
      clearTimeout(pending.timer);
      if (message.error) pending.reject(new Error(message.error.message || "CDP command failed"));
      else pending.resolve(message.result || {});
    });
    socket.addEventListener("close", () => {
      for (const pending of this.pending.values()) {
        clearTimeout(pending.timer);
        pending.reject(new Error("CDP WebSocket closed"));
      }
      this.pending.clear();
    });
  }

  send(method, params = {}, timeout = 10000) {
    const id = this.nextId++;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`CDP command timed out: ${method}`));
      }, timeout);
      this.pending.set(id, { resolve, reject, timer });
      this.socket.send(JSON.stringify({ id, method, params }));
    });
  }

  async evaluate(expression, timeout = 10000) {
    const response = await this.send("Runtime.evaluate", {
      expression,
      awaitPromise: true,
      returnByValue: true,
      userGesture: true
    }, timeout);
    if (response.exceptionDetails) {
      throw new Error(response.exceptionDetails.exception?.description || response.exceptionDetails.text || "Runtime.evaluate failed");
    }
    return response.result?.value;
  }

  close() {
    if (this.socket.readyState === WebSocket.OPEN) this.socket.close();
  }
}

async function connect(target) {
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Timed out opening CDP WebSocket")), 10000);
    socket.addEventListener("open", () => { clearTimeout(timer); resolve(); }, { once: true });
    socket.addEventListener("error", () => { clearTimeout(timer); reject(new Error("Could not open CDP WebSocket")); }, { once: true });
  });
  const client = new CdpClient(socket);
  await client.send("Runtime.enable");
  return client;
}

async function waitForTarget() {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const target = (await listPages()).find(page => String(page.title || "").includes(documentTitle));
      if (target) return target;
    } catch { /* The WebView2 CDP endpoint may still be starting. */ }
    await delay(100);
  }
  throw new Error(`Timed out finding the 3T Office page for ${documentTitle}.`);
}

async function waitUntilDocumentOpen(target) {
  const deadline = Date.now() + timeoutMs;
  const client = await connect(target);
  try {
    while (Date.now() < deadline) {
      const ready = await client.evaluate("window.__vnoStartupEvents?.some(event => event.name === 'document_open_complete') === true");
      if (ready) return;
      await delay(100);
    }
    throw new Error(`Timed out waiting for document_open_complete: ${documentTitle}.`);
  } finally {
    client.close();
  }
}

const target = await waitForTarget();
await waitUntilDocumentOpen(target);

if (options.mode === "wait-open") {
  console.log(`CDP document_open_complete=${documentTitle}`);
  process.exit(0);
}

const client = await connect(target);
try {
  const accepted = await client.evaluate("window.__vnoHandleNativeClose ? window.__vnoHandleNativeClose() : false", 15000);
  if (accepted !== true) throw new Error(`3T Office did not accept closing ${documentTitle}.`);
} finally {
  client.close();
}

const deadline = Date.now() + 15000;
while (Date.now() < deadline) {
  const stillOpen = (await listPages()).some(page => String(page.title || "").includes(documentTitle));
  if (!stillOpen) {
    console.log(`CDP closed=${documentTitle}`);
    process.exit(0);
  }
  await delay(100);
}
throw new Error(`Timed out waiting for the 3T Office page to close: ${documentTitle}.`);
