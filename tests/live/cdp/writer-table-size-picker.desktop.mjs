import { mkdir } from "node:fs/promises";
import path from "node:path";
import { launchApp } from "./session.mjs";
import { click, mouseDrag, press, sleep } from "./actions.mjs";

const results = [];
const check = (name, passed, detail = "") => {
  results.push({ name, passed: Boolean(passed) });
  console.log(`${passed ? "PASS" : "FAIL"} | ${name} | ${detail}`);
};
const session = await launchApp("writer", { localAppData: process.env.VNO_CDP_LOCALAPPDATA });
const { cdp } = session;
const tableState = () => cdp.evaluate(`(() => [...document.querySelectorAll('.vno-writer-body table')].map(table => ({ rows: table.rows.length, columns: table.rows[0]?.cells.length, cells: table.rows[0]?.cells.length, firstCellFocused: table.rows[0]?.cells[0]?.contains(window.getSelection()?.anchorNode) || table.rows[0]?.cells[0] === window.getSelection()?.anchorNode })))()`);

try {
  await click(cdp, "#vno-ribbon-tab-insert");
  await click(cdp, '[data-command-id="writer.table.insert"]');
  await sleep(150);
  check("Nút Bảng biểu mở lưới chọn kích thước", await cdp.evaluate("!!document.querySelector('[data-table-size-picker]')"));
  const dragPoints = await cdp.evaluate(`(() => ["1x1", "5x3"].map(size => {
    const rect = document.querySelector('[data-table-size="' + size + '"]').getBoundingClientRect();
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }))()`);
  await mouseDrag(cdp, dragPoints[0].x, dragPoints[0].y, dragPoints[1].x, dragPoints[1].y, { steps: 10 });
  await sleep(250);
  let tables = await tableState();
  check("Chọn 5 cột × 3 hàng tạo đúng kích thước và đặt con trỏ vào ô đầu", tables.length === 1 && tables[0].rows === 3 && tables[0].columns === 5 && tables[0].firstCellFocused, JSON.stringify(tables));

  await click(cdp, "#vno-ribbon-tab-insert");
  await click(cdp, '[data-command-id="writer.table.insert"]');
  await press(cdp, "Escape", {}, 150);
  await sleep(100);
  check("Escape đóng bộ chọn mà không chèn bảng", (await tableState()).length === 1 && !await cdp.evaluate("!!document.querySelector('[data-table-size-picker]')"));

  await click(cdp, "#vno-ribbon-tab-insert");
  await click(cdp, '[data-command-id="writer.table.insert"]');
  await click(cdp, '[data-table-size-picker] [data-action="custom-size"]');
  await sleep(100);
  const dialogVisible = await cdp.evaluate("!!document.querySelector('[data-table-size-dialog] [role=dialog]')");
  if (dialogVisible) {
    await cdp.evaluate(`(() => { document.querySelector('[name="columns"]').value = "6"; document.querySelector('[name="rows"]').value = "4"; })()`);
    await click(cdp, '[data-table-size-dialog] [data-action="insert"]');
    await sleep(250);
  }
  tables = await tableState();
  check("Hộp thoại tạo bảng 6 cột × 4 hàng", dialogVisible && tables.length === 2 && tables[1].rows === 4 && tables[1].columns === 6, JSON.stringify(tables));

  const savePath = path.join(session.localAppData, "writer-table-size-picker.docx");
  await mkdir(path.dirname(savePath), { recursive: true });
  const saved = await cdp.evaluate(`globalThis.globalUnoBridge.saveRealFileInPlace("writer", window.__vnoAppInstance.adapter._contentForExport(), ${JSON.stringify(savePath)}, null)`);
  check("Lưu DOCX chứa hai bảng vừa tạo", saved?.status === "ok", JSON.stringify(saved));
  console.log(`DOCX_PATH ${savePath}`);

  await press(cdp, "z", { ctrl: true }, 500);
  tables = await tableState();
  check("Ctrl+Z một bước hoàn tác bảng vừa chèn", tables.length === 1 && tables[0].rows === 3 && tables[0].columns === 5, JSON.stringify(tables));
} catch (error) {
  check("Kịch bản CDP hoàn tất không ngoại lệ", false, error.stack || error.message);
} finally {
  console.log(`CDP_PORT ${session.debugPort} | PROFILE ${session.localAppData}`);
  await session.close();
}
const passed = results.filter(result => result.passed).length;
console.log(`SUMMARY ${passed}/${results.length} PASS | ${results.length - passed} FAIL`);
if (passed !== results.length) process.exitCode = 1;
