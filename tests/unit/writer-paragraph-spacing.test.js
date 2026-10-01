/**
 * VN Writer — Paragraph spacing before/after (pt)
 * Commands, ribbon Layout selects, FODT serialize/parse idempotence.
 */
import assert from "node:assert/strict";
import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";
import { WRITER_COMMANDS } from "../../platform/commands/command-definitions.js";
import { WRITER_RIBBON_TABS } from "../../apps/writer/writer-ribbon.js";
import { WRITER_HELP_ENTRIES } from "../../platform/help/entries-writer.js";
import { mapVnCommandToUno } from "../../adapters/libreoffice/common/command-dispatch-mapper.js";
import { viStrings } from "../../platform/i18n/strings-vi.js";
import { enStrings } from "../../platform/i18n/strings-en.js";

function adapterWithBody(innerHTML) {
  const body = { innerHTML };
  const editor = {
    innerHTML,
    querySelector(selector) {
      return selector === ".vno-writer-body" ? body : null;
    }
  };
  return { adapter: new WriterAdapter(editor), body };
}

function flattenRibbonItems(items = []) {
  return items.flatMap((item) => (item.items ? flattenRibbonItems(item.items) : [item]));
}

export async function runWriterParagraphSpacingTests() {
  const results = [];
  const test = async (name, fn) => {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.stack || error.message });
    }
  };

  await test("Writer paragraph spacing: hai lệnh WRITER_COMMANDS + i18n VI/EN + UNO map", () => {
    for (const id of ["writer.para.spacingBefore", "writer.para.spacingAfter"]) {
      const cmd = WRITER_COMMANDS.find((item) => item.id === id);
      assert.ok(cmd, `Thiếu ${id} trong WRITER_COMMANDS`);
      assert.equal(cmd.category, "paragraph");
      assert.ok(viStrings.commands[id]?.label, `Thiếu i18n VI ${id}`);
      assert.ok(viStrings.commands[id]?.tooltip, `Thiếu tooltip VI ${id}`);
      assert.ok(enStrings.commands[id]?.label, `Thiếu i18n EN ${id}`);
      assert.ok(enStrings.commands[id]?.tooltip, `Thiếu tooltip EN ${id}`);
    }
    assert.equal(mapVnCommandToUno("writer.para.spacingBefore"), ".uno:ParSpaceBefore");
    assert.equal(mapVnCommandToUno("writer.para.spacingAfter"), ".uno:ParSpaceAfter");
    assert.equal(viStrings.commands["writer.para.spacingBefore"].label, "Khoảng trước đoạn");
    assert.equal(enStrings.commands["writer.para.spacingAfter"].label, "Spacing After");
  });

  await test("Writer paragraph spacing: tab Bố cục nhóm Đoạn văn có hai select 0/6/8/12/18 pt", () => {
    const layout = WRITER_RIBBON_TABS.find((tab) => tab.id === "layout");
    assert.ok(layout, "Thiếu tab layout");
    const group = layout.groups.find((item) => item.id === "paragraph");
    assert.ok(group, "Thiếu nhóm paragraph trên Layout");
    const items = flattenRibbonItems(group.items);
    const before = items.find((item) => item.commandId === "writer.para.spacingBefore");
    const after = items.find((item) => item.commandId === "writer.para.spacingAfter");
    assert.equal(before?.type, "select");
    assert.equal(after?.type, "select");
    const values = (options) => options.map((opt) => opt.value).join(",");
    assert.equal(values(before.options), "0,6,8,12,18");
    assert.equal(values(after.options), "0,6,8,12,18");
    assert.match(before.options[0].label, /Trước/);
    assert.match(after.options[0].label, /Sau/);
    const home = WRITER_RIBBON_TABS.find((tab) => tab.id === "home");
    const homeIds = flattenRibbonItems(home.groups.find((g) => g.id === "paragraph")?.items || []).map((item) => item.commandId);
    assert.ok(!homeIds.includes("writer.para.spacingBefore"), "Không thêm select Before lên Home (tránh tràn 1280px)");
    assert.ok(!homeIds.includes("writer.para.spacingAfter"), "Không thêm select After lên Home (tránh tràn 1280px)");
  });

  await test("Writer paragraph spacing: bài hướng dẫn tiếng Việt khớp UI Layout", () => {
    const entry = WRITER_HELP_ENTRIES.find((item) => item.id === "writer.para.spacingBeforeAfter");
    assert.ok(entry, "Thiếu bài writer.para.spacingBeforeAfter");
    assert.ok(entry.commandIds.includes("writer.para.spacingBefore"));
    assert.ok(entry.commandIds.includes("writer.para.spacingAfter"));
    assert.equal(entry.ribbon.tab, "Bố cục");
    assert.equal(entry.ribbon.group, "Đoạn văn");
    assert.ok(entry.steps.length >= 3);
    const blob = [entry.title, entry.summary, ...entry.steps].join(" ");
    assert.match(blob, /Bố cục/);
    assert.match(blob, /0 pt/);
    assert.match(blob, /Giãn dòng/);
    assert.ok(!/lorem|todo|placeholder/i.test(blob));
  });

  await test("Writer paragraph spacing: parse pt args; giá trị âm/lạ bị từ chối", () => {
    const { adapter } = adapterWithBody("<p>x</p>");
    assert.equal(adapter._parseParagraphSpacingPt("12"), 12);
    assert.equal(adapter._parseParagraphSpacingPt("12pt"), 12);
    assert.equal(adapter._parseParagraphSpacingPt("0"), 0);
    assert.equal(adapter._parseParagraphSpacingPt("8"), 8);
    assert.equal(adapter._parseParagraphSpacingPt({ pt: "18" }), 18);
    assert.equal(adapter._parseParagraphSpacingPt(""), null);
    assert.equal(adapter._parseParagraphSpacingPt("-6"), null);
    assert.equal(adapter._parseParagraphSpacingPt("nope"), null);
    assert.equal(adapter.applyParagraphSpacingBefore("nope"), false);
    assert.equal(adapter.applyParagraphSpacingAfter("-1"), false);
  });

  await test("Writer paragraph layout: first-line indent and exact line spacing write point-valued styles", () => {
    const { adapter } = adapterWithBody("<p>x</p>");
    const calls = [];
    adapter._applyParagraphVisualStyle = (styles, description) => { calls.push({ styles, description }); return true; };
    assert.equal(adapter.applyParagraphFirstLineIndent("14.17"), true);
    assert.deepEqual(calls[0], {
      styles: { textIndent: "14.17pt" },
      description: "writer.para.firstLineIndent"
    });
    assert.equal(adapter.applyParagraphFirstLineIndent("-1"), false);
    const layout = WRITER_RIBBON_TABS.find(tab => tab.id === "layout");
    const items = flattenRibbonItems(layout.groups.find(group => group.id === "paragraph").items);
    assert.deepEqual(
      items.find(item => item.commandId === "writer.para.firstLineIndent").options.map(option => option.value),
      ["0", "14.17", "36"]
    );
    const spacingMenu = layout.groups.find(group => group.id === "paragraph").items
      .find(item => item.id === "writer.para.lineSpacingLayout");
    assert.ok(spacingMenu.items.some(item => item.args === "1.15"));
    assert.ok(spacingMenu.items.some(item => item.args === "exact"));

    const help = WRITER_HELP_ENTRIES.find(entry => entry.id === "writer.para.alignmentSpacing");
    assert.ok(help.commandIds.includes("writer.para.lineSpacing"));
    assert.match(help.steps.join(" "), /1\.15/);
    assert.match(help.steps.join(" "), /Chính xác/);
    assert.ok(WRITER_HELP_ENTRIES.some(entry => entry.id === "writer.para.firstLineIndent"));
  });

  await test("Writer line spacing: 1.15 is applied and enters Undo history", () => {
    const { adapter } = adapterWithBody("<p>x</p>");
    const style = {
      setProperty(name, value) { this[name] = value; },
      removeProperty(name) { delete this[name]; }
    };
    const paragraph = { nodeType: 1, tagName: "P", style };
    const oldWindow = globalThis.window;
    let snapshot = "";
    try {
      globalThis.window = { getSelection: () => ({ rangeCount: 1, anchorNode: paragraph }) };
      adapter.recordSnapshot = name => { snapshot = name; };
      assert.equal(adapter._setLineHeight("1.15"), true);
      assert.equal(style["--vno-lh"], "1.15");
      assert.equal(snapshot, "writer.para.lineSpacing");
    } finally {
      globalThis.window = oldWindow;
    }
  });

  await test("Writer line spacing: chính xác áp dụng vào đoạn đã chọn dù hộp thoại lấy focus", async () => {
    const { adapter, body } = adapterWithBody("<p>x</p>");
    const paragraph = {
      nodeType: 1,
      tagName: "P",
      style: {},
      hasAttribute() { return false; }
    };
    body.children = [paragraph];
    body.contains = (node) => node === paragraph;
    adapter._initZones();
    adapter.flushTyping = () => {};
    let snapshot = "";
    adapter.recordSnapshot = (name) => { snapshot = name; };

    const range = {
      startContainer: paragraph,
      intersectsNode: (node) => node === paragraph
    };
    const previousWindow = globalThis.window;
    let selectionAvailable = true;
    try {
      globalThis.window = {
        getSelection: () => selectionAvailable
          ? { rangeCount: 1, getRangeAt: () => range }
          : { rangeCount: 0 }
      };
      const applied = await adapter._applyExactLineSpacing(async () => {
        selectionAvailable = false;
        return "18";
      });
      assert.equal(applied, true);
      assert.equal(paragraph.style.lineHeight, "18pt");
      assert.equal(snapshot, "writer.para.lineSpacingExact");
    } finally {
      if (previousWindow === undefined) delete globalThis.window;
      else globalThis.window = previousWindow;
    }
  });

  await test("Writer FODT: spacing before/after serialize đúng fo:margin-top/bottom (pt)", () => {
    const { adapter } = adapterWithBody(
      '<p style="margin-top:12pt;margin-bottom:6pt">KHOANG_12_6</p>'
    );
    const fodt = adapter.serializeToFodt();
    assert.match(fodt, /fo:margin-top="12pt"/);
    assert.match(fodt, /fo:margin-bottom="6pt"/);
    assert.match(fodt, /<text:p text:style-name="P1">KHOANG_12_6<\/text:p>/);
  });

  await test("Writer FODT: đoạn không spacing không phát sinh fo:margin-*", () => {
    const { adapter } = adapterWithBody("<p>KHONG_SPACING</p>");
    const fodt = adapter.serializeToFodt();
    assert.doesNotMatch(fodt, /<style:paragraph-properties[^>]*fo:margin-top=/);
    assert.doesNotMatch(fodt, /<style:paragraph-properties[^>]*fo:margin-bottom=/);
    assert.match(fodt, /<text:p>KHONG_SPACING<\/text:p>/);
  });

  await test("Writer FODT: 0pt tường minh được emit (đè CSS canvas 6pt)", () => {
    const { adapter } = adapterWithBody('<p style="margin-top:0pt;margin-bottom:0pt">KHIT</p>');
    const fodt = adapter.serializeToFodt();
    assert.match(fodt, /fo:margin-top="0pt"/);
    assert.match(fodt, /fo:margin-bottom="0pt"/);
  });

  await test("Writer FODT: spacing + text-align dùng chung registry P*", () => {
    const { adapter } = adapterWithBody(
      '<p style="text-align:center;margin-top:18pt;margin-bottom:8pt">GIUA_18_8</p>'
    );
    const fodt = adapter.serializeToFodt();
    assert.match(fodt, /fo:text-align="center"/);
    assert.match(fodt, /fo:margin-top="18pt"/);
    assert.match(fodt, /fo:margin-bottom="8pt"/);
  });

  await test("Writer FODT: spacing before/after round-trip đúng idempotent", () => {
    const initial = adapterWithBody(
      '<p style="margin-top:12pt;margin-bottom:6pt">A</p><p style="text-align:center;margin-bottom:0pt">B</p><p>C</p>'
    );
    const first = initial.adapter.serializeToFodt();
    const parsed = adapterWithBody("<p>không được giữ</p>");
    const html = parsed.adapter.parseFodt(first);
    assert.equal(parsed.body.innerHTML, html);
    assert.equal(parsed.adapter.serializeToFodt(), first);
    assert.match(html, /margin-top:12pt/);
    assert.match(html, /margin-bottom:6pt/);
    assert.match(html, /margin-bottom:0pt/);
    assert.match(html, /text-align:center/);
    assert.match(html, />C<\/p>/);
  });

  await test("Writer FODT: first-line indent and exact line height survive serialize/parse", () => {
    const initial = adapterWithBody('<p style="margin-left:0pt;text-indent:14.17pt;line-height:18pt">EXACT_LAYOUT</p>');
    const fodt = initial.adapter.serializeToFodt();
    assert.match(fodt, /fo:margin-left="0pt"/);
    assert.match(fodt, /fo:text-indent="14\.17pt"/);
    assert.match(fodt, /fo:line-height="18pt"/);
    const parsed = adapterWithBody("<p>placeholder</p>");
    const html = parsed.adapter.parseFodt(fodt);
    assert.match(html, /margin-left:0pt/);
    assert.match(html, /text-indent:14\.17pt/);
    assert.match(html, /line-height:18pt/);
    assert.equal(parsed.adapter.serializeToFodt(), fodt);
  });

  await test("Writer FODT: parse fo:margin cm (canonical LO) ra pt", () => {
    const { adapter, body } = adapterWithBody("<p>giữ</p>");
    const fodt = `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" office:version="1.3" office:mimetype="application/vnd.oasis.opendocument.text">
<office:automatic-styles>
<style:page-layout style:name="pm1"><style:page-layout-properties fo:page-width="21cm" fo:page-height="29.7cm" fo:margin-top="2cm" fo:margin-bottom="2cm" fo:margin-left="3cm" fo:margin-right="1.5cm" style:print-orientation="portrait"/></style:page-layout>
<style:style style:name="P1" style:family="paragraph"><style:paragraph-properties fo:margin-top="0.423cm" fo:margin-bottom="0.282cm"/></style:style>
</office:automatic-styles>
<office:master-styles><style:master-page style:name="Standard" style:page-layout-name="pm1"/></office:master-styles>
<office:body><office:text><text:p text:style-name="P1">TU_CM</text:p></office:text></office:body>
</office:document>`;
    const html = adapter.parseFodt(fodt);
    assert.match(html, /TU_CM/);
    const topPt = Number(html.match(/margin-top:([\d.]+)pt/)?.[1]);
    const bottomPt = Number(html.match(/margin-bottom:([\d.]+)pt/)?.[1]);
    assert.ok(Math.abs(topPt - 12) < 0.02, `0.423cm phải gần 12pt, nhận ${topPt}`);
    assert.ok(Math.abs(bottomPt - 8) < 0.02, `0.282cm phải gần 8pt, nhận ${bottomPt}`);
    assert.equal(body.innerHTML, html);
  });

  await test("Writer FODT: CSS margin shorthand trên đoạn vẫn bị từ chối (không nuốt indent)", () => {
    const { adapter } = adapterWithBody('<p style="margin:12pt 0">x</p>');
    assert.throws(() => adapter.serializeToFodt(), (error) => error?.code === "WRITER_FODT_UNSUPPORTED_CONTENT");
  });

  return results;
}
