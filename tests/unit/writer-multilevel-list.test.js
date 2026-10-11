/**
 * VN Writer — Multilevel list (3 presets × 3 levels)
 * Command, Home gallery, Tab/Shift+Tab, FODT serialize/parse idempotence.
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
    querySelector(selector) {
      return selector === ".vno-writer-body" ? body : null;
    }
  };
  return { adapter: new WriterAdapter(editor), body };
}

function threeLevelHtml(className) {
  return `<ol class="${className}"><li>L1_ONE<ol class="${className}"><li>L2_ONE<ol class="${className}"><li>L3_ONE</li><li>L3_TWO</li></ol></li><li>L2_TWO</li></ol></li><li>L1_TWO</li></ol>`;
}

export async function runWriterMultilevelListTests() {
  const results = [];
  const test = async (name, fn) => {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.stack || error.message });
    }
  };

  await test("Writer multilevel: lệnh WRITER_COMMANDS + i18n VI/EN + UNO + icon", () => {
    const id = "writer.para.multilevelList";
    const cmd = WRITER_COMMANDS.find((item) => item.id === id);
    assert.ok(cmd, "Thiếu writer.para.multilevelList");
    assert.equal(cmd.category, "paragraph");
    assert.equal(cmd.icon, "listMultilevel");
    assert.ok(ICONS.listMultilevel?.includes("<svg"), "Thiếu icon listMultilevel");
    assert.ok(viStrings.commands[id]?.label, "Thiếu i18n VI");
    assert.ok(enStrings.commands[id]?.label, "Thiếu i18n EN");
    assert.equal(viStrings.commands[id].label, "Danh sách đa cấp");
    assert.equal(enStrings.commands[id].label, "Multilevel List");
    assert.equal(mapVnCommandToUno(id), ".uno:OutlineBullet");
    assert.equal(mapVnCommandToUno("writer.list.numbered"), ".uno:DefaultNumbering");
  });

  await test("Writer multilevel: gallery Home nhóm Đoạn văn ngay sau Đánh số", () => {
    const home = WRITER_RIBBON_TABS.find((tab) => tab.id === "home");
    const group = home.groups.find((item) => item.id === "paragraph");
    const row = group.items[0].items[0].items;
    const ids = row.map((item) => item.commandId || item.id);
    assert.deepEqual(ids.slice(0, 4), [
      "writer.list.bullet",
      "writer.list.numbered",
      "writer.para.multilevelList",
      "writer.para.indentDec"
    ]);
    const gallery = row.find((item) => item.id === "writer.para.multilevelList");
    assert.equal(gallery.type, "dropdown");
    assert.equal(gallery.iconOnly, true);
    const args = gallery.items.map((item) => item.args).join(",");
    assert.equal(args, "decimal,letter,nd30");
    assert.match(gallery.items[0].label, /1\.1\.1/);
    assert.match(gallery.items[1].label, /a\./);
    assert.match(gallery.items[2].label, /Điều/);
  });

  await test("Writer multilevel: bài hướng dẫn tiếng Việt khớp UI Home", () => {
    const entry = WRITER_HELP_ENTRIES.find((item) => item.id === "writer.para.multilevelList");
    assert.ok(entry, "Thiếu bài writer.para.multilevelList");
    assert.ok(entry.commandIds.includes("writer.para.multilevelList"));
    assert.equal(entry.ribbon.tab, "Trang đầu");
    assert.equal(entry.ribbon.group, "Đoạn văn");
    assert.ok(entry.steps.length >= 3);
    const blob = [entry.title, entry.summary, ...entry.steps].join(" ");
    assert.match(blob, /Tab/);
    assert.match(blob, /Shift\+Tab/);
    assert.match(blob, /1\.1\.1/);
    assert.match(blob, /NĐ 30|Nghị định 30|Điều/);
    assert.match(blob, /3 cấp/);
    assert.doesNotMatch(blob, /lorem|todo|placeholder/i);
  });

  await test("Writer multilevel: apply decimal bọc đoạn thành ol class vno-ml-decimal", () => {
    const { adapter, body } = adapterWithBody("<p>Một</p><p>Hai</p>");
    assert.equal(adapter.applyMultilevelList("decimal"), true);
    assert.match(body.innerHTML, /<ol class="vno-ml-decimal">/);
    assert.match(body.innerHTML, /<li>Một<\/li>/);
    assert.match(body.innerHTML, /<li>Hai<\/li>/);
    assert.equal(adapter.applyMultilevelList("nope"), false);
  });

  await test("Writer FODT: decimal 3 cấp emit LMultiDecimal + display-levels", () => {
    const { adapter } = adapterWithBody(threeLevelHtml("vno-ml-decimal"));
    const fodt = adapter.serializeToFodt();
    assert.match(fodt, /<text:list-style style:name="LMultiDecimal">/);
    assert.match(fodt, /text:level="2"[^>]*text:display-levels="2"/);
    assert.match(fodt, /text:level="3"[^>]*text:display-levels="3"/);
    assert.match(fodt, /<text:list text:style-name="LMultiDecimal">/);
    assert.match(fodt, /<text:p>L1_ONE<\/text:p><text:list text:style-name="LMultiDecimal">/);
    assert.match(fodt, /<text:p>L3_ONE<\/text:p>/);
    assert.doesNotMatch(fodt, /LMultiLetter|LMultiNd30/);
  });

  await test("Writer FODT: letter 1/a/i và nd30 Điều prefix", () => {
    const letter = adapterWithBody(threeLevelHtml("vno-ml-letter")).adapter.serializeToFodt();
    assert.match(letter, /style:name="LMultiLetter"/);
    assert.match(letter, /text:level="2" style:num-format="a" style:num-suffix="\."/);
    assert.match(letter, /text:level="3" style:num-format="i" style:num-suffix="\."/);
    assert.doesNotMatch(letter, /text:display-levels/);

    const nd30 = adapterWithBody(threeLevelHtml("vno-ml-nd30")).adapter.serializeToFodt();
    assert.match(nd30, /style:name="LMultiNd30"/);
    assert.match(nd30, /style:num-prefix="Điều "/);
    assert.match(nd30, /text:level="3" style:num-format="a" style:num-suffix="\)"/);
  });

  await test("Writer FODT: list đơn Phase A không thành multilevel", () => {
    const { adapter } = adapterWithBody("<ol><li>Số một</li><li>Số hai</li></ol><ul><li>Chấm</li></ul>");
    const fodt = adapter.serializeToFodt();
    assert.match(fodt, /text:style-name="LNumber"/);
    assert.match(fodt, /text:style-name="LBullet"/);
    assert.doesNotMatch(fodt, /LMultiDecimal|LMultiLetter|LMultiNd30|display-levels/);
  });

  await test("Writer FODT: nested inherit (thiếu style-name trên list con) parse được", () => {
    const inner = '<text:list text:style-name="LMultiDecimal"><text:list-item><text:p>Cha</text:p><text:list><text:list-item><text:p>Con</text:p></text:list-item></text:list></text:list-item></text:list>';
    const fodt = `<?xml version="1.0" encoding="UTF-8"?><office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0" office:version="1.3" office:mimetype="application/vnd.oasis.opendocument.text"><office:automatic-styles><style:page-layout style:name="pm1"><style:page-layout-properties fo:page-width="21cm" fo:page-height="29.7cm" fo:margin-top="2cm" fo:margin-bottom="2cm" fo:margin-left="3cm" fo:margin-right="1.5cm" style:print-orientation="portrait"/></style:page-layout><text:list-style style:name="LBullet"><text:list-level-style-bullet text:level="1" text:bullet-char="•"><style:list-level-properties text:space-before="0.635cm" text:min-label-width="0.635cm"/></text:list-level-style-bullet></text:list-style><text:list-style style:name="LNumber"><text:list-level-style-number text:level="1" style:num-format="1" style:num-suffix="."><style:list-level-properties text:space-before="0.635cm" text:min-label-width="0.635cm"/></text:list-level-style-number></text:list-style></office:automatic-styles><office:master-styles><style:master-page style:name="Standard" style:page-layout-name="pm1"/></office:master-styles><office:body><office:text>${inner}</office:text></office:body></office:document>`;
    const { adapter, body } = adapterWithBody("<p>drop</p>");
    adapter.parseFodt(fodt);
    assert.match(body.innerHTML, /class="vno-ml-decimal"/);
    assert.match(body.innerHTML, /<li>Cha<ol class="vno-ml-decimal"><li>Con<\/li><\/ol><\/li>/);
  });

  await test("Writer FODT: ba preset round-trip idempotent", () => {
    for (const className of ["vno-ml-decimal", "vno-ml-letter", "vno-ml-nd30"]) {
      const initial = adapterWithBody(threeLevelHtml(className));
      const first = initial.adapter.serializeToFodt();
      const parsed = adapterWithBody("<p>drop</p>");
      parsed.adapter.parseFodt(first);
      const second = parsed.adapter.serializeToFodt();
      assert.equal(second, first, `${className} serialize → parse → serialize phải byte-identical`);
      assert.match(parsed.body.innerHTML, new RegExp(`class="${className}"`));
    }
  });

  await test("Writer multilevel: Tab tăng cấp, Shift+Tab giảm cấp, trần 3 cấp", () => {
    const { adapter, body } = adapterWithBody('<ol class="vno-ml-decimal"><li>A</li><li>B</li></ol>');
    assert.equal(adapter.changeListLevel(1, "B"), true);
    const afterInc = adapter.serializeToFodt();
    assert.match(afterInc, /<text:p>A<\/text:p><text:list text:style-name="LMultiDecimal"><text:list-item><text:p>B<\/text:p>/);

    assert.equal(adapter.changeListLevel(-1, "B"), true);
    const afterDec = adapter.serializeToFodt();
    assert.match(afterDec, /<text:p>A<\/text:p><\/text:list-item><text:list-item><text:p>B<\/text:p>/);

    const deep = adapterWithBody(threeLevelHtml("vno-ml-decimal"));
    assert.equal(deep.adapter.changeListLevel(1, "L3_ONE"), false, "cấp 3 không lồng thêm");
    assert.equal(deep.body.innerHTML, threeLevelHtml("vno-ml-decimal"));
  });

  await test("Writer FODT: list style lạ vẫn render được (fallback ol/ul)", () => {
    const { adapter } = adapterWithBody("<p>Giữ</p>");
    const bad = `<?xml version="1.0"?><office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" office:mimetype="application/vnd.oasis.opendocument.text"><office:body><office:text><text:list text:style-name="L1"><text:list-item><text:p>X</text:p></text:list-item></text:list></office:text></office:body></office:document>`;
    assert.doesNotThrow(() => adapter.parseFodt(bad), "parseFodt không được ném lỗi với list style lạ (fallback)");
  });

  return results;
}
