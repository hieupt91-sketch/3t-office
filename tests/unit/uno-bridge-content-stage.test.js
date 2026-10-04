/** Chia đoạn nội dung lưu rất lớn trước khi qua cầu nối (lan14: chuỗi 327 triệu ký tự làm sập trang). */

import { UnoBridge } from "../../adapters/libreoffice/common/uno-bridge.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function makeBridge(apiOverrides = {}) {
  const calls = { chunks: [], aborted: [], saved: [] };
  const bridge = new UnoBridge();
  bridge.hasRealEngine = true;
  bridge.desktopApi = {
    begin_content_stage: async () => ({ ok: true, id: "stage-1" }),
    append_content_stage: async (id, chunk) => { calls.chunks.push(chunk); return { ok: true }; },
    abort_content_stage: async (id) => { calls.aborted.push(id); return { ok: true }; },
    save_document_in_place: async (payload) => { calls.saved.push(payload); return { status: "ok" }; },
    save_document_dialog: async (payload) => { calls.saved.push(payload); return { status: "ok" }; },
    ...apiOverrides,
  };
  return { bridge, calls };
}

export async function runUnoBridgeContentStageTests() {
  const results = [];
  const test = async (name, callback) => {
    try { await callback(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };
  const BIG = 17 * 1024 * 1024; // just over the 16M-character threshold

  await test("small content goes through the bridge unchanged", async () => {
    const { bridge, calls } = makeBridge();
    await bridge.saveRealFileInPlace("sheet", "tiny", "C:/a.xlsx", "C:/a.xlsx");
    assert(calls.saved[0] === "tiny", "small content must not be staged");
    assert(calls.chunks.length === 0, "no chunks for small content");
  });

  await test("large content is sent in ordered chunks and replaced by a reference", async () => {
    const { bridge, calls } = makeBridge();
    const content = "a".repeat(BIG);
    await bridge.saveRealFileInPlace("sheet", content, "C:/a.xlsx", "C:/a.xlsx");
    const payload = calls.saved[0];
    assert(payload && payload.vnoContentStage === "stage-1" && payload.chars === BIG, "reference expected: " + JSON.stringify(payload));
    assert(calls.chunks.join("") === content, "chunks must reassemble to the original");
    assert(calls.chunks.length >= 4, "must be split into several chunks, got " + calls.chunks.length);
    assert(calls.chunks.every((chunk) => chunk.length <= 4 * 1024 * 1024), "chunk size cap");
  });

  await test("a surrogate pair is never split across chunks", async () => {
    const { bridge, calls } = makeBridge();
    const chunkSize = 4 * 1024 * 1024;
    // Place an astral character exactly on a chunk boundary.
    const content = "b".repeat(chunkSize - 1) + "😀" + "c".repeat(BIG - chunkSize);
    await bridge.saveRealFile("sheet", content, "xlsx", "x.xlsx", "C:/x.xlsx");
    assert(calls.chunks.join("") === content, "lossless reassembly");
    for (const chunk of calls.chunks) {
      const first = chunk.charCodeAt(0);
      const last = chunk.charCodeAt(chunk.length - 1);
      assert(!(first >= 0xdc00 && first <= 0xdfff), "chunk must not start with a low surrogate");
      assert(!(last >= 0xd800 && last <= 0xdbff), "chunk must not end with a high surrogate");
    }
  });

  await test("old Python without the staging API keeps the direct path", async () => {
    const { bridge, calls } = makeBridge({ begin_content_stage: undefined, append_content_stage: undefined });
    const content = "d".repeat(BIG);
    await bridge.saveRealFileInPlace("sheet", content, "C:/a.xlsx", "C:/a.xlsx");
    assert(calls.saved[0] === content, "fallback to the direct call");
  });

  await test("a failing chunk aborts the stage and falls back to the direct call", async () => {
    let appended = 0;
    const { bridge, calls } = makeBridge({ append_content_stage: async () => (++appended > 1 ? { ok: false } : { ok: true }) });
    const content = "e".repeat(BIG);
    await bridge.saveRealFileInPlace("sheet", content, "C:/a.xlsx", "C:/a.xlsx");
    assert(calls.aborted.includes("stage-1"), "stage must be aborted");
    assert(calls.saved[0] === content, "must fall back to the direct call");
  });

  await test("legacy switch disables staging", async () => {
    const { bridge, calls } = makeBridge();
    globalThis.__VNO_SAVE_LEGACY = true;
    try {
      const content = "f".repeat(BIG);
      await bridge.saveRealFileInPlace("sheet", content, "C:/a.xlsx", "C:/a.xlsx");
      assert(calls.saved[0] === content && calls.chunks.length === 0, "legacy path expected");
    } finally {
      delete globalThis.__VNO_SAVE_LEGACY;
    }
  });

  return results;
}
