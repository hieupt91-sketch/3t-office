import {
  captureSelectionBookmark,
  restoreSelectionBookmark
} from "../../platform/text/spellcheck-dom-controller.js";
import { resolveWriterTabBehavior, WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";
import { SheetGridController } from "../../apps/sheet/sheet-grid.js";
import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";
import { ShortcutManager } from "../../platform/commands/shortcut-manager.js";
import { globalCommandBus } from "../../platform/commands/command-bus.js";
import {
  parseOfficeHtmlTable,
  parseOfficeTsv,
  cleanWordHtml
} from "../../platform/clipboard/office-clipboard.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function fakeElement(tagName) {
  const element = {
    nodeType: 1,
    tagName: tagName.toUpperCase(),
    childNodes: [],
    parentNode: null,
    parentElement: null,
    append(...nodes) {
      for (const node of nodes) {
        node.parentNode = this;
        node.parentElement = this;
        this.childNodes.push(node);
      }
    },
    replaceChildren(...nodes) {
      this.childNodes = [];
      this.append(...nodes);
    },
    contains(target) {
      for (let node = target; node; node = node.parentNode) if (node === this) return true;
      return false;
    },
    closest(selector) {
      const tags = selector.split(",").map(value => value.trim().toUpperCase());
      for (let node = this; node; node = node.parentElement) if (tags.includes(node.tagName)) return node;
      return null;
    }
  };
  return element;
}

function fakeText(data) {
  return { nodeType: 3, data, parentNode: null, parentElement: null };
}

function mockGridContainer() {
  let focusCount = 0;
  return {
    dataset: {},
    setAttribute() {},
    style: {},
    innerHTML: "",
    className: "",
    appendChild() {},
    insertBefore() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener() {},
    classList: { add() {}, remove() {}, toggle() {} },
    focus() { focusCount++; },
    get focusCount() { return focusCount; }
  };
}

async function test(name, fn) {
  try { return { name, pass: true, detail: await fn() }; }
  catch (error) { return { name, pass: false, error: error.message }; }
}

