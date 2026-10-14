import assert from "node:assert/strict";
import { WRITER_COMMANDS } from "../../platform/commands/command-definitions.js";
import { WRITER_RIBBON_TABS } from "../../apps/writer/writer-ribbon.js";
import { WRITER_HELP_ENTRIES } from "../../platform/help/entries-writer.js";
import { viStrings } from "../../platform/i18n/strings-vi.js";
import { enStrings } from "../../platform/i18n/strings-en.js";
import { mapVnCommandToUno } from "../../adapters/libreoffice/common/command-dispatch-mapper.js";
import { evaluateMergeCondition, replaceMergeFields, resolveMailMergeRecord } from "../../apps/writer/mail-merge-data.js";
import { WriterBuildingBlockStore, buildAlphabeticalIndex, buildIndexHtml, sanitizeBuildingBlockHtml } from "../../apps/writer/writer-w4.js";

function flatten(items = []) {
  return items.flatMap((item) => item.items ? flatten(item.items) : [item]);
}

function memoryStorage() {
  const values = new Map();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)) };
}

export async function runWriterW4Tests() {
  const results = [];
  const test = async (name, fn) => {
    try { await fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.stack || error.message }); }
  };

  await test("WORD-W4: command, UNO mapping và i18n VI/EN đầy đủ", () => {
    const expected = {
      "writer.mailMerge.ifRule": ".uno:InsertField",
      "writer.reference.indexMark": ".uno:IndexEntryDialog",
      "writer.reference.indexInsert": ".uno:InsertMultiIndex",
      "writer.insert.quickParts": ".uno:EditGlossary",
      "writer.layout.hyphenation": ".uno:Hyphenate"
    };
    for (const [id, uno] of Object.entries(expected)) {
      assert.ok(WRITER_COMMANDS.some((command) => command.id === id), `Thiếu command ${id}`);
      assert.ok(viStrings.commands[id]?.label, `Thiếu VI ${id}`);
      assert.ok(enStrings.commands[id]?.label, `Thiếu EN ${id}`);
      assert.equal(mapVnCommandToUno(id), uno);
    }
  });

  await test("WORD-W4: ribbon đặt tính năng đúng tab và ngắt từ có hai trạng thái", () => {
    const insert = flatten(WRITER_RIBBON_TABS.find((tab) => tab.id === "insert").groups.flatMap((group) => group.items));
    const refs = flatten(WRITER_RIBBON_TABS.find((tab) => tab.id === "references").groups.flatMap((group) => group.items));
    const layout = flatten(WRITER_RIBBON_TABS.find((tab) => tab.id === "layout").groups.flatMap((group) => group.items));
    assert.ok(insert.some((item) => item.commandId === "writer.insert.quickParts"));
    assert.ok(refs.some((item) => item.commandId === "writer.reference.indexMark"));
    assert.ok(refs.some((item) => item.commandId === "writer.reference.indexInsert"));
    const hyphen = layout.find((item) => item.commandId === "writer.layout.hyphenation");
    assert.equal(hyphen.type, "select");
    assert.deepEqual(hyphen.options.map((item) => item.value), ["none", "auto"]);
  });

  await test("WORD-W4: điều kiện Rules và điều khiển bản ghi hoạt động", () => {
    assert.equal(evaluateMergeCondition("12", "greaterThan", "9"), true);
    assert.equal(evaluateMergeCondition("Hà Nội", "contains", "Nội"), true);
    const skip = '<span data-merge-rule="skipIf" data-field="City" data-op="equals" data-value="Huế">rule</span><span data-field="Name">«Name»</span>';
    assert.equal(resolveMailMergeRecord(skip, { City: "Huế", Name: "An" }).skip, true);
    const next = '<span data-merge-rule="nextIf" data-field="Move" data-op="equals" data-value="Có">rule</span><span data-field="Name">«Name»</span>';
    const resolved = resolveMailMergeRecord(next, { Move: "Có", Name: "A" }, { Move: "Không", Name: "B" });
    assert.equal(resolved.record.Name, "B");
    assert.equal(replaceMergeFields(next, resolved.record), "B");
    const fill = '<span data-merge-rule="fillIn" data-prompt="Mã" data-default="A-01">Điền vào</span>';
    assert.equal(replaceMergeFields(fill, {}), "A-01");
  });

  await test("WORD-W4: chỉ mục gộp mục trùng và sắp chữ cái tiếng Việt", () => {
    const entries = buildAlphabeticalIndex([
      { term: "Ứng dụng", page: 3, targetId: "u1" },
      { term: "An toàn", page: 2, targetId: "a1" },
      { term: "Ứng dụng", page: 5, targetId: "u2" }
    ], "vi");
    assert.deepEqual(entries.map((item) => item.term), ["An toàn", "Ứng dụng"]);
    assert.deepEqual(entries[1].pages, [3, 5]);
    const html = buildIndexHtml(entries, "vi");
    assert.match(html, /CHỈ MỤC/);
    assert.match(html, /data-index-block="true"/);
  });

  await test("WORD-W4: khối dựng sẵn lưu offline, thay thế cùng tên và loại nội dung nguy hiểm", () => {
    const storage = memoryStorage();
    const store = new WriterBuildingBlockStore(storage);
    const saved = store.save({ name: "Chữ ký", category: "Công văn", html: '<p onclick="steal()">Ký</p><script>bad()</script>' });
    assert.ok(saved);
    assert.equal(store.list().length, 1);
    assert.doesNotMatch(store.list()[0].html, /onclick|script|bad/);
    store.save({ name: "Chữ ký", category: "Công văn", html: "<p>Ký mới</p>" });
    assert.equal(store.list().length, 1);
    assert.match(store.list()[0].html, /Ký mới/);
    assert.equal(store.remove(store.list()[0].id), true);
    assert.equal(store.list().length, 0);
    assert.equal(sanitizeBuildingBlockHtml('<a href="javascript:x()">x</a>').includes("javascript"), false);
  });

  await test("WORD-W4: Help tiếng Việt chỉ đúng vị trí và có thao tác cụ thể", () => {
    for (const id of ["writer.mailMerge.ifRule.docx", "writer.reference.index", "writer.insert.quickParts", "writer.layout.hyphenation"]) {
      const entry = WRITER_HELP_ENTRIES.find((item) => item.id === id);
      assert.ok(entry, `Thiếu Help ${id}`);
      assert.ok(entry.steps.length >= 4);
      const content = [entry.title, entry.summary, ...entry.steps].join(" ");
      assert.doesNotMatch(content, /TODO|placeholder|Microsoft|Word|Excel|PowerPoint/i);
    }
  });

  return results;
}

