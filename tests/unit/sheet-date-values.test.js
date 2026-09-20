import assert from "node:assert/strict";
import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";

// Đo 2026-09-15 (batch LAN): ô ngày (serial 44470 + numFmt ngày) được lưu ra FODS là
// office:value-type="string" "01/10/2021" → Excel thấy chuỗi (lan05 20 ô, lan28 77 ô, VAT 642 ô).

export async function runSheetDateValuesTests() {
  const results = [];
  const test = (name, fn) => { try { fn(); results.push({ name, pass: true }); } catch (error) { results.push({ name, pass: false, error: error.message }); } };
  const adapter = Object.create(SheetAdapter.prototype);

  test("parse office:date-value (date, datetime) and office:time-value into Excel serials, UTC-safe", () => {
    const date = adapter._cellFromFodsAttributes({ "office:value-type": "date", "office:date-value": "2021-10-01" }, "01/10/2021");
    assert.equal(date.val, 44470);
    const dateTime = adapter._cellFromFodsAttributes({ "office:value-type": "date", "office:date-value": "2021-10-01T08:30:00" }, "01/10/2021 08:30");
    assert.equal(Math.round(dateTime.val * 1e6) / 1e6, 44470.354167);
    const time = adapter._cellFromFodsAttributes({ "office:value-type": "time", "office:time-value": "PT08H30M00S" }, "08:30");
    assert.equal(Math.round(time.val * 1e6) / 1e6, 0.354167);
  });

  test("serial -> ISO helpers", () => {
    assert.equal(adapter._excelSerialToIsoDate(44470), "2021-10-01");
    assert.equal(adapter._excelSerialToIsoDate(1), "1899-12-31");
    assert.equal(adapter._excelSerialToIsoTime(0.354167), "PT08H30M00S");
  });

  test("serializeToFods writes date / datetime / time cells as ODF values, plain numbers stay float", () => {
    const sheet = "S";
    const grid = {
      sheets: [sheet], activeSheet: sheet,
      sheetsData: { [sheet]: new Map([
        ["A1", { val: 44470, formula: "", style: { numberFormat: { category: "date", dateFormat: "dd/mm/yyyy" } } }],
        ["A2", { val: 44470.354167, formula: "", style: { numberFormat: { category: "date", dateFormat: "dd/mm/yyyy hh:mm" } } }],
        ["A3", { val: 0.354167, formula: "", style: { numberFormat: { category: "date", dateFormat: "h:mm" } } }],
        ["A4", { val: 12.5, formula: "", style: { numberFormat: { category: "number" } } }]
      ]) },
      commentsBySheet: { [sheet]: {} }, mergedRangesBySheet: { [sheet]: [] }, namedRangesBySheet: { [sheet]: [] },
      namedRangesWorkbook: [], printAreaBySheet: { [sheet]: null }, conditionalFormattingBySheet: { [sheet]: [] },
      dataValidationsBySheet: { [sheet]: [] }, chartsBySheet: { [sheet]: [] }, pageBreaksBySheet: { [sheet]: { rows: [], cols: [] } },
      protectionBySheet: { [sheet]: { enabled: false, password: "" } }, workbookProtection: { enabled: false, password: "" },
      outlineGroupsBySheet: { [sheet]: [] }
    };
    const fods = new SheetAdapter(grid).serializeToFods();
    assert.match(fods, /office:value-type="date" office:date-value="2021-10-01"/);
    assert.match(fods, /office:value-type="date" office:date-value="2021-10-01T08:30:00"/);
    assert.match(fods, /office:value-type="time" office:time-value="PT08H30M00S"/);
    assert.match(fods, /office:value-type="float" office:value="12.5"/);
    assert.doesNotMatch(fods, /office:value-type="date"[^>]*office:time-value/);
  });

  test("AutoFilter database range quotes sheet names with spaces/parentheses on both ends", () => {
    const a = Object.assign(Object.create(SheetAdapter.prototype), { grid: { sheetStates: {
      "Nguồn 2020 (GVCN Trang)": { isFilterActive: true, filterRange: "A1:J2650" }, Plain: { isFilterActive: true, filterRange: "A1:L431" } } } });
    const xml = a._serializeDatabaseRanges(["Nguồn 2020 (GVCN Trang)", "Plain"]);
    assert.match(xml, /table:target-range-address="&apos;Nguồn 2020 \(GVCN Trang\)&apos;\.A1:&apos;Nguồn 2020 \(GVCN Trang\)&apos;\.J2650"/);
    assert.match(xml, /table:target-range-address="Plain\.A1:Plain\.L431"/);
  });

  test("imported database-ranges: quoted sheet names and two-ended addresses map to the right sheet", () => {
    // Đo vòng 8: lan01 sheet 3 ('Nguồn ... (GVCN Trang)'.A1:'...'.J2650) và lan11 sheet 3 (Ruijie.A3:Ruijie.CF145) mất AutoFilter
    const wb = {};
    Object.create(SheetAdapter.prototype)._attachImportedAutoFilter(wb, `<table:database-ranges>
      <table:database-range table:name="__Anonymous_Sheet_DB__0" table:target-range-address="&apos;DS A B&apos;.A1:&apos;DS A B&apos;.L431" table:display-filter-buttons="true"/>
      <table:database-range table:name="__Anonymous_Sheet_DB__2" table:target-range-address="Ruijie.A3:Ruijie.CF145" table:display-filter-buttons="true"/>
      <table:database-range table:name="__Anonymous_Sheet_DB__3" table:target-range-address="Plain.$A$1:Plain.$C$9" table:display-filter-buttons="true"/>
      </table:database-ranges>`);
    assert.deepEqual(wb.autoFilterBySheet, { "DS A B": "A1:L431", Ruijie: "A3:CF145", Plain: "A1:C9" });
  });

  test("imported database-ranges: chi bật AutoFilter khi display-filter-buttons=true (S25d)", () => {
    const wb = {};
    Object.create(SheetAdapter.prototype)._attachImportedAutoFilter(wb, `<table:database-ranges>
      <table:database-range table:name="Filter1" table:target-range-address="Sheet1.A1:C10" table:display-filter-buttons="true"/>
      <table:database-range table:name="Filter2" table:target-range-address="Sheet2.A1:D5" table:display-filter-buttons="false"/>
      <table:database-range table:name="Filter3" table:target-range-address="Sheet3.A1:B3"/>
      <table:database-range table:name="Filter4" table:target-range-address="Sheet4.A1:E7" table:display-filter-buttons="true"/>
      </table:database-ranges>`);
    assert.deepEqual(wb.autoFilterBySheet, { Sheet1: "A1:C10", Sheet4: "A1:E7" });
    assert.ok(!wb.autoFilterBySheet.Sheet2, "Sheet2 không có display-filter-buttons=true không được kích hoạt");
    assert.ok(!wb.autoFilterBySheet.Sheet3, "Sheet3 thiếu display-filter-buttons không được kích hoạt");
  });

  test("rows hidden by an active AutoFilter (table:visibility=filter) import as hidden rows", () => {
    // lan01.xlsx: 2635 dòng bị lọc ẩn (LibreOffice ghi visibility="filter", không phải "collapse") từng mất khi lưu.
    const fods = `<?xml version="1.0"?><office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"><office:body><office:spreadsheet><table:table table:name="F"><table:table-column/><table:table-row><table:table-cell office:value-type="string"><text:p>h</text:p></table:table-cell></table:table-row><table:table-row table:visibility="filter"><table:table-cell office:value-type="float" office:value="1"><text:p>1</text:p></table:table-cell></table:table-row><table:table-row><table:table-cell office:value-type="float" office:value="2"><text:p>2</text:p></table:table-cell></table:table-row></table:table></office:spreadsheet></office:body></office:document>`;
    const workbook = Object.create(SheetAdapter.prototype).parseFods(fods);
    const hidden = workbook.userHiddenRowsBySheet?.F;
    assert.ok(hidden && (hidden.has ? hidden.has(2) : hidden.includes(2)), `row 2 must be hidden: ${JSON.stringify([...(hidden || [])])}`);
  });

  test("S8: vno:xf is written only for cells whose style is unchanged since import", () => {
    const fods = `<?xml version="1.0"?><office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0" xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0" xmlns:vno="https://vnoffice.vn/ns/spreadsheet/1.0"><office:body><office:spreadsheet><table:table table:name="S"><table:table-column/><table:table-row><table:table-cell office:value-type="float" office:value="5" vno:xf="7"><text:p>5</text:p></table:table-cell><table:table-cell office:value-type="float" office:value="6" vno:xf="8"><text:p>6</text:p></table:table-cell></table:table-row></table:table></office:spreadsheet></office:body></office:document>`;
    const wb = Object.create(SheetAdapter.prototype).parseFods(fods);
    const data = wb.sheetsData.S;
    assert.equal(data.get("A1").style.origXf, 7);
    // B1: người dùng đổi định dạng trong app -> style khác lúc nhập
    const b1 = data.get("B1");
    b1.style = { ...b1.style, numberFormat: { category: "percentage", decimals: 2 } };
    const sheet = "S";
    const grid = {
      sheets: [sheet], activeSheet: sheet, sheetsData: { [sheet]: data },
      commentsBySheet: { [sheet]: {} }, mergedRangesBySheet: { [sheet]: [] }, namedRangesBySheet: { [sheet]: [] },
      namedRangesWorkbook: [], printAreaBySheet: { [sheet]: null }, conditionalFormattingBySheet: { [sheet]: [] },
      dataValidationsBySheet: { [sheet]: [] }, chartsBySheet: { [sheet]: [] }, pageBreaksBySheet: { [sheet]: { rows: [], cols: [] } },
      protectionBySheet: { [sheet]: { enabled: false, password: "" } }, workbookProtection: { enabled: false, password: "" },
      outlineGroupsBySheet: { [sheet]: [] }
    };
    const out = new SheetAdapter(grid).serializeToFods();
    const cells = [...out.matchAll(/<table:table-cell\b[^>]*>/g)].map(m => m[0]);
    assert.ok(cells[0].includes('vno:xf="7"'), `A1 untouched must keep vno:xf: ${cells[0]}`);
    assert.ok(!cells[1].includes("vno:xf"), `B1 edited must not carry vno:xf: ${cells[1]}`);
  });

  return results;
}