export async function runBasicEditingKeysTests() {
  const results = [];

  results.push(await test("Writer spell-check caret bookmark stays in the same paragraph after marker wrapping", () => {
    const oldDocument = globalThis.document;
    const oldGetSelection = globalThis.getSelection;
    const root = fakeElement("div");
    const first = fakeElement("p");
    const second = fakeElement("p");
    const firstText = fakeText("abc");
    const secondText = fakeText("Dong mot");
    first.append(firstText);
    second.append(secondText);
    root.append(first, second);
    const selection = {
      rangeCount: 1,
      isCollapsed: true,
      anchorNode: secondText,
      anchorOffset: 6,
      focusNode: secondText,
      focusOffset: 6,
      setBaseAndExtent(anchorNode, anchorOffset, focusNode, focusOffset) {
        this.anchorNode = anchorNode;
        this.anchorOffset = anchorOffset;
        this.focusNode = focusNode;
        this.focusOffset = focusOffset;
      }
    };
    globalThis.document = { activeElement: root };
    globalThis.getSelection = () => selection;
    try {
      const bookmark = captureSelectionBookmark(root);
      const markerA = fakeElement("span");
      markerA.append(fakeText("abc"));
      first.replaceChildren(markerA);
      const markerWord = fakeElement("span");
      markerWord.append(fakeText("mot"));
      second.replaceChildren(fakeText("Dong "), markerWord);
      restoreSelectionBookmark(root, bookmark);
      assert(selection.anchorNode.parentElement === markerWord, "con trỏ phải còn trong đoạn thứ hai sau khi bọc từ");
      assert(selection.anchorOffset === 1, `offset trong từ phải là 1, thực tế ${selection.anchorOffset}`);
    } finally {
      globalThis.document = oldDocument;
      if (oldGetSelection === undefined) delete globalThis.getSelection;
      else globalThis.getSelection = oldGetSelection;
    }
  }));

  results.push(await test("Writer Tab maps normal text, list indentation, table traversal and the final table cell", () => {
    assert(resolveWriterTabBehavior() === "insertTab", "Tab outside lists/tables inserts a tab character");
    assert(resolveWriterTabBehavior({ shiftKey: true }) === "ignore", "Shift+Tab ngoài bảng/danh sách phải vô hại");
    assert(resolveWriterTabBehavior({ inListAtStart: true }) === "listIndent", "Tab đầu mục phải tăng cấp danh sách");
    assert(resolveWriterTabBehavior({ inListAtStart: true, shiftKey: true }) === "listOutdent", "Shift+Tab đầu mục phải giảm cấp danh sách");
    assert(resolveWriterTabBehavior({ inTable: true, cellIndex: 1, cellCount: 3 }) === "nextCell", "Tab trong bảng phải sang ô kế tiếp");
    assert(resolveWriterTabBehavior({ inTable: true, cellIndex: 1, cellCount: 3, shiftKey: true }) === "previousCell", "Shift+Tab trong bảng phải về ô trước");
    assert(resolveWriterTabBehavior({ inTable: true, cellIndex: 2, cellCount: 3 }) === "appendTableRow", "Tab ở ô cuối phải thêm hàng");
    assert(resolveWriterTabBehavior({ inTable: true, cellIndex: 0, cellCount: 3, shiftKey: true }) === "ignore", "Shift+Tab ở ô đầu phải không thoát bảng");
  }));

  results.push(await test("Writer paste event uses clipboard HTML/text and the plain-text command selects text only", async () => {
    const adapter = Object.create(WriterAdapter.prototype);
    const captured = [];
    adapter._readClipboardFromSystem = async () => ({ status: "ok", html: "<b>định dạng</b>", text: "định dạng" });
    adapter._insertClipboardContent = data => { captured.push(data); return true; };
    assert(await adapter._pasteFromSystemClipboard(false), "Dán định dạng phải thành công");
    assert(captured.at(-1).html === "<b>định dạng</b>", "Dán thường phải giữ HTML clipboard");
    assert(await adapter._pastePlainText(), "Dán văn bản thuần phải thành công");
    assert(captured.at(-1).html === "" && captured.at(-1).text === "định dạng", "Dán thuần không được chèn HTML");

    const root = { listeners: {}, addEventListener(type, handler) { this.listeners[type] = handler; } };
    adapter.headerDom = null;
    adapter.bodyDom = root;
    adapter.footerDom = null;
    adapter._clipboardEventRoots = null;
    adapter._insertClipboardContent = data => { captured.push(data); };
    adapter._bindClipboardEvents();
    let prevented = false;
    root.listeners.paste({
      clipboardData: { getData(type) { return type === "text/html" ? "<strong>giữ kiểu</strong>" : "giữ kiểu"; } },
      preventDefault() { prevented = true; }
    });
    assert(prevented && captured.at(-1).html === "<strong>giữ kiểu</strong>", "paste event phải dùng HTML đã có trong clipboard");
  }));

  results.push(await test("Sheet Enter after a Tab sequence returns to its starting column and focus target is callable", () => {
    const container = mockGridContainer();
    const grid = new SheetGridController(container);
    grid.selectedCoord = { c: "A", r: 2 };
    grid._beginTabSequence();
    grid.selectedCoord = { c: "C", r: 2 };
    const next = grid._enterDestination(false);
    assert(next.c === "A" && next.r === 3, `Enter sau Tab phải chọn A3, thực tế ${next.c}${next.r}`);
    grid.selectedCoord = { c: "D", r: 4 };
    const ordinary = grid._enterDestination(false);
    assert(ordinary.c === "D" && ordinary.r === 5, "Enter bình thường phải giữ cột đang chọn");
    assert(grid.focusGrid() && container.focusCount === 1, "lưới phải có focus target chủ động");
  }));

  results.push(await test("Writer clipboard keys keep native events and Sheet keys route to the grid command", () => {
    const manager = new ShortcutManager();
    manager.bind("Ctrl+C", "common.edit.copy");
    manager.bind("Ctrl+X", "common.edit.cut");
    manager.bind("Ctrl+V", "common.edit.paste");
    const sheetRoot = { isContentEditable: false, classList: { contains: name => name === "vno-sheet-container" } };
    let sheetPrevented = false;
    manager._handleKeyDown({
      key: "v", ctrlKey: true, altKey: false, shiftKey: false, metaKey: false,
      target: { closest: selector => selector === "[data-vno-native-clipboard]" ? sheetRoot : null, matches: () => false },
      preventDefault() { sheetPrevented = true; }, stopPropagation() {}
    });
    assert(sheetPrevented, "Sheet clipboard shortcut must use its grid adapter command");
    const before = globalCommandBus.getHistory().length;
    for (const key of ["c", "x", "v"]) {
      let prevented = false;
      const target = {
        isContentEditable: true,
        closest: selector => selector === "[data-vno-native-clipboard]" ? { isContentEditable: true } : null,
        matches: () => false
      };
      manager._handleKeyDown({ key, ctrlKey: true, altKey: false, shiftKey: false, metaKey: false, target, preventDefault() { prevented = true; }, stopPropagation() {} });
      assert(!prevented, `Ctrl+${key.toUpperCase()} không được hủy trước ClipboardEvent`);
    }
    assert(globalCommandBus.getHistory().length === before, "shortcut capture không được chạy command thay clipboard event");
  }));

  results.push(await test("Sheet clipboard parses outside text and defers Cut until paste", async () => {
    const values = new Map([["A1", { val: "move me", formula: "", style: {} }]]);
    let mark = null;
    let pasteArgs = null;
    let cleared = false;
    const grid = {
      selectedCoord: { c: "A", r: 1 },
      activeSheet: "Sheet1",
      selectionRange: { start: { c: "A", r: 1 }, end: { c: "A", r: 1 } },
      cellsData: values,
      setCellValue() {},
      _normalizeRange: range => range,
      _rangeContains: (_range, c, r) => c === "A" && r === 1,
      _columnNumber: col => col === "A" ? 1 : col === "B" ? 2 : 3,
      _columnLabel: n => n === 1 ? "A" : n === 2 ? "B" : "C",
      setClipboardRange: (range, mode, sheet) => { mark = { range, mode, sheet }; },
      clearClipboardRange: () => { cleared = true; },
      applyPasteSpecial: (model, mode, destination, options) => { pasteArgs = { model, mode, destination, options }; return true; }
    };
    const adapter = new SheetAdapter(grid);
    const model = adapter._clipboardModelFromText("123\tabc\r\nx\ty\r\n");
    assert(model.cells.length === 2 && model.cells[0].length === 2, "clipboard TSV phải tạo đúng ma trận 2×2");
    assert(model.cells[0][0].val === 123 && model.cells[0][1].val === "abc", "clipboard TSV phải giữ nội dung ô theo cột (số được parse thành number)");

    const payload = adapter._captureSelectedClipboard();
    adapter._rememberClipboard(payload, "cut");
    assert(values.get("A1").val === "move me", "Ctrl+X phải giữ giá trị nguồn cho tới khi dán");
    assert(mark?.mode === "cut", "vùng Cắt phải được đánh dấu để người dùng thấy trạng thái");
    adapter._clipboardText = "move me";
    adapter._clipboardSourceSheet = "Sheet1";
    grid._clipboardRange = mark;
    await adapter._pasteModelIntoGrid(adapter._clipboardModel, "move me", true);
    assert(pasteArgs.options.moveRange.start.c === "A", "dán nội bộ sau Cắt phải gửi vùng nguồn để di chuyển trong một thao tác");
    assert(cleared, "viền Cắt phải biến mất sau khi dán");
grid.selectedCoord = { c: "B", r: 2 };
    adapter._readClipboardData = async () => ({ status: "ok", text: "", html: "" });
    await adapter._pasteIntoSelectedCell();
    assert(pasteArgs.destination.c === "B" && pasteArgs.destination.r === 2,
      "an empty system clipboard read falls back to the cached Sheet cut/copy range");
  }));

  // End-to-end test: Excel-style HTML paste into 3T Sheet
  results.push(await test("Sheet end-to-end: Excel HTML paste parses numbers, dates, percentages, formats, borders, merged cells", () => {
    const excelHtml = `
      <html>
      <style>
        .xl65 { mso-number-format: '0.00%'; font-weight: bold; color: #ff0000; border: 1px solid #000; }
        .xl66 { mso-number-format: '#,##0.00'; background: #ffff00; border: 1px solid #000; }
        .xl67 { mso-number-format: 'dd/mm/yyyy'; border: 1px solid #000; }
      </style>
      <table>
        <col width="80"><col width="100"><col width="90">
        <tr height="20">
          <td class="xl65" style="border:1px solid #000" x:num="0.75">75%</td>
          <td class="xl66" style="border:1px solid #000" x:num="1234.56">1,234.56</td>
          <td class="xl67" style="border:1px solid #000" x:num="45230">01/01/2024</td>
        </tr>
        <tr height="20">
          <td class="xl65" style="border:1px solid #000" x:num="0.25">25%</td>
          <td class="xl66" style="border:1px solid #000" x:num="789.01">789.01</td>
          <td class="xl67" style="border:1px solid #000" x:num="45231">02/01/2024</td>
        </tr>
      </table>
      </html>
    `;
    const result = parseOfficeHtmlTable(excelHtml);
    assert(result !== null, "Phân tích HTML Excel phải thành công");
    assert(result.cells.length === 2, "Phải có 2 hàng");
    assert(result.cells[0].length === 3, "Phải có 3 cột");
    
    // Row 1 - Percentage cell
    assert(result.cells[0][0].val === 0.75, "Ô phần trăm phải là số 0.75");
    assert(result.cells[0][0].style.numberFormat.category === "percentage", "Phải nhận diện định dạng phần trăm");
    assert(result.cells[0][0].style.fontWeight === "bold", "Phải giữ in đậm");
    assert(result.cells[0][0].style.color === "#ff0000", "Phải giữ màu chữ");
    assert(result.cells[0][0].style.border || result.cells[0][0].style.borderTop, "Phải giữ đường viền");
    
    // Row 1 - Number cell
    assert(result.cells[0][1].val === 1234.56, "Ô số phải là 1234.56");
    assert(result.cells[0][1].style.numberFormat.category === "number", "Phải nhận diện định dạng số");
    assert(result.cells[0][1].style.backgroundColor === "#ffff00", "Phải giữ màu nền");
    
    // Row 1 - Date cell (x:num takes precedence, value is Excel serial number)
    assert(result.cells[0][2].val === 45230, "Ô ngày phải là số serial Excel");
    assert(result.cells[0][2].style.numberFormat.category === "date", "Phải nhận diện định dạng ngày");
    
    // Row 2
    assert(result.cells[1][0].val === 0.25, "Hàng 2 ô 1 phải là 0.25");
    assert(result.cells[1][1].val === 789.01, "Hàng 2 ô 2 phải là 789.01");
    assert(result.cells[1][2].val === 45231, "Hàng 2 ô 3 phải là 45231");
    
    // Merged cells test
    const mergedHtml = `
      <table>
        <tr>
          <td colspan="2" rowspan="2" style="border:1px solid #000;">Merged</td>
          <td style="border:1px solid #000;">C1</td>
        </tr>
        <tr>
          <td style="border:1px solid #000;">C2</td>
        </tr>
        <tr>
          <td style="border:1px solid #000;">A3</td>
          <td style="border:1px solid #000;">B3</td>
          <td style="border:1px solid #000;">C3</td>
        </tr>
      </table>
    `;
    const mergedResult = parseOfficeHtmlTable(mergedHtml);
    assert(mergedResult !== null, "Phân tích ô gộp phải thành công");
    assert(mergedResult.mergedRanges.length === 1, "Phải có 1 ô gộp");
    assert(mergedResult.mergedRanges[0].start.c === "A" && mergedResult.mergedRanges[0].start.r === 1, "Ô gộp bắt đầu tại A1");
    assert(mergedResult.mergedRanges[0].end.c === "B" && mergedResult.mergedRanges[0].end.r === 2, "Ô gộp kết thúc tại B2");
  }));

  // End-to-end test: Word HTML paste into 3T Doc
  results.push(await test("Doc end-to-end: Word HTML paste cleans junk and preserves headings, lists, tables, links, formatting", () => {
    const wordHtml = `
      <!--[if gte mso 9]><xml><o:OfficeDocumentSettings></o:OfficeDocumentSettings></xml><![endif]-->
      <w:p><w:r><w:t>Text</w:t></w:r></w:p>
      <o:p></o:p>
      <p class="MsoHeading1" style="mso-margin-top-alt:auto; margin-top:10pt;">Title 1</p>
      <p class="MsoHeading2" style="font-size:14pt; color:#ff0000;">Title 2</p>
      <p class="MsoListParagraph" style="mso-list:l0 level1 lfo1;"><span style="font-family:Symbol">·</span>Item 1</p>
      <p class="MsoListParagraph" style="mso-list:l0 level1 lfo1;"><span style="font-family:Symbol">·</span>Item 2</p>
      <p class="MsoListParagraph" style="mso-list:l0 level1 lfo1;">1. Numbered 1</p>
      <p class="MsoListParagraph" style="mso-list:l0 level1 lfo1;">2. Numbered 2</p>
      <p><b>Bold</b> <i>Italic</i> <u>Underline</u></p>
      <p><a href="https://example.com">Link</a></p>
      <table class="MsoTableGrid"><tr><td>Cell 1</td><td>Cell 2</td></tr></table>
      <p style="font-size:14pt; color:#ff0000;">Red 14pt</p>
    `;
    const cleaned = cleanWordHtml(wordHtml);
    
    // Word junk removed
    assert(!cleaned.includes("if gte mso"), "Phải loại bỏ conditional comments");
    assert(!cleaned.includes("<xml"), "Phải loại bỏ XML tags");
    assert(!cleaned.includes("w:p"), "Phải loại bỏ w:* tags");
    assert(!cleaned.includes("w:r"), "Phải loại bỏ w:r tags");
    assert(!cleaned.includes("w:t"), "Phải loại bỏ w:t tags");
    assert(!cleaned.includes("o:p"), "Phải loại bỏ o:p tags");
    // mso- styles in style attributes are removed by cleanCssStyleString; class Mso* removed by cleanWordHtml
    assert(!cleaned.includes("mso-margin-top-alt"), "Phải loại bỏ mso-* styles trong style attribute");
    // mso-list in style attributes removed; data-vno-mso-list attribute is internal marker, not a style
    assert(!cleaned.includes('style="mso-list') && !cleaned.includes("style='mso-list"), "Phải loại bỏ mso-list styles trong style attribute");
    
    // Headings preserved
    assert(cleaned.includes("<h1>Title 1</h1>"), "Phải chuyển đổi MsoHeading1 thành h1");
    assert(cleaned.includes("<h2>Title 2</h2>"), "Phải chuyển đổi MsoHeading2 thành h2");
    
    // Lists preserved
    assert(cleaned.includes("<ul"), "Phải chuyển đổi bullet list thành ul");
    assert(cleaned.includes("<li>Item 1</li>"), "Phải giữ mục bullet 1");
    assert(cleaned.includes("<li>Item 2</li>"), "Phải giữ mục bullet 2");
    assert(cleaned.includes("<ol"), "Phải chuyển đổi numbered list thành ol");
    assert(cleaned.includes("<li>Numbered 1</li>"), "Phải giữ mục numbered 1");
    assert(cleaned.includes("<li>Numbered 2</li>"), "Phải giữ mục numbered 2");
    
    // Formatting preserved
    assert(cleaned.includes("<b>Bold</b>"), "Phải giữ in đậm");
    assert(cleaned.includes("<i>Italic</i>"), "Phải giữ in nghiêng");
    assert(cleaned.includes("<u>Underline</u>"), "Phải giữ gạch chân");
    
    // Links preserved
    assert(cleaned.includes('<a href="https://example.com">Link</a>'), "Phải giữ liên kết");
    
    // Tables preserved
    assert(cleaned.includes("<table"), "Phải giữ bảng");
    assert(cleaned.includes("<td>Cell 1</td>"), "Phải giữ ô bảng");
    assert(!cleaned.includes("MsoTableGrid"), "Phải loại bỏ class MsoTableGrid");
    
    // Font size and color preserved
    assert(cleaned.includes("font-size:14pt"), "Phải giữ cỡ chữ");
    assert(cleaned.includes("color:#ff0000") || cleaned.includes("color: #ff0000"), "Phải giữ màu chữ");
  }));

  // End-to-end test: Sheet Paste Special modes produce one Undo step
  results.push(await test("Sheet Paste Special: each mode creates exactly one Undo step", () => {
    const container = {
      querySelector() { return null; },
      querySelectorAll() { return []; },
      addEventListener() {},
      classList: { add() {}, remove() {}, toggle() {} },
      style: {},
      innerHTML: "",
      dataset: {},
      setAttribute() {},
      appendChild() {},
      focus() {},
    };
    const grid = new SheetGridController(container);
    
    // Set up source data - these calls record history
    grid.setCellValue("A", 1, 10);
    grid.cellsData.get("A1").style = { backgroundColor: "#ff0000", fontWeight: "bold", numberFormat: { category: "currency" } };
    grid.setCellValue("B", 1, 20);
    grid.cellsData.get("B1").style = { color: "#00ff00", fontStyle: "italic" };
    
    const baseUndoLength = grid.undoStack.length; // Should be 2 from the two setCellValue calls
    
    const clipboard = {
      range: { start: { c: "A", r: 1 }, end: { c: "B", r: 1 } },
      cells: [
        [
          { val: 10, formula: "", style: { backgroundColor: "#ff0000", fontWeight: "bold", numberFormat: { category: "currency" } } },
          { val: 20, formula: "", style: { color: "#00ff00", fontStyle: "italic" } }
        ]
      ]
    };
    
    // Test Values Only
    grid.applyPasteSpecial(clipboard, "values", { c: "D", r: 1 });
    assert(grid.undoStack.length === baseUndoLength + 1, "Paste Values phải tạo 1 bước Undo");
    assert(grid.cellsData.get("D1").val === 10, "Phải dán giá trị");
    assert(grid.cellsData.get("D1").formula === "", "Không được dán công thức");
    assert(!grid.cellsData.get("D1").style.backgroundColor, "Không được dán định dạng");
    grid.undo();
    assert(grid.undoStack.length === baseUndoLength, "Undo phải khôi phục");
    grid.redo();
    assert(grid.undoStack.length === baseUndoLength + 1, "Redo phải khôi phục");
    
    // Test Formats Only
    grid.applyPasteSpecial(clipboard, "formats", { c: "E", r: 1 });
    assert(grid.undoStack.length === baseUndoLength + 2, "Paste Formats phải tạo 1 bước Undo");
    assert(grid.cellsData.get("E1").style.backgroundColor === "#ff0000", "Phải dán màu nền");
    assert(grid.cellsData.get("E1").style.fontWeight === "bold", "Phải dán in đậm");
    assert(grid.cellsData.get("E1").style.numberFormat?.category === "currency", "Phải dán number format");
    grid.undo();
    assert(grid.undoStack.length === baseUndoLength + 1, "Undo phải khôi phục");
    
    // Test Transpose
    grid.applyPasteSpecial(clipboard, "transpose", { c: "G", r: 1 });
    assert(grid.undoStack.length === baseUndoLength + 2, "Paste Transpose phải tạo 1 bước Undo");
    assert(grid.cellsData.get("G1").val === 10 && grid.cellsData.get("G2").val === 20, "Hàng phải thành cột");
    grid.undo();
    assert(grid.undoStack.length === baseUndoLength + 1, "Undo phải khôi phục");
    
    // Test Keep Source (source mode)
    grid.applyPasteSpecial(clipboard, "source", { c: "I", r: 1 });
    assert(grid.undoStack.length === baseUndoLength + 2, "Paste Source phải tạo 1 bước Undo");
    assert(grid.cellsData.get("I1").val === 10 && grid.cellsData.get("J1").val === 20, "Phải dán giá trị");
    assert(grid.cellsData.get("I1").style.backgroundColor === "#ff0000", "Phải dán định dạng");
    grid.undo();
    assert(grid.undoStack.length === baseUndoLength + 1, "Undo phải khôi phục");
  }));

  return results;
}
