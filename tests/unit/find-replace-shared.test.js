/**
 * 3T Office — Shared Find and Replace Tests (CH-7.1)
 * Kiểm thử toàn diện hộp thoại và bộ máy tìm kiếm / thay thế dùng chung cho:
 * 3T Doc (Writer), 3T Sheet và 3T Slide.
 * Kiểm tra:
 * - Matcher: matchCase, wholeWord Unicode, NFC normalization, ignoreDiacritics (kể cả đ/Đ),
 *   thoát ký tự đặc biệt regex ($ ^ * + ? . ( ) [ ] { } | \), replace count.
 * - FindReplaceEngine: find, findNext, findPrevious, vòng quanh (wrap-around).
 * - Dialog Session: lưu trạng thái, F3 / Shift+F3.
 * - 3T Doc model: tìm trong DOM, thay thế 1 lần, thay thế tất cả, Undo đúng 1 bước.
 * - 3T Sheet model: tìm theo hàng/cột, tìm trong sheet/workbook, tìm theo giá trị/công thức,
 *   thay thế tất cả và Undo đúng 1 bước.
 * - 3T Slide model: tìm xuyên suốt các trang chiếu & shapes, thay thế tất cả và Undo đúng 1 bước.
 */

import assert from "node:assert/strict";
import {
  normalizeNFC,
  stripDiacritics,
  escapeRegExp,
  createMatcher,
  FindReplaceEngine,
  showFindReplaceDialog,
  getLastFindSession,
  setLastFindSession,
  findNextFromSession,
  findPrevFromSession
} from "../../platform/find/index.js";
import { replaceTextInTextNodes, WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";
import { SheetGridController } from "../../apps/sheet/sheet-grid.js";
import { SlidesCanvasController } from "../../apps/slides/slides-canvas.js";

function createMockSheetContainer() {
  const domMap = new Map();
  return {
    setAttribute() {},
    focus() {},
    querySelector(sel) {
      const coordMatch = sel?.match?.(/data-coord="([^"]+)"/);
      if (coordMatch) {
        const coord = coordMatch[1];
        if (!domMap.has(coord)) {
          domMap.set(coord, {
            textContent: "",
            innerHTML: "",
            style: {},
            classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
            dataset: { coord },
            scrollIntoView() {}
          });
        }
        return domMap.get(coord);
      }
      return null;
    },
    querySelectorAll() { return []; },
    classList: { add() {}, remove() {}, toggle() {} },
    dataset: {}
  };
}

function createMockWriterEnv(initialHtml = "<p>Nội dung ban đầu</p>") {
  const listeners = {};
  const bodyEl = {
    innerHTML: initialHtml,
    innerText: initialHtml.replace(/<[^>]*>/g, ""),
    focus() {},
    contains() { return true; },
    dispatchEvent(event) {
      if (listeners.input) listeners.input.forEach(fn => fn(event));
    },
    querySelectorAll() { return []; },
    querySelector() { return null; }
  };

  const editorDom = {
    bodyDom: bodyEl,
    style: {},
    focus() {},
    contains() { return true; },
    addEventListener(name, fn) {
      if (!listeners[name]) listeners[name] = [];
      listeners[name].push(fn);
    },
    removeEventListener(name, fn) {
      if (listeners[name]) {
        listeners[name] = listeners[name].filter(f => f !== fn);
      }
    },
    querySelector(sel) {
      if (sel === ".vno-writer-body" || sel === "[contenteditable='true']") return bodyEl;
      return null;
    },
    querySelectorAll() { return []; }
  };

  return { editorDom, bodyEl };
}

