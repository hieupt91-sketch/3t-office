import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { click, press, typeText } from "./actions.mjs";
import { launchApp } from "./session.mjs";

const profile = process.env.VNO_CDP_LOCALAPPDATA || fs.mkdtempSync(path.join(os.tmpdir(), "vno-writer-table-props-"));
fs.mkdirSync(profile, { recursive: true });
const docxPath = path.join(profile, "writer-table-properties.docx");
const splitDocxPath = path.join(profile, "writer-table-split.docx");
const percentDocxPath = path.join(profile, "writer-table-width-percent.docx");
const cmDocxPath = path.join(profile, "writer-table-width-cm.docx");
const session = await launchApp("writer", { localAppData: profile });
const { cdp } = session;
const ev = expression => cdp.evaluate(expression, { awaitPromise: true, timeoutMilliseconds: 60000 });
const checks = [];
const check = (label, pass, detail = "") => {
  checks.push(Boolean(pass));
  console.log(`${pass ? "PASS" : "FAIL"} | ${label}${detail ? ` | ${detail}` : ""}`);
};

try {
  await cdp.waitFor("!!window.__vnoAppInstance?.adapter && !!document.querySelector('.vno-writer-body')");
  await ev(`(() => {
    const body = document.querySelector('.vno-writer-body');
    body.innerHTML = '<table id="table-check"><tbody>' +
      '<tr><td>A1</td><td>B1</td></tr><tr><td>A2</td><td>B2</td></tr>' +
      '<tr><td>A3</td><td>B3</td></tr><tr><td>A4</td><td>B4</td></tr>' +
      '</tbody></table>';
    const adapter = window.__vnoAppInstance.adapter;
    adapter.tableController.activeTable = body.querySelector('#table-check');
    adapter.tableController.activeCell = body.querySelector('#table-check').rows[1].cells[0];
    return true;
  })()`);

  await click(cdp, "#table-check td");
  await ev(`(() => { const adapter = window.__vnoAppInstance.adapter; const table = document.querySelector('#table-check'); adapter.tableController.activeTable = table; adapter.tableController.activeCell = table.rows[1].cells[0]; })()`);
  await click(cdp, "#vno-ribbon-tab-tableLayout");
  await click(cdp, '[data-command-id="writer.table.splitTable"]');
  let tableCount = await ev("document.querySelectorAll('.vno-writer-body table').length");
  check("CDP chuột: Tách bảng tại hàng chọn tạo hai bảng", tableCount === 2, `tables=${tableCount}`);
  const splitSave = await ev(`(async () => {
    const adapter = window.__vnoAppInstance.adapter; adapter.isDirty = true;
    return await globalThis.globalUnoBridge.saveRealFileInPlace('writer', adapter._contentForExport(), ${JSON.stringify(splitDocxPath)}, null);
  })()`);
  check("Lưu DOCX sau tách bảng", splitSave?.status === "ok" && fs.existsSync(splitDocxPath), JSON.stringify(splitSave));
  if (fs.existsSync(splitDocxPath)) {
    const oraclePath = path.join(path.dirname(fileURLToPath(import.meta.url)), "writer-table-properties-word-readonly.ps1");
    const splitOracle = JSON.parse(execFileSync("powershell", ["-NoProfile", "-File", oraclePath, "-Path", splitDocxPath], { encoding: "utf8", timeout: 90000 }).trim());
    check("Word COM đọc hai bảng DOCX sau tách; các hàng được chia đúng", splitOracle.tables === 2 && splitOracle.rowsByTable?.join(",") === "1,3", JSON.stringify(splitOracle));
  }
  await press(cdp, "z", { ctrl: true });
  tableCount = await ev("document.querySelectorAll('.vno-writer-body table').length");
  check("CDP bàn phím: Ctrl+Z hoàn tác việc tách bảng", tableCount === 1, `tables=${tableCount}`);
  await ev(`(() => {
    const adapter = window.__vnoAppInstance.adapter; const table = document.querySelector('#table-check');
    adapter.tableController.activeTable = table; adapter.tableController.activeCell = table.rows[0].cells[0];
  })()`);

  await click(cdp, '[data-command-id="writer.table.textDirection"]');
  let direction = await ev("document.querySelector('#table-check td')?.getAttribute('data-vno-text-direction')");
  check("CDP chuột: Hướng chữ lần đầu xoay 90 độ", direction === "tbRl", `direction=${direction}`);

  await click(cdp, '[data-command-id="writer.table.properties"]');
  check("Hộp thoại có đủ tab Bảng, Hàng, Cột, Ô", await ev("document.querySelectorAll('.vno-table-props-dialog [role=tab]').length") === 4);
  await click(cdp, "#vno-tblprops-tab-table");
  await click(cdp, 'input[name="vno-tbl-align"][value="center"]');
  await click(cdp, "#vno-tbl-indent");
  await press(cdp, "a", { ctrl: true });
  await typeText(cdp, "0.5");
  await click(cdp, "#vno-tblprops-tab-row");
  await click(cdp, "#vno-tbl-rowheight-enable");
  await click(cdp, "#vno-tbl-rowheight");
  await press(cdp, "a", { ctrl: true });
  await typeText(cdp, "0.8");
  await click(cdp, "#vno-tblprops-tab-column");
  await click(cdp, "#vno-tbl-colwidth-enable");
  await click(cdp, "#vno-tbl-colwidth");
  await press(cdp, "a", { ctrl: true });
  await typeText(cdp, "2");
  await click(cdp, "#vno-tblprops-tab-cell");
  await click(cdp, "#vno-tbl-valign");
  await press(cdp, "ArrowDown");
  await press(cdp, "Enter");
  await click(cdp, "#vno-tbl-margin-scope");
  await press(cdp, "ArrowUp");
  await press(cdp, "Enter");
  for (const [id, value] of [["top", "0.2"], ["bottom", "0.2"], ["left", "0.3"], ["right", "0.3"]]) {
    await click(cdp, `#vno-tbl-mar-${id}`);
    await press(cdp, "a", { ctrl: true });
    await typeText(cdp, value);
  }
  await click(cdp, "#vno-tblprops-ok");

  const domState = await ev(`(() => {
    const table = document.querySelector('#table-check'); const cell = table.rows[0].cells[0];
    return { align: table.dataset.vnoTableAlign, indent: table.dataset.vnoTableIndent,
      width: table.dataset.vnoTableWidth, margins: [table.dataset.vnoCellMarTop, table.dataset.vnoCellMarBottom,
      table.dataset.vnoCellMarLeft, table.dataset.vnoCellMarRight], valign: cell.dataset.vnoVerticalAlign,
      rowHeight: table.rows[0].style.height, colWidth: table.rows[0].cells[0].style.width };
  })()`);
  check("Hộp thoại áp dụng căn, thụt, cao, rộng cột, căn dọc và lề cm",
    domState.align === "center" && domState.margins.every(Boolean) && domState.valign === "center" && !!domState.colWidth,
    JSON.stringify(domState));
  await click(cdp, '[data-command-id="writer.table.properties"]');
  const reopened = await ev(`(() => ({
    indent: document.querySelector('#vno-tbl-indent')?.value,
    rowHeight: document.querySelector('#vno-tbl-rowheight')?.value,
    colWidth: document.querySelector('#vno-tbl-colwidth')?.value,
    marginTop: document.querySelector('#vno-tbl-mar-top')?.value,
    marginLeft: document.querySelector('#vno-tbl-mar-left')?.value,
    verticalAlign: document.querySelector('#vno-tbl-valign')?.value
  }))()`);
  check("Mở lại hộp thoại hiển thị đúng các giá trị đã áp dụng",
    reopened.indent === "0.50" && reopened.rowHeight === "0.80" && reopened.colWidth === "2" &&
      reopened.marginTop === "0.20" && reopened.marginLeft === "0.30" && reopened.verticalAlign === "center",
    JSON.stringify(reopened));
  await click(cdp, "#vno-tblprops-cancel");

  const saved = await ev(`(async () => {
    const adapter = window.__vnoAppInstance.adapter; adapter.isDirty = true;
    return await globalThis.globalUnoBridge.saveRealFileInPlace('writer', adapter._contentForExport(), ${JSON.stringify(docxPath)}, null);
  })()`);
  check("Lưu DOCX thật qua luồng app Python", saved?.status === "ok" && fs.existsSync(docxPath), JSON.stringify(saved));
  if (fs.existsSync(docxPath)) {
    const oraclePath = path.join(path.dirname(fileURLToPath(import.meta.url)), "writer-table-properties-word-readonly.ps1");
    const raw = execFileSync("powershell", ["-NoProfile", "-File", oraclePath, "-Path", docxPath], { encoding: "utf8", timeout: 90000 }).trim();
    const oracle = JSON.parse(raw);
    check("Word COM ẩn đọc hai w:tbl sau split + undo", oracle.tables === 1, JSON.stringify(oracle));
    check("Word COM đọc căn giữa và căn dọc giữa", oracle.alignment === 1 && oracle.verticalAlignment === 1, JSON.stringify(oracle));
    check("Word COM đọc hướng 90 độ và lề ô đã lưu", oracle.orientation === 3 && oracle.topPadding > 5 && oracle.leftPadding > 7, JSON.stringify(oracle));
    check("Word COM đọc độ rộng cột xấp xỉ 2 cm", Math.abs(oracle.firstColumnWidth - 56.7) < 1, JSON.stringify(oracle));
    check("Word COM đọc chiều cao hàng tối thiểu xấp xỉ 0,8 cm", oracle.rowHeightRule === 1 && Math.abs(oracle.rowHeight - 22.68) < 1, JSON.stringify(oracle));
  }

  const setPreferredWidth = async (unit, value, outputPath) => {
    await click(cdp, '[data-command-id="writer.table.properties"]');
    await click(cdp, "#vno-tblprops-tab-table");
    const enabled = await ev("document.querySelector('#vno-tbl-width-enable')?.checked");
    if (!enabled) await click(cdp, "#vno-tbl-width-enable");
    await click(cdp, "#vno-tbl-width-unit");
    if (unit === "cm") await press(cdp, "ArrowDown");
    else await press(cdp, "Home");
    await press(cdp, "Enter");
    await click(cdp, "#vno-tbl-width");
    await press(cdp, "a", { ctrl: true });
    await typeText(cdp, value);
    await click(cdp, "#vno-tblprops-ok");
    return ev(`(async () => {
      const adapter = window.__vnoAppInstance.adapter; adapter.isDirty = true;
      return await globalThis.globalUnoBridge.saveRealFileInPlace('writer', adapter._contentForExport(), ${JSON.stringify(outputPath)}, null);
    })()`);
  };
  const percentSave = await setPreferredWidth("%", "80", percentDocxPath);
  check("Lưu DOCX với độ rộng ưu tiên 80%", percentSave?.status === "ok" && fs.existsSync(percentDocxPath), JSON.stringify(percentSave));
  if (fs.existsSync(percentDocxPath)) {
    const oraclePath = path.join(path.dirname(fileURLToPath(import.meta.url)), "writer-table-properties-word-readonly.ps1");
    const preferred = JSON.parse(execFileSync("powershell", ["-NoProfile", "-File", oraclePath, "-Path", percentDocxPath], { encoding: "utf8", timeout: 90000 }).trim());
    check("Word COM nhận kiểu %; w:tblW lưu đúng 80% (4000/5000)",
      preferred.preferredWidthType === 2 && preferred.ooxmlPreferredWidthType === "pct" && preferred.ooxmlPreferredWidth === 4000,
      JSON.stringify(preferred));
  }
  const cmSave = await setPreferredWidth("cm", "10", cmDocxPath);
  check("Lưu DOCX với độ rộng ưu tiên 10 cm", cmSave?.status === "ok" && fs.existsSync(cmDocxPath), JSON.stringify(cmSave));
  if (fs.existsSync(cmDocxPath)) {
    const oraclePath = path.join(path.dirname(fileURLToPath(import.meta.url)), "writer-table-properties-word-readonly.ps1");
    const preferred = JSON.parse(execFileSync("powershell", ["-NoProfile", "-File", oraclePath, "-Path", cmDocxPath], { encoding: "utf8", timeout: 90000 }).trim());
    check("Word COM nhận kiểu cm; w:tblW lưu đúng 10 cm (5669 twips)",
      preferred.preferredWidthType === 3 && preferred.ooxmlPreferredWidthType === "dxa" && preferred.ooxmlPreferredWidth === 5669,
      JSON.stringify(preferred));
  }
} catch (error) {
  check("Luồng CDP/Word không phát sinh ngoại lệ", false, error.stack || error.message);
} finally {
  await session.close();
}

const passed = checks.filter(Boolean).length;
console.log(`Writer table properties desktop CDP: ${passed}/${checks.length} PASS`);
if (passed !== checks.length) process.exitCode = 1;
