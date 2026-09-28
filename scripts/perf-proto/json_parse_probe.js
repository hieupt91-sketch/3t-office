// Scratch-only V8 JSON.parse proxy. Node shares V8 with Chromium, but is not a
// WebView2 timing substitute; renderer transfer and DOM memory are excluded.
import fs from "node:fs";
const path = process.argv[2];
const bytes = fs.readFileSync(path);
const source = bytes.toString("utf8");
const start = performance.now();
const model = JSON.parse(source);
const elapsed = performance.now() - start;
console.log(JSON.stringify({
  parse_ms: Math.round(elapsed),
  input_bytes: bytes.byteLength,
  sheets: model.sheets.length,
  heap_used_mb: Math.round(process.memoryUsage().heapUsed / 1e6),
  rss_mb: Math.round(process.memoryUsage().rss / 1e6)
}, null, 2));
