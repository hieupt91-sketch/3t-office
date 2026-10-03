/**
 * Tests — Sheet Formula IntelliSense, Vietnamese hints & Composing visual
 * Kiểm tra các tính năng nâng cấp nhập hàm:
 * 1. Tìm đối số hiện tại theo dấu phẩy / chấm phẩy lồng nhau và chuỗi văn bản
 * 2. Đang soạn công thức hiển thị chuỗi đang gõ, không hiện #VALUE! hay #NAME?
 * 3. Bộ dữ liệu cú pháp tiếng Việt đầy đủ cho danh sách hàm ưu tiên (>= 120 hàm)
 * 4. Tooltip cú pháp và autocomplete không làm ảnh hưởng đến kết quả tính toán
 */

import {
  FormulaEngine,
  FUNCTION_CATALOG,
  SUPPORTED_FUNCTION_CATALOG,
  parseFormulaContext,
  findEnclosingFunction,
  formatSyntaxHtml,
  detectFormulaDelimiter,
  getFunctionSuggestions
} from "../../apps/sheet/formula-engine.js";
import { VI_FORMULA_CATALOG, parseSyntaxParamNames } from "../../apps/sheet/formula-definitions-vi.js";
import { SheetGridController } from "../../apps/sheet/sheet-grid.js";

