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

  return results;
}
