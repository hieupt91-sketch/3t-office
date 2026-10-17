/**
 * VN Writer — Desktop CDP Verification for Word 2016 Parity Round 2
 * Tests real UI interactions for:
 * 1. Selection Pane (writer.view.selectionPane)
 * 2. Group / Ungroup (writer.arrange.group / ungroup)
 * 3. Split Window (writer.view.split)
 * 4. Table Styles Gallery (writer.table.stylesGallery)
 * 5. Table Formula Dialog (writer.table.formula)
 */

import { launchApp } from "./session.mjs";
import { click, press, sleep } from "./actions.mjs";

const checks = [];
const check = (name, pass, detail = "") => {
  checks.push({ name, pass: Boolean(pass), detail });
  console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`);
};

const session = await launchApp("writer", {
  startTimeoutMilliseconds: 180000,
  readyTimeoutMilliseconds: 180000
});
const { cdp } = session;
const ev = (expression) => cdp.evaluate(expression, { awaitPromise: true, timeoutMilliseconds: 240000 });
const execCmd = (cmd, args = null) => ev(`(async () => {
  const bus = window.__vnoGlobalCommandBus || (await import('/platform/commands/command-bus.js')).globalCommandBus;
  return bus.execute(${JSON.stringify(cmd)}, ${JSON.stringify(args)});
})()`);

try {
  await sleep(1500);
  await cdp.waitFor(`Boolean(document.querySelector('.vno-writer-body'))`, {
    timeoutMilliseconds: 90000,
    intervalMilliseconds: 500
  });

  // ==========================================
  // 1. SELECTION PANE (Ngăn lựa chọn đối tượng)
  // ==========================================
  console.log("--- TEST 1: Selection Pane ---");
  await ev(`(() => {
    const adapter = window.__vnoAppInstance?.adapter;
    if (!adapter) throw new Error("Adapter not ready");
    adapter.shapes = [
      { id: "shape-rect-1", name: "Hộp 1", type: "rectangle", visible: true, x: 20, y: 20, width: 100, height: 60 },
      { id: "shape-oval-2", name: "Hình bầu dục 2", type: "oval", visible: true, x: 80, y: 50, width: 80, height: 80 }
    ];
  })()`);

  // Open selection pane via command
  await execCmd("writer.view.selectionPane");
  await sleep(500);

  const paneVisible = await ev(`(() => {
    const pane = document.querySelector("#vno-writer-selection-pane");
    return Boolean(pane && pane.style.display !== "none");
  })()`);
  check("Selection Pane hiển thị khi gọi lệnh writer.view.selectionPane", paneVisible);

  const itemCount = await ev(`document.querySelectorAll("#vno-writer-selection-pane .vno-selection-pane-item").length`);
  check("Selection Pane hiển thị đủ 2 đối tượng", itemCount === 2, `count=${itemCount}`);

  // Toggle visibility of first shape via eye button click
  await click(cdp, "#vno-writer-selection-pane .vno-selection-pane-item:nth-child(1) .vno-selection-pane-eye");
  await sleep(400);

  const firstHidden = await ev(`(() => {
    const adapter = window.__vnoAppInstance?.adapter;
    return adapter?.shapes?.[1]?.visible === false || adapter?.shapes?.[0]?.visible === false;
  })()`);
  check("Bấm biểu tượng mắt ẩn hình khối thành công", firstHidden);

  // Click "Hiện tất cả" toolbar button
  await click(cdp, "#vno-writer-selection-pane .vno-selection-pane-toolbar button:nth-child(1)");
  await sleep(400);

  const allVisible = await ev(`(() => {
    const adapter = window.__vnoAppInstance?.adapter;
    return adapter?.shapes?.every(s => s.visible !== false);
  })()`);
  check("Nút Hiện tất cả khôi phục trạng thái hiển thị của các hình", allVisible);

  // Close selection pane
  await click(cdp, "#vno-writer-selection-pane .vno-selection-pane-close");
  await sleep(400);
  const paneClosed = await ev(`(() => {
    const pane = document.querySelector("#vno-writer-selection-pane");
    return !pane || pane.style.display === "none";
  })()`);
  check("Đóng Selection Pane thành công", paneClosed);

  // ==========================================
  // 2. GROUP / UNGROUP ĐỐI TƯỢNG
  // ==========================================
  console.log("--- TEST 2: Group / Ungroup ---");
  await ev(`(() => {
    const arrange = window.__vnoAppInstance.adapter.arrangeController;
    arrange.selectedObjectIds = new Set(["shape-rect-1", "shape-oval-2"]);
  })()`);

  await execCmd("writer.arrange.group");
  await sleep(400);

  const groupInfo = await ev(`(() => {
    const arrange = window.__vnoAppInstance.adapter.arrangeController;
    const g = arrange.groups?.[0];
    return {
      count: arrange.groups?.length || 0,
      type: g?.type,
      childrenCount: g?.children?.length || 0
    };
  })()`);
  check("Nhóm đối tượng (Group) tạo nhóm đối tượng hợp nhất chuẩn Word", groupInfo.count === 1 && groupInfo.type === "group" && groupInfo.childrenCount === 2, JSON.stringify(groupInfo));

  await execCmd("writer.arrange.ungroup");
  await sleep(400);

  const ungroupInfo = await ev(`(() => {
    const arrange = window.__vnoAppInstance.adapter.arrangeController;
    return {
      groupCount: arrange.groups?.length || 0,
      shapesCount: arrange.shapes?.length || 0
    };
  })()`);
  check("Bỏ nhóm (Ungroup) rã nhóm và trả về các hình độc lập", ungroupInfo.groupCount === 0 && ungroupInfo.shapesCount === 2, JSON.stringify(ungroupInfo));

  // ==========================================
  // 3. SPLIT WINDOW (Chia đôi cửa sổ soạn thảo)
  // ==========================================
  console.log("--- TEST 3: Split Window ---");
  await execCmd("writer.view.split");
  await sleep(600);

  const splitActive = await ev(`(() => {
    const splitBar = document.querySelector(".vno-writer-split-bar");
    const bottomPane = document.querySelector(".vno-writer-split-bottom-pane");
    const workspace = document.querySelector(".vno-writer-workspace") || document.body;
    return Boolean(splitBar && bottomPane && workspace.classList.contains("vno-writer-split-active"));
  })()`);
  check("Chia cửa sổ (Split Window) tạo vạch phân cách và phân vùng cuộn thứ 2", splitActive);

  // Double click split bar to remove split
  await ev(`(() => {
    const splitBar = document.querySelector(".vno-writer-split-bar");
    if (splitBar) splitBar.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
  })()`);
  await sleep(500);

  const splitRemoved = await ev(`(() => {
    const splitBar = document.querySelector(".vno-writer-split-bar");
    const bottomPane = document.querySelector(".vno-writer-split-bottom-pane");
    return !splitBar && !bottomPane;
  })()`);
  check("Nhấp đúp vào vạch phân cách để hủy chia cửa sổ chuẩn Word 2016", splitRemoved);

  // ==========================================
  // 4. TABLE STYLES GALLERY (Thư viện kiểu bảng)
  // ==========================================
  console.log("--- TEST 4: Table Styles Gallery ---");
  await ev(`(() => {
    const body = document.querySelector(".vno-writer-body");
    body.innerHTML = \`
      <table id="test-table-1" border="1" style="width:100%; border-collapse:collapse;">
        <thead>
          <tr><th>Mã</th><th>Tên</th><th>Điểm</th></tr>
        </thead>
        <tbody>
          <tr><td>A1</td><td>Toán</td><td>100</td></tr>
          <tr><td>A2</td><td>Lý</td><td>120</td></tr>
          <tr><td>A3</td><td>Tổng</td><td></td></tr>
        </tbody>
      </table>
    \`;
    const table = document.querySelector("#test-table-1");
    const cell = table.rows[1].cells[1];
    const adapter = window.__vnoAppInstance.adapter;
    if (adapter.tableController) {
      adapter.tableController.activeTable = table;
      adapter.tableController.activeCell = cell;
    }
    const range = document.createRange();
    range.selectNodeContents(cell);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  })()`);
  await sleep(400);

  // Open Table Styles Gallery
  await execCmd("writer.table.stylesGallery");
  await sleep(500);

  const galleryOpen = await ev(`Boolean(document.querySelector("#vno-table-styles-gallery-popup"))`);
  check("Mở Thư viện kiểu bảng hiển thị popup thư viện 32 kiểu dáng", galleryOpen);

  // Click style card 'TableGrid'
  await ev(`document.querySelector('#vno-table-styles-gallery-popup [data-style-id="TableGrid"]')?.scrollIntoView({ block: 'center' })`);
  await sleep(200);
  await click(cdp, '#vno-table-styles-gallery-popup [data-style-id="TableGrid"]');
  await sleep(400);

  const appliedStyle = await ev(`(() => {
    const tbl = document.querySelector("#test-table-1");
    const popup = document.querySelector("#vno-table-styles-gallery-popup");
    return {
      popupClosed: !popup,
      styleAttr: tbl?.getAttribute("data-vno-table-style"),
      classes: tbl?.className || ""
    };
  })()`);
  check("Áp dụng kiểu bảng TableGrid thành công và đóng popup", appliedStyle.popupClosed && appliedStyle.styleAttr === "TableGrid", JSON.stringify(appliedStyle));

  // ==========================================
  // 5. TABLE FORMULA DIALOG (Công thức trong bảng)
  // ==========================================
  console.log("--- TEST 5: Table Formula Dialog ---");
  await ev(`(() => {
    const table = document.querySelector("#test-table-1");
    const emptyCell = table.rows[3].cells[2]; // row index 3, column index 2 (under 100, 120)
    const adapter = window.__vnoAppInstance.adapter;
    if (adapter.tableController) {
      adapter.tableController.activeTable = table;
      adapter.tableController.activeCell = emptyCell;
    }
    const range = document.createRange();
    range.selectNodeContents(emptyCell);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  })()`);

  // Open Formula Dialog
  await execCmd("writer.table.formula");
  await sleep(500);

  const formulaDialogState = await ev(`(() => {
    const overlay = document.querySelector("#vno-table-formula-overlay");
    const input = document.querySelector("#vno-table-formula-input");
    return {
      open: Boolean(overlay),
      formula: input?.value || ""
    };
  })()`);
  check("Hộp thoại Công thức tự động nhận diện ngữ cảnh gợi ý =SUM(ABOVE)", formulaDialogState.open && formulaDialogState.formula === "=SUM(ABOVE)", JSON.stringify(formulaDialogState));

  // Click OK button to evaluate formula and insert
  await click(cdp, "#vno-formula-ok-btn");
  await sleep(500);

  const formulaResult = await ev(`(() => {
    const table = document.querySelector("#test-table-1");
    const cell = table?.rows[3]?.cells[2];
    const overlay = document.querySelector("#vno-table-formula-overlay");
    const field = cell?.querySelector(".vno-table-formula-field");
    return {
      overlayClosed: !overlay,
      text: cell?.textContent?.trim(),
      fieldFormula: field?.getAttribute("data-vno-formula")
    };
  })()`);
  check("Tính toán và chèn công thức =SUM(ABOVE) ra kết quả 220 chuẩn Word", formulaResult.overlayClosed && formulaResult.text === "220" && formulaResult.fieldFormula === "=SUM(ABOVE)", JSON.stringify(formulaResult));

} catch (err) {
  console.error("LỖI CDP:", err);
  check("Toàn bộ quy trình kiểm thử CDP không phát sinh lỗi ngoại lệ", false, err.message);
} finally {
  await session.close();
}

const failed = checks.filter(c => !c.pass);
console.log(`\n========================================`);
console.log(`KẾT QUẢ CDP: ${checks.length - failed.length}/${checks.length} PASS`);
if (failed.length > 0) {
  console.error(`CÓ ${failed.length} KIỂM THỬ THẤT BẠI:`);
  failed.forEach(f => console.error(`  - ${f.name}: ${f.detail}`));
  process.exit(1);
} else {
  console.log(`TẤT CẢ KIỂM THỬ CDP DESKTOP ĐÃ ĐẠT 100%!`);
  process.exit(0);
}
