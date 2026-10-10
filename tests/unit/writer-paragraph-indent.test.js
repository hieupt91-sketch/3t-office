/**
 * Unit Tests: Thụt lề đoạn kiểu Word (Ctrl+M / Ctrl+Shift+M) — bước 1,27 cm, ghi vào lề trái của đoạn.
 */
import assert from "node:assert/strict";
import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";
import { nextIndentPx, indentPxToCss, cssLengthToPx, INDENT_STEP_PX } from "../../apps/writer/paragraph-indent.js";

function makeBlock(initialMarginLeft = "") {
  const props = initialMarginLeft ? { "margin-left": initialMarginLeft } : {};
  return {
    nodeType: 1,
    tagName: "P",
    style: {
      get marginLeft() { return props["margin-left"] || ""; },
      set marginLeft(value) { props["margin-left"] = String(value); },
      removeProperty(name) { delete props[name]; },
    },
    props,
  };
}

function makeAdapter(blocks) {
  const body = { children: blocks, contains: () => true };
  const adapter = new WriterAdapter({ querySelector: (sel) => (sel === ".vno-writer-body" ? body : null), innerHTML: "" });
  adapter.bodyDom = body;
  adapter.flushTyping = () => {};
  const snapshots = [];
  adapter.recordSnapshot = (name) => snapshots.push(name);
  adapter._indentTargetBlocks = () => blocks;
  return { adapter, snapshots };
}

export async function runWriterParagraphIndentTests() {
  const results = [];
  const test = async (name, fn) => {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.stack || error.message });
    }
  };

  await test("Thụt lề: bước 1,27 cm = 48 px; tăng tới điểm dừng kế tiếp", () => {
    assert.equal(INDENT_STEP_PX, 48);
    assert.equal(nextIndentPx(0, 1), 48);
    assert.equal(nextIndentPx(30, 1), 48);
    assert.equal(nextIndentPx(48, 1), 96);
    assert.equal(nextIndentPx(100, 1), 144);
  });

  await test("Giảm thụt lề: lùi tới điểm dừng liền trước và không âm", () => {
    assert.equal(nextIndentPx(96, -1), 48);
    assert.equal(nextIndentPx(48, -1), 0);
    assert.equal(nextIndentPx(60, -1), 48);
    assert.equal(nextIndentPx(0, -1), 0);
  });

  await test("Đổi đơn vị: 1,27 cm = 36 pt = 0,5 in = 48 px, giá trị CSS ghi bằng cm", () => {
    assert.ok(Math.abs(cssLengthToPx("1.27cm") - 48) < 0.01);
    assert.ok(Math.abs(cssLengthToPx("36pt") - 48) < 0.01);
    assert.ok(Math.abs(cssLengthToPx("0.5in") - 48) < 0.01);
    assert.ok(Number.isNaN(cssLengthToPx("auto")));
    assert.equal(indentPxToCss(48), "1.27cm");
    assert.equal(indentPxToCss(96), "2.54cm");
    assert.equal(indentPxToCss(0), "");
  });

  await test("adjustParagraphIndent: tăng hai lần rồi giảm hai lần trả lề về 0, mỗi bước một mốc Hoàn tác", () => {
    const block = makeBlock();
    const { adapter, snapshots } = makeAdapter([block]);
    assert.equal(adapter.adjustParagraphIndent(1), true);
    assert.equal(block.style.marginLeft, "1.27cm");
    assert.equal(adapter.adjustParagraphIndent(1), true);
    assert.equal(block.style.marginLeft, "2.54cm");
    assert.equal(adapter.adjustParagraphIndent(-1), true);
    assert.equal(block.style.marginLeft, "1.27cm");
    assert.equal(adapter.adjustParagraphIndent(-1), true);
    assert.equal(block.style.marginLeft, "", "về 0 thì bỏ thuộc tính margin-left");
    assert.deepEqual(snapshots, ["writer.para.indentInc", "writer.para.indentInc", "writer.para.indentDec", "writer.para.indentDec"]);
  });

  await test("adjustParagraphIndent: giảm khi lề đã 0 không đổi gì và trả false để dùng đường cũ (khối trích dẫn nhập từ tài liệu cũ)", () => {
    const block = makeBlock();
    const { adapter, snapshots } = makeAdapter([block]);
    assert.equal(adapter.adjustParagraphIndent(-1), false);
    assert.deepEqual(snapshots, []);
  });

  await test("adjustParagraphIndent: nhiều đoạn có lề khác nhau, mỗi đoạn lên điểm dừng của chính nó", () => {
    const a = makeBlock();
    const b = makeBlock("2cm");
    const c = makeBlock("1.27cm");
    const { adapter } = makeAdapter([a, b, c]);
    assert.equal(adapter.adjustParagraphIndent(1), true);
    assert.equal(a.style.marginLeft, "1.27cm");
    assert.equal(b.style.marginLeft, "2.54cm", "2 cm chưa tới điểm dừng 2,54 cm nên lên 2,54 cm");
    assert.equal(c.style.marginLeft, "2.54cm");
  });

  return results;
}
