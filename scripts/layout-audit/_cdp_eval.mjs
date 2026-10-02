// JSON-lines CDP evaluation for the real desktop audit; no OS input or extra server.
import readline from "node:readline";
const port = Number(process.argv[2]);
let target;
for (let i = 0; i < 100; i++) {
  try {
    const pages = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    target = pages.find(page => page.type === "page" && page.url !== "about:blank");
    if (target) break;
  } catch { /* WebView2 startup. */ }
  await new Promise(resolve => setTimeout(resolve, 200));
}
if (!target) throw new Error("Audit WebView2 CDP target unavailable");
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  ws.addEventListener("open", resolve, { once: true });
  ws.addEventListener("error", reject, { once: true });
});
let id = 0;
const pending = new Map();
ws.addEventListener("message", event => {
  const message = JSON.parse(String(event.data));
  const request = pending.get(message.id);
  if (!request) return;
  pending.delete(message.id);
  if (message.error || message.result?.exceptionDetails) request.reject(new Error(JSON.stringify(message.error || message.result.exceptionDetails)));
  else request.resolve(message.result?.result?.value ?? null);
});
const lines = readline.createInterface({ input: process.stdin });
for await (const line of lines) {
  try {
    const expression = JSON.parse(line);
    const value = await new Promise((resolve, reject) => {
      const requestId = ++id;
      pending.set(requestId, { resolve, reject });
      ws.send(JSON.stringify({ id: requestId, method: "Runtime.evaluate", params: { expression, returnByValue: true, awaitPromise: true } }));
    });
    process.stdout.write(JSON.stringify({ value }) + "\n");
  } catch (error) {
    process.stdout.write(JSON.stringify({ error: error.message }) + "\n");
  }
}
ws.close();
