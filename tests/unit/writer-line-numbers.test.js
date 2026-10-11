/**
 * VN Writer — Line Numbers (document-level config + FODT)
 * Command, Layout select, serialize/parse idempotence, undo.
 */
import assert from "node:assert/strict";
import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";
import { WRITER_COMMANDS } from "../../platform/commands/command-definitions.js";
import { WRITER_RIBBON_TABS } from "../../apps/writer/writer-ribbon.js";
import { WRITER_HELP_ENTRIES } from "../../platform/help/entries-writer.js";
import { mapVnCommandToUno } from "../../adapters/libreoffice/common/command-dispatch-mapper.js";
import { ICONS } from "../../platform/ui-kit/icons.js";
import { viStrings } from "../../platform/i18n/strings-vi.js";
import { enStrings } from "../../platform/i18n/strings-en.js";

function adapterWithBody(innerHTML) {
  const body = { innerHTML };
  const editor = {
    innerHTML,
    classList: { toggle() {} },
    querySelector(selector) {
      return selector === ".vno-writer-body" ? body : null;
    }
  };
  return { adapter: new WriterAdapter(editor), body };
}

function flattenRibbonItems(items = []) {
  return items.flatMap((item) => (item.items ? flattenRibbonItems(item.items) : [item]));
}

function wrapFodt({ styles = "", meta = "", body = "<text:p>X</text:p>" }) {
  const metaNs = meta ? ' xmlns:meta="urn:oasis:names:tc:opendocument:xmlns:meta:1.0"' : "";
  return `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"${metaNs} office:version="1.3" office:mimetype="application/vnd.oasis.opendocument.text">
${meta}
${styles}
<office:automatic-styles>
<style:page-layout style:name="pm1">
  <style:page-layout-properties fo:page-width="21cm" fo:page-height="29.7cm" fo:margin-top="2cm" fo:margin-bottom="2cm" fo:margin-left="3cm" fo:margin-right="1.5cm" style:print-orientation="portrait"/>
</style:page-layout>
</office:automatic-styles>
<office:master-styles>
<style:master-page style:name="Standard" style:page-layout-name="pm1"/>
</office:master-styles>
<office:body><office:text>${body}</office:text></office:body>
</office:document>`;
}

