/**
 * Unit Tests: phát hiện bảng/hàng/ô người dùng đã sửa để lưu DOCX không ghi đè bằng thuộc tính gốc.
 */
import assert from "node:assert/strict";
import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";

function makeElement(tagName, attrs = {}, children = []) {
  const element = {
    tagName,
    nodeType: 1,
    attributes: Object.entries(attrs).map(([name, value]) => ({ name, value: String(value) })),
    children,
    parentElement: null,
    style: {},
    getAttribute(name) {
      const found = this.attributes.find((attribute) => attribute.name === name);
      return found ? found.value : null;
    },
    setAttribute(name, value) {
      const found = this.attributes.find((attribute) => attribute.name === name);
      if (found) found.value = String(value);
      else this.attributes.push({ name, value: String(value) });
    },
    closest(selector) {
      const wanted = selector.toUpperCase();
      for (let node = this; node; node = node.parentElement) if (node.tagName === wanted) return node;
      return null;
    },
    textContent: "",
  };
  children.forEach((child) => { child.parentElement = element; });
  return element;
}

function makeTable(rowsOfTexts, { rowSpanAt } = {}) {
  const rows = rowsOfTexts.map((texts, r) => {
    const cells = texts.map((text, c) => {
      const cell = makeElement("TD", {});
      cell.textContent = text;
      cell.rowSpan = rowSpanAt && rowSpanAt[0] === r && rowSpanAt[1] === c ? 2 : 1;
      return cell;
    });
    const row = makeElement("TR", {}, cells);
    row.cells = cells;
    return row;
  });
  const table = makeElement("TABLE", {}, rows);
  table.rows = rows;
  table.textContent = rowsOfTexts.flat().join(" ");
  return table;
}

function makeAdapter(table) {
  const root = {
    querySelectorAll(selector) {
      if (selector === "table") return [table];
      if (selector === "table,tr,td,th") return [table, ...table.rows, ...table.rows.flatMap((row) => row.cells)];
      return [];
    },
    children: [table],
  };
  const adapter = new WriterAdapter({ querySelector: () => root, innerHTML: "" });
  adapter.bodyDom = root;
  adapter._markImportedParagraphsUntouched(root);
  return { adapter, root };
}

export async function runWriterTableEditsExportTests() {
  const results = [];
  const test = async (name, fn) => {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.stack || error.message });
    }
  };

  await test("Bảng chưa sửa: không báo sửa đổi nào", () => {
    const { adapter, root } = makeAdapter(makeTable([["Họ tên", "Tuổi"], ["An", "20"]]));
    assert.deepEqual(adapter._tableEditsForExport(root), []);
  });

  await test("Rê chuột qua mép ô (style cursor / style rỗng) không bị coi là chỉnh sửa", () => {
    const table = makeTable([["Họ tên", "Tuổi"], ["An", "20"]]);
    const { adapter, root } = makeAdapter(table);
    const cell = table.rows[1].cells[0];
    cell.setAttribute("style", "cursor: col-resize;");
    table.rows[0].cells[1].setAttribute("style", "");
    assert.deepEqual(adapter._tableEditsForExport(root), []);
  });

  await test("Tô nền một ô: chỉ ô đó được báo, kèm khóa chữ đầu của bảng, không cờ all/table", () => {
    const table = makeTable([["Họ tên", "Tuổi"], ["An", "20"]]);
    const { adapter, root } = makeAdapter(table);
    table.rows[1].cells[1].setAttribute("style", "background-color: rgb(255, 255, 0);");
    const edits = adapter._tableEditsForExport(root);
    assert.equal(edits.length, 1);
    assert.deepEqual(edits[0].cells, [[1, 1]]);
    assert.equal(edits[0].all, false);
    assert.equal(edits[0].table, false);
    assert.equal(edits[0].k, "họtênTuổian20".toLowerCase().replace(/[^0-9a-zà-ỹ]+/g, "").slice(0, 24));
  });

  await test("Đổi độ rộng một ô: bảng được đánh dấu table (bỏ lưới cột nguồn)", () => {
    const table = makeTable([["A", "B"], ["C", "D"]]);
    const { adapter, root } = makeAdapter(table);
    table.rows[0].cells[0].style.width = "50%";
    const edits = adapter._tableEditsForExport(root);
    assert.equal(edits.length, 1);
    assert.equal(edits[0].table, true);
  });

  await test("Xóa một hàng (cấu trúc đổi): bảng báo all, không khôi phục thuộc tính gốc", () => {
    const table = makeTable([["A", "B"], ["C", "D"], ["E", "F"]]);
    const { adapter, root } = makeAdapter(table);
    table.rows.splice(1, 1);
    const edits = adapter._tableEditsForExport(root);
    assert.equal(edits.length, 1);
    assert.equal(edits[0].all, true);
  });

  await test("Hàng phân trang tự động do trình soạn thảo chèn không bị coi là đổi cấu trúc", () => {
    const table = makeTable([["A", "B"], ["C", "D"], ["E", "F"]]);
    const { adapter, root } = makeAdapter(table);
    const gap = makeElement("TR", { "data-vno-auto-page-gap": "true", class: "vno-page-auto-gap" }, []);
    gap.cells = [{ rowSpan: 1, getAttribute: () => null, attributes: [], style: {} }];
    table.rows.splice(1, 0, gap);
    assert.deepEqual(adapter._tableEditsForExport(root), [], "hàng phân trang tự động không phải chỉnh sửa");
  });

  await test("Hàng chèn mới không có dấu nguồn: bảng báo all", () => {
    const table = makeTable([["A", "B"], ["C", "D"]]);
    const { adapter, root } = makeAdapter(table);
    const inserted = makeElement("TR", {}, []);
    inserted.cells = [];
    table.rows.push(inserted);
    const edits = adapter._tableEditsForExport(root);
    assert.equal(edits[0].all, true);
  });

  await test("Bảng có ô gộp dọc và ô bị sửa: báo all vì chỉ số ô DOM không khớp w:tc", () => {
    const table = makeTable([["A", "B"], ["C"]], { rowSpanAt: [0, 1] });
    const { adapter, root } = makeAdapter(table);
    table.rows[1].cells[0].setAttribute("style", "background-color: red;");
    const edits = adapter._tableEditsForExport(root);
    assert.equal(edits[0].all, true);
  });

  return results;
}
