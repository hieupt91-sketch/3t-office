import { SlidesAdapter } from "../../adapters/libreoffice/slides/slides-adapter.js";

export async function runSlidesPasteSpecialTests() {
  const results = [];
  const test = (name, fn) => {
    try { fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };
  const asyncTest = async (name, fn) => {
    try { await fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };
  const adapter = new SlidesAdapter({ slides: [] });

  await asyncTest("Paste Special text creates an editable local text shape", async () => {
    let shapeId = null;
    let inserted = null;
    adapter.canvas = {
      insertShape(type) { shapeId = 17; return { id: shapeId, type }; },
      updateShapeText(id, text) { inserted = { id, text }; return true; }
    };
    const result = await adapter._pasteSpecialAs("text", { text: "Clipboard text" });
    if (!result || inserted?.id !== 17 || inserted?.text !== "Clipboard text") throw new Error(JSON.stringify({ result, inserted }));
  });

  await asyncTest("Paste Special refuses unknown modes without inserting data", async () => {
    let inserts = 0;
    adapter.canvas = { insertShape() { inserts++; return { id: 1 }; } };
    const result = await adapter._pasteSpecialAs("unknown", { text: "test" });
    if (result !== false || inserts !== 0) throw new Error(`result=${result}, inserts=${inserts}`);
  });

  return results;
}
