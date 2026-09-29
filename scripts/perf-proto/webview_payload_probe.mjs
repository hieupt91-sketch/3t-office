import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";
import { loadSheetPayload } from "./sheet-payload-loader.mjs";

function diffModels(left, right, path = "workbook", diffs = []) {
  if (diffs.length >= 40 || Object.is(left, right)) return diffs;
  if (left instanceof Map || right instanceof Map) {
    if (!(left instanceof Map) || !(right instanceof Map)) {
      diffs.push(path + ": collection type differs");
      return diffs;
    }
    if (left.size !== right.size) diffs.push(path + ": map size differs");
    for (const [key, value] of left) {
      if (!right.has(key)) diffs.push(path + "." + key + ": missing in payload");
      else diffModels(value, right.get(key), path + "." + key, diffs);
      if (diffs.length >= 40) break;
    }
    return diffs;
  }
  if (left instanceof Set || right instanceof Set) {
    if (!(left instanceof Set) || !(right instanceof Set)) {
      diffs.push(path + ": collection type differs");
      return diffs;
    }
    if (left.size !== right.size || [...left].some(value => !right.has(value))) diffs.push(path + ": set contents differ");
    return diffs;
  }
  if (left && right && typeof left === "object" && typeof right === "object") {
    if (Array.isArray(left) || Array.isArray(right)) {
      if (!Array.isArray(left) || !Array.isArray(right)) {
        diffs.push(path + ": collection type differs");
        return diffs;
      }
      if (left.length !== right.length) diffs.push(path + ": array length " + left.length + " vs " + right.length);
      for (let index = 0; index < Math.min(left.length, right.length) && diffs.length < 40; index++) {
        diffModels(left[index], right[index], path + "[" + index + "]", diffs);
      }
      return diffs;
    }
    for (const key of new Set([...Object.keys(left), ...Object.keys(right)])) {
      diffModels(left[key], right[key], path + "." + key, diffs);
      if (diffs.length >= 40) break;
    }
  } else {
    const describe = value => value === undefined ? "undefined" : value === null ? "null"
      : Array.isArray(value) ? "array(" + value.length + ")"
        : typeof value === "string" ? "string(" + value.length + ")"
          : typeof value;
    diffs.push(path + ": parseFods=" + describe(left) + " payload=" + describe(right));
  }
  return diffs;
}

const report = async values => window.pywebview.api.report({
  ...values,
  userAgent: navigator.userAgent,
});

window.addEventListener("pywebviewready", async () => {
  try {
    const transferStart = performance.now();
    let source = await window.pywebview.api.get_payload();
    const transferMs = performance.now() - transferStart;
    const payloadChars = source.length;
    const byteLength = new TextEncoder().encode(source).byteLength;
    const parseStart = performance.now();
    let payload = JSON.parse(source);
    const jsonParseMs = performance.now() - parseStart;
    source = null;
    const buildStart = performance.now();
    const adapter = new SheetAdapter(null);
    const workbook = await loadSheetPayload(payload, adapter);
    const buildMs = performance.now() - buildStart;
    payload = null;
    const cellCount = Object.values(workbook.sheetsData).reduce((total, cells) => total + cells.size, 0);
    let modelIdentical = null;
    let baselineParseMs = null;
    let baselineParserError = null;
    let diffs = [];
    let sourceFods = await window.pywebview.api.get_source_fods();
    if (sourceFods) {
      const originalParseFromString = DOMParser.prototype.parseFromString;
      DOMParser.prototype.parseFromString = function (...args) {
        const document = originalParseFromString.apply(this, args);
        baselineParserError = Boolean(document.querySelector("parsererror"));
        return document;
      };
      const baselineStart = performance.now();
      let baseline;
      try {
        baseline = new SheetAdapter(null).parseFods(sourceFods);
      } finally {
        DOMParser.prototype.parseFromString = originalParseFromString;
      }
      sourceFods = null;
      baselineParseMs = Math.round(performance.now() - baselineStart);
      diffs = diffModels(baseline, workbook);
      modelIdentical = diffs.length === 0;
      baseline = null;
    }
    await report({
      mode: "sheet-model",
      transfer_ms: Math.round(transferMs),
      json_parse_ms: Math.round(jsonParseMs),
      build_model_ms: Math.round(buildMs),
      total_renderer_ms: Math.round(jsonParseMs + buildMs),
      payload_chars: payloadChars,
      payload_bytes: byteLength,
      payload_mb: Number((byteLength / 1e6).toFixed(2)),
      sheets: workbook.sheets.length,
      cells: cellCount,
      active_sheet: workbook.activeSheet,
      parse_ok: workbook.sheets.length > 0,
      model_identical: modelIdentical,
      baseline_parse_ms: baselineParseMs,
      baseline_parsererror: baselineParserError,
      diffs,
    });
  } catch (error) {
    await report({ mode: "sheet-model", parse_ok: false, error: String(error?.stack || error) });
  }
});
