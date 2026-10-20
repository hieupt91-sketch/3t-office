import { SheetGridController } from "../../apps/sheet/sheet-grid.js";
import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";
import { PivotTableEngine } from "../../apps/sheet/pivot-table.js";
import { ICONS } from "../../platform/ui-kit/icons.js";
import { SHEET_COMMANDS } from "../../platform/commands/command-definitions.js";

function container() { return { querySelector(){ return null; }, querySelectorAll(){ return []; }, addEventListener(){}, classList:{ add(){}, remove(){}, toggle(){} } }; }
function assert(condition, message) { if (!condition) throw new Error(message); }
function seed(grid) {
  const data = [["A1","Vùng"],["B1","Sản phẩm"],["C1","Doanh số"],["A2","Bắc"],["B2","Bút"],["C2",10],["A3","Bắc"],["B3","Vở"],["C3",20],["A4","Nam"],["B4","Bút"],["C4",15],["A5","Nam"],["B5","Bút"],["C5",5]];
  data.forEach(([coord,val]) => { const [, col, row] = coord.match(/^([A-Z]+)(\d+)$/); grid.setCellValue(col, +row, val, false); });
}

export async function runSheetPivotTableTests() {
  const results = [];
  const test = async (name, fn) => { try { await fn(); results.push({ name, pass:true }); } catch(error) { results.push({ name, pass:false, error:error.message }); } };

  await test("Pivot engine tạo bảng Rows/Columns/Sum thật từ vùng nguồn", () => {
    const grid = new SheetGridController(container()); seed(grid);
    const table = PivotTableEngine.aggregate(grid.cellsData, { sourceRange:"A1:C5", rows:["Vùng"], columns:["Sản phẩm"], values:[{field:"Doanh số",aggregate:"SUM"}] });
    assert(table[0].join("|") === "Vùng|Bút — SUM Doanh số|Vở — SUM Doanh số", `Header sai: ${table[0]}`);
    assert(table[1].join("|") === "Bắc|10|20" && table[2].join("|") === "Nam|20|0", "Kết quả Sum theo trục sai");
  });

  await test("Pivot Count/Average cho kết quả số chính xác", () => {
    const grid = new SheetGridController(container()); seed(grid);
    const table = PivotTableEngine.aggregate(grid.cellsData, { sourceRange:"A1:C5", rows:["Vùng"], columns:[], values:[{field:"Doanh số",aggregate:"COUNT"},{field:"Doanh số",aggregate:"AVERAGE"}] });
    assert(table[1][1] === 2 && table[1][2] === 15 && table[2][1] === 2 && table[2][2] === 10, "Count/Average sai");
  });

  await test("Pivot lọc giá trị trường trước khi tổng hợp và giữ điều kiện khi làm mới", async () => {
    const grid = new SheetGridController(container()); seed(grid);
    await grid.initializeOptionalDocumentFeatures();
    const config = {
      sourceRange: "A1:C5",
      rows: ["Vùng"],
      columns: ["Sản phẩm"],
      values: [{ field: "Doanh số", aggregate: "SUM" }],
      filters: [{ field: "Vùng", selectedValues: ["Bắc"] }]
    };
    const pivot = grid.createPivotTable(config);
    const p = grid.sheetsData[pivot.targetSheet];
    assert(p.get("A2")?.val === "Bắc" && p.get("A3")?.val === undefined, `Filter phải chỉ giữ vùng Bắc, nhận được ${p.get("A2")?.val}/${p.get("A3")?.val}`);
    assert(p.get("B2")?.val === 10 && p.get("C2")?.val === 20, "Filter phải giữ đúng tổng theo sản phẩm ở vùng Bắc");
    grid.sheetsData[pivot.sourceSheet].get("C2").val = 100;
    assert(grid.refreshPivotTable(pivot.targetSheet), "Refresh Pivot thất bại");
    assert(grid.sheetsData[pivot.targetSheet].get("B2")?.val === 100, "Refresh phải áp dụng lại filter đã chọn");
    assert(grid.sheetsData[pivot.targetSheet].get("A3")?.val === undefined, "Refresh phải tiếp tục loại vùng Nam theo filter");
    assert(grid.pivotTablesBySheet[pivot.targetSheet][0].filters?.[0]?.selectedValues?.[0] === "Bắc", "Refresh làm mất cấu hình filter");
  });

  await test("Tạo Pivot sinh sheet thật, state cô lập và undo/redo phục hồi snapshot", async () => {
    const grid = new SheetGridController(container()); seed(grid); grid.undoStack=[];
    await grid.initializeOptionalDocumentFeatures();
    const source = grid.activeSheet;
    const pivot = grid.createPivotTable({ sourceRange:"A1:C5", rows:["Vùng"], columns:[], values:[{field:"Doanh số",aggregate:"SUM"}] });
    assert(grid.activeSheet === pivot.targetSheet && grid.cellsData.get("B2")?.val === 30, "Sheet Pivot chưa render dữ liệu thật");
    assert(grid.pivotTablesBySheet[source].length === 0 && grid.pivotTablesBySheet[pivot.targetSheet][0].sourceSheet === source, "Pivot state bị rò sheet");
    grid.undo(); assert(!grid.sheets.includes(pivot.targetSheet), "Undo create phải xóa sheet Pivot");
    grid.redo(); assert(grid.cellsData.get("B2")?.val === 30 && grid.pivotTablesBySheet[pivot.targetSheet].length === 1, "Redo phải phục hồi data/config Pivot");
  });

  await test("Refresh đọc lại source và có undo/redo riêng", async () => {
    const grid = new SheetGridController(container()); seed(grid);
    await grid.initializeOptionalDocumentFeatures();
    const pivot = grid.createPivotTable({ sourceRange:"A1:C5", rows:["Vùng"], columns:[], values:[{field:"Doanh số",aggregate:"SUM"}] });
    grid.sheetsData[pivot.sourceSheet].get("C2").val = 100;
    grid.refreshPivotTable(); assert(grid.cellsData.get("B2")?.val === 120, "Refresh chưa lấy dữ liệu nguồn mới");
    grid.undo(); assert(grid.cellsData.get("B2")?.val === 30, "Undo refresh chưa về kết quả cũ");
    grid.redo(); assert(grid.cellsData.get("B2")?.val === 120, "Redo refresh chưa áp dụng kết quả mới");
  });

  await test("Refresh Pivot tải engine nếu XLSX mở chưa khởi tạo engine", async () => {
    const grid = new SheetGridController(container());
    let loads = 0;
    let refreshes = 0;
    grid._loadPivotEngine = async () => { loads += 1; grid.pivotTableEngine = PivotTableEngine; };
    grid.refreshPivotTable = () => { refreshes += 1; return true; };
    const adapter = new SheetAdapter(grid);
    const result = await adapter.handleDispatch("sheet.data.pivotRefresh");
    assert(result && loads === 1 && refreshes === 1, `refresh=${result} loads=${loads} refreshes=${refreshes}`);
  });

  await test("Giảm indent tường minh bỏ dấu XF gốc dù model ban đầu đã là 0", () => {
    const grid = new SheetGridController(container());
    const adapter = new SheetAdapter(grid);
    grid.setCellValue("B", 2, "x", false);
    grid.selectCell("B", 2);
    const item = grid.cellsData.get("B2");
    item.style = { indentLevel: 0, origXf: 4 };
    item.style.styleHashAtImport = adapter._computeStyleHash(item.style);
    grid.adjustIndent(-1);
    assert(item.style.indentLevel === 0, `indentLevel=${item.style.indentLevel}`);
    assert(item.style.origXf === undefined && item.style.styleHashAtImport === undefined, "giảm indent vẫn giữ metadata XF nguồn");
  });

  await test("Xóa sheet Pivot rồi undo phục hồi cả config và bảng", async () => {
    const grid = new SheetGridController(container()); seed(grid);
    await grid.initializeOptionalDocumentFeatures();
    const pivot = grid.createPivotTable({ sourceRange:"A1:C5", rows:["Vùng"], columns:[], values:[{field:"Doanh số",aggregate:"COUNT"}] });
    grid.deleteSheet(pivot.targetSheet); grid.undo();
    assert(grid.activeSheet === pivot.targetSheet && grid.pivotTablesBySheet[pivot.targetSheet][0].id === pivot.id && grid.cellsData.get("B2")?.val === 2, "Undo delete phải phục hồi toàn bộ Pivot sheet");
  });

  await test("Command Pivot dùng icon bảng SVG thật và Refresh có command riêng", () => {
    const pivotCommand = SHEET_COMMANDS.find(command => command.id === "sheet.data.pivotTable");
    assert(pivotCommand?.icon === "pivotTable" && ICONS.pivotTable?.includes("<rect"), "Pivot command thiếu icon bảng thật");
    assert(SHEET_COMMANDS.some(command => command.id === "sheet.data.pivotRefresh") && ICONS.refreshTable?.includes("<path"), "Thiếu command/icon Refresh");
    assert(SHEET_COMMANDS.some(command => command.id === "sheet.data.pivotChangeDataSource"), "Thiếu command Change Data Source");
    assert(SHEET_COMMANDS.some(command => command.id === "sheet.data.pivotGroup"), "Thiếu command Pivot Group");
    assert(SHEET_COMMANDS.some(command => command.id === "sheet.data.pivotUngroup"), "Thiếu command Pivot Ungroup");
    assert(SHEET_COMMANDS.some(command => command.id === "sheet.data.pivotCalculatedField"), "Thiếu command Pivot Calculated Field");
  });

  await test("Đổi nguồn dữ liệu (Change Data Source) dựng lại bảng và tự động loại bỏ cột đã xóa", async () => {
    const grid = new SheetGridController(container());
    await grid.initializeOptionalDocumentFeatures();
    // Seed A1:D5
    const data = [
      ["A1", "Vùng"], ["B1", "Sản phẩm"], ["C1", "Doanh số"], ["D1", "Thưởng"],
      ["A2", "Bắc"], ["B2", "Bút"], ["C2", 10], ["D2", 1],
      ["A3", "Bắc"], ["B3", "Vở"], ["C3", 20], ["D3", 2],
      ["A4", "Nam"], ["B4", "Bút"], ["C4", 15], ["D4", 3],
      ["A5", "Nam"], ["B5", "Bút"], ["C5", 5], ["D5", 4]
    ];
    data.forEach(([coord, val]) => { const [, col, row] = coord.match(/^([A-Z]+)(\d+)$/); grid.setCellValue(col, +row, val, false); });
    const pivot = grid.createPivotTable({
      sourceRange: "A1:D5",
      rows: ["Vùng"],
      columns: ["Sản phẩm"],
      values: [{ field: "Doanh số", aggregate: "SUM" }, { field: "Thưởng", aggregate: "SUM" }]
    });
    assert(pivot && grid.activeSheet === pivot.targetSheet, "Tạo pivot ban đầu thất bại");

    // Đổi nguồn sang chỉ A1:C5 (loại bỏ cột D Thưởng)
    const changed = grid.changePivotDataSource(pivot.targetSheet, "A1:C5");
    assert(changed === true, "changePivotDataSource thất bại");
    const currentPivot = grid.pivotTablesBySheet[pivot.targetSheet][0];
    assert(currentPivot.sourceRange === "A1:C5", `SourceRange chưa đổi: ${currentPivot.sourceRange}`);
    assert(!currentPivot.values.some(v => v.field === "Thưởng"), "Cột Thưởng bị xóa khỏi nguồn nhưng vẫn còn trong values");
    assert(currentPivot.values.some(v => v.field === "Doanh số"), "Cột Doanh số phải còn trong values");

    // Undo phục hồi lại nguồn cũ A1:D5
    grid.undo();
    const undonePivot = grid.pivotTablesBySheet[pivot.targetSheet][0];
    assert(undonePivot.sourceRange === "A1:D5", `Undo chưa khôi phục sourceRange: ${undonePivot.sourceRange}`);
    assert(undonePivot.values.some(v => v.field === "Thưởng"), "Undo chưa khôi phục cột Thưởng");

    // Redo áp dụng lại A1:C5
    grid.redo();
    const redonePivot = grid.pivotTablesBySheet[pivot.targetSheet][0];
    assert(redonePivot.sourceRange === "A1:C5", `Redo chưa áp dụng sourceRange mới: ${redonePivot.sourceRange}`);
  });

  await test("Nhóm số (Number Grouping) sinh nhãn chuẩn Excel (<start, intervals, >end) và Bỏ nhóm phục hồi", async () => {
    const grid = new SheetGridController(container());
    await grid.initializeOptionalDocumentFeatures();
    const numData = [
      ["A1", "Num"], ["B1", "Amount"],
      ["A2", 5], ["B2", 10],
      ["A3", 12], ["B3", 20],
      ["A4", 18], ["B4", 30],
      ["A5", 25], ["B5", 40],
      ["A6", 33], ["B6", 50],
      ["A7", 45], ["B6", 60]
    ];
    numData.forEach(([coord, val]) => { const [, col, row] = coord.match(/^([A-Z]+)(\d+)$/); grid.setCellValue(col, +row, val, false); });
    const pivot = grid.createPivotTable({
      sourceRange: "A1:B7",
      rows: ["Num"],
      columns: [],
      values: [{ field: "Amount", aggregate: "SUM" }]
    });

    // Nhóm trường Num: start=10, end=40, by=10
    grid.groupPivotField(pivot.targetSheet, "Num", { type: "number", start: 10, end: 40, by: 10 });
    const pSheet = pivot.targetSheet;
    // Kiểm tra các nhãn nhóm sinh ra tại cột A của pivot targetSheet
    const labels = [
      grid.sheetsData[pSheet].get("A2")?.val,
      grid.sheetsData[pSheet].get("A3")?.val,
      grid.sheetsData[pSheet].get("A4")?.val,
      grid.sheetsData[pSheet].get("A5")?.val,
      grid.sheetsData[pSheet].get("A6")?.val
    ];
    assert(labels[0] === "<10", `Label 0 phải là <10, nhận được: ${labels[0]}`);
    assert(labels[1] === "10-19", `Label 1 phải là 10-19, nhận được: ${labels[1]}`);
    assert(labels[2] === "20-29", `Label 2 phải là 20-29, nhận được: ${labels[2]}`);
    assert(labels[3] === "30-40", `Label 3 phải là 30-40, nhận được: ${labels[3]}`);
    assert(labels[4] === ">40", `Label 4 phải là >40, nhận được: ${labels[4]}`);

    // Bỏ nhóm
    grid.ungroupPivotField(pivot.targetSheet, "Num");
    const rawFirst = grid.sheetsData[pSheet].get("A2")?.val;
    assert(rawFirst === 5 || rawFirst === "5", `Bỏ nhóm phải về số 5 gốc, nhận được: ${rawFirst}`);

    // Undo bỏ nhóm phải trở lại các nhãn <10, 10-19...
    grid.undo();
    assert(grid.sheetsData[pSheet].get("A2")?.val === "<10", "Undo ungroup chưa khôi phục nhãn nhóm");
  });

  await test("Nhóm ngày (Date Grouping) sinh nhãn Tháng, Quý chuẩn Excel và Bỏ nhóm", async () => {
    const grid = new SheetGridController(container());
    await grid.initializeOptionalDocumentFeatures();
    const dateData = [
      ["A1", "Ngay"], ["B1", "Amount"],
      ["A2", "2023-01-15"], ["B2", 10],
      ["A3", "2023-02-10"], ["B2", 20],
      ["A4", "2023-04-05"], ["B4", 30],
      ["A5", "2023-07-20"], ["B5", 40],
      ["A6", "2023-11-12"], ["B6", 50],
      ["A7", "2024-01-02"], ["B7", 60]
    ];
    dateData.forEach(([coord, val]) => { const [, col, row] = coord.match(/^([A-Z]+)(\d+)$/); grid.setCellValue(col, +row, val, false); });
    const pivot = grid.createPivotTable({
      sourceRange: "A1:B7",
      rows: ["Ngay"],
      columns: [],
      values: [{ field: "Amount", aggregate: "SUM" }]
    });

    // Nhóm theo Tháng
    grid.groupPivotField(pivot.targetSheet, "Ngay", { type: "date", periods: ["months"] });
    const pSheet = pivot.targetSheet;
    const monthLabels = [
      grid.sheetsData[pSheet].get("A2")?.val,
      grid.sheetsData[pSheet].get("A3")?.val,
      grid.sheetsData[pSheet].get("A4")?.val,
      grid.sheetsData[pSheet].get("A5")?.val,
      grid.sheetsData[pSheet].get("A6")?.val
    ];
    assert(monthLabels.includes("Jan") && monthLabels.includes("Feb") && monthLabels.includes("Apr") && monthLabels.includes("Jul") && monthLabels.includes("Nov"), `Nhãn tháng không khớp: ${JSON.stringify(monthLabels)}`);

    // Nhóm theo Quý
    grid.groupPivotField(pivot.targetSheet, "Ngay", { type: "date", periods: ["quarters"] });
    const qtrLabels = [
      grid.sheetsData[pSheet].get("A2")?.val,
      grid.sheetsData[pSheet].get("A3")?.val,
      grid.sheetsData[pSheet].get("A4")?.val,
      grid.sheetsData[pSheet].get("A5")?.val
    ];
    assert(qtrLabels.includes("Qtr1") && qtrLabels.includes("Qtr2") && qtrLabels.includes("Qtr3") && qtrLabels.includes("Qtr4"), `Nhãn quý không khớp: ${JSON.stringify(qtrLabels)}`);

    // Bỏ nhóm
    grid.ungroupPivotField(pivot.targetSheet, "Ngay");
    const unval = grid.sheetsData[pSheet].get("A2")?.val;
    assert(Number(unval) === 44941 || String(unval).startsWith("2023-01"), `Bỏ nhóm chưa khôi phục ngày ban đầu (nhận được: ${unval})`);
  });

  await test("Trường tính toán (Calculated Fields) thêm, sửa, xóa và tính toán đúng chuẩn tổng hợp SUM", async () => {
    const grid = new SheetGridController(container());
    await grid.initializeOptionalDocumentFeatures();
    const salesData = [
      ["A1", "Loai"], ["B1", "DonGia"], ["C1", "SoLuong"],
      ["A2", "A"], ["B2", 10], ["C2", 2],
      ["A3", "A"], ["B3", 20], ["C3", 3],
      ["A4", "B"], ["B4", 30], ["C4", 1],
      ["A5", "B"], ["B5", 40], ["C5", 2]
    ];
    salesData.forEach(([coord, val]) => { const [, col, row] = coord.match(/^([A-Z]+)(\d+)$/); grid.setCellValue(col, +row, val, false); });
    const pivot = grid.createPivotTable({
      sourceRange: "A1:C5",
      rows: ["Loai"],
      columns: [],
      values: [{ field: "DonGia", aggregate: "SUM" }, { field: "SoLuong", aggregate: "SUM" }]
    });

    const pSheet = pivot.targetSheet;
    // Thêm trường tính toán DoanhThu = DonGia * SoLuong
    // Chuẩn Excel: với Loại A, SUM(DonGia) = 10+20=30, SUM(SoLuong) = 2+3=5 => DoanhThu = 30 * 5 = 150
    grid.addPivotCalculatedField(pSheet, "DoanhThu", "=DonGia*SoLuong");
    const valA_DoanhThu = grid.sheetsData[pSheet].get("D2")?.val;
    assert(valA_DoanhThu === 150, `DoanhThu loại A phải là 150 (SUM*SUM khớp Excel), nhận được: ${valA_DoanhThu}`);

    // Với Loại B: SUM(DonGia) = 30+40=70, SUM(SoLuong) = 1+2=3 => DoanhThu = 70 * 3 = 210
    const valB_DoanhThu = grid.sheetsData[pSheet].get("D3")?.val;
    assert(valB_DoanhThu === 210, `DoanhThu loại B phải là 210, nhận được: ${valB_DoanhThu}`);

    // Sửa trường tính toán: DoanhThu = DonGia * 0.1
    grid.addPivotCalculatedField(pSheet, "DoanhThu", "=DonGia*0.1");
    const valA_Modified = grid.sheetsData[pSheet].get("D2")?.val;
    assert(valA_Modified === 3, `DoanhThu sau sửa phải là 30*0.1 = 3, nhận được: ${valA_Modified}`);

    // Xóa trường tính toán
    grid.deletePivotCalculatedField(pSheet, "DoanhThu");
    assert(!grid.sheetsData[pSheet].has("D2") || grid.sheetsData[pSheet].get("D2")?.val === "", "Sau xóa trường tính toán cột D vẫn còn dữ liệu");

    // Undo phục hồi trường tính toán
    grid.undo();
    assert(grid.sheetsData[pSheet].get("D2")?.val === 3, "Undo delete chưa khôi phục trường tính toán");
  });

  await test("Lưu FODS và mở lại bảo toàn grouping và calculatedFields trên model pivotTablesBySheet", () => {
    const grid = new SheetGridController(container());
    seed(grid);
    grid.pivotTablesBySheet = {
      "Sheet1 (2)": [{
        id: "pivot-saved-1",
        name: "BangTongHopTest",
        sourceSheet: "Sheet1",
        sourceRange: "A1:C5",
        rows: ["Vùng"],
        columns: [],
        values: [{ field: "Doanh số", aggregate: "SUM" }],
        targetSheet: "Sheet1 (2)",
        filters: [{ field: "Vùng", selectedValues: ["Bắc"] }],
        grouping: { "Vùng": { type: "number", start: 0, end: 50, by: 10 } },
        calculatedFields: [{ name: "Thue", formula: "=Doanh_so*0.1" }]
      }]
    };
    grid.sheets = ["Sheet1", "Sheet1 (2)"];
    grid.activeSheet = "Sheet1 (2)";
    const adapter = new SheetAdapter(grid);
    const fodsXml = adapter.serializeToFods();
    assert(fodsXml.includes("vno:grouping="), "FODS XML thiếu vno:grouping");
    assert(fodsXml.includes("vno:calculated-fields="), "FODS XML thiếu vno:calculated-fields");
    assert(fodsXml.includes("vno:filters="), "FODS XML thiếu vno:filters");

    const workbook = { sheets: ["Sheet1", "Sheet1 (2)"] };
    adapter._attachImportedPivots(workbook, fodsXml);
    const loaded = workbook.pivotTablesBySheet["Sheet1 (2)"]?.[0];
    assert(loaded, "Không đọc lại được pivot từ FODS");
    assert(loaded.grouping?.["Vùng"]?.by === 10, "Grouping không sống sót qua FODS roundtrip");
    assert(loaded.calculatedFields?.[0]?.name === "Thue", "CalculatedFields không sống sót qua FODS roundtrip");
    assert(loaded.filters?.[0]?.selectedValues?.[0] === "Bắc", "Lựa chọn bộ lọc Pivot không sống sót qua FODS roundtrip");
  });
  return results;
}
