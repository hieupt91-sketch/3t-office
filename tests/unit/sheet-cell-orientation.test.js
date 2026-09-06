/**
 * VN Sheet — cell text orientation (Home > Alignment dropdown)
 * FODS style:rotation-angle / direction=ttb and soffice XLSX textRotation.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { SheetGridController } from "../../apps/sheet/sheet-grid.js";
import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";
import { SHEET_RIBBON_TABS } from "../../apps/sheet/sheet-ribbon.js";
import { SHEET_COMMANDS } from "../../platform/commands/command-definitions.js";
import { ICONS } from "../../platform/ui-kit/icons.js";
import { viStrings } from "../../platform/i18n/strings-vi.js";
import { enStrings } from "../../platform/i18n/strings-en.js";
import { mapVnCommandToUno } from "../../adapters/libreoffice/common/command-dispatch-mapper.js";
import { convertWithSoffice, findSoffice } from "../helpers/soffice-convert.mjs";
import { readZipEntry } from "../helpers/zip-package.mjs";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function flatten(items) {
  return (items || []).flatMap(item => item.items ? flatten(item.items) : [item]);
}

function container() {
  return {
    querySelector() { return { style: {}, classList: { add() {}, remove() {}, toggle() {} }, dataset: {} }; },
    querySelectorAll() { return []; },
    addEventListener() {},
    classList: { add() {}, remove() {}, toggle() {} },
    setAttribute() {},
    focus() {}
  };
}

function makeGrid(cells) {
  const sheet = "Orientation";
  return {
    sheets: [sheet],
    activeSheet: sheet,
    sheetsData: { [sheet]: new Map(cells) },
    commentsBySheet: { [sheet]: {} },
    mergedRangesBySheet: { [sheet]: [] },
    namedRangesBySheet: { [sheet]: [] },
    namedRangesWorkbook: [],
    printAreaBySheet: { [sheet]: null },
    conditionalFormattingBySheet: { [sheet]: [] },
    dataValidationsBySheet: { [sheet]: [] },
    chartsBySheet: { [sheet]: [] },
    pageBreaksBySheet: { [sheet]: { rows: [], cols: [] } },
    protectionBySheet: { [sheet]: { enabled: false, password: "" } },
    workbookProtection: { enabled: false, password: "" },
    outlineGroupsBySheet: { [sheet]: [] }
  };
}

function cellXfTextRotations(stylesXml) {
  const alignments = [...String(stylesXml || "").matchAll(/<(?:[\w]+:)?alignment\b([^>]*)\/?>/gi)];
  return alignments
    .map(match => (match[1].match(/\btextRotation\s*=\s*"([^"]+)"/i) || [])[1])
    .filter(value => value !== undefined);
}

export async function runSheetCellOrientationTests() {
  const results = [];
  const test = async (name, fn) => {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.message });
    }
  };

  await test("sheet.cell.orientation: command, i18n VI/EN, UNO, icon", () => {
    const cmd = SHEET_COMMANDS.find(item => item.id === "sheet.cell.orientation");
    assert(cmd, "Thiếu SHEET_COMMANDS sheet.cell.orientation");
    assert(cmd.icon === "textOrientation", "Icon command phải là textOrientation");
    assert(viStrings.commands["sheet.cell.orientation"]?.label === "Hướng chữ", "Thiếu i18n VI");
    assert(enStrings.commands["sheet.cell.orientation"]?.label === "Orientation", "Thiếu i18n EN");
    assert(mapVnCommandToUno("sheet.cell.orientation") === ".uno:ChangeRotation", "UNO map sai");
    assert(ICONS.textOrientation?.includes("<svg"), "Thiếu icon SVG textOrientation");
  });

  await test("Ribbon Alignment: dropdown Hướng chữ sau wrapText, đủ 6 góc", () => {
    const home = SHEET_RIBBON_TABS.find(tab => tab.id === "home");
    const alignment = home.groups.find(group => group.id === "alignment" || group.labelKey === "sheetRibbon.group.alignment");
    const findDropdown = items => {
      for (const item of items || []) {
        if (item.type === "dropdown" && item.id === "sheet.cell.orientation") return item;
        const nested = findDropdown(item.items);
        if (nested) return nested;
      }
      return null;
    };
    const dropdown = findDropdown(alignment.items);
    assert(dropdown, "Thiếu dropdown sheet.cell.orientation trong nhóm Căn chỉnh");
    const args = dropdown.items.map(item => item.args);
    assert(JSON.stringify(args) === JSON.stringify([0, 45, -45, 90, -90, 255]), `Góc dropdown sai: ${args.join(",")}`);
    assert(dropdown.items.every(item => item.commandId === "sheet.cell.orientation"), "Mọi mục phải gọi sheet.cell.orientation");
  });

  await test("Grid: setCellOrientation lưu textRotation; giá trị lạ bị từ chối", () => {
    const grid = new SheetGridController(container());
    grid.setCellValue("A", 1, "XOAY");
    assert(grid.setCellOrientation(45) === true, "45° phải nhận");
    assert(grid.cellsData.get("A1").style.textRotation === 45, "Phải lưu textRotation=45");
    assert(grid.setCellOrientation(255) === true, "255 stacked phải nhận");
    assert(grid.cellsData.get("A1").style.textRotation === 255, "Phải lưu 255");
    assert(grid.setCellOrientation(12) === false, "Góc lạ phải từ chối");
    assert(grid.cellsData.get("A1").style.textRotation === 255, "Góc lạ không được ghi đè");
    assert(grid.undo() === true, "Undo orientation");
    assert(grid.cellsData.get("A1").style.textRotation === 45, "Undo về 45");
  });

  await test("FODS: serialize rotation-angle / ttb và parse round-trip", () => {
    const adapter = new SheetAdapter(makeGrid([
      ["A1", { val: "Ngang", formula: "", style: { textRotation: 0 } }],
      ["B1", { val: "45", formula: "", style: { textRotation: 45 } }],
      ["C1", { val: "-45", formula: "", style: { textRotation: -45 } }],
      ["D1", { val: "90", formula: "", style: { textRotation: 90 } }],
      ["E1", { val: "-90", formula: "", style: { textRotation: -90 } }],
      ["F1", { val: "Doc", formula: "", style: { textRotation: 255 } }]
    ]));
    const xml = adapter.serializeToFods();
    assert(xml.includes('style:rotation-angle="45"'), "FODS phải ghi 45");
    assert(xml.includes('style:rotation-angle="315"'), "FODS -45 phải ghi 315 (canonical LO)");
    assert(xml.includes('style:rotation-angle="90"'), "FODS phải ghi 90");
    assert(xml.includes('style:rotation-angle="270"'), "FODS -90 phải ghi 270");
    assert(/style:direction="ttb"/i.test(xml), "FODS stacked phải ghi direction=ttb");
    const parsed = new SheetAdapter(null).parseFods(xml);
    const data = parsed.sheetsData.Orientation;
    assert(data.get("B1").style.textRotation === 45, `B1 parse 45, nhận ${data.get("B1").style.textRotation}`);
    assert(data.get("C1").style.textRotation === -45, `C1 parse -45, nhận ${data.get("C1").style.textRotation}`);
    assert(data.get("D1").style.textRotation === 90, "D1 parse 90");
    assert(data.get("E1").style.textRotation === -90, "E1 parse -90");
    assert(data.get("F1").style.textRotation === 255, "F1 parse 255");
  });

  await test("LibreOffice FODS -> XLSX: textRotation 45/135/90/180/255 đúng XML", () => {
    assert(findSoffice(), "Không tìm thấy LibreOffice soffice.exe");
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "vno-sheet-orientation-"));
    try {
      const source = path.join(root, "rotation.fods");
      const adapter = new SheetAdapter(makeGrid([
        ["A1", { val: "A45", formula: "", style: { textRotation: 45 } }],
        ["B1", { val: "Bm45", formula: "", style: { textRotation: -45 } }],
        ["C1", { val: "C90", formula: "", style: { textRotation: 90 } }],
        ["D1", { val: "Dm90", formula: "", style: { textRotation: -90 } }],
        ["E1", { val: "Edoc", formula: "", style: { textRotation: 255 } }]
      ]));
      fs.writeFileSync(source, adapter.serializeToFods(), "utf8");
      const xlsx = convertWithSoffice(source, "xlsx", path.join(root, "xlsx"), {
        profileDir: path.join(root, "profile"),
        timeoutMs: 30000
      });
      const stylesXml = readZipEntry(xlsx, "xl/styles.xml")?.toString("utf8") || "";
      const rotations = cellXfTextRotations(stylesXml);
      for (const expected of ["45", "135", "90", "180", "255"]) {
        assert(rotations.includes(expected), `XLSX thiếu textRotation=${expected}: ${JSON.stringify(rotations)}`);
      }
      const roundTrip = convertWithSoffice(xlsx, "fods", path.join(root, "fods"), {
        profileDir: path.join(root, "profile"),
        timeoutMs: 30000
      });
      const parsed = new SheetAdapter(null).parseFods(fs.readFileSync(roundTrip, "utf8"));
      const sheetName = parsed.sheets[0];
      const data = parsed.sheetsData[sheetName];
      const byVal = {};
      for (const item of data.values()) {
        if (item?.val) byVal[String(item.val)] = item.style?.textRotation;
      }
      assert(byVal.A45 === 45, `A45 roundtrip ${byVal.A45}`);
      assert(byVal.Bm45 === -45, `Bm45 roundtrip ${byVal.Bm45}`);
      assert(byVal.C90 === 90, `C90 roundtrip ${byVal.C90}`);
      assert(byVal.Dm90 === -90, `Dm90 roundtrip ${byVal.Dm90}`);
      assert(byVal.Edoc === 255, `Edoc roundtrip ${byVal.Edoc}`);
    } finally {
      if (!process.env.VNO_KEEP_FODS_TEST_OUTPUT) fs.rmSync(root, { recursive: true, force: true });
    }
  });

  return results;
}
