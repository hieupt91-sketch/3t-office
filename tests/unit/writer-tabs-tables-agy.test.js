/**
 * VN Writer — Unit Tests: Tabs Dialog, Ruler Tab Stops, Go To Dialog, Split Table,
 * Cell Text Direction, and Combined Table Properties Dialog.
 * Ticket: AGY-WRITER1 (Khớp Word 2016).
 */

import assert from "node:assert/strict";
import {
  TAB_ALIGNMENTS,
  TAB_LEADERS,
  parseTabStops,
  serializeTabStops,
  resolveTab,
  styleTabElement
} from "../../apps/writer/tab-stops.js";
import { GOTO_TYPES } from "../../apps/writer/writer-goto-dialog.js";
import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";
import { globalCommandBus } from "../../platform/commands/command-bus.js";

class MockClassList {
  constructor(owner) { this.owner = owner; }
  _set() { return new Set((this.owner.className || "").split(/\s+/).filter(Boolean)); }
  add(...names) {
    const s = this._set();
    for (const n of names) s.add(n);
    this.owner.className = [...s].join(" ");
  }
  remove(...names) {
    const s = this._set();
    for (const n of names) s.delete(n);
    this.owner.className = [...s].join(" ");
  }
  contains(n) { return this._set().has(n); }
  toggle(n) {
    if (this.contains(n)) { this.remove(n); return false; }
    this.add(n); return true;
  }
}

class MockElement {
  constructor(tagName = "div") {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.parentElement = null;
    this.parentNode = null;
    this.className = "";
    this.classList = new MockClassList(this);
    this.style = {};
    this.attributes = {};
    this.dataset = {};
    this.listeners = {};
    this.id = "";
    this._innerHTML = "";
    this.colSpan = 1;
    this.rowSpan = 1;
  }

  get isConnected() { return true; }

  get innerHTML() { return this._innerHTML; }
  set innerHTML(val) {
    this._innerHTML = val;
    this.children = [];
  }

  get textContent() {
    return this._textContent !== undefined ? this._textContent : this._innerHTML.replace(/<[^>]+>/g, "");
  }
  set textContent(val) {
    this._textContent = val;
    this._innerHTML = val;
  }

  setAttribute(k, v) { this.attributes[k] = String(v); }
  getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attributes, k) ? this.attributes[k] : null; }
  removeAttribute(k) { delete this.attributes[k]; }
  hasAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attributes, k); }

  appendChild(child) {
    if (child.parentElement) child.parentElement.removeChild(child);
    child.parentElement = this;
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  insertBefore(newChild, refChild) {
    if (!refChild) return this.appendChild(newChild);
    if (newChild.parentElement) newChild.parentElement.removeChild(newChild);
    const idx = this.children.indexOf(refChild);
    if (idx === -1) return this.appendChild(newChild);
    newChild.parentElement = this;
    newChild.parentNode = this;
    this.children.splice(idx, 0, newChild);
    return newChild;
  }

  removeChild(child) {
    const idx = this.children.indexOf(child);
    if (idx !== -1) {
      this.children.splice(idx, 1);
      child.parentElement = null;
      child.parentNode = null;
    }
    return child;
  }

  remove() {
    if (this.parentElement) {
      this.parentElement.removeChild(this);
    }
  }

  get nextSibling() {
    if (!this.parentElement) return null;
    const idx = this.parentElement.children.indexOf(this);
    return idx >= 0 && idx + 1 < this.parentElement.children.length ? this.parentElement.children[idx + 1] : null;
  }

  get previousSibling() {
    if (!this.parentElement) return null;
    const idx = this.parentElement.children.indexOf(this);
    return idx > 0 ? this.parentElement.children[idx - 1] : null;
  }

  closest(selector) {
    let cur = this;
    const tag = selector.toUpperCase();
    while (cur) {
      if (cur.tagName === tag) return cur;
      cur = cur.parentElement;
    }
    return null;
  }

  querySelectorAll(selector) {
    const results = [];
    const selectors = selector.split(",").map(s => s.trim().toLowerCase());
    const walk = (node) => {
      for (const child of node.children) {
        const tag = child.tagName.toLowerCase();
        let matches = false;
        for (const sel of selectors) {
          if (sel === tag || sel === "*") {
            matches = true;
            break;
          }
          if (sel.startsWith("#") && child.id === sel.slice(1)) {
            matches = true;
            break;
          }
          if (sel.startsWith(".") && child.classList.contains(sel.slice(1))) {
            matches = true;
            break;
          }
          if (sel.includes("[name=") && child.getAttribute("name")) {
            const val = sel.match(/\[name=["']?([^"'\]]+)["']?\]/)?.[1];
            if (val && child.getAttribute("name") === val) {
              matches = true;
              break;
            }
          }
          if (sel === "td, th" || sel === "td,th") {
            if (tag === "td" || tag === "th") {
              matches = true;
              break;
            }
          }
        }
        if (matches) results.push(child);
        walk(child);
      }
    };
    walk(this);
    return results;
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] || null;
  }

  get rows() {
    if (this.tagName === "TABLE") {
      const r = [];
      const walk = (node) => {
        for (const child of node.children) {
          if (child.tagName === "TR") r.push(child);
          else walk(child);
        }
      };
      walk(this);
      r.forEach((row, i) => { row.rowIndex = i; });
      return r;
    }
    return [];
  }

  get cells() {
    if (this.tagName === "TR") {
      const c = this.children.filter(ch => ch.tagName === "TD" || ch.tagName === "TH");
      c.forEach((cell, i) => { cell.cellIndex = i; });
      return c;
    }
    return [];
  }

  cloneNode(deep = true) {
    const clone = new MockElement(this.tagName);
    clone.className = this.className;
    clone.style = { ...this.style };
    clone.attributes = { ...this.attributes };
    clone.dataset = { ...this.dataset };
    clone._innerHTML = this._innerHTML;
    if (deep) {
      for (const child of this.children) {
        clone.appendChild(child.cloneNode(true));
      }
    }
    return clone;
  }

  scrollIntoView() {}
}

