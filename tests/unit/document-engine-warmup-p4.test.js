import { scheduleDocumentEngineWarmup } from "../../platform/startup/document-engine-warmup.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export async function runDocumentEngineWarmupP4Tests() {
  const results = [];
  const test = async (name, callback) => {
    try { await callback(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };

  await test("P4 starts the main.py document engine after first paint and bridge readiness", async () => {
    let starts = 0;
    const listeners = new Map();
    const target = {
      document: { addEventListener() {}, removeEventListener() {} },
      addEventListener(name, callback) { listeners.set(name, callback); },
    };
    const result = scheduleDocumentEngineWarmup({
      target,
      getApi: () => target.api,
      setTimeoutFn: () => { throw new Error("early mode must not defer"); },
    });
    assert(result.mode === "early" && starts === 0, "must wait only for a missing bridge");
    target.api = { start_document_engine() { starts += 1; } };
    listeners.get("pywebviewready")?.();
    await Promise.resolve();
    assert(starts === 1, `engine start count=${starts}`);
  });

  await test("P4 Legacy rollback keeps first trusted input plus 250 ms delay", async () => {
    const listeners = new Map();
    const removed = [];
    const delays = [];
    let starts = 0;
    const target = {
      __VNO_OPEN_LEGACY: true,
      document: {
        addEventListener(name, callback) { listeners.set(name, callback); },
        removeEventListener(name) { removed.push(name); },
      },
    };
    const result = scheduleDocumentEngineWarmup({
      target,
      getApi: () => ({ start_document_engine() { starts += 1; } }),
      setTimeoutFn(callback, delay) { delays.push(delay); callback(); },
    });
    assert(result.mode === "legacy" && starts === 0, "Legacy must not start before input");
    listeners.get("keydown")?.({ isTrusted: false });
    assert(starts === 0, "Legacy accepted synthetic input");
    listeners.get("keydown")?.({ isTrusted: true });
    await Promise.resolve();
    assert(starts === 1 && delays[0] === 250, `Legacy timing differs: starts=${starts}, delays=${delays}`);
    assert(removed.length === 4, `Legacy listeners not removed: ${removed}`);
  });

  return results;
}
