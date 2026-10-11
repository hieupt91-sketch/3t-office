import { SheetGridController } from "../../apps/sheet/sheet-grid.js";
import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";
import { VN_TO_UNO_MAP } from "../../adapters/libreoffice/common/command-dispatch-mapper.js";
import { globalCommandBus } from "../../platform/commands/command-bus.js";
import { registerAllStandardCommands } from "../../platform/commands/command-definitions.js";
import { SHEET_RIBBON_TABS } from "../../apps/sheet/sheet-ribbon.js";
import { FUNCTION_CATALOG } from "../../apps/sheet/formula-engine.js";
import { ICONS } from "../../platform/ui-kit/icons.js";
import { viStrings } from "../../platform/i18n/strings-vi.js";
import { enStrings } from "../../platform/i18n/strings-en.js";

function mockContainer() {
  const listeners = {};
  return {
    setAttribute() {},
    style: {},
    innerHTML: "",
    className: "",
    appendChild() {},
    insertBefore() {},
    querySelector() { return null; },
    querySelectorAll() { return []; },
    addEventListener(event, fn) {
      listeners[event] = listeners[event] || [];
      listeners[event].push(fn);
    },
    dispatchEvent(e) {
      (listeners[e.type] || []).forEach(fn => fn(e));
    },
    classList: { add() {}, remove() {}, toggle() {} },
    focus() { this._focused = true; },
    _listeners: listeners
  };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export async function runSheetFormulasTabTests() {
  const results = [];
  const test = async (name, fn) => {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.message });
    }
  };

  await test("Formulas Ribbon: Có 4 nhóm chuẩn Excel (Thư viện hàm, Tên xác định, Kiểm tra công thức, Tính toán)", () => {
    const formulasTab = SHEET_RIBBON_TABS.find(tab => tab.id === "formulas");
    assert(formulasTab, "Tab 'formulas' phải tồn tại trong SHEET_RIBBON_TABS");
    assert(formulasTab.groups.length === 4, `Formulas tab phải có đúng 4 nhóm, thực tế: ${formulasTab.groups.length}`);

    const [g1, g2, g3, g4] = formulasTab.groups;
    assert(g1.labelKey === "sheetRibbon.group.functionLibrary", "Nhóm 1 phải là functionLibrary");
    assert(g2.labelKey === "sheetRibbon.group.definedNames", "Nhóm 2 phải là definedNames");
    assert(g3.labelKey === "sheetRibbon.group.formulaAuditing", "Nhóm 3 phải là formulaAuditing");
    assert(g4.labelKey === "sheetRibbon.group.calculation", "Nhóm 4 phải là calculation");

    // Kiểm tra Insert Function (fx)
    const hasFx = g1.items.some(it => it.commandId === "sheet.formula.insertFunction");
    assert(hasFx, "Nhóm functionLibrary phải có nút Insert Function (fx)");

    // Kiểm tra các danh mục hàm
    const requiredCategories = [
      "sheet.formula.categoryFinancial",
      "sheet.formula.categoryLogical",
      "sheet.formula.categoryText",
      "sheet.formula.categoryDateTime",
      "sheet.formula.categoryLookup",
      "sheet.formula.categoryMath",
      "sheet.formula.categoryMore"
    ];
    for (const catCmd of requiredCategories) {
      const found = JSON.stringify(g1.items).includes(catCmd);
      assert(found, `Nhóm functionLibrary phải chứa lệnh ${catCmd}`);
    }

    // Kiểm tra Defined Names
    const definedCmds = [
      "sheet.formula.nameManager",
      "sheet.formula.defineName",
      "sheet.formula.useInFormula",
      "sheet.formula.createFromSelection"
    ];
    for (const cmd of definedCmds) {
      const found = JSON.stringify(g2.items).includes(cmd);
      assert(found, `Nhóm definedNames phải chứa lệnh ${cmd}`);
    }

    // Kiểm tra Formula Auditing
    const auditCmds = [
      "sheet.formula.tracePrecedents",
      "sheet.formula.traceDependents",
      "sheet.formula.removeArrows",
      "sheet.formula.showFormulas",
      "sheet.formula.errorChecking",
      "sheet.formula.evaluateFormula",
      "sheet.formula.watchWindow"
    ];
    for (const cmd of auditCmds) {
      const found = JSON.stringify(g3.items).includes(cmd);
      assert(found, `Nhóm formulaAuditing phải chứa lệnh ${cmd}`);
    }

    // Kiểm tra Calculation
    const calcCmds = [
      "sheet.calc.calculationOptions",
      "sheet.formula.recalculate",
      "sheet.calc.calculateSheet"
    ];
    for (const cmd of calcCmds) {
      const found = JSON.stringify(g4.items).includes(cmd);
      assert(found, `Nhóm calculation phải chứa lệnh ${cmd}`);
    }
  });

  await test("Formulas Commands: Đầy đủ định nghĩa, UNO mapping, icon SVG và song ngữ VI/EN", () => {
    registerAllStandardCommands(globalCommandBus);

    const commandsToCheck = [
      "sheet.formula.insertFunction",
      "sheet.formula.countNumbers",
      "sheet.formula.max",
      "sheet.formula.min",
      "sheet.formula.categoryFinancial",
      "sheet.formula.categoryLogical",
      "sheet.formula.categoryText",
      "sheet.formula.categoryDateTime",
      "sheet.formula.categoryLookup",
      "sheet.formula.categoryMath",
      "sheet.formula.categoryMore",
      "sheet.formula.defineName",
      "sheet.formula.useInFormula",
      "sheet.formula.createFromSelection",
      "sheet.formula.tracePrecedents",
      "sheet.formula.traceDependents",
      "sheet.formula.removeArrows",
      "sheet.formula.showFormulas",
      "sheet.formula.errorChecking",
      "sheet.formula.evaluateFormula",
      "sheet.formula.watchWindow",
      "sheet.calc.calculationOptions",
      "sheet.calc.modeAutomatic",
      "sheet.calc.modeManual",
      "sheet.calc.calculateSheet"
    ];

    for (const cmdId of commandsToCheck) {
      const def = globalCommandBus.getDefinition(cmdId);
      assert(def, `Lệnh ${cmdId} phải được định nghĩa trong CommandBus`);
      assert(VN_TO_UNO_MAP[cmdId], `Lệnh ${cmdId} phải có ánh xạ UNO trong VN_TO_UNO_MAP`);
      if (def.icon) {
        assert(ICONS[def.icon], `Icon '${def.icon}' của lệnh ${cmdId} phải tồn tại trong ICONS`);
      }
      assert(viStrings.commands[cmdId], `Lệnh ${cmdId} phải có bản dịch tiếng Việt trong viStrings.commands`);
      assert(enStrings.commands[cmdId], `Lệnh ${cmdId} phải có bản dịch tiếng Anh trong enStrings.commands`);
    }
  });

  await test("Function Catalog: Đầy đủ 97 hàm thuộc 7 danh mục kế toán & văn phòng chuẩn Excel", () => {
    const catalog = FUNCTION_CATALOG;
    assert(Array.isArray(catalog), "FUNCTION_CATALOG phải là một mảng");
    assert(catalog.length === 97, `FUNCTION_CATALOG phải có đúng 97 hàm, thực tế: ${catalog.length}`);

    const categories = new Set(catalog.map(f => f.category));
    assert(categories.has("Toán học"), "Thiếu danh mục 'Toán học'");
    assert(categories.has("Thống kê"), "Thiếu danh mục 'Thống kê'");
    assert(categories.has("Tra cứu"), "Thiếu danh mục 'Tra cứu'");
    assert(categories.has("Logic"), "Thiếu danh mục 'Logic'");
    assert(categories.has("Văn bản"), "Thiếu danh mục 'Văn bản'");
    assert(categories.has("Ngày tháng"), "Thiếu danh mục 'Ngày tháng'");
    assert(categories.has("Tài chính"), "Thiếu danh mục 'Tài chính'");

    const funcMap = new Map(catalog.map(f => [f.name, f]));

    // Kiểm tra các hàm tài chính kế toán trọng điểm
    const essentialAccountingFuncs = [
      "PMT", "FV", "PV", "NPV", "IRR", "RATE", "NPER", "IPMT", "PPMT", "SLN", "DB",
      "VLOOKUP", "HLOOKUP", "INDEX", "MATCH", "XLOOKUP",
      "SUMIF", "SUMIFS", "COUNTIF", "COUNTIFS", "AVERAGEIF", "AVERAGEIFS",
      "IF", "IFNA", "AND", "OR", "NOT", "IFERROR"
    ];
    for (const fn of essentialAccountingFuncs) {
      assert(funcMap.has(fn), `FUNCTION_CATALOG phải chứa hàm kế toán quan trọng ${fn}`);
      const item = funcMap.get(fn);
      assert(item.syntax, `Hàm ${fn} phải có cú pháp syntax`);
      assert(item.desc, `Hàm ${fn} phải có mô tả desc`);
    }
  });

  await test("Formula Auditing: extractFormulaReferences bóc tách chính xác ô, dải ô và vùng đặt tên", () => {
    const grid = new SheetGridController(mockContainer());
    grid.saveNamedRange({ name: "DoanhThu", ref: "C1:C3", scope: "workbook", sheet: "Sheet1" });

    // 1. Ô đơn
    const refs1 = grid.extractFormulaReferences("=A1+B2*2");
    assert(refs1.includes("A1") && refs1.includes("B2"), `extractFormulaReferences ô đơn sai: ${refs1}`);

    // 2. Dải ô range
    const refs2 = grid.extractFormulaReferences("=SUM(D1:D4)");
    assert(refs2.length === 4 && refs2.includes("D1") && refs2.includes("D4"), `extractFormulaReferences dải ô sai: ${refs2}`);

    // 3. Vùng có tên (Named range)
    const refs3 = grid.extractFormulaReferences("=AVERAGE(DoanhThu)");
    assert(refs3.includes("C1") && refs3.includes("C2") && refs3.includes("C3"), `extractFormulaReferences named range sai: ${refs3}`);
  });

  await test("Formula Auditing: Trace Precedents và Trace Dependents nhận diện quan hệ phụ thuộc thật", () => {
    const grid = new SheetGridController(mockContainer());
    grid.setCellValue("A", 1, 10);
    grid.setCellValue("A", 2, 20);
    grid.setCellValue("B", 1, "=A1*2");
    grid.setCellValue("C", 1, "=SUM(A1:A2)+B1");

    // Trace Precedents của C1 (phụ thuộc vào A1, A2, B1)
    grid.selectedCoord = { c: "C", r: 1 };
    const prec = grid.tracePrecedents();
    assert(prec.type === "precedents", "Loại trace phải là precedents");
    assert(prec.cells.includes("A1"), "Precedents của C1 phải có A1");
    assert(prec.cells.includes("A2"), "Precedents của C1 phải có A2");
    assert(prec.cells.includes("B1"), "Precedents của C1 phải có B1");
    assert(grid.auditArrows.length === 1, "auditArrows phải lưu 1 nhóm mũi tên");

    // Trace Dependents của A1 (C1 và B1 đều phụ thuộc vào A1)
    grid.selectedCoord = { c: "A", r: 1 };
    const dep = grid.traceDependents();
    assert(dep.type === "dependents", "Loại trace phải là dependents");
    assert(dep.cells.includes("B1"), "Dependents của A1 phải có B1");
    assert(dep.cells.includes("C1"), "Dependents của A1 phải có C1");
    assert(grid.auditArrows.length === 2, "auditArrows phải có 2 nhóm mũi tên");

    // Remove Arrows
    grid.removeArrows();
    assert(grid.auditArrows.length === 0, "Sau removeArrows() danh sách auditArrows phải rỗng");
  });

  await test("Formula Auditing: Show Formulas chuyển đổi chế độ xem công thức thay vì kết quả", () => {
    const grid = new SheetGridController(mockContainer());
    grid.setCellValue("A", 1, 100);
    grid.setCellValue("A", 2, "=A1*2");

    assert(grid.showFormulas === false, "Mặc định showFormulas phải false");
    const toggledOn = grid.toggleShowFormulas();
    assert(toggledOn === true && grid.showFormulas === true, "toggleShowFormulas lần 1 phải bật true");

    const toggledOff = grid.toggleShowFormulas();
    assert(toggledOff === false && grid.showFormulas === false, "toggleShowFormulas lần 2 phải trả về false");
  });

  await test("Calculation Engine: Chế độ Tính thủ công (Manual) không tự tính lại cho tới khi gọi Calculate Now / Calculate Sheet", () => {
    const grid = new SheetGridController(mockContainer());
    assert(grid.calculationMode === "automatic", "Mặc định chế độ tính phải là automatic");

    grid.setCellValue("A", 1, 10);
    grid.setCellValue("B", 1, "=A1*2");
    const b1Initial = String(grid.cellsData.get("B1")?.val);
    assert(b1Initial.includes("20"), `Ban đầu B1 phải chứa 20, thực tế: ${b1Initial}`);

    // Đổi sang chế độ Thủ công (Manual)
    grid.setCalculationMode("manual");
    assert(grid.calculationMode === "manual", "Chế độ tính phải chuyển sang manual");

    // Thay đổi ô nguồn A1 -> 50
    grid.setCellValue("A", 1, 50);

    // B1 KHÔNG ĐƯỢC tự động cập nhật trong chế độ Manual!
    assert(String(grid.cellsData.get("B1")?.val).includes("20"), `Trong chế độ manual, B1 vẫn phải giữ giá trị 20 trước khi tính lại, thực tế: ${grid.cellsData.get("B1")?.val}`);

    // Kích hoạt Calculate Sheet (Shift+F9)
    grid.calculateSheet();
    assert(String(grid.cellsData.get("B1")?.val).includes("100"), `Sau calculateSheet(), B1 phải được cập nhật lên 100, thực tế: ${grid.cellsData.get("B1")?.val}`);

    // Thay đổi A1 -> 200 trong chế độ manual
    grid.setCellValue("A", 1, 200);
    assert(String(grid.cellsData.get("B1")?.val).includes("100"), "B1 vẫn chưa thay đổi");

    // Kích hoạt Calculate Now (F9) qua recalculateAll()
    grid.recalculateAll();
    assert(String(grid.cellsData.get("B1")?.val).includes("400"), `Sau recalculateAll(), B1 phải là 400, thực tế: ${grid.cellsData.get("B1")?.val}`);

    // Đổi lại sang Automatic -> Tự động tính toán lại
    grid.setCalculationMode("automatic");
    grid.setCellValue("A", 1, 300);
    assert(String(grid.cellsData.get("B1")?.val).includes("600"), `Khi ở chế độ automatic, B1 phải được tính ngay thành 600, thực tế: ${grid.cellsData.get("B1")?.val}`);
  });

  await test("Calculation Engine: chế độ Manual phải chặn MỌI đường gọi _recalculateAllFormulas (autofill/paste/insert/sort), không chỉ gõ trực tiếp vào ô", () => {
    const grid = new SheetGridController(mockContainer());
    grid.setCellValue("A", 1, 10);
    grid.setCellValue("B", 1, "=A1*2");
    assert(String(grid.cellsData.get("B1")?.val).includes("20"), "B1 ban đầu phải là 20");

    grid.setCalculationMode("manual");

    // Sửa giá trị nguồn trực tiếp trong model (mô phỏng đường đi của autofill/paste/insert
    // row/sort — các thao tác này không đi qua setCellValue mà chỉnh cellsData trực tiếp
    // rồi tự gọi _recalculateAllFormulas()) và gọi lại hàm không có force.
    grid.cellsData.get("A1").val = 99;
    grid._recalculateAllFormulas();
    assert(String(grid.cellsData.get("B1")?.val).includes("20"), `Ở chế độ Manual, _recalculateAllFormulas() KHÔNG force phải bị chặn hoàn toàn (mọi đường gọi, không riêng setCellValue) — B1 phải vẫn là 20, thực tế: ${grid.cellsData.get("B1")?.val}`);

    // force=true (đường Calculate Now / F9 dùng) phải luôn vượt qua gác cổng Manual.
    grid._recalculateAllFormulas(undefined, true);
    assert(String(grid.cellsData.get("B1")?.val).includes("198"), `_recalculateAllFormulas(undefined, true) phải luôn tính lại bất kể chế độ — B1 phải là 198, thực tế: ${grid.cellsData.get("B1")?.val}`);
  });

  await test("Defined Names: createNamesFromSelection tạo vùng đặt tên từ tiêu đề hàng trên cùng", () => {
    const grid = new SheetGridController(mockContainer());
    grid.setCellValue("A", 1, "GiaBan");
    grid.setCellValue("A", 2, 1000);
    grid.setCellValue("A", 3, 2000);
    grid.selectionRange = { start: { c: "A", r: 1 }, end: { c: "A", r: 3 } };

    const success = grid.createNamesFromSelection();
    assert(success, "createNamesFromSelection phải trả về true");

    const created = grid.namedRangesWorkbook.find(n => n.name === "GiaBan");
    assert(created, "Phải tạo thành công named range 'GiaBan'");
    assert(created.ref === "A2:A3", `Vùng tham chiếu phải là A2:A3, thực tế: ${created.ref}`);
  });

  await test("SheetAdapter E2E: globalCommandBus.execute kích hoạt chính xác toàn bộ lệnh Formulas tab", async () => {
    registerAllStandardCommands(globalCommandBus);

    const calls = [];
    const mockGrid = {
      selectedCoord: { c: "A", r: 1 },
      showFunctionDialog(cat) { calls.push(["showFunctionDialog", cat]); return true; },
      insertFormula(name) { calls.push(["insertFormula", name]); return true; },
      showDefineNameDialog() { calls.push(["showDefineNameDialog"]); return true; },
      showUseInFormulaDialog() { calls.push(["showUseInFormulaDialog"]); return true; },
      createNamesFromSelection() { calls.push(["createNamesFromSelection"]); return true; },
      tracePrecedents() { calls.push(["tracePrecedents"]); return true; },
      traceDependents() { calls.push(["traceDependents"]); return true; },
      removeArrows() { calls.push(["removeArrows"]); return true; },
      toggleShowFormulas() { calls.push(["toggleShowFormulas"]); return true; },
      showErrorCheckingDialog() { calls.push(["showErrorCheckingDialog"]); return true; },
      showEvaluateFormulaDialog() { calls.push(["showEvaluateFormulaDialog"]); return true; },
      showWatchWindow() { calls.push(["showWatchWindow"]); return true; },
      setCalculationMode(mode) { calls.push(["setCalculationMode", mode]); return true; },
      calculateSheet() { calls.push(["calculateSheet"]); return true; },
      recalculateAll() { calls.push(["recalculateAll"]); return true; }
    };

    const adapter = new SheetAdapter(mockGrid);
    adapter.attach();

    const testMap = [
      ["sheet.formula.insertFunction", "showFunctionDialog"],
      ["sheet.formula.countNumbers", "insertFormula"],
      ["sheet.formula.max", "insertFormula"],
      ["sheet.formula.min", "insertFormula"],
      ["sheet.formula.categoryFinancial", "showFunctionDialog"],
      ["sheet.formula.categoryLogical", "showFunctionDialog"],
      ["sheet.formula.categoryText", "showFunctionDialog"],
      ["sheet.formula.categoryDateTime", "showFunctionDialog"],
      ["sheet.formula.categoryLookup", "showFunctionDialog"],
      ["sheet.formula.categoryMath", "showFunctionDialog"],
      ["sheet.formula.categoryMore", "showFunctionDialog"],
      ["sheet.formula.defineName", "showDefineNameDialog"],
      ["sheet.formula.useInFormula", "showUseInFormulaDialog"],
      ["sheet.formula.createFromSelection", "createNamesFromSelection"],
      ["sheet.formula.tracePrecedents", "tracePrecedents"],
      ["sheet.formula.traceDependents", "traceDependents"],
      ["sheet.formula.removeArrows", "removeArrows"],
      ["sheet.formula.showFormulas", "toggleShowFormulas"],
      ["sheet.formula.errorChecking", "showErrorCheckingDialog"],
      ["sheet.formula.evaluateFormula", "showEvaluateFormulaDialog"],
      ["sheet.formula.watchWindow", "showWatchWindow"],
      ["sheet.calc.modeAutomatic", "setCalculationMode"],
      ["sheet.calc.modeManual", "setCalculationMode"],
      ["sheet.calc.calculateSheet", "calculateSheet"],
      ["sheet.formula.recalculate", "recalculateAll"]
    ];

    for (const [cmdId, expectedMethod] of testMap) {
      calls.length = 0;
      const res = await globalCommandBus.execute(cmdId);
      assert(res !== false, `execute(${cmdId}) không được trả về false`);
      assert(calls.some(c => c[0] === expectedMethod), `execute(${cmdId}) phải gọi grid.${expectedMethod}`);
    }
  });

  await test("Bug thật đã sửa: setCellValue lưu kết quả công thức thô, không tự ý format thành chuỗi tiền tệ VNĐ", () => {
    const grid = new SheetGridController(mockContainer());
    grid.setCellValue("A", 1, "=1/3");
    const a1 = grid.cellsData.get("A1");
    assert(typeof a1.val === "number", `A1 phải lưu số thô, không phải chuỗi đã format: ${JSON.stringify(a1.val)}`);
    assert(Math.abs(a1.val - 1 / 3) < 1e-12, `A1 =1/3 phải giữ đúng độ chính xác, hiện: ${a1.val}`);

    // Công thức tham chiếu tiếp phải tính đúng dây chuyền (trước đây bị
    // getCellValue hiểu nhầm số thập phân là chuỗi tiền tệ, phá vỡ chuỗi).
    grid.setCellValue("B", 1, "=A1*3");
    const b1 = grid.cellsData.get("B1");
    assert(Math.abs(b1.val - 1) < 1e-9, `B1 =A1*3 phải ra đúng 1 (khớp Excel/JS double), hiện: ${b1.val}`);
  });

  return results;
}