function setupMockDocument() {
  const root = new MockElement("div");
  global.document = {
    createElement(tag) { return new MockElement(tag); },
    body: root,
    addEventListener() {},
    removeEventListener() {}
  };
  global.window = {
    getSelection() {
      return {
        rangeCount: 0,
        removeAllRanges() {},
        addRange() {}
      };
    }
  };
  return root;
}

function createMockTable(rowCount = 4, colCount = 2) {
  const table = new MockElement("table");
  const tbody = new MockElement("tbody");
  table.appendChild(tbody);
  for (let r = 0; r < rowCount; r++) {
    const tr = new MockElement("tr");
    tbody.appendChild(tr);
    for (let c = 0; c < colCount; c++) {
      const td = new MockElement("td");
      td.innerHTML = `R${r + 1}C${c + 1}`;
      tr.appendChild(td);
    }
  }
  return table;
}

export async function runWriterTabsTablesAgyTests() {
  const origDoc = global.document;
  const origWin = global.window;
  setupMockDocument();

  const results = [];
  const test = async (name, fn) => {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.message });
    }
  };

  // 1. TABS & RULER TAB STOPS
  await test("Tabs: TAB_ALIGNMENTS hỗ trợ đầy đủ Left, Center, Right, Decimal và Bar", () => {
    const ids = TAB_ALIGNMENTS.map(a => a.id);
    assert(ids.includes("l"), "Phải có l (Trái)");
    assert(ids.includes("c"), "Phải có c (Giữa)");
    assert(ids.includes("r"), "Phải có r (Phải)");
    assert(ids.includes("dec"), "Phải có dec (Thập phân)");
    assert(ids.includes("bar"), "Phải có bar (Thanh dọc)");
  });

  await test("Tabs: TAB_LEADERS hỗ trợ đầy đủ None, Dots, Dashes và Underline", () => {
    const ids = TAB_LEADERS.map(l => l.id);
    assert(ids.includes("n"), "Phải có n (None)");
    assert(ids.includes("d"), "Phải có d (Dots)");
    assert(ids.includes("h"), "Phải có h (Dashes)");
    assert(ids.includes("u"), "Phải có u (Underline)");
  });

  await test("Tabs: parseTabStops và serializeTabStops round-trip chuẩn xác cho dec và bar", () => {
    const original = [
      { cm: 2.54, align: "l", leader: "n" },
      { cm: 5.08, align: "c", leader: "d" },
      { cm: 7.62, align: "r", leader: "h" },
      { cm: 10.16, align: "dec", leader: "u" },
      { cm: 12.7, align: "bar", leader: "n" }
    ];
    const encoded = serializeTabStops(original);
    const parsed = parseTabStops(encoded);
    assert.equal(parsed.length, 5);
    assert.equal(parsed[3].align, "dec");
    assert.equal(parsed[3].leader, "u");
    assert.equal(parsed[4].align, "bar");
    assert.equal(parsed[4].leader, "n");
  });

  await test("Tabs: resolveTab tính toán offset cho Decimal tab và style cho Bar tab", () => {
    const decStops = [{ px: 200, align: "dec", leader: "n" }];
    const resolvedDec = resolveTab(100, 40, decStops, 48);
    assert.equal(resolvedDec.width, 60, "Decimal tab phải lùi lại bề rộng chữ");
    assert.equal(resolvedDec.align, "dec");

    const barStops = [{ px: 150, align: "bar", leader: "n" }];
    const resolvedBar = resolveTab(100, 40, barStops, 48);
    assert.equal(resolvedBar.width, 50, "Bar tab phải giữ full width tới vị trí thanh");
    assert.equal(resolvedBar.align, "bar");
  });

  await test("Tabs: styleTabElement gắn đúng CSS border-right cho bar tab", () => {
    const el = new MockElement("span");
    styleTabElement(el, 25, "n", "bar");
    assert.equal(el.style.borderRight, "1px solid currentColor");
    assert.equal(el.style.display, "inline-block");
  });

  // 2. GO TO DIALOG (Ctrl+G)
  await test("Go To: GOTO_TYPES chứa đủ 6 loại điều hướng chuẩn Word 2016", () => {
    const ids = GOTO_TYPES.map(g => g.id);
    assert(ids.includes("page"), "Phải có Trang");
    assert(ids.includes("line"), "Phải có Dòng");
    assert(ids.includes("heading"), "Phải có Đề mục");
    assert(ids.includes("bookmark"), "Phải có Dấu trang");
    assert(ids.includes("footnote"), "Phải có Chú thích cuối trang");
    assert(ids.includes("table"), "Phải có Bảng");
  });

  await test("Go To: navigateToGoToTarget điều hướng chính xác tới Heading, Bookmark, Table", () => {
    const adapter = new WriterAdapter();
    const docRoot = new MockElement("div");
    adapter.editorDom = docRoot;

    const h1 = new MockElement("h1");
    h1.textContent = "Điều 1: Quy định chung";
    docRoot.appendChild(h1);

    const bmk = new MockElement("a");
    bmk.setAttribute("name", "muc_luc_chinh");
    docRoot.appendChild(bmk);

    const tbl = createMockTable(2, 2);
    docRoot.appendChild(tbl);

    let placedNode = null;
    adapter._placeCaretAt = (node) => { placedNode = node; return true; };

    // Điều hướng tới Heading
    const okHeading = adapter.navigateToGoToTarget({ type: "heading", target: "Quy định" });
    assert.equal(okHeading, true);
    assert.equal(placedNode, h1);

    // Điều hướng tới Bookmark
    const okBookmark = adapter.navigateToGoToTarget({ type: "bookmark", target: "muc_luc_chinh" });
    assert.equal(okBookmark, true);
    assert.equal(placedNode, bmk);

    // Điều hướng tới Table
    const okTable = adapter.navigateToGoToTarget({ type: "table", target: 1 });
    assert.equal(okTable, true);
    assert(placedNode.tagName === "TD" || placedNode.tagName === "TABLE");
  });

  // 3. SPLIT TABLE
  await test("Split Table: Tách bảng 4 hàng tại hàng thứ 2 tạo thành 2 bảng xen giữa bởi đoạn trống", () => {
    const adapter = new WriterAdapter();
    const docRoot = new MockElement("div");
    adapter.editorDom = docRoot;
    adapter.bodyDom = docRoot;

    const table = createMockTable(4, 2);
    docRoot.appendChild(table);

    // Đặt active cell ở hàng thứ 2 (rowIndex = 1, tức hàng thứ 2)
    const targetCell = table.rows[1].cells[0];
    adapter._getActiveTableCell = () => targetCell;

    const snapshots = [];
    adapter.recordSnapshot = (name) => {
      snapshots.push({ name, html: docRoot.innerHTML, childCount: docRoot.children.length });
    };

    const ok = adapter.splitTable();
    assert.equal(ok, true, "splitTable phải thành công");

    // docRoot phải có: table1, p, table2
    const tables = docRoot.children.filter(c => c.tagName === "TABLE");
    assert.equal(tables.length, 2, "Phải tách thành 2 bảng riêng rẽ");
    assert.equal(tables[0].rows.length, 1, "Bảng 1 phải có 1 hàng (hàng 0)");
    assert.equal(tables[1].rows.length, 3, "Bảng 2 phải có 3 hàng (hàng 1..3)");

    const sep = tables[0].nextSibling;
    assert.equal(sep.tagName, "P", "Xen giữa 2 bảng phải là thẻ <p>");
    assert(snapshots.length > 0, "Phải ghi nhận snapshot writer.table.splitTable");
  });

  await test("Split Table: Tại hàng đầu tiên (rowIndex 0), chèn đoạn trống phía trên bảng", () => {
    const adapter = new WriterAdapter();
    const docRoot = new MockElement("div");
    adapter.editorDom = docRoot;
    adapter.bodyDom = docRoot;

    const table = createMockTable(3, 2);
    docRoot.appendChild(table);

    const firstCell = table.rows[0].cells[0];
    adapter._getActiveTableCell = () => firstCell;

    const ok = adapter.splitTable();
    assert.equal(ok, true);

    const firstChild = docRoot.children[0];
    assert.equal(firstChild.tagName, "P", "Phần tử đầu tiên phải là đoạn trống <p>");
    assert.equal(table.rows.length, 3, "Bảng gốc phải giữ nguyên số hàng");
  });

  // 4. CELL TEXT DIRECTION
  await test("Cell Text Direction: Xoay vòng horizontal -> tbRl -> btLr -> horizontal chuẩn xác", () => {
    const adapter = new WriterAdapter();
    const docRoot = new MockElement("div");
    adapter.editorDom = docRoot;
    adapter.bodyDom = docRoot;

    const table = createMockTable(2, 2);
    docRoot.appendChild(table);

    const cell = table.rows[0].cells[0];
    adapter._getActiveTableCell = () => cell;

    // Lần 1: horizontal -> tbRl (90°)
    adapter.setTableTextDirection();
    assert.equal(cell.getAttribute("data-vno-text-direction"), "tbRl");
    assert.equal(cell.style.writingMode, "vertical-rl");
    assert(cell.classList.contains("vno-cell-vertical-tbrl"));

    // Lần 2: tbRl -> btLr (270°)
    adapter.setTableTextDirection();
    assert.equal(cell.getAttribute("data-vno-text-direction"), "btLr");
    assert.equal(cell.style.writingMode, "vertical-lr");
    assert(cell.classList.contains("vno-cell-vertical-btlr"));

    // Lần 3: btLr -> horizontal
    adapter.setTableTextDirection();
    assert.equal(cell.getAttribute("data-vno-text-direction"), null);
    assert.equal(cell.style.writingMode, "");
    assert(!cell.classList.contains("vno-cell-vertical-tbrl"));
    assert(!cell.classList.contains("vno-cell-vertical-btlr"));
  });

  // 5. COMBINED TABLE PROPERTIES DIALOG
  await test("Table Properties: Thiết lập căn lề, thụt lề, lề ô và dãn cách ô chính xác trên DOM", async () => {
    const adapter = new WriterAdapter();
    const docRoot = new MockElement("div");
    adapter.editorDom = docRoot;
    adapter.bodyDom = docRoot;

    const table = createMockTable(2, 2);
    docRoot.appendChild(table);

    adapter._getActiveTable = () => table;

    const config = {
      align: "center",
      indentPt: 18,
      width: "80%",
      rowHeightPt: 24,
      marginTopPt: 6,
      marginBottomPt: 6,
      marginLeftPt: 9,
      marginRightPt: 9,
      cellSpacingPt: 2.8
    };

    const ok = await adapter.openTablePropertiesDialog(config);
    assert.equal(ok, true);

    // Kiểm tra các thuộc tính dataset và CSS trên table
    assert.equal(table.getAttribute("data-vno-table-align"), "center");
    assert.equal(table.style.marginLeft, "auto");
    assert.equal(table.style.marginRight, "auto");
    assert.equal(table.getAttribute("data-vno-table-indent"), "18");
    assert.equal(table.style.width, "80%");

    // Kiểm tra độ cao hàng và lề ô
    assert.equal(table.rows[0].style.height, "24pt");
    assert.equal(table.rows[0].cells[0].style.padding, "6pt 9pt 6pt 9pt");

    // Kiểm tra khoảng cách ô (cell spacing)
    assert.equal(table.getAttribute("data-vno-cell-spacing"), "2.8");
    assert.equal(table.style.borderCollapse, "separate");
    assert.equal(table.style.borderSpacing, "2.8pt");
  });

  await test("List Preservation: _applyOoxmlListIndents và _applyOoxmlListBullets bảo toàn list-style-type và margin cho mục danh sách", async () => {
    const adapter = new WriterAdapter();
    const docXml = '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:pPr><w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr><w:r><w:t>Item 1</w:t></w:r></w:p></w:body></w:document>';
    const numXml = '<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:abstractNum w:abstractNumId="1"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="1"/></w:num></w:numbering>';
    const html = '<ol><li><p>Item 1</p></li></ol>';
    let res = adapter._applyOoxmlListBullets(html, docXml, "", numXml);
    res = adapter._applyOoxmlListIndents(res, docXml, "", numXml);
    assert.ok(res.includes('list-style-type: decimal'), "Phải gán list-style-type: decimal");
    assert.ok(res.includes('margin-left: 1.27cm'), "Phải gán margin-left: 1.27cm");
  });

  global.document = origDoc;
  global.window = origWin;

  return results;
}
