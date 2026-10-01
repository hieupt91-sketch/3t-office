/** VN Sheet compact open payload validation, staged load, and FODS fallback. */

import { deflateSync, inflateSync } from "node:zlib";
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

function makeRowsPayload(rowCount) {
  const rows = Array.from({ length: rowCount }, (_, index) => [
    "row-xml",
    `<table:table-row><table:table-cell office:value-type="string"><text:p>${index + 1}</text:p></table:table-cell></table:table-row>`
  ]);
  return makePayload([["sheet", "Data"], ...rows, ["end-sheet"]]);
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

  await test("payload parser yields the first viewport model before completing row hydration", async () => {
    const adapter = new SheetAdapter(null);
    let earlyCellCount = 0;
    let earlyRows = 0;
    const workbook = await buildSheetPayloadModel(makeRowsPayload(60), adapter, undefined, {
      initialRows: 12,
      onViewportReady(partial, progress) {
        earlyCellCount = partial.sheetsData.Data.size;
        earlyRows = progress.rows;
      }
    });
    assert(earlyRows >= 12 && earlyRows < 60, `viewport callback ran after ${earlyRows} rows`);
    assert(earlyCellCount > 0 && earlyCellCount < 60, `partial model had ${earlyCellCount} cells`);
    assert(workbook.sheetsData.Data.size === 60, "background hydration did not complete the full model");
    assert(workbook.dataDimensionsBySheet.Data.lastRow === 60, "full sheet bounds were not available before viewport hydration");
  });

  await test("payload parser interns repeated styles and cell edits copy them before mutation", async () => {
    const rowXml = `<table:table-row><table:table-cell office:value-type="string" table:style-name="ce1"><text:p>same</text:p></table:table-cell></table:table-row>`;
    const grid = new SheetGridController(makeContainer());
    const adapter = new SheetAdapter(grid);
    assert(await adapter.loadFromPayload(makePayload([
      ["sheet", "Data"], ["row-xml", rowXml], ["row-xml", rowXml], ["end-sheet"]
    ])), "repeated-style payload failed to load");
    const first = grid.sheetsData.Data.get("A1");
    const second = grid.sheetsData.Data.get("A2");
    assert(first?.style === second?.style, "identical imported cell styles were not interned");
    grid.selectedCoord = { c: "A", r: 1 };
    assert(grid.setStyle("color", "#123456", false), "cell style edit failed");
    assert(first.style !== second.style, "cell edit mutated a shared style object");
    assert(first.style.color === "#123456" && second.style.color !== "#123456", "cell style edit leaked to neighboring cells");
  });

  await test("pristine XLSX native saves use a compact sheet-count-preserving payload", async () => {
    const grid = new SheetGridController(makeContainer());
    const adapter = new SheetAdapter(grid);
    assert(await adapter.loadFromPayload(makePayload()), "pristine-save payload failed to load");
    adapter.sourceFilePath = "C:\\workbooks\\source.xlsx";
    adapter.isDirty = false;
    const content = adapter._nativeSaveContent();
    assert(content.includes("<!-- vno-pristine-xlsx-source -->"), "pristine source marker is missing");
    assert((content.match(/<table:table\b/g) || []).length === grid.sheets.length, "compact save did not retain the workbook sheet count");
    adapter.isDirty = true;
    assert(adapter._nativeSaveContent().includes("Hello"), "edited workbook did not use full FODS serialization");
  });

  await test("payload parser reads independent compressed row chunks in sequence", async () => {
    const adapter = new SheetAdapter(null);
    const payload = makeRowsPayload(12);
    const lines = inflateSync(Buffer.from(payload.rowsDeflateBase64, "base64")).toString("utf8").split("\n").filter(Boolean);
    const records = lines.map(line => JSON.parse(line));
    const splitAt = Math.floor(records.length / 2);
    payload.rowChunksBase64 = [records.slice(0, splitAt), records.slice(splitAt)].map(chunk =>
      deflateSync(Buffer.from(chunk.map(record => JSON.stringify(record)).join("\n") + "\n", "utf8")).toString("base64")
    );
    delete payload.rowsDeflateBase64;
    const workbook = await buildSheetPayloadModel(payload, adapter);
    assert(workbook.sheetsData.Data.size === 12, "compressed chunks were not combined in order");
    assert(workbook.sheetsData.Data.get("A12")?.val === "12", "last chunk row was not reconstructed");
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

  await test("partial viewport rejects edits and serialization until full hydration finishes", async () => {
    const container = makeContainer();
    let grid;
    let adapter;
    let editAccepted = null;
    let serializationRejected = false;
    const addClass = container.classList.add;
    container.classList.add = name => {
      addClass(name);
      if (name !== "vno-sheet-hydrating" || !grid?.__vnoSheetHydrationPending) return;
      editAccepted = grid.setCellValue("A", 1, "partial-edit");
      try { adapter.serializeToFods(); } catch { serializationRejected = true; }
    };
    grid = new SheetGridController(container);
    adapter = new SheetAdapter(grid);
    assert(await adapter.loadFromPayload(makeRowsPayload(60)), "progressive payload load failed");
    assert(editAccepted === false, "cell edits were accepted against the partial model");
    assert(serializationRejected, "AutoRecover/save serialization was allowed during hydration");
    assert(!grid.__vnoSheetHydrationPending, "hydration flag remained set after completion");
    assert(grid.sheetsData.Data.size === 60, "final model is missing background rows");
  });

  await test("payload session renders its preview before fetching full row chunks", async () => {
    const grid = new SheetGridController(makeContainer());
    const adapter = new SheetAdapter(grid);
    const source = makeRowsPayload(60);
    const records = inflateSync(Buffer.from(source.rowsDeflateBase64, "base64")).toString("utf8")
      .trim().split("\n").map(line => JSON.parse(line));
    const rowRecords = records.filter(record => record[0] === "row-xml");
    const encode = values => deflateSync(Buffer.from(values.map(record => JSON.stringify(record)).join("\n") + "\n", "utf8")).toString("base64");
    const preview = {
      ...source,
      rows: 12,
      partialPreview: true,
      rowsDeflateBase64: encode([["sheet", "Data"], ...rowRecords.slice(0, 12), ["end-sheet"]]),
    };
    let beginFirstRequest;
    const firstRequestStarted = new Promise(resolve => { beginFirstRequest = resolve; });
    let releaseFirstChunk;
    let firstChunkPaused = false;
    const fetchedIndices = [];
    const originalGetChunk = globalUnoBridge.getSheetOpenPayloadChunk;
    const originalGetStatus = globalUnoBridge.getSheetOpenPayloadStatus;
    let statusCalls = 0;
    globalUnoBridge.getSheetOpenPayloadStatus = async () => {
      statusCalls++;
      return statusCalls === 1
        ? { status: "building", phase: "overlay" }
        : {
          status: "ready",
          metadata: {
            totalRows: 60,
            chunkCount: 2,
            supportXml: source.supportXml,
          },
        };
    };
    globalUnoBridge.getSheetOpenPayloadChunk = async (_openId, index) => {
      fetchedIndices.push(index);
      if (index === 0 && !firstChunkPaused) {
        firstChunkPaused = true;
        beginFirstRequest();
        return await new Promise(resolve => { releaseFirstChunk = () => resolve({
          status: "ok", openId: "session-id", index: 0, rows: 30,
          data: encode([["sheet", "Data"], ...rowRecords.slice(0, 30)])
        }); });
      }
      if (index === 0) {
        return {
          status: "ok", openId: "session-id", index: 0, rows: 30,
          data: encode([["sheet", "Data"], ...rowRecords.slice(0, 30)])
        };
      }
      return {
        status: "ok", openId: "session-id", index: 1, rows: 30,
        data: encode([...rowRecords.slice(30), ["end-sheet"]])
      };
    };
    try {
      const task = adapter.loadFromPayload(preview, undefined, "session-id");
      await firstRequestStarted;
      assert(grid.__vnoSheetHydrationPending, "hydration barrier was not active during chunk transfer");
      assert(grid.sheetsData.Data.size === 12, "preview viewport was not committed before requesting full chunks");
      let partialSerializeBlocked = false;
      try { adapter.serializeToFods(); } catch { partialSerializeBlocked = true; }
      assert(partialSerializeBlocked, "serialization read the partial workbook during chunk transfer");
      releaseFirstChunk();
      assert(await task, "chunked workbook hydration failed");
      assert(grid.sheetsData.Data.size === 60, "chunk hydration did not restore the complete workbook");
      assert(fetchedIndices.join(",") === "0,1,0,1", `streamed chunks were not fetched per pass: ${fetchedIndices.join(",")}`);
    } finally {
      globalUnoBridge.getSheetOpenPayloadChunk = originalGetChunk;
      globalUnoBridge.getSheetOpenPayloadStatus = originalGetStatus;
    }
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
      adapter.isDirty = true;
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
