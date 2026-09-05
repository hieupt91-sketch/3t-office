import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";
import { WRITER_COMMANDS } from "../../platform/commands/command-definitions.js";
import { WRITER_RIBBON_TABS } from "../../apps/writer/writer-ribbon.js";
import { WRITER_HELP_ENTRIES } from "../../platform/help/entries-writer.js";
import { ICONS } from "../../platform/ui-kit/icons.js";

function assert(value, message) { if (!value) throw new Error(message); }

function createAdapter(html = "<p>Nội dung</p>") {
  const body = { innerHTML: html, innerText: "Nội dung", contains: () => true, querySelectorAll: () => [], querySelector: () => null, classList: { add() {}, remove() {}, toggle() {} }, style: {} };
  const header = { innerHTML: "", innerText: "" };
  const footer = { innerHTML: "", innerText: "" };
  const style = { setProperty() {} };
  const editor = {
    style,
    innerHTML: html,
    querySelector(selector) { if (selector === ".vno-writer-body") return body; if (selector === ".vno-writer-header") return header; if (selector === ".vno-writer-footer") return footer; return null; },
    closest() { return { style: { setProperty() {} } }; },
    addEventListener() {}, removeEventListener() {}
  };
  return { adapter: new WriterAdapter(editor), editor, body };
}

export async function runWriterSectionBreaksPageColorTests() {
  const results = [];
  const test = async (name, fn) => { try { await fn(); results.push({ name, pass: true }); } catch (error) { results.push({ name, pass: false, error: error.message }); } };

  await test("Writer Page Color: command, ribbon, icon và Help được nối thật", () => {
    assert(WRITER_COMMANDS.some((item) => item.id === "writer.page.color"), "Thiếu command Page Color");
    const design = WRITER_RIBBON_TABS.find((tab) => tab.id === "design");
    assert(design?.groups.some((group) => group.items.some((item) => item.commandId === "writer.page.color")), "Thiếu Page Color trên Design");
    assert(ICONS.pageColor?.includes("<svg"), "Thiếu icon Page Color");
    assert(WRITER_HELP_ENTRIES.some((entry) => entry.id === "writer.page.color" && entry.steps.length >= 3), "Thiếu Help Page Color");
  });

  await test("Writer Page Color: đổi model, CSS canvas/export và Undo/Redo", () => {
    const { adapter, editor } = createAdapter();
    adapter.setPageColor("#dbeafe");
    assert(adapter.pageColor === "#dbeafe", "Model không đổi màu");
    assert(editor.style.backgroundColor === "#dbeafe", "Canvas không đổi màu");
    assert(adapter._contentForExport().includes("background-color: #dbeafe"), "Export thiếu page background");
    assert(adapter.undo(), "Không Undo được Page Color");
    assert(adapter.pageColor === "transparent", "Undo không phục hồi không màu");
    assert(adapter.redo(), "Không Redo được Page Color");
    assert(adapter.pageColor === "#dbeafe", "Redo không phục hồi màu");
  });

  return results;
}