export async function runSharedFindReplaceTests() {
  const results = [];
  const test = (name, fn) => {
    try {
      fn();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.stack || error.message });
    }
  };

  const asyncTest = async (name, fn) => {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.stack || error.message });
    }
  };

  // 1. Core Matcher: Case Sensitivity
  test("Search Engine: Khớp chữ hoa/thường (matchCase = true vs false)", () => {
    const text = "Báo Cáo Tài Chính và báo cáo tài chính";
    const caseSensitive = createMatcher("Báo Cáo", { matchCase: true });
    const caseInsensitive = createMatcher("Báo Cáo", { matchCase: false });

    const matchesSensitive = caseSensitive.findAll(text);
    assert.equal(matchesSensitive.length, 1, "matchCase: true chỉ khớp đúng chữ hoa");
    assert.equal(matchesSensitive[0].index, 0);

    const matchesInsensitive = caseInsensitive.findAll(text);
    assert.equal(matchesInsensitive.length, 2, "matchCase: false khớp cả chữ hoa lẫn chữ thường");
  });

  // 2. Core Matcher: Whole Word with Vietnamese Unicode
  test("Search Engine: Chỉ toàn bộ từ (wholeWord) với tiếng Việt có dấu", () => {
    const text = "văn bản và bảng tổng hợp biểu mẫu bản nháp";
    const wholeWord = createMatcher("bản", { wholeWord: true });
    const partWord = createMatcher("bản", { wholeWord: false });

    const wholeMatches = wholeWord.findAll(text);
    // "văn bản" (khớp), "bảng" (không khớp vì sau 'bản' là 'g'), "bản nháp" (khớp)
    assert.equal(wholeMatches.length, 2, "wholeWord: true không được khớp vào từ con của 'bảng'");
    assert.equal(wholeMatches[0].match, "bản");
    assert.equal(wholeMatches[1].match, "bản");

    const partMatches = partWord.findAll(text);
    assert.equal(partMatches.length, 3, "wholeWord: false khớp cả 3 lần (kể cả 'bảng')");
  });

  // 3. Core Matcher: Vietnamese Diacritics and NFC Normalization
  test("Search Engine: Chuẩn hóa NFC và tùy chọn bỏ qua dấu tiếng Việt (kể cả đ/Đ)", () => {
    // Chuỗi dựng sẵn (NFC) vs tổ hợp (NFD)
    const nfcString = "Tiếng Việt có dấu: đơn giá và hợp đồng";
    const nfdFind = "Tiê\u0301ng Viê\u0323t"; // NFD
    const matcherNfc = createMatcher(nfdFind, { matchCase: false, ignoreDiacritics: false });
    assert.equal(matcherNfc.matches(nfcString), true, "NFD tìm kiếm phải khớp với NFC văn bản");

    // ignoreDiacritics = false: không dấu không khớp có dấu
    const noAccentFind = "don gia";
    const strictMatcher = createMatcher(noAccentFind, { ignoreDiacritics: false });
    assert.equal(strictMatcher.matches(nfcString), false, "Khi không bỏ qua dấu, 'don gia' không khớp 'đơn giá'");

    // ignoreDiacritics = true: không dấu khớp có dấu kể cả đ/Đ
    const looseMatcher = createMatcher(noAccentFind, { ignoreDiacritics: true });
    assert.equal(looseMatcher.matches(nfcString), true, "ignoreDiacritics: true thì 'don gia' phải khớp 'đơn giá'");
    const found = looseMatcher.findAll(nfcString);
    assert.equal(found.length, 1);
    assert.equal(found[0].match, "đơn giá", "Kết quả trả về phải giữ nguyên chữ có dấu gốc");

    // Khớp chữ Đ hoa và đ thường
    const matcherD = createMatcher("hop dong", { ignoreDiacritics: true });
    assert.equal(matcherD.matches(nfcString), true, "ignoreDiacritics: true khớp cả 'đ' trong 'hợp đồng'");
  });

  // 4. Core Matcher: Regex-special characters
  test("Search Engine: Thoát an toàn ký tự đặc biệt Regex trong chuỗi tìm kiếm", () => {
    const text = "Giá trị: $100.00 (VAT [10%] + phụ phí?) * 2 = $220.00 (tổng cộng)";
    const query = "$100.00 (VAT [10%] + phụ phí?)";
    const matcher = createMatcher(query);

    assert.equal(matcher.matches(text), true, "Phải khớp chính xác chuỗi chứa ký tự $, ., (, ), [, ], +, ?");
    const rep = matcher.replace(text, "$150.00 (VAT [5%])", false);
    assert.equal(rep.count, 1, "Thay thế 1 lần thành công");
    assert(rep.text.includes("$150.00 (VAT [5%]) * 2 = $220.00"), "Nội dung thay thế đúng vị trí");

    const query2 = "* 2 = $220.00";
    const matcher2 = createMatcher(query2);
    assert.equal(matcher2.matches(text), true, "Khớp chuỗi bắt đầu bằng *");
  });

  // 5. FindReplaceEngine: findNext, findPrevious, wrap-around
  test("FindReplaceEngine: Duyệt vòng quanh xuôi/ngược và thay thế", () => {
    const engine = new FindReplaceEngine();
    const docText = "mục 1, mục 2, mục 3, mục 1 tiếp";

    const m1 = engine.find(docText, "mục", { searchDirection: "forward" });
    assert.equal(m1.index, 0);

    const m2 = engine.findNext(docText, "mục");
    assert.equal(m2.index, 7);

    const m3 = engine.findNext(docText, "mục");
    assert.equal(m3.index, 14);

    const m4 = engine.findNext(docText, "mục");
    assert.equal(m4.index, 21);

    // Vòng quanh lại đầu
    const mWrap = engine.findNext(docText, "mục");
    assert.equal(mWrap.index, 0, "Duyệt xuôi hết danh sách phải vòng quanh về kết quả đầu");

    // Lùi ngược lại
    const mPrev = engine.findPrevious(docText, "mục");
    assert.equal(mPrev.index, 21, "Duyệt ngược từ đầu phải vòng về kết quả cuối");

    // Replace All
    const repAll = engine.replaceAll(docText, "mục", "phần");
    assert.equal(repAll.count, 4, "Đã thay thế đúng 4 lần");
    assert.equal(repAll.text, "phần 1, phần 2, phần 3, phần 1 tiếp");
  });

  // 6. Dialog Session & F3 / Shift+F3
  test("Dialog Session: Lưu trạng thái phiên tìm kiếm và điều hướng F3 / Shift+F3", () => {
    let nextCount = 0;
    let prevCount = 0;
    setLastFindSession({
      findText: "từ khóa test",
      replaceText: "thay thế test",
      options: { matchCase: true, wholeWord: false },
      app: "writer",
      onFind: () => { nextCount++; return true; },
      onFindPrev: () => { prevCount++; return true; }
    });

    const session = getLastFindSession();
    assert.equal(session.findText, "từ khóa test");
    assert.equal(session.replaceText, "thay thế test");
    assert.equal(session.options.matchCase, true);

    const resNext = findNextFromSession();
    assert.equal(resNext, true);
    assert.equal(nextCount, 1, "findNextFromSession kích hoạt onFind");

    const resPrev = findPrevFromSession();
    assert.equal(resPrev, true);
    assert.equal(prevCount, 1, "findPrevFromSession kích hoạt onFindPrev");
  });

  // 7. 3T Doc (Writer) Model: text nodes replace, replaceAll count & single Undo
  test("3T Doc (Writer): thay thế văn bản, đếm số lượng và hoàn tác 1 bước", () => {
    const boldNode = { data: "Hợp đồng thử nghiệm số 1" };
    const textNode = { data: " - Chi tiết Hợp đồng và phụ lục Hợp đồng." };
    const nodes = [boldNode, textNode];

    // Thay thế 1 lần
    const r1 = replaceTextInTextNodes(nodes, "Hợp đồng", "Văn bản", false, { matchCase: true });
    assert.equal(r1, 1, "Thay thế 1 lần thành công");
    assert.equal(boldNode.data, "Văn bản thử nghiệm số 1");
    assert.equal(textNode.data, " - Chi tiết Hợp đồng và phụ lục Hợp đồng.");

    // Thay thế tất cả
    const rAll = replaceTextInTextNodes(nodes, "Hợp đồng", "Thỏa thuận", true, { matchCase: true });
    assert.equal(rAll, 2, "Thay thế tất cả 2 chỗ còn lại");
    assert.equal(textNode.data, " - Chi tiết Thỏa thuận và phụ lục Thỏa thuận.");

    // Kiểm tra Undo của WriterAdapter
    const env = createMockWriterEnv("<p>Báo cáo năm 2025. Báo cáo quý 1 và Báo cáo quý 2.</p>");
    const adapter = new WriterAdapter(env.editorDom);
    adapter.attach();

    env.bodyEl.innerHTML = "<p>Tổng kết năm 2025. Tổng kết quý 1 và Tổng kết quý 2.</p>";
    adapter.recordSnapshot("common.edit.replaceAll");
    assert(adapter.canUndo(), "WriterAdapter phải có snapshot Undo sau khi thay thế");
    assert.equal(adapter.undo(), true, "Hoàn tác thành công chỉ trong đúng 1 bước");
    assert.equal(env.bodyEl.innerHTML, "<p>Báo cáo năm 2025. Báo cáo quý 1 và Báo cáo quý 2.</p>");
  });

  // 8. 3T Sheet Model: findNext/Prev, row/column order, workbook scope, replaceAll & single Undo
  test("3T Sheet: tìm theo hàng/cột, tìm trong sheet/workbook, thay thế và Hoàn tác 1 bước", () => {
    const grid = new SheetGridController(createMockSheetContainer());
    grid.setCellValue("A", 1, "Dữ liệu A1");
    grid.setCellValue("B", 1, "Dữ liệu B1");
    grid.setCellValue("A", 2, "Dữ liệu A2");
    grid.setCellValue("C", 1, "=SUM(A1:B1)");

    // Tìm theo hàng (mặc định)
    const c1 = grid.findNext("Dữ liệu", { searchBy: "rows" });
    assert.equal(c1, "A1");
    const c2 = grid.findNext("Dữ liệu", { searchBy: "rows" });
    assert.equal(c2, "B1");
    const c3 = grid.findNext("Dữ liệu", { searchBy: "rows" });
    assert.equal(c3, "A2");

    // Tìm theo cột
    const cCol1 = grid.findNext("Dữ liệu", { searchBy: "columns" });
    assert.equal(cCol1, "A1");
    const cCol2 = grid.findNext("Dữ liệu", { searchBy: "columns" });
    assert.equal(cCol2, "A2");

    // Tìm theo công thức vs giá trị
    const fMatch = grid.findNext("SUM", { lookIn: "formulas" });
    assert.equal(fMatch, "C1", "lookIn: formulas phải tìm thấy trong công thức");
    const valMiss = grid.findNext("SUM", { lookIn: "values" });
    assert.equal(valMiss, false, "lookIn: values không khớp công thức thô SUM");

    // Replace All trên sheet và Undo 1 bước
    const repCount = grid.replaceAll("Dữ liệu", "Thông tin");
    assert.equal(repCount, 3, "Đã thay thế đúng 3 ô");
    assert.equal(grid.cellsData.get("A1").val, "Thông tin A1");
    assert.equal(grid.cellsData.get("B1").val, "Thông tin B1");
    assert.equal(grid.cellsData.get("A2").val, "Thông tin A2");

    assert.equal(grid.undo(), true, "Undo replaceAll");
    assert.equal(grid.cellsData.get("A1").val, "Dữ liệu A1", "Undo phải phục hồi lại A1");
    assert.equal(grid.cellsData.get("B1").val, "Dữ liệu B1", "Undo phải phục hồi lại B1");
    assert.equal(grid.cellsData.get("A2").val, "Dữ liệu A2", "Undo phải phục hồi lại A2");

    // Replace All với scope: workbook (đa trang tính) và Undo 1 bước
    grid.sheets = ["Sheet1", "Sheet2"];
    grid.activeSheet = "Sheet1";
    grid.sheetsData["Sheet2"] = new Map([
      ["A1", { val: "Mục Sheet2", formula: "", style: {} }]
    ]);
    grid.setCellValue("A", 1, "Mục Sheet1");

    const wbRepCount = grid.replaceAll("Mục", "Phần", { scope: "workbook" });
    assert.equal(wbRepCount, 2, "replaceAll với scope workbook thay thế trên cả 2 sheet");
    assert.equal(grid.cellsData.get("A1").val, "Phần Sheet1");
    assert.equal(grid.sheetsData["Sheet2"].get("A1").val, "Phần Sheet2");

    assert.equal(grid.undo(), true, "Undo workbook replaceAll thành công");
    assert.equal(grid.cellsData.get("A1").val, "Mục Sheet1", "Undo phục hồi Sheet1");
    assert.equal(grid.sheetsData["Sheet2"].get("A1").val, "Mục Sheet2", "Undo phục hồi Sheet2");
  });

  // 9. 3T Slide Model: find across slides, select slide/shape, replaceAll & single Undo
  test("3T Slide: tìm xuyên suốt trang chiếu, thay thế tất cả và Hoàn tác 1 bước", () => {
    const canvas = new SlidesCanvasController({ innerHTML: "", className: "" });
    canvas.shapesLayer = null;
    canvas._renderThumbnails = () => {};
    canvas._renderShapesLayer = () => {};
    canvas.selectSlide = (index) => { canvas.currentSlideIndex = index; };
    canvas.setSelectedShapes = () => {};
    canvas.setSelectedTarget = () => {};

    canvas.slides = [
      {
        id: 1,
        title: "Kế hoạch năm 2026",
        body: "Nội dung kế hoạch chi tiết",
        shapes: [
          { id: "s1", text: "Ghi chú kế hoạch" }
        ]
      },
      {
        id: 2,
        title: "Triển khai kế hoạch",
        body: "Các bước thực hiện",
        shapes: []
      }
    ];
    canvas.currentSlideIndex = 0;

    // Tìm kiếm
    const f1 = canvas.findNext("kế hoạch");
    assert.equal(f1.slideIndex, 0);
    assert.equal(f1.field, "title");

    const f2 = canvas.findNext("kế hoạch");
    assert.equal(f2.slideIndex, 0);
    assert.equal(f2.field, "body");

    const f3 = canvas.findNext("kế hoạch");
    assert.equal(f3.slideIndex, 0);
    assert.equal(f3.field, "shape");

    const f4 = canvas.findNext("kế hoạch");
    assert.equal(f4.slideIndex, 1);
    assert.equal(f4.field, "title");

    // Replace All và Undo 1 bước
    const repCount = canvas.replaceAll("kế hoạch", "chiến lược");
    assert.equal(repCount, 4, "Đã thay thế đúng 4 vị trí trên 2 trang chiếu");
    assert.equal(canvas.slides[0].title, "chiến lược năm 2026");
    assert.equal(canvas.slides[0].body, "Nội dung chiến lược chi tiết");
    assert.equal(canvas.slides[0].shapes[0].text, "Ghi chú chiến lược");
    assert.equal(canvas.slides[1].title, "Triển khai chiến lược");

    assert.equal(canvas.undo(), true, "Undo replaceAll trên slide thành công");
    assert.equal(canvas.slides[0].title, "Kế hoạch năm 2026", "Undo khôi phục tiêu đề slide 1");
    assert.equal(canvas.slides[0].body, "Nội dung kế hoạch chi tiết", "Undo khôi phục nội dung slide 1");
    assert.equal(canvas.slides[0].shapes[0].text, "Ghi chú kế hoạch", "Undo khôi phục text của shape");
    assert.equal(canvas.slides[1].title, "Triển khai kế hoạch", "Undo khôi phục tiêu đề slide 2");
  });

  return results;
}

if (process.argv[1] && process.argv[1].includes("find-replace-shared.test.js")) {
  runSharedFindReplaceTests().then(results => {
    console.log(`Ran ${results.length} tests`);
    for (const r of results) {
      console.log(r.pass ? `[PASS] ${r.name}` : `[FAIL] ${r.name}: ${r.error}`);
    }
  });
}