export async function runSheetFormulaHintsTests() {
  const results = [];

  const assert = (condition, name, errorMsg = "") => {
    if (condition) {
      results.push({ name, pass: true });
    } else {
      results.push({ name, pass: false, error: errorMsg || `Thất bại: ${name}` });
    }
  };

  // ========================================================
  // Nhóm 1: Tìm đối số hiện tại theo dấu phẩy/chấm phẩy lồng nhau và chuỗi
  // ========================================================
  try {
    const ctx1 = parseFormulaContext("=VLOOKUP(A2, ");
    assert(
      ctx1.mode === "syntax_tooltip" && ctx1.funcName === "VLOOKUP" && ctx1.activeParamIndex === 1 && ctx1.activeParamDef?.name === "bảng_dữ_liệu",
      "Tìm đối số: =VLOOKUP(A2, nhận diện chính xác đối số thứ 2 (bảng_dữ_liệu)"
    );

    const ctx2 = parseFormulaContext('=VLOOKUP("Hà Nội, Việt Nam", ');
    assert(
      ctx2.mode === "syntax_tooltip" && ctx2.activeParamIndex === 1 && ctx2.activeParamDef?.name === "bảng_dữ_liệu",
      'Tìm đối số: bỏ qua dấu phẩy trong chuỗi văn bản nháy kép "Hà Nội, Việt Nam"'
    );

    const ctx3 = parseFormulaContext('=VLOOKUP("A,B", B1:C10, ');
    assert(
      ctx3.mode === "syntax_tooltip" && ctx3.activeParamIndex === 2 && ctx3.activeParamDef?.name === "số_cột",
      "Tìm đối số: chuỗi có dấu phẩy trước đó không làm sai lệch chỉ số đối số tiếp theo"
    );

    const ctx4 = parseFormulaContext("=VLOOKUP(IF(A1 > 0, 10, 20), ");
    assert(
      ctx4.mode === "syntax_tooltip" && ctx4.funcName === "VLOOKUP" && ctx4.activeParamIndex === 1 && ctx4.activeParamDef?.name === "bảng_dữ_liệu",
      "Tìm đối số: hàm lồng nhau IF() sau khi đóng ngoặc trả về đúng hàm ngoài VLOOKUP và đối số 1"
    );

    const ctx5 = parseFormulaContext("=IF(AND(A1 > 0, B1 < 10), VLOOKUP(C1, ");
    assert(
      ctx5.mode === "syntax_tooltip" && ctx5.funcName === "VLOOKUP" && ctx5.activeParamIndex === 1,
      "Tìm đối số: hàm lồng nhau nhiều cấp nhận diện chính xác hàm trong cùng đang mở"
    );

    const ctx6 = parseFormulaContext("=VLOOKUP(A2; Bảng!A:C; ");
    assert(
      ctx6.mode === "syntax_tooltip" && ctx6.delimiter === ";" && ctx6.activeParamIndex === 2 && ctx6.activeParamDef?.name === "số_cột",
      "Tìm đối số: nhận diện dấu chấm phẩy ; làm phân cách đối số"
    );

    const enc = findEnclosingFunction("=SUM(1, 2, 3", 12);
    assert(
      enc && enc.funcName === "SUM" && enc.activeParamIndex === 2,
      "findEnclosingFunction: xác định đúng hàm SUM và activeParamIndex = 2"
    );
  } catch (err) {
    assert(false, "Nhóm 1 kiểm thử tìm đối số", err.message);
  }

  // ========================================================
  // Nhóm 2: Đang gõ hiển thị đúng chuỗi đang gõ, không hiện #VALUE!
  // ========================================================
  try {
    const mockContainer = {
      appendChild: () => {},
      removeChild: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      querySelector: () => null,
      querySelectorAll: () => [],
      style: {},
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600, right: 800, bottom: 600 })
    };

    const grid = new SheetGridController(mockContainer, { isBlank: true });
    grid.cellsData = new Map();

    // 1. Giả lập người dùng bắt đầu soạn =SU trong ô C3
    grid.selectedCoord = { c: "C", r: 3 };
    grid.formulaEntry = {
      coord: { c: "C", r: 3 },
      sheet: grid.activeSheet,
      mode: "enter",
      value: "=SU"
    };

    // Khi gõ dở =SU và setCellValue với isComposing: true
    grid.setCellValue("C", 3, "=SU", false, { coalesce: true, userInput: true, isComposing: true });
    const cellData = grid.cellsData.get("C3");
    assert(
      cellData && cellData.formula === "=SU" && cellData.val === "=SU",
      "Ô đang soạn: setCellValue với isComposing: true lưu đúng chuỗi =SU, không tính trước ra #VALUE!"
    );

    // 2. Render visual của ô đang soạn
    const mockTd = {
      textContent: "",
      style: {},
      setAttribute: () => {},
      appendChild: () => {},
      classList: { add: () => {}, remove: () => {} }
    };
    grid._renderCellVisual(mockTd, cellData, "C", 3);
    assert(
      mockTd.textContent === "=SU",
      "Visual ô đang soạn: td.textContent hiển thị chính xác =SU thay vì mã lỗi #VALUE! hay #NAME?"
    );

    // 3. Khi xác nhận Enter (commit) với công thức hoàn chỉnh =SUM(10, 20)
    grid.formulaEntry.value = "=SUM(10, 20)";
    grid._commitFormulaEntry();
    const committedData = grid.cellsData.get("C3");
    assert(
      committedData && committedData.formula === "=SUM(10, 20)" && committedData.val === 30,
      "Xác nhận Enter: công thức hoàn chỉnh =SUM(10, 20) được tính toán chính xác ra kết quả 30"
    );

    // 4. Khi hủy (Escape / cancel)
    grid.cellsData.set("D5", { val: "Gốc", formula: "" });
    grid.selectedCoord = { c: "D", r: 5 };
    grid.formulaEntry = { coord: { c: "D", r: 5 }, sheet: grid.activeSheet, mode: "enter", value: "=INVALID(" };
    grid._cellValueBeforeEdit = "Gốc";
    grid._cancelFormulaEntry();
    const cancelledData = grid.cellsData.get("D5");
    assert(
      cancelledData && cancelledData.val === "Gốc" && grid.formulaEntry === null,
      "Hủy phím Esc: giá trị ô được hoàn tác về ban đầu, không bị lưu lỗi dở dang"
    );
  } catch (err) {
    assert(false, "Nhóm 2 kiểm thử hiển thị chuỗi đang gõ", err.message);
  }

  // ========================================================
  // Nhóm 3: Dữ liệu tiếng Việt đầy đủ cho danh sách hàm ưu tiên
  // ========================================================
  try {
    assert(
      VI_FORMULA_CATALOG.length >= 120,
      `Kho dữ liệu tiếng Việt có ít nhất 120 hàm phổ biến (hiện có: ${VI_FORMULA_CATALOG.length} hàm)`
    );

    const priorityFunctions = [
      "VLOOKUP", "HLOOKUP", "XLOOKUP", "INDEX", "MATCH", "LOOKUP",
      "SUM", "SUMIF", "SUMIFS", "COUNT", "COUNTA", "COUNTIF", "COUNTIFS",
      "AVERAGE", "AVERAGEIF", "AVERAGEIFS", "IF", "IFS", "IFERROR", "AND", "OR", "NOT",
      "LEFT", "RIGHT", "MID", "LEN", "TRIM", "UPPER", "LOWER", "PROPER",
      "CONCAT", "TEXTJOIN", "SUBSTITUTE", "TEXT", "VALUE",
      "DATE", "TODAY", "NOW", "YEAR", "MONTH", "DAY", "DATEDIF", "EOMONTH", "WEEKDAY",
      "ROUND", "ROUNDUP", "ROUNDDOWN", "INT", "MOD", "ABS", "MAX", "MIN", "LARGE", "SMALL", "RANK",
      "SUMPRODUCT", "NA", "ISERROR", "ISNUMBER", "ISBLANK"
    ];

    const catalogMap = new Map(VI_FORMULA_CATALOG.map(f => [f.name, f]));
    let allPriorityPresent = true;
    const missing = [];
    for (const name of priorityFunctions) {
      if (!catalogMap.has(name)) {
        allPriorityPresent = false;
        missing.push(name);
      }
    }
    assert(
      allPriorityPresent,
      `Tất cả ${priorityFunctions.length} hàm ưu tiên có trong catalog tiếng Việt` + (missing.length ? ` (thiếu: ${missing.join(", ")})` : "")
    );

    // Kiểm tra cấu trúc từng hàm trong catalog:
    // Tên đối số tiếng Việt, mô tả đối số, ví dụ thực tế, số đối số khớp cú pháp gốc
    let structValid = true;
    const structErrors = [];
    for (const func of VI_FORMULA_CATALOG) {
      if (!func.name || !func.category || !func.desc || !func.syntax || !func.syntaxVi || !func.example) {
        structValid = false;
        structErrors.push(`${func.name}: thiếu trường cơ bản`);
        continue;
      }

      if (!func.example.startsWith("=")) {
        structValid = false;
        structErrors.push(`${func.name}: ví dụ phải bắt đầu bằng =`);
      }

      const expectedParams = parseSyntaxParamNames(func.syntax);
      if (expectedParams.length !== func.params.length) {
        structValid = false;
        structErrors.push(`${func.name}: số đối số (${func.params.length}) không khớp cú pháp gốc (${expectedParams.length})`);
      }

      for (let pIdx = 0; pIdx < func.params.length; pIdx++) {
        const p = func.params[pIdx];
        if (!p.name || !p.desc) {
          structValid = false;
          structErrors.push(`${func.name}: param #${pIdx} thiếu tên hoặc mô tả`);
        }
      }
    }

    assert(
      structValid,
      `Tất cả ${VI_FORMULA_CATALOG.length} hàm có metadata tiếng Việt hoàn chỉnh, số đối số khớp cú pháp gốc` + (structErrors.length ? ` (lỗi: ${structErrors.slice(0, 3).join("; ")})` : "")
    );

    // Kiểm tra chi tiết hàm VLOOKUP (chiếm 91% thực tế)
    const vlookup = catalogMap.get("VLOOKUP");
    assert(
      vlookup &&
      vlookup.syntaxVi.includes("giá_trị_tìm") &&
      vlookup.syntaxVi.includes("bảng_dữ_liệu") &&
      vlookup.params.length === 4 &&
      vlookup.example.includes("VLOOKUP"),
      "Hàm VLOOKUP có cú pháp tiếng Việt chuẩn, 4 đối số rõ nghĩa và ví dụ mẫu"
    );
  } catch (err) {
    assert(false, "Nhóm 3 kiểm thử catalog tiếng Việt", err.message);
  }

  // ========================================================
  // Nhóm 4: Tooltip cú pháp và gợi ý không thay đổi kết quả tính
  // ========================================================
  try {
    const engine = new FormulaEngine(() => new Map());

    // Các phép tính chuẩn
    const resSum = engine.evaluate("=SUM(10, 20, 30)");
    assert(resSum === 60, "FormulaEngine: evaluate SUM(10, 20, 30) = 60");

    const resIf = engine.evaluate("=IF(5 > 2, 100, 200)");
    assert(resIf === 100, "FormulaEngine: evaluate IF(5 > 2, 100, 200) = 100");

    const resRound = engine.evaluate("=ROUND(3.14159, 2)");
    assert(resRound === 3.14, "FormulaEngine: evaluate ROUND(3.14159, 2) = 3.14");

    // Thao tác phân tích ngữ cảnh gợi ý không làm thay đổi kết quả
    parseFormulaContext("=SUM(10, 20, 30)");
    formatSyntaxHtml("SUM(number1, [number2], ...)", 1);
    findEnclosingFunction("=SUM(10, 20, 30)", 10);

    const resSumAfter = engine.evaluate("=SUM(10, 20, 30)");
    assert(resSumAfter === 60, "Tooltip & autocomplete không làm biến đổi kết quả tính toán");
  } catch (err) {
    assert(false, "Nhóm 4 kiểm thử tính toán", err.message);
  }

  // ========================================================
  // Nhóm 5: UI Helpers (formatSyntaxHtml, delimiter, suggestions)
  // ========================================================
  try {
    const htmlComma = formatSyntaxHtml("VLOOKUP(giá_trị_tìm, bảng_dữ_liệu, số_cột, [tìm_gần_đúng])", 0, ",");
    assert(
      htmlComma.includes('<strong class="vno-syntax-param-active">giá_trị_tìm</strong>') && htmlComma.includes(", bảng_dữ_liệu"),
      "formatSyntaxHtml: định dạng thẻ strong cho đối số active với dấu phẩy ,"
    );

    const htmlSemi = formatSyntaxHtml("VLOOKUP(giá_trị_tìm, bảng_dữ_liệu, số_cột, [tìm_gần_đúng])", 1, ";");
    assert(
      htmlSemi.includes('<strong class="vno-syntax-param-active">bảng_dữ_liệu</strong>') && htmlSemi.includes("; "),
      "formatSyntaxHtml: tự động chuyển sang dấu chấm phẩy ; khi delimiter là ;"
    );

    assert(detectFormulaDelimiter("=SUM(A1, B1)") === ",", "detectFormulaDelimiter nhận diện dấu phẩy ,");
    assert(detectFormulaDelimiter("=SUM(A1; B1)") === ";", "detectFormulaDelimiter nhận diện dấu chấm phẩy ;");

    const suggV = getFunctionSuggestions("V");
    assert(suggV.length > 0 && suggV.some(s => s.name === "VLOOKUP"), "getFunctionSuggestions gợi ý VLOOKUP khi gõ V");

    const suggSu = getFunctionSuggestions("SU");
    assert(suggSu.length > 0 && suggSu.some(s => s.name === "SUM"), "getFunctionSuggestions gợi ý SUM khi gõ SU");
  } catch (err) {
    assert(false, "Nhóm 5 kiểm thử UI helpers", err.message);
  }

  return results;
}