export async function runWriterLineNumbersTests() {
  const results = [];
  const test = async (name, fn) => {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.stack || error.message });
    }
  };

  await test("Writer line numbers: lệnh WRITER_COMMANDS + i18n VI/EN + UNO + icon", () => {
    const id = "writer.layout.lineNumbers";
    const cmd = WRITER_COMMANDS.find((item) => item.id === id);
    assert.ok(cmd, "Thiếu writer.layout.lineNumbers");
    assert.equal(cmd.category, "layout");
    assert.equal(cmd.icon, "lineNumbers");
    assert.ok(ICONS.lineNumbers?.includes("<svg"), "Thiếu icon lineNumbers");
    assert.ok(viStrings.commands[id]?.label, "Thiếu i18n VI");
    assert.ok(enStrings.commands[id]?.label, "Thiếu i18n EN");
    assert.equal(viStrings.commands[id].label, "Danh số dòng");
    assert.equal(enStrings.commands[id].label, "Line Numbers");
    assert.equal(mapVnCommandToUno(id), ".uno:LineNumberingDialog");
  });

  await test("Writer line numbers: tab Bố cục nhóm Thiết lập trang có select 4 mode sau Ngắt trang", () => {
    const layout = WRITER_RIBBON_TABS.find((tab) => tab.id === "layout");
    const group = layout.groups.find((item) => item.id === "pageSetup");
    const items = flattenRibbonItems(group.items);
    const select = items.find((item) => item.commandId === "writer.layout.lineNumbers");
    assert.equal(select?.type, "select");
    assert.equal(select.defaultValue, "none");
    assert.equal(select.options.map((opt) => opt.value).join(","), "none,continuous,restartPage,restartSection");
    assert.match(select.options[0].label, /Không có/);
    assert.match(select.options[1].label, /Liên tục/);
    assert.match(select.options[2].label, /Mỗi trang/);
    assert.match(select.options[3].label, /Mỗi mục/);
    const breaksIndex = group.items.findIndex((item) => item.id === "writer.layout.breaks");
    const lineIndex = group.items.findIndex((item) => item.commandId === "writer.layout.lineNumbers");
    assert.ok(breaksIndex >= 0 && lineIndex === breaksIndex + 1, "Select phải đứng ngay sau dropdown Ngắt trang");
  });

  await test("Writer line numbers: bài hướng dẫn tiếng Việt nói rõ canvas không vẽ số", () => {
    const entry = WRITER_HELP_ENTRIES.find((item) => item.id === "writer.layout.lineNumbers");
    assert.ok(entry, "Thiếu bài writer.layout.lineNumbers");
    assert.ok(entry.commandIds.includes("writer.layout.lineNumbers"));
    assert.equal(entry.ribbon.tab, "Bố cục");
    assert.equal(entry.ribbon.group, "Thiết lập trang");
    assert.ok(entry.steps.length >= 3);
    const blob = [entry.title, entry.summary, ...entry.steps].join(" ");
    assert.match(blob, /Bố cục/);
    assert.match(blob, /Không có/);
    assert.match(blob, /Liên tục/);
    assert.match(blob, /không vẽ số/i);
    assert.match(blob, /phần mềm văn phòng khác/);
    assert.match(blob, /Mỗi mục chuyển thành Liên tục/);
    assert.doesNotMatch(blob, /Word|LibreOffice|FODT/);
    assert.ok(!/lorem|todo|placeholder/i.test(blob));
  });

  await test("Writer line numbers: setLineNumbers nhận 4 mode; giá trị lạ bị từ chối", () => {
    const { adapter } = adapterWithBody("<p>x</p>");
    assert.deepEqual(adapter.lineNumbers, { enabled: false, countBy: 1, restart: "continuous" });
    assert.equal(adapter.setLineNumbers("continuous"), true);
    assert.deepEqual(adapter.lineNumbers, { enabled: true, countBy: 1, restart: "continuous" });
    assert.equal(adapter.setLineNumbers("restartPage"), true);
    assert.equal(adapter.lineNumbers.restart, "page");
    assert.equal(adapter.setLineNumbers("restartSection"), true);
    assert.equal(adapter.lineNumbers.restart, "section");
    assert.equal(adapter.setLineNumbers("none"), true);
    assert.equal(adapter.lineNumbers.enabled, false);
    assert.equal(adapter.setLineNumbers("nope"), false);
    assert.equal(adapter.setLineNumbers(""), false);
    assert.equal(adapter._lineNumbersMode(), "none");
  });

  await test("Writer FODT: tắt không emit linenumbering-configuration", () => {
    const { adapter } = adapterWithBody("<p>KHONG_SO_DONG</p>");
    const fodt = adapter.serializeToFodt();
    assert.doesNotMatch(fodt, /text:linenumbering-configuration/);
    assert.doesNotMatch(fodt, /vnd.vn-office.line-numbers-restart/);
    assert.doesNotMatch(fodt, /xmlns:meta=/);
  });

  await test("Writer FODT: Liên tục emit increment=1, không restart-on-page", () => {
    const { adapter } = adapterWithBody("<p>LIEN_TUC</p>");
    adapter.lineNumbers = { enabled: true, countBy: 1, restart: "continuous" };
    const fodt = adapter.serializeToFodt();
    assert.match(fodt, /<office:styles><text:linenumbering-configuration /);
    assert.match(fodt, /text:number-lines="true"/);
    assert.match(fodt, /text:increment="1"/);
    assert.match(fodt, /text:number-position="left"/);
    assert.match(fodt, /style:num-format="1"/);
    assert.doesNotMatch(fodt, /text:restart-on-page/);
    assert.doesNotMatch(fodt, /office:meta/);
  });

  await test("Writer FODT: Mỗi trang emit restart-on-page=true", () => {
    const { adapter } = adapterWithBody("<p>MOI_TRANG</p>");
    adapter.lineNumbers = { enabled: true, countBy: 1, restart: "page" };
    const fodt = adapter.serializeToFodt();
    assert.match(fodt, /text:restart-on-page="true"/);
    assert.match(fodt, /text:increment="1"/);
    assert.doesNotMatch(fodt, /vnd.vn-office.line-numbers-restart/);
  });

  await test("Writer FODT: Mỗi mục emit meta section + XML giống liên tục", () => {
    const { adapter } = adapterWithBody("<p>MOI_MUC</p>");
    adapter.lineNumbers = { enabled: true, countBy: 1, restart: "section" };
    const fodt = adapter.serializeToFodt();
    assert.match(fodt, /xmlns:meta="urn:oasis:names:tc:opendocument:xmlns:meta:1.0"/);
    assert.match(fodt, /<office:meta><meta:user-defined meta:name="vnd.vn-office.line-numbers-restart">section<\/meta:user-defined><\/office:meta>/);
    assert.match(fodt, /text:number-lines="true"/);
    assert.match(fodt, /text:increment="1"/);
    assert.doesNotMatch(fodt, /text:restart-on-page/);
  });

  await test("Writer FODT: line numbers round-trip đúng idempotent", () => {
    const { adapter } = adapterWithBody("<p>ROUND</p>");
    adapter.lineNumbers = { enabled: true, countBy: 1, restart: "page" };
    const first = adapter.serializeToFodt();
    const parsed = adapterWithBody("<p>drop</p>").adapter;
    parsed.parseFodt(first);
    assert.deepEqual(parsed.lineNumbers, { enabled: true, countBy: 1, restart: "page" });
    assert.equal(parsed.serializeToFodt(), first);
  });

  await test("Writer FODT: parse omit number-lines = bật; false = tắt; thiếu increment = 5", () => {
    const onOmit = adapterWithBody("<p>x</p>").adapter;
    onOmit.parseFodt(wrapFodt({
      styles: '<office:styles><text:linenumbering-configuration text:increment="1" text:number-position="left" style:num-format="1"/></office:styles>'
    }));
    assert.equal(onOmit.lineNumbers.enabled, true);
    assert.equal(onOmit.lineNumbers.countBy, 1);
    assert.equal(onOmit.lineNumbers.restart, "continuous");

    const off = adapterWithBody("<p>x</p>").adapter;
    off.parseFodt(wrapFodt({
      styles: '<office:styles><text:linenumbering-configuration text:number-lines="false" text:increment="1" style:num-format="1" text:number-position="left"/></office:styles>'
    }));
    assert.equal(off.lineNumbers.enabled, false);

    const missingInc = adapterWithBody("<p>x</p>").adapter;
    missingInc.parseFodt(wrapFodt({
      styles: '<office:styles><text:linenumbering-configuration text:number-lines="true" text:number-position="left" style:num-format="1"/></office:styles>'
    }));
    assert.equal(missingInc.lineNumbers.enabled, true);
    assert.equal(missingInc.lineNumbers.countBy, 5);

    const section = adapterWithBody("<p>x</p>").adapter;
    section.parseFodt(wrapFodt({
      styles: '<office:styles><text:linenumbering-configuration text:number-lines="true" text:increment="1" text:number-position="left" style:num-format="1"/></office:styles>',
      meta: '<office:meta><meta:user-defined meta:name="vnd.vn-office.line-numbers-restart">section</meta:user-defined></office:meta>'
    }));
    assert.equal(section.lineNumbers.restart, "section");
  });

  await test("Writer FODT: gộp notes-configuration và linenumbering trong một office:styles", () => {
    const footnoteBody = '<p>Ghi chú<sup data-vno-footnote-ref="ftn1" class="vno-footnote-ref" contenteditable="false" title="Nhấp để chuyển đến chú thích">1</sup></p><div data-vno-footnotes="true" class="vno-writer-footnotes-container" contenteditable="false"><div class="vno-footnote-item" data-vno-footnote-id="ftn1"><span class="vno-note-text">nội dung</span></div></div>';
    const { adapter } = adapterWithBody(footnoteBody);
    adapter.lineNumbers = { enabled: true, countBy: 1, restart: "continuous" };
    const fodt = adapter.serializeToFodt();
    assert.match(fodt, /<office:styles><text:notes-configuration text:note-class="footnote"/);
    assert.match(fodt, /text:linenumbering-configuration /);
    assert.equal((fodt.match(/<office:styles>/g) || []).length, 1);
  });

  await test("Writer line numbers: undo/redo khôi phục cấu hình", () => {
    const { adapter } = adapterWithBody("<p>Undo</p>");
    assert.equal(adapter.lineNumbers.enabled, false);
    adapter.setLineNumbers("continuous");
    assert.equal(adapter.lineNumbers.enabled, true);
    adapter.undo();
    assert.equal(adapter.lineNumbers.enabled, false);
    adapter.redo();
    assert.equal(adapter.lineNumbers.enabled, true);
    assert.equal(adapter.lineNumbers.restart, "continuous");
  });

  return results;
}
