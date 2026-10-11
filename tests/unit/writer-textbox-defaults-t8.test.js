import assert from "node:assert/strict";
import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";

export async function runWriterTextBoxDefaultsT8Tests() {
  const results = [];
  const test = async (name, fn) => {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.stack || error.message });
    }
  };

  await test("new Writer text box uses the measured Word default size", () => {
    const adapter = new WriterAdapter(null);
    adapter.flushTyping = () => {};
    adapter._renderShapes = () => {};
    adapter.recordSnapshot = () => {};
    const shape = adapter.insertTextBox({ text: "Audit textbox" });
    assert.equal(shape.w, 125.47);
    assert.equal(shape.h, 45.6);
  });

  await test("explicit Writer text box dimensions are preserved", () => {
    const adapter = new WriterAdapter(null);
    adapter.flushTyping = () => {};
    adapter._renderShapes = () => {};
    adapter.recordSnapshot = () => {};
    const shape = adapter.insertTextBox({ text: "Custom size", width: 220, height: 80 });
    assert.equal(shape.w, 220);
    assert.equal(shape.h, 80);
  });

  return results;
}
