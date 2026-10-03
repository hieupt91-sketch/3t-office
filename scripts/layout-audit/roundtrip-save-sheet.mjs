import fs from "node:fs/promises";
import path from "node:path";
import { connectToPort } from "../../tests/live/cdp/client.mjs";

const [port, input, output] = process.argv.slice(2);
const expected = (await fs.realpath(input)).replaceAll("\\", "/").toLowerCase();
const cdp = await connectToPort(Number(port));
const started = performance.now();
cdp.socket.addEventListener("message", event => {
  const message = JSON.parse(event.data);
  if (message.method === "Inspector.targetCrashed") {
    console.error("FAIL WebView2 renderer crashed before Save completed.");
    process.exitCode = 1;
    void cdp.close();
    return;
  }
  if (message.method !== "Runtime.consoleAPICalled") return;
  const line = message.params.args.map(arg => arg.value ?? "").join(" ");
  if (line.startsWith("[VNO Sheet Perf] audit serialize")) console.log(line);
});
try {
  await cdp.send("Inspector.enable");
  await cdp.waitFor("location.protocol === 'http:' && /^(localhost|127\\.0\\.0\\.1)$/.test(location.hostname)");
  await cdp.evaluate(`import('/apps/sheet/number-formatter.js').then(({NumberFormatter}) => {
    const original = NumberFormatter.inferUserInput;
    window.__vnoAuditInference = { calls: 0, ms: 0 };
    if (!original) return;
    NumberFormatter.inferUserInput = function(...args) {
      const t = performance.now();
      try { return original.apply(this, args); }
      finally { window.__vnoAuditInference.calls++; window.__vnoAuditInference.ms += performance.now() - t; }
    };
  }).catch(() => { window.__vnoAuditInference = { calls: 0, ms: 0, unavailable: true }; })`);
  // The launch title already contains the file name while its blank grid is
  // still visible. The adapter publishes the source path after hydration.
  await cdp.waitFor(
    "String(window.__vnoAppInstance?.adapter?.sourceFilePath || '').replace(/\\\\/g, '/').toLowerCase() === " + JSON.stringify(expected),
    { timeoutMilliseconds: 900000, intervalMilliseconds: 500 },
  );
  console.log("LOADED: " + path.basename(input));
  console.log("PHASE hydrated_ms=" + Math.round(performance.now() - started));
  console.log("TYPE_INFERENCE " + JSON.stringify(await cdp.evaluate("window.__vnoAuditInference")));
  console.log("MODEL " + JSON.stringify(await cdp.evaluate(`(() => {
    const adapter = window.__vnoAppInstance.adapter;
    return { cells: Object.values(adapter.grid.sheetsData).reduce((n, cells) => n + cells.size, 0),
      dirty: adapter.isDirty, heapBytes: performance.memory?.usedJSHeapSize };
  })()`)));
  await cdp.evaluate(`(() => {
    const adapter = window.__vnoAppInstance.adapter;
    const original = adapter.serializeToFods;
    adapter.serializeToFods = function(...args) {
      const t = performance.now();
      window.__vnoPerfReport?.('audit serialize begin', 0);
      const content = original.apply(this, args);
      window.__vnoAuditSerialize = { ms: performance.now() - t, chars: content.length };
      window.__vnoPerfReport?.('audit serialize', window.__vnoAuditSerialize.ms);
      return content;
    };
  })()`);
  const saveStarted = performance.now();
  const result = await cdp.evaluate(
    "import('/platform/commands/command-bus.js').then(m => m.globalCommandBus.execute('common.file.saveAs'))",
    { timeoutMilliseconds: 1200000 },
  );
  const stat = await fs.stat(output);
  console.log("PHASE save_ms=" + Math.round(performance.now() - saveStarted));
  console.log("SERIALIZE " + JSON.stringify(await cdp.evaluate("window.__vnoAuditSerialize")));
  console.log("SAVE_DONE: " + Number(result === true) + " ERR:");
  console.log("EXISTS: True " + stat.size);
  if (result !== true || stat.size <= 0) throw new Error("Save As did not complete successfully.");
} catch (error) {
  console.error("FAIL " + (error?.stack || error));
  process.exitCode = 1;
} finally {
  await cdp.close();
}
