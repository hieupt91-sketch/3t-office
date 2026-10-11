// Canonical hash of the JS model built from a Sheet open payload (gate G2 of docs/PLAN-PAYLOAD-V3.md).
// Usage: node --max-old-space-size=12000 scripts/perf-proto/payload_model_hash.mjs payload1.json [payload2.json ...]
// Prints "<file> <sha256> <node count>"; the hash walks the whole model (Map/Set/array/object, keys sorted) without
// building one giant JSON string, so the biggest sheets fit.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";
import { buildSheetPayloadModel } from "../../adapters/libreoffice/sheet/sheet-payload-parser.js";

function feed(value, hash, counter) {
  counter.n++;
  if (value === null || value === undefined) { hash.update(value === null ? "n;" : "u;"); return; }
  if (value instanceof Map) {
    hash.update(`M${value.size}{`);
    for (const key of [...value.keys()].sort((a, b) => (String(a) < String(b) ? -1 : String(a) > String(b) ? 1 : 0))) {
      hash.update(`k${JSON.stringify(String(key))}:`);
      feed(value.get(key), hash, counter);
    }
    hash.update("}");
  } else if (value instanceof Set) {
    hash.update(`S${value.size}[`);
    for (const item of [...value].sort()) feed(item, hash, counter);
    hash.update("]");
  } else if (Array.isArray(value)) {
    hash.update(`A${value.length}[`);
    for (const item of value) feed(item, hash, counter);
    hash.update("]");
  } else if (typeof value === "object") {
    const keys = Object.keys(value).sort();
    hash.update(`O${keys.length}{`);
    for (const key of keys) { hash.update(`k${JSON.stringify(key)}:`); feed(value[key], hash, counter); }
    hash.update("}");
  } else {
    hash.update(`${typeof value}:${typeof value === "number" && !Number.isFinite(value) ? String(value) : JSON.stringify(value)};`);
  }
}

for (const file of process.argv.slice(2)) {
  const payload = JSON.parse(readFileSync(file, "utf8"));
  const model = await buildSheetPayloadModel(payload, new SheetAdapter(null));
  const hash = createHash("sha256");
  const counter = { n: 0 };
  feed(model, hash, counter);
  console.log(basename(file, ".json"), hash.digest("hex").slice(0, 24), counter.n);
}
