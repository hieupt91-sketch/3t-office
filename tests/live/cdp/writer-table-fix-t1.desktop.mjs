import { launchApp } from "./session.mjs";
import { click, mouseDrag, press, typeText, sleep } from "./actions.mjs";

const results = [];
const check = (name, passed, detail) => {
  results.push({ name, passed: Boolean(passed) });
  console.log(`${passed ? "PASS" : "FAIL"} | ${name} | ${detail}`);
};
const session = await launchApp("writer", { localAppData: process.env.VNO_CDP_LOCALAPPDATA });
const { cdp } = session;

async function tableState(index = 0) {
  return cdp.evaluate(`(() => {
    const tables = [...document.querySelectorAll('.vno-writer-body table')];
    const table = tables[${index}];
    return table ? {
      rows: table.rows.length,
      cells: [...table.rows].map(row => row.cells.length),
      rowSpan: table.rows[0]?.cells[0]?.rowSpan || 1,
      colSpan: table.rows[0]?.cells[0]?.colSpan || 1,
      text: table.innerText
    } : null;
  })()`);
}

try {
  await sleep(1000);
  await click(cdp, "#vno-ribbon-tab-insert");
  await click(cdp, '[data-command-id="writer.table.insert"]');
  await sleep(500);
  let state = await tableState(0);
  check("Chèn bảng tạo 3 hàng × 4 cột trống", state?.rows === 3 && state.cells.every(n => n === 4) && state.text.trim() === "", JSON.stringify(state));
  const exportedHtml = await cdp.evaluate("window.__vnoAppInstance.adapter._contentForExport()");
  const saveResult = await cdp.evaluate(`globalThis.globalUnoBridge.saveRealFileInPlace(
    "writer", ${JSON.stringify(exportedHtml)},
    "E:/VNOffice-profiles/codex-fix-t1/blank-table-t1.docx", null
  )`);
  check("Lưu DOCX thật chứa bảng trống", saveResult?.status === "ok", JSON.stringify(saveResult));

  const firstCell = await cdp.evaluate(`(() => {
    const rect = document.querySelector('.vno-writer-body table')?.rows[0]?.cells[0]?.getBoundingClientRect();
    return rect && { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  })()`);
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x: firstCell.x, y: firstCell.y, button: "left", buttons: 1, clickCount: 1 });
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: firstCell.x, y: firstCell.y, button: "left", buttons: 0, clickCount: 1 });
  await typeText(cdp, "Hang muc", 5);
  await press(cdp, "Tab", {}, 250);
  await typeText(cdp, "Tieu de", 5);
  state = await tableState(0);
  check("Gõ và Tab không bị dính với chữ mẫu", state?.text.includes("Hang muc") && state?.text.includes("Tieu de") && !/Tiêu đề|Dữ liệu/.test(state?.text || ""), JSON.stringify(state));

  await click(cdp, "#vno-ribbon-tab-insert");
  await click(cdp, '[data-command-id="writer.table.insert"]');
  await sleep(500);

  const cells = await cdp.evaluate(`(() => {
    const tables = [...document.querySelectorAll('.vno-writer-body table')];
    const row = tables.at(-1)?.rows[0];
    return row ? [0, 1, 2].map(i => {
      const rect = row.cells[i].getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    }) : null;
  })()`);
  await mouseDrag(cdp, cells[0].x, cells[0].y, cells[2].x, cells[2].y, { steps: 8 });
  await click(cdp, "#vno-ribbon-tab-tableLayout");
  await click(cdp, '[data-command-id="writer.table.mergeCells"]');
  await sleep(400);
  state = await tableState(1);
  check("Gộp ngang ghi nhận span ba ô", state?.cells?.[0] === 2 && state.colSpan === 3, JSON.stringify(state));
  await click(cdp, '[data-command-id="writer.table.splitCells"]');
  await sleep(400);
  state = await tableState(1);
  check("Tách ngang khôi phục bốn ô", state?.cells?.[0] === 4 && state.colSpan === 1, JSON.stringify(state));
  await press(cdp, "z", { ctrl: true }, 900);
  state = await tableState(1);
  check("Ctrl+Z một bước hoàn tác thao tác tách ngang", state?.cells?.[0] === 2 && state.colSpan === 3, JSON.stringify(state));
} catch (error) {
  check("Kịch bản CDP chạy không ngoại lệ", false, error.stack || error.message);
} finally {
  await session.close();
}

const passed = results.filter(result => result.passed).length;
console.log(`SUMMARY ${passed}/${results.length} PASS | ${results.length - passed} FAIL`);
if (passed !== results.length) process.exitCode = 1;
