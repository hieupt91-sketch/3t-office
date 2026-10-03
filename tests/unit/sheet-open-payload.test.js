/** VN Sheet compact open payload validation, staged load, and FODS fallback. */

import { deflateSync } from "node:zlib";
import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";
import { buildSheetPayloadModel } from "../../adapters/libreoffice/sheet/sheet-payload-parser.js";
import { SheetGridController } from "../../apps/sheet/sheet-grid.js";
import { globalUnoBridge } from "../../adapters/libreoffice/common/uno-bridge.js";
import { AutoRecoverManager } from "../../platform/autorecover/auto-recover.js";

const NS = {
  office: "urn:oasis:names:tc:opendocument:xmlns:office:1.0",
  table: "urn:oasis:names:tc:opendocument:xmlns:table:1.0",
  text: "urn:oasis:names:tc:opendocument:xmlns:text:1.0",
  config: "urn:oasis:names:tc:opendocument:xmlns:config:1.0"
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function supportXml() {
  return `<office:document xmlns:office="${NS.office}" xmlns:table="${NS.table}" xmlns:text="${NS.text}" xmlns:config="${NS.config}" office:mimetype="application/vnd.oasis.opendocument.spreadsheet"><office:settings/><office:body><office:spreadsheet><table:table table:name="Data"><table:table-row/></table:table></office:spreadsheet></office:body></office:document>`;
}

function makePayload(records = null) {
  const rowXml = `<table:table-row><table:table-cell office:value-type="string"><text:p>Hello</text:p></table:table-cell></table:table-row>`;
  const lines = records || [["sheet", "Data"], ["row-xml", rowXml], ["end-sheet"]];
  const data = deflateSync(Buffer.from(lines.map(record => JSON.stringify(record)).join("\n") + "\n", "utf8"));
  const xml = supportXml();
  return {
    format: "vno.sheet.payload.v2",
    rowsEncoding: "deflate-base64-jsonl-row-xml",
    sourceBytes: Buffer.byteLength(xml),
    sheets: 1,
    rows: lines.filter(record => record[0] === "row-xml").length,
    supportXml: xml,
    rawStyleXml: {},
    rowsDeflateBase64: data.toString("base64")
  };
}

function makeContainer() {
  return {
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener() {},
    classList: { add() {}, remove() {}, toggle() {} }
  };
}

function makeFallbackFods() {
  return `<?xml version="1.0"?><office:document xmlns:office="${NS.office}" xmlns:table="${NS.table}" xmlns:text="${NS.text}" xmlns:config="${NS.config}"><office:settings/><office:body><office:spreadsheet><table:table table:name="Fallback"><table:table-row><table:table-cell office:value-type="string"><text:p>Recovered</text:p></table:table-cell></table:table-row></table:table></office:spreadsheet></office:body></office:document>`;
}

export async function runSheetOpenPayloadTests() {
  const results = [];
  const test = async (name, callback) => {
    try {
      await callback();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.message });
    }
  };

  await test("payload parser validates and builds a workbook model before grid mutation", async () => {
    const adapter = new SheetAdapter(null);
    const workbook = await buildSheetPayloadModel(makePayload(), adapter);
    assert(workbook.sheets.length === 1 && workbook.sheets[0] === "Data", "sheet list not reconstructed");
    assert(workbook.sheetsData.Data.get("A1")?.val === "Hello", "row cell not reconstructed");
  });

  await test("phase2 payload keeps deferred sheets as validated metadata stubs", async () => {
    const adapter = new SheetAdapter(null);
    const payload = makePayload();
    payload.supportXml = payload.supportXml.replace(
      "</office:spreadsheet>",
      '<table:table table:name="Deferred"></table:table></office:spreadsheet>'
    );
    payload.sheetStubs = [
      { name: "Data", state: "visible", tabColor: "", usedRange: "A1", cellCount: 1 },
      { name: "Deferred", state: "hidden", tabColor: "#ff0000", usedRange: "A1:C9", cellCount: 4 }
    ];
    payload.deferredSheets = ["Deferred"];

    const workbook = await buildSheetPayloadModel(payload, adapter);
    assert(workbook.sheets.join("|") === "Data|Deferred", "stub sheet order was not retained");
    assert(workbook.sheetsData.Deferred.size === 0, "deferred sheet was materialised unexpectedly");
    assert(workbook.deferredSheets[0] === "Deferred", "deferred marker was not retained");
    assert(workbook.sheetStubs.Deferred.usedRange === "A1:C9", "stub used range was lost");
  });

  await test("payload parser rejects unsupported versions, broken counts, and truncated records", async () => {
    const adapter = new SheetAdapter(null);
    const wrongVersion = makePayload();
    wrongVersion.format = "vno.sheet.payload.v1";
    await buildSheetPayloadModel(wrongVersion, adapter).then(
      () => { throw new Error("unsupported format was accepted"); },
      error => assert(/format/i.test(error.message), `unexpected format error: ${error.message}`)
    );
    const wrongCount = makePayload();
    wrongCount.rows++;
    await buildSheetPayloadModel(wrongCount, adapter).then(
      () => { throw new Error("wrong row count was accepted"); },
      error => assert(/count/i.test(error.message), `unexpected count error: ${error.message}`)
    );
    const truncated = makePayload();
    truncated.rowsDeflateBase64 = truncated.rowsDeflateBase64.slice(0, -8);
    await buildSheetPayloadModel(truncated, adapter).then(
      () => { throw new Error("truncated records were accepted"); },
      () => {}
    );
  });

  await test("payload load commits the in-memory model used by FODS save serialization", async () => {
    const grid = new SheetGridController(makeContainer());
    const adapter = new SheetAdapter(grid);
    assert(await adapter.loadFromPayload(makePayload()), "payload load failed");
    assert(grid.sheets.length === 1 && grid.sheets[0] === "Data", "committed sheet list is incorrect");
    assert(grid.sheetsData.Data.get("A1")?.val === "Hello", "committed cell value is incorrect");
    assert(adapter.serializeToFods().includes("Hello"), "save serializer did not serialize the in-memory model");
  });

  await test("Save, Save As, PDF export, and AutoRecover serialize the payload-loaded model", async () => {
    const grid = new SheetGridController(makeContainer());
    const adapter = new SheetAdapter(grid);
    assert(await adapter.loadFromPayload(makePayload()), "payload load failed");

    const original = {
      saveRealFile: globalUnoBridge.saveRealFile,
      saveRealFileInPlace: globalUnoBridge.saveRealFileInPlace,
      exportRealPdf: globalUnoBridge.exportRealPdf
    };
    const bridgeCalls = {};
    globalUnoBridge.saveRealFile = async (_kind, content) => { bridgeCalls.saveAs = content; return { status: "cancelled" }; };
    globalUnoBridge.saveRealFileInPlace = async (_kind, content) => { bridgeCalls.save = content; return { status: "cancelled" }; };
    globalUnoBridge.exportRealPdf = async (_kind, content) => { bridgeCalls.pdf = content; return { status: "cancelled" }; };

    const snapshots = [];
    const recoverBridge = {
      desktopApi: {},
      async getAutoRecoverSettings() { return { enabled: true, interval_minutes: 1 }; },
      async listAutoRecoverSnapshots() { return []; },
      async writeAutoRecoverSnapshot(value) {
        snapshots.push(value);
        return { status: "ok", written: true, snapshot_id: "payload-recovery" };
      }
    };
    const timers = { setInterval() { return 1; }, clearInterval() {} };
    const manager = new AutoRecoverManager({ bridge: recoverBridge, timers, idleScheduler: () => () => {}, documentRef: null });
    try {
      assert(await manager.register({
        appKind: "sheet", adapter, shell: { documentName: "input.xlsx" },
        serialize: () => adapter.serializeToFods(), restore: () => true
      }), "AutoRecover did not register");
      adapter.sourceFilePath = "C:\\input.xlsx";
      await adapter.save();
      await adapter.saveAs();
      await adapter.exportPdf();
      adapter.isDirty = true;
      assert(await manager._takeSnapshot(manager.context), "AutoRecover snapshot failed");

      for (const operation of ["save", "saveAs", "pdf"]) {
        assert(bridgeCalls[operation]?.includes("Hello"), `${operation} did not serialize the payload-loaded cell`);
      }
      assert(snapshots[0]?.content.includes("Hello"), "AutoRecover did not serialize the payload-loaded cell");
      assert(snapshots[0]?.format === "fods", "AutoRecover did not retain its existing FODS format");
    } finally {
      manager.detach(adapter);
      Object.assign(globalUnoBridge, original);
    }
  });

  await test("failed payload parse leaves the current grid model untouched", async () => {
    const grid = new SheetGridController(makeContainer());
    const originalSheets = grid.sheets;
    const originalData = grid.sheetsData;
    const adapter = new SheetAdapter(grid);
    const invalid = makePayload();
    invalid.rowsDeflateBase64 = "eA==";
    await adapter.loadFromPayload(invalid).then(
      () => { throw new Error("invalid payload unexpectedly loaded"); },
      () => {}
    );
    assert(grid.sheets === originalSheets, "failed parse replaced the sheet list");
    assert(grid.sheetsData === originalData, "failed parse replaced the workbook model");
  });

  await test("open automatically falls back to FODS and updates chrome only after load", async () => {
    const grid = new SheetGridController(makeContainer());
    const adapter = new SheetAdapter(grid);
    const chrome = [];
    adapter.setShell({ setStatus() {}, resetDocumentChrome(name) { chrome.push(name); } });
    const saved = {
      openRealFile: globalUnoBridge.openRealFile,
      getSheetOpenFallback: globalUnoBridge.getSheetOpenFallback,
      getLatestSheetOpenFallback: globalUnoBridge.getLatestSheetOpenFallback,
      releaseSheetOpenFallback: globalUnoBridge.releaseSheetOpenFallback
    };
    let released = null;
    try {
      globalUnoBridge.openRealFile = async () => ({
        status: "ok", sourcePath: "C:\\input.xlsx", fileName: "input.xlsx", openId: "open-id",
        sheetPayload: { ...makePayload(), rowsDeflateBase64: "bad!" }
      });
      globalUnoBridge.getSheetOpenFallback = async openId => ({
        status: "ok", openId, sourcePath: "C:\\input.xlsx", fileName: "input.xlsx", content: makeFallbackFods()
      });
      globalUnoBridge.getLatestSheetOpenFallback = async () => ({ status: "error" });
      globalUnoBridge.releaseSheetOpenFallback = async openId => { released = openId; return true; };
      assert(await adapter.open(), "open did not recover from an invalid compact payload");
      assert(grid.sheets[0] === "Fallback", "legacy FODS fallback was not loaded");
      assert(adapter.sourceFileName === "input", "source name was not committed after fallback");
      assert(adapter.isDirty === false, "successful open incorrectly marked the workbook dirty");
      assert(chrome.at(-1) === "input.xlsx", "document chrome was not updated after fallback commit");
      assert(released === "open-id", "fallback session was not acknowledged/released");
    } finally {
      Object.assign(globalUnoBridge, saved);
    }
  });

  return results;
}
