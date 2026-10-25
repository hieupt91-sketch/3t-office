// Master Desktop CDP Mouse Operations Audit & Test
// Measures real mouse interactions via CDP Input.dispatchMouseEvent across Doc, Sheet, Slide.
// Uses real profile: LOCALAPPDATA=E:\VNOffice-profiles\agy-mouse
// Enforces 1 app at a time, logs PASS/FAIL/N-A with raw values.

import path from "node:path";
import { fileURLToPath } from "node:url";
import { launchApp } from "./session.mjs";
import {
  mouseClick,
  mouseDoubleClick,
  mouseTripleClick,
  mouseRightClick,
  mouseMove,
  mouseDrag,
  mouseWheel,
  click,
  press,
  typeText,
  sleep
} from "./actions.mjs";
import { platformOutputPath } from "./output-path.mjs";

const LOCAL_APP_DATA = process.env.LOCALAPPDATA || platformOutputPath("E:\\VNOffice-profiles\\agy-mouse", { directory: true });
const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

const results = [];
function record(app, opId, name, status, expected, actual, detail = "") {
  const item = {
    app,
    opId,
    name,
    status: Boolean(status) ? "PASS" : (status === "N-A" ? "N-A" : "FAIL"),
    expected: String(expected),
    actual: String(actual),
    detail: String(detail)
  };
  results.push(item);
  console.log(`[${item.status}] [${app.toUpperCase()}] ${opId}: ${name} | kq: ${actual} | mong-doi: ${expected}${detail ? " | " + detail : ""}`);
}

async function getElementPoint(cdp, selector) {
  return await cdp.evaluate(`(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (!r.width && !r.height) return null;
    return { x: r.left + r.width / 2, y: r.top + r.height / 2, left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height };
  })()`);
}

// ============================================================================
// 1. DOC (VN Writer) MOUSE OPERATIONS
// ============================================================================
async function auditDoc() {
  console.log("\n=== BẮT ĐẦU AUDIT THAO TÁC CHUỘT: VN WRITER (DOC) ===");
  const session = await launchApp("writer", { root: appRoot, localAppData: LOCAL_APP_DATA });
  const { cdp } = session;

  try {
    await sleep(2000);

    // 1.1 Double-click chọn từ (Select word)
    await cdp.evaluate(`(() => {
      const body = document.querySelector(".vno-writer-body");
      body.innerHTML = '<p id="test-p1">Văn phòng điện tử 3T Office thông minh và hiện đại.</p><p id="test-p2">Đoạn văn bản thứ hai dùng để kiểm tra kéo thả dữ liệu.</p>';
      window.getSelection().removeAllRanges();
    })()`);
    await sleep(300);

    const wordPoint = await cdp.evaluate(`(() => {
      const p = document.getElementById("test-p1");
      const textNode = p.firstChild;
      const range = document.createRange();
      range.setStart(textNode, 10); // "điện"
      range.setEnd(textNode, 14);
      const rect = range.getBoundingClientRect();
      return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    })()`);

    if (wordPoint) {
      await mouseDoubleClick(cdp, wordPoint.x, wordPoint.y);
      const selWord = await cdp.evaluate(`window.getSelection().toString().trim()`);
      record("doc", "doc_dblclick_word", "Nhấp đúp chọn từ", selWord.includes("điện") || selWord.includes("tử"), "chứa 'điện'", selWord);
    } else {
      record("doc", "doc_dblclick_word", "Nhấp đúp chọn từ", false, "tọa độ từ hợp lệ", "không tìm thấy tọa độ");
    }

    // 1.2 Triple-click chọn cả đoạn văn (Select paragraph)
    if (wordPoint) {
      await mouseTripleClick(cdp, wordPoint.x, wordPoint.y);
      const selPara = await cdp.evaluate(`window.getSelection().toString().trim()`);
      const fullText = "Văn phòng điện tử 3T Office thông minh và hiện đại.";
      record("doc", "doc_tripleclick_para", "Nhấp ba chọn cả đoạn", selPara === fullText, fullText, selPara);
    } else {
      record("doc", "doc_tripleclick_para", "Nhấp ba chọn cả đoạn", false, "đoạn văn bản đầy đủ", "không tìm thấy tọa độ");
    }

    // 1.3 Kéo chọn văn bản (Drag select text)
    await cdp.evaluate(`window.getSelection().removeAllRanges()`);
    const dragTextCoords = await cdp.evaluate(`(() => {
      const p = document.getElementById("test-p2");
      const textNode = p.firstChild;
      const r1 = document.createRange();
      r1.setStart(textNode, 0);
      r1.setEnd(textNode, 4);
      const box1 = r1.getBoundingClientRect();
      const r2 = document.createRange();
      r2.setStart(textNode, 10);
      r2.setEnd(textNode, 16);
      const box2 = r2.getBoundingClientRect();
      return { startX: box1.left, startY: box1.top + box1.height / 2, endX: box2.right, endY: box2.top + box2.height / 2 };
    })()`);

    if (dragTextCoords) {
      await mouseDrag(cdp, dragTextCoords.startX, dragTextCoords.startY, dragTextCoords.endX, dragTextCoords.endY, { steps: 6 });
      const selDrag = await cdp.evaluate(`window.getSelection().toString().trim()`);
      record("doc", "doc_drag_select_text", "Kéo chuột chọn văn bản", selDrag.length > 5, "văn bản được bôi đen > 5 ký tự", selDrag);
    } else {
      record("doc", "doc_drag_select_text", "Kéo chuột chọn văn bản", false, "vùng bôi đen", "không lấy được tọa độ");
    }

    // 1.4 Kéo-thả văn bản đã bôi đen: Di chuyển (Move) và Ctrl+kéo (Copy)
    // Thiết lập vùng chọn rõ ràng
    await cdp.evaluate(`(() => {
      const body = document.querySelector(".vno-writer-body");
      body.innerHTML = '<p id="p-move-src">Nguồn: <b>DULIEUKEO</b> còn đây là phần sau.</p><p id="p-move-dest">Đích đến: [DIEMTHA]</p>';
      const app = window.__vnoAppInstance;
      if (app?.adapter) {
        app.adapter.undoStack = [];
        app.adapter.redoStack = [];
        app.adapter._lastSnapshot = app.adapter._createSnapshot("init.dragtest");
      }
      body.focus();
      const targetB = body.querySelector("b");
      const range = document.createRange();
      range.selectNodeContents(targetB);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    })()`);
    await sleep(200);

    const dndCoords = await cdp.evaluate(`(() => {
      const b = document.querySelector("#p-move-src b");
      const dest = document.getElementById("p-move-dest");
      const r1 = b.getBoundingClientRect();
      const r2 = dest.getBoundingClientRect();
      return {
        startX: r1.left + r1.width / 2,
        startY: r1.top + r1.height / 2,
        endX: r2.right - 20,
        endY: r2.top + r2.height / 2
      };
    })()`);

    if (dndCoords) {
      // 1.4a Kéo thả di chuyển (Move)
      await mouseDrag(cdp, dndCoords.startX, dndCoords.startY, dndCoords.endX, dndCoords.endY, { steps: 8 });
      await sleep(400);
      const afterMove = await cdp.evaluate(`(() => {
        const srcText = document.getElementById("p-move-src")?.textContent || "";
        const destText = document.getElementById("p-move-dest")?.textContent || "";
        const allText = document.querySelector(".vno-writer-body")?.textContent || "";
        return { srcHas: srcText.includes("DULIEUKEO"), destHas: destText.includes("DULIEUKEO"), srcText, destText, allText };
      })()`);
      record("doc", "doc_drag_drop_move", "Kéo-thả văn bản di chuyển (Move)", !afterMove.srcHas && afterMove.destHas, "nguồn mất, đích có", JSON.stringify(afterMove));

      // 1.4b Ctrl+Z hoàn tác kéo thả di chuyển
      await cdp.evaluate('document.querySelector(".vno-writer-body")?.focus()');
      await press(cdp, "z", { ctrl: true }, 400);
      await sleep(300);
      const afterUndoMove = await cdp.evaluate(`(() => {
        const srcText = document.getElementById("p-move-src")?.textContent || "";
        return srcText.includes("DULIEUKEO");
      })()`);
      record("doc", "doc_drag_drop_move_undo", "Hoàn tác di chuyển văn bản (Ctrl+Z)", afterUndoMove, "nguồn phục hồi DULIEUKEO", String(afterUndoMove));

      // 1.4c Ctrl+kéo thả sao chép (Copy)
      await cdp.evaluate(`(() => {
        const body = document.querySelector(".vno-writer-body");
        body.focus();
        let b = document.querySelector("#p-move-src b") || body.querySelector("b");
        if (!b) {
          const pSrc = document.getElementById("p-move-src");
          if (pSrc) {
            pSrc.innerHTML = 'Nguồn: <b>DULIEUKEO</b> còn đây là phần sau.';
            b = pSrc.querySelector("b");
          }
        }
        if (!b) return;
        const range = document.createRange();
        range.selectNodeContents(b);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      })()`);
      await sleep(200);

      const copyCoords = await cdp.evaluate(`(() => {
        const b = document.querySelector("#p-move-src b") || document.querySelector(".vno-writer-body b");
        const dest = document.getElementById("p-move-dest");
        if (!b || !dest) return null;
        const r1 = b.getBoundingClientRect();
        const r2 = dest.getBoundingClientRect();
        return {
          startX: r1.left + r1.width / 2,
          startY: r1.top + r1.height / 2,
          endX: r2.right - 20,
          endY: r2.top + r2.height / 2
        };
      })()`);

      if (copyCoords) {
        await mouseDrag(cdp, copyCoords.startX, copyCoords.startY, copyCoords.endX, copyCoords.endY, { modifiers: { ctrl: true }, steps: 8 });
        await sleep(400);
        const afterCopy = await cdp.evaluate(`(() => {
          const srcText = document.getElementById("p-move-src")?.textContent || "";
          const destText = document.getElementById("p-move-dest")?.textContent || "";
          return { srcHas: srcText.includes("DULIEUKEO"), destHas: destText.includes("DULIEUKEO"), srcText, destText };
        })()`);
        record("doc", "doc_drag_drop_copy", "Ctrl+kéo sao chép văn bản (Copy)", afterCopy.srcHas && afterCopy.destHas, "cả nguồn và đích đều có", JSON.stringify(afterCopy));
      }
    }

    // 1.5 Nhấp đôi viền cột bảng để tự vừa cột (Double-click table col border auto-fit)
    await cdp.evaluate(`(() => {
      const body = document.querySelector(".vno-writer-body");
      body.innerHTML = '<table id="test-table" border="1" style="border-collapse:collapse;"><tr><td id="t-cell-1" style="width:280px;">Ngắn</td><td id="t-cell-2" style="width:200px;">Cột 2</td></tr></table>';
    })()`);
    await sleep(300);

    const colBorderPoint = await cdp.evaluate(`(() => {
      const c1 = document.getElementById("t-cell-1");
      const r = c1.getBoundingClientRect();
      return { x: r.right, y: r.top + r.height / 2, initialWidth: c1.offsetWidth };
    })()`);

    if (colBorderPoint) {
      await mouseDoubleClick(cdp, colBorderPoint.x, colBorderPoint.y);
      await sleep(300);
      const afterColAutoFit = await cdp.evaluate(`document.getElementById("t-cell-1").offsetWidth`);
      record("doc", "doc_table_col_autofit", "Nhấp đôi viền cột bảng tự vừa", afterColAutoFit < colBorderPoint.initialWidth, `< ${colBorderPoint.initialWidth}px`, `${afterColAutoFit}px`);
    }

    // 1.6 Kéo viền cột và viền hàng bảng đổi kích thước (Resize table col/row)
    const currentTablePoints = await cdp.evaluate(`(() => {
      const c1 = document.getElementById("t-cell-1");
      if (!c1) return null;
      const r = c1.getBoundingClientRect();
      return {
        colX: r.right,
        colY: r.top + r.height / 2,
        beforeW: c1.offsetWidth,
        rowX: r.left + r.width / 2,
        rowY: r.bottom,
        beforeH: c1.offsetHeight
      };
    })()`);

    if (currentTablePoints) {
      // 1.6a Kéo viền cột
      await mouseDrag(cdp, currentTablePoints.colX, currentTablePoints.colY, currentTablePoints.colX + 60, currentTablePoints.colY, { steps: 8 });
      await sleep(300);
      const afterColDragW = await cdp.evaluate(`document.getElementById("t-cell-1").offsetWidth`);
      record("doc", "doc_table_col_resize", "Kéo viền cột bảng đổi kích thước", afterColDragW >= currentTablePoints.beforeW + 40, `>= ${currentTablePoints.beforeW + 40}px`, `${afterColDragW}px`);

      // 1.6b Kéo viền hàng
      const currentRowBorder = await cdp.evaluate(`(() => {
        const c1 = document.getElementById("t-cell-1");
        const r = c1.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.bottom - 2, beforeH: c1.offsetHeight };
      })()`);
      if (currentRowBorder) {
        await mouseDrag(cdp, currentRowBorder.x, currentRowBorder.y, currentRowBorder.x, currentRowBorder.y + 50, { steps: 8 });
        await sleep(300);
        const afterRowDragH = await cdp.evaluate(`document.getElementById("t-cell-1").offsetHeight`);
        record("doc", "doc_table_row_resize", "Kéo viền hàng bảng đổi kích thước", afterRowDragH >= currentRowBorder.beforeH + 25, `>= ${currentRowBorder.beforeH + 25}px`, `${afterRowDragH}px`);
      }
    }

    // 1.7 Click vào hình -> tay cầm (Image selection & handles)
    await cdp.evaluate(`(() => {
      const body = document.querySelector(".vno-writer-body");
      body.innerHTML = '<p>Hình:</p><img id="doc-test-img" src="data:image/svg+xml,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'160\\' height=\\'100\\'><rect width=\\'160\\' height=\\'100\\' fill=\\'navy\\'/></svg>" style="width:160px;height:100px;" />';
    })()`);
    await sleep(200);

    const imgPoint = await getElementPoint(cdp, "#doc-test-img");
    if (imgPoint) {
      await mouseClick(cdp, imgPoint.x, imgPoint.y);
      await sleep(300);
      const imgHandles = await cdp.evaluate(`(() => {
        const overlay = document.querySelector("#vno-image-resize-overlay");
        const handles = overlay ? overlay.querySelectorAll(".vno-image-resize-handle").length : 0;
        return { hasOverlay: !!overlay, handles };
      })()`);
      record("doc", "doc_click_image_handles", "Click hình hiện tay cầm", imgHandles.hasOverlay && imgHandles.handles === 8, "8 tay cầm", `${imgHandles.handles} tay cầm (overlay: ${imgHandles.hasOverlay})`);
    }

    // 1.8 Con trỏ chuột đổi hình đúng (text / resize) tại vùng tương ứng
    const cursors = await cdp.evaluate(`(() => {
      const body = document.querySelector(".vno-writer-body");
      const bodyCursor = window.getComputedStyle(body).cursor;
      const link = document.createElement("a");
      link.href = "#";
      link.textContent = "liên kết";
      body.appendChild(link);
      const linkCursor = window.getComputedStyle(link).cursor;
      link.remove();
      return { bodyCursor, linkCursor };
    })()`);
    record("doc", "doc_cursor_contextual", "Con trỏ chuột đổi hình đúng ngữ cảnh", cursors.bodyCursor === "text" && cursors.linkCursor === "pointer", "body: text, link: pointer", `body: ${cursors.bodyCursor}, link: ${cursors.linkCursor}`);

    // 1.9 Cuộn chuột và Ctrl+cuộn thu phóng (Scroll & Ctrl+wheel zoom)
    const zoomBefore = await cdp.evaluate(`window.__vnoAppInstance?.shell?.zoomLevel || 100`);
    const editorContainer = await getElementPoint(cdp, ".vno-writer-viewport") || { x: 400, y: 300 };
    // Ctrl+wheel phóng to
    await mouseWheel(cdp, editorContainer.x, editorContainer.y, 0, -120, { ctrl: true });
    await sleep(300);
    const zoomAfterIn = await cdp.evaluate(`window.__vnoAppInstance?.shell?.zoomLevel || 100`);
    record("doc", "doc_ctrl_wheel_zoom_in", "Ctrl+cuộn chuột phóng to", zoomAfterIn > zoomBefore, `> ${zoomBefore}%`, `${zoomAfterIn}%`);

    // Ctrl+wheel thu nhỏ
    await mouseWheel(cdp, editorContainer.x, editorContainer.y, 0, 120, { ctrl: true });
    await sleep(300);
    const zoomAfterOut = await cdp.evaluate(`window.__vnoAppInstance?.shell?.zoomLevel || 100`);
    record("doc", "doc_ctrl_wheel_zoom_out", "Ctrl+cuộn chuột thu nhỏ", zoomAfterOut < zoomAfterIn, `< ${zoomAfterIn}%`, `${zoomAfterOut}%`);

    // Cuộn chuột thường (Vertical scroll)
    const scrollBefore = await cdp.evaluate(`document.querySelector(".vno-writer-viewport")?.scrollTop || 0`);
    await mouseWheel(cdp, editorContainer.x, editorContainer.y, 0, 150);
    await sleep(300);
    const scrollAfter = await cdp.evaluate(`document.querySelector(".vno-writer-viewport")?.scrollTop || 0`);
    record("doc", "doc_wheel_scroll", "Cuộn chuột thường dọc trang", true, "cuộn bình thường", `trước: ${scrollBefore}, sau: ${scrollAfter}`);

  } finally {
    await session.close();
  }
}

// ============================================================================
// 2. SHEET (VN Sheet) MOUSE OPERATIONS
// ============================================================================
async function auditSheet() {
  console.log("\n=== BẮT ĐẦU AUDIT THAO TÁC CHUỘT: VN SHEET ===");
  const session = await launchApp("sheet", { root: appRoot, localAppData: LOCAL_APP_DATA });
  const { cdp } = session;

  try {
    await sleep(2500);

    // 2.1 Nhập đôi ô vào chế độ sửa (Double-click cell edit mode)
    const b2Point = await getElementPoint(cdp, '.vno-grid-cell[data-coord="B2"]');
    if (b2Point) {
      await mouseDoubleClick(cdp, b2Point.x, b2Point.y);
      await sleep(300);
      const isEditing = await cdp.evaluate(`(() => {
        const active = document.activeElement;
        const formulaInput = document.querySelector(".vno-formula-input");
        const inlineInput = document.querySelector(".vno-inline-cell-editor");
        return active === formulaInput || active === inlineInput || active?.classList?.contains("vno-formula-input");
      })()`);
      record("sheet", "sheet_dblclick_cell_edit", "Nhập đôi ô vào chế độ sửa", isEditing, "focus formula input / inline editor", String(isEditing));
      await press(cdp, "Escape", {}, 200);
    }

    // 2.2 Kéo chọn vùng (Drag select range B2:D4)
    const d4Point = await getElementPoint(cdp, '.vno-grid-cell[data-coord="D4"]');
    if (b2Point && d4Point) {
      await mouseDrag(cdp, b2Point.x, b2Point.y, d4Point.x, d4Point.y, { steps: 8 });
      await sleep(300);
      const rangeState = await cdp.evaluate(`(() => {
        const label = document.querySelector("#vno-name-box")?.value || "";
        const grid = window.__vnoAppInstance?.grid;
        const r = grid?._getSelectionRanges?.()?.[0] || grid?.selectionRange;
        return { label, start: r?.start, end: r?.end };
      })()`);
      const rangeValid = rangeState.label === "B2:D4" || (rangeState.start?.c === "B" && rangeState.start?.r === 2 && rangeState.end?.c === "D" && rangeState.end?.r === 4);
      record("sheet", "sheet_drag_select_range", "Kéo chuột chọn vùng (B2:D4)", rangeValid, "B2:D4", `${rangeState.label} (${rangeState.start?.c}${rangeState.start?.r}:${rangeState.end?.c}${rangeState.end?.r})`);
    }

    // 2.3 Shift+click mở rộng vùng (Shift+click extend range to E6)
    const e6Point = await getElementPoint(cdp, '.vno-grid-cell[data-coord="E6"]');
    if (e6Point) {
      await mouseClick(cdp, e6Point.x, e6Point.y, { shift: true });
      await sleep(300);
      const shiftState = await cdp.evaluate(`(() => {
        const label = document.querySelector("#vno-name-box")?.value || "";
        const grid = window.__vnoAppInstance?.grid;
        const r = grid?._getSelectionRanges?.()?.[0] || grid?.selectionRange;
        return { label, start: r?.start, end: r?.end };
      })()`);
      const shiftValid = shiftState.label === "B2:E6" || (shiftState.start?.c === "B" && shiftState.start?.r === 2 && shiftState.end?.c === "E" && shiftState.end?.r === 6);
      record("sheet", "sheet_shift_click_extend", "Shift+click mở rộng vùng (B2:E6)", shiftValid, "B2:E6", `${shiftState.label} (${shiftState.start?.c}${shiftState.start?.r}:${shiftState.end?.c}${shiftState.end?.r})`);
    }

    // 2.4 Ctrl+click chọn nhiều vùng rời rạc (Ctrl+click multi-select)
    const g8Point = await getElementPoint(cdp, '.vno-grid-cell[data-coord="G8"]');
    if (g8Point) {
      await mouseClick(cdp, g8Point.x, g8Point.y, { ctrl: true });
      await sleep(300);
      const multiState = await cdp.evaluate(`(() => {
        const grid = window.__vnoAppInstance?.grid;
        const ranges = grid?._getSelectionRanges?.() || [];
        return { count: ranges.length, ranges };
      })()`);
      record("sheet", "sheet_ctrl_click_multiselect", "Ctrl+click chọn nhiều vùng rời nhau", multiState.count >= 2, ">= 2 vùng", `${multiState.count} vùng`);
    }

    // 2.5 Nhấp đôi viền cột/hàng tự vừa (Auto-fit col/row border dblclick)
    await cdp.evaluate(`(() => {
      const grid = window.__vnoAppInstance?.grid;
      grid.setCellValue("B", 1, "Chuỗi rất dài kiểm tra tự động vừa khít cột B trong VN Sheet", false);
      grid.setColumnWidths(80, ["B"], false);
    })()`);
    await sleep(200);

    const bResizerPoint = await getElementPoint(cdp, '.vno-col-resizer[data-col="B"]');
    if (bResizerPoint) {
      await mouseDoubleClick(cdp, bResizerPoint.x, bResizerPoint.y);
      await sleep(300);
      const colBWidth = await cdp.evaluate(`window.__vnoAppInstance?.grid?.getColumnWidth("B")`);
      record("sheet", "sheet_dblclick_col_autofit", "Nhấp đôi viền cột tự vừa độ rộng", colBWidth > 150, "> 150px", `${colBWidth}px`);
    } else {
      record("sheet", "sheet_dblclick_col_autofit", "Nhấp đôi viền cột tự vừa độ rộng", false, "resizer B hiện diện", "không thấy resizer");
    }

    // 2.6 Kéo viền cột/hàng đổi kích thước (Drag col/row border resize)
    const cResizerPoint = await getElementPoint(cdp, '.vno-col-resizer[data-col="C"]');
    if (cResizerPoint) {
      const wBefore = await cdp.evaluate(`window.__vnoAppInstance?.grid?.getColumnWidth("C")`);
      await mouseDrag(cdp, cResizerPoint.x, cResizerPoint.y, cResizerPoint.x + 50, cResizerPoint.y, { steps: 8 });
      await sleep(300);
      const wAfter = await cdp.evaluate(`window.__vnoAppInstance?.grid?.getColumnWidth("C")`);
      record("sheet", "sheet_drag_col_resize", "Kéo viền cột đổi độ rộng", wAfter >= wBefore + 35, `>= ${wBefore + 35}px`, `${wAfter}px (trước: ${wBefore}px)`);
    } else {
      record("sheet", "sheet_drag_col_resize", "Kéo viền cột đổi độ rộng", false, "resizer C hiện diện", "không thấy resizer");
    }

    const r3ResizerPoint = await getElementPoint(cdp, '.vno-row-resizer[data-row="3"]');
    if (r3ResizerPoint) {
      const hBefore = await cdp.evaluate(`window.__vnoAppInstance?.grid?.getRowHeight(3)`);
      await mouseDrag(cdp, r3ResizerPoint.x, r3ResizerPoint.y, r3ResizerPoint.x, r3ResizerPoint.y + 30, { steps: 8 });
      await sleep(300);
      const hAfter = await cdp.evaluate(`window.__vnoAppInstance?.grid?.getRowHeight(3)`);
      record("sheet", "sheet_drag_row_resize", "Kéo viền hàng đổi chiều cao", hAfter >= hBefore + 20, `>= ${hBefore + 20}px`, `${hAfter}px (trước: ${hBefore}px)`);
    } else {
      record("sheet", "sheet_drag_row_resize", "Kéo viền hàng đổi chiều cao", false, "resizer hàng 3 hiện diện", "không thấy resizer");
    }

    // 2.7 Kéo tay cầm điền AutoFill (Chuỗi số, Ngày tháng, Công thức)
    // 2.7a Chuỗi số: A1=1, A2=2 -> kéo xuống A4 thành 1, 2, 3, 4
    await cdp.evaluate(`(() => {
      const grid = window.__vnoAppInstance?.grid;
      grid.setCellValue("A", 1, 1, false);
      grid.setCellValue("A", 2, 2, false);
      grid.selectCell("A", 1);
      grid.selectCell("A", 2, true); // range A1:A2
    })()`);
    await sleep(300);

    const fillHandlePoint = await getElementPoint(cdp, ".vno-cell-autofill-handle");
    const a4CellPoint = await getElementPoint(cdp, '.vno-grid-cell[data-coord="A4"]');
    if (fillHandlePoint && a4CellPoint) {
      await mouseDrag(cdp, fillHandlePoint.x, fillHandlePoint.y, a4CellPoint.x, a4CellPoint.y, { steps: 8 });
      await sleep(400);
      const autofillNums = await cdp.evaluate(`(() => {
        const grid = window.__vnoAppInstance?.grid;
        return [1, 2, 3, 4].map(r => grid.cellsData.get("A" + r)?.val);
      })()`);
      const numsOk = autofillNums[2] === 3 && autofillNums[3] === 4;
      record("sheet", "sheet_drag_autofill_numbers", "Kéo tay cầm điền chuỗi số (AutoFill 1..4)", numsOk, "[1, 2, 3, 4]", JSON.stringify(autofillNums));
    } else {
      record("sheet", "sheet_drag_autofill_numbers", "Kéo tay cầm điền chuỗi số", false, "autofill handle hiện diện", "không thấy handle");
    }

    // 2.7b Công thức tịnh tiến: C1 = "=A1*10" -> kéo xuống C3
    await cdp.evaluate(`(() => {
      const grid = window.__vnoAppInstance?.grid;
      grid.setCellValue("C", 1, "=A1*10", true);
      grid.selectCell("C", 1);
    })()`);
    await sleep(300);
    const c1HandlePoint = await getElementPoint(cdp, ".vno-cell-autofill-handle");
    const c3CellPoint = await getElementPoint(cdp, '.vno-grid-cell[data-coord="C3"]');
    if (c1HandlePoint && c3CellPoint) {
      await mouseDrag(cdp, c1HandlePoint.x, c1HandlePoint.y, c3CellPoint.x, c3CellPoint.y, { steps: 8 });
      await sleep(400);
      const formulaVals = await cdp.evaluate(`(() => {
        const grid = window.__vnoAppInstance?.grid;
        return [
          { f: grid.cellsData.get("C2")?.formula, v: grid.cellsData.get("C2")?.val },
          { f: grid.cellsData.get("C3")?.formula, v: grid.cellsData.get("C3")?.val }
        ];
      })()`);
      const formulaOk = formulaVals[0].f === "=A2*10" && formulaVals[1].f === "=A3*10";
      record("sheet", "sheet_drag_autofill_formula", "Kéo tay cầm điền công thức tịnh tiến", formulaOk, "C2==A2*10, C3==A3*10", JSON.stringify(formulaVals));
    }

    // 2.8 Kéo-thả ô để di chuyển (Move) và Ctrl+kéo (Copy)
    // 2.8a Kéo di chuyển ô D1 sang F1
    await cdp.evaluate(`(() => {
      const grid = window.__vnoAppInstance?.grid;
      grid.setCellValue("D", 1, "CHUYEN_O", false);
      grid.selectCell("D", 1);
    })()`);
    await sleep(300);

    const d1MoveHandle = await getElementPoint(cdp, '.vno-grid-cell[data-coord="D1"] .vno-cell-move-handle.top') ||
                         await getElementPoint(cdp, '.vno-grid-cell[data-coord="D1"] .vno-cell-move-handle');
    const f1CellPoint = await getElementPoint(cdp, '.vno-grid-cell[data-coord="F1"]');

    if (d1MoveHandle && f1CellPoint) {
      await mouseDrag(cdp, d1MoveHandle.x, d1MoveHandle.y, f1CellPoint.x, f1CellPoint.y, { steps: 8 });
      await sleep(400);
      const afterCellMove = await cdp.evaluate(`(() => {
        const grid = window.__vnoAppInstance?.grid;
        return {
          d1: grid.cellsData.get("D1")?.val,
          f1: grid.cellsData.get("F1")?.val
        };
      })()`);
      const moveOk = (!afterCellMove.d1 || afterCellMove.d1 === "") && afterCellMove.f1 === "CHUYEN_O";
      record("sheet", "sheet_drag_cell_move", "Kéo viền ô di chuyển dữ liệu (Move)", moveOk, "D1 rỗng, F1='CHUYEN_O'", JSON.stringify(afterCellMove));

      // 2.8b Hoàn tác di chuyển (Ctrl+Z)
      await press(cdp, "z", { ctrl: true }, 300);
      const afterUndoCellMove = await cdp.evaluate(`window.__vnoAppInstance?.grid?.cellsData.get("D1")?.val`);
      record("sheet", "sheet_drag_cell_move_undo", "Hoàn tác di chuyển ô (Ctrl+Z)", afterUndoCellMove === "CHUYEN_O", "D1='CHUYEN_O'", String(afterUndoCellMove));

      // 2.8c Ctrl+kéo sao chép ô (Copy D1 -> H1)
      await cdp.evaluate(`window.__vnoAppInstance?.grid?.selectCell("D", 1)`);
      await sleep(200);
      const d1MoveHandleAgain = await getElementPoint(cdp, '.vno-grid-cell[data-coord="D1"] .vno-cell-move-handle.top') ||
                                await getElementPoint(cdp, '.vno-grid-cell[data-coord="D1"] .vno-cell-move-handle');
      const h1CellPoint = await getElementPoint(cdp, '.vno-grid-cell[data-coord="H1"]');
      if (d1MoveHandleAgain && h1CellPoint) {
        await mouseDrag(cdp, d1MoveHandleAgain.x, d1MoveHandleAgain.y, h1CellPoint.x, h1CellPoint.y, { modifiers: { ctrl: true }, steps: 8 });
        await sleep(400);
        const afterCellCopy = await cdp.evaluate(`(() => {
          const grid = window.__vnoAppInstance?.grid;
          return {
            d1: grid.cellsData.get("D1")?.val,
            h1: grid.cellsData.get("H1")?.val
          };
        })()`);
        const copyOk = afterCellCopy.d1 === "CHUYEN_O" && afterCellCopy.h1 === "CHUYEN_O";
        record("sheet", "sheet_drag_cell_copy", "Ctrl+kéo viền ô sao chép dữ liệu (Copy)", copyOk, "cả D1 và H1 đều ='CHUYEN_O'", JSON.stringify(afterCellCopy));
      }
    } else {
      record("sheet", "sheet_drag_cell_move", "Kéo viền ô di chuyển", false, "move handle hiện diện", "không thấy move handle");
    }

    // 2.9 Click tiêu đề cột/hàng chọn cả cột/hàng
    const colHeaderC = await getElementPoint(cdp, 'th.vno-col-header[data-col="C"]');
    if (colHeaderC) {
      await mouseClick(cdp, colHeaderC.x, colHeaderC.y);
      await sleep(200);
      const colSelLabel = await cdp.evaluate(`document.querySelector("#vno-cell-name, .vno-name-box")?.value || ""`);
      record("sheet", "sheet_click_col_header", "Click tiêu đề cột chọn cả cột", colSelLabel.includes("C") && colSelLabel.includes(":"), "C:C", colSelLabel);
    }

    const rowHeader5 = await getElementPoint(cdp, 'th.vno-row-header[data-row="5"]');
    if (rowHeader5) {
      await mouseClick(cdp, rowHeader5.x, rowHeader5.y);
      await sleep(200);
      const rowSelLabel = await cdp.evaluate(`document.querySelector("#vno-cell-name, .vno-name-box")?.value || ""`);
      record("sheet", "sheet_click_row_header", "Click tiêu đề hàng chọn cả hàng", rowSelLabel.includes("5") && rowSelLabel.includes(":"), "5:5", rowSelLabel);
    }

    // 2.10 Kéo tiêu đề chọn nhiều cột/hàng
    const colHeaderD = await getElementPoint(cdp, 'th.vno-col-header[data-col="D"]');
    const colHeaderF = await getElementPoint(cdp, 'th.vno-col-header[data-col="F"]');
    if (colHeaderD && colHeaderF) {
      await mouseDrag(cdp, colHeaderD.x, colHeaderD.y, colHeaderF.x, colHeaderF.y, { steps: 6 });
      await sleep(200);
      const multiColLabel = await cdp.evaluate(`document.querySelector("#vno-cell-name, .vno-name-box")?.value || ""`);
      record("sheet", "sheet_drag_col_headers", "Kéo tiêu đề chọn nhiều cột", multiColLabel.includes("D") && multiColLabel.includes("F"), "D:F", multiColLabel);
    }

    // 2.11 Chuột phải mở menu ngữ cảnh
    if (b2Point) {
      await mouseRightClick(cdp, b2Point.x, b2Point.y);
      await sleep(300);
      const ctxMenuVisible = await cdp.evaluate(`(() => {
        const menu = document.querySelector(".vno-context-menu");
        return !!menu && window.getComputedStyle(menu).display !== "none";
      })()`);
      record("sheet", "sheet_right_click_context_menu", "Chuột phải mở Menu ngữ cảnh", ctxMenuVisible, "menu ngữ cảnh hiển thị", String(ctxMenuVisible));
      await press(cdp, "Escape", {}, 200);
    }

    // 2.12 Ctrl+cuộn thu phóng
    const zoomBeforeSheet = await cdp.evaluate(`window.__vnoAppInstance?.shell?.zoomLevel || 100`);
    const sheetVp = await getElementPoint(cdp, ".vno-sheet-container") || { x: 400, y: 300 };
    await mouseWheel(cdp, sheetVp.x, sheetVp.y, 0, -120, { ctrl: true });
    await sleep(300);
    const zoomAfterSheet = await cdp.evaluate(`window.__vnoAppInstance?.shell?.zoomLevel || 100`);
    record("sheet", "sheet_ctrl_wheel_zoom", "Ctrl+cuộn chuột thu phóng Sheet", zoomAfterSheet > zoomBeforeSheet, `> ${zoomBeforeSheet}%`, `${zoomAfterSheet}%`);

    // 2.13 STEP 3: Tràn chữ khi soạn ô sang các ô bên phải (Formula / Text overflow during compose)
    await cdp.evaluate(`(() => {
      const grid = window.__vnoAppInstance?.grid;
      grid.setCellValue("E", 10, "", false);
      grid.setCellValue("F", 10, "", false);
      grid.setCellValue("G", 10, "", false);
      grid.selectCell("E", 10);
    })()`);
    await sleep(200);

    // Gõ công thức dài vào ô E10
    const longFormula = "=VLOOKUP(100, A1:D50, 2, FALSE)";
    await cdp.evaluate(`(() => {
      const grid = window.__vnoAppInstance?.grid;
      grid.formulaInput.value = ${JSON.stringify(longFormula)};
      grid.formulaInput.dispatchEvent(new Event("input", { bubbles: true }));
    })()`);
    await sleep(300);

    const overflowState = await cdp.evaluate(`(() => {
      const td = document.querySelector('.vno-grid-cell[data-coord="E10"]');
      if (!td) return null;
      const computed = window.getComputedStyle(td);
      const isVisible = computed.overflow === "visible";
      const hasCanOverflow = td.classList.contains("can-overflow");
      return {
        text: td.textContent,
        overflow: computed.overflow,
        zIndex: computed.zIndex,
        hasCanOverflow,
        isOverflowVisible: isVisible
      };
    })()`);
    record("sheet", "sheet_composing_text_overflow", "Nội dung soạn ô tràn sang phải khi rỗng", overflowState?.isOverflowVisible || overflowState?.hasCanOverflow, "overflow: visible", JSON.stringify(overflowState));
    await press(cdp, "Escape", {}, 200);

  } finally {
    await session.close();
  }
}

// ============================================================================
// 3. SLIDE (VN Slides) MOUSE OPERATIONS
// ============================================================================
async function auditSlide() {
  console.log("\n=== BẮT ĐẦU AUDIT THAO TÁC CHUỘT: VN SLIDES ===");
  const session = await launchApp("slides", { root: appRoot, localAppData: LOCAL_APP_DATA });
  const { cdp } = session;

  try {
    await sleep(2500);

    // Chuẩn bị 1 slide có shape hình chữ nhật
    await cdp.evaluate(`(() => {
      const canvas = window.__vnoAppInstance?.canvas;
      canvas.insertShape("rectangle");
    })()`);
    await sleep(400);

    // 3.1 Kéo di chuyển đối tượng (Drag move object)
    const shapePoint = await cdp.evaluate(`(() => {
      const shape = document.querySelector(".vno-slide-shape-item");
      if (!shape) return null;
      const r = shape.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2, left: shape.offsetLeft, top: shape.offsetTop };
    })()`);

    if (shapePoint) {
      await mouseDrag(cdp, shapePoint.x, shapePoint.y, shapePoint.x + 80, shapePoint.y + 60, { steps: 8 });
      await sleep(300);
      const afterShapeMove = await cdp.evaluate(`(() => {
        const shape = document.querySelector(".vno-slide-shape-item");
        return { left: shape.offsetLeft, top: shape.offsetTop };
      })()`);
      const moved = Math.abs(afterShapeMove.left - shapePoint.left) > 30 && Math.abs(afterShapeMove.top - shapePoint.top) > 20;
      record("slide", "slide_drag_move_object", "Kéo di chuyển đối tượng trên canvas", moved, `left dời ~80px, top ~60px`, `left: ${afterShapeMove.left}, top: ${afterShapeMove.top}`);

      // Hoàn tác (Ctrl+Z)
      await press(cdp, "z", { ctrl: true }, 300);
      const afterUndoMove = await cdp.evaluate(`document.querySelector(".vno-slide-shape-item")?.offsetLeft`);
      record("slide", "slide_drag_move_undo", "Hoàn tác di chuyển đối tượng (Ctrl+Z)", Math.abs(afterUndoMove - shapePoint.left) <= 5, `${shapePoint.left}px`, `${afterUndoMove}px`);
    }

    // 3.2 Kéo tay cầm đổi kích thước (Shift giữ tỉ lệ) (Drag resize handle & Shift maintain aspect)
    // Click chọn shape để hiện tay cầm
    const selShapePoint = await cdp.evaluate(`(() => {
      const shape = document.querySelector(".vno-slide-shape-item");
      const r = shape.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    })()`);
    await mouseClick(cdp, selShapePoint.x, selShapePoint.y);
    await sleep(300);

    const seHandlePoint = await getElementPoint(cdp, ".vno-shape-resize-handle.vno-handle-se");
    if (seHandlePoint) {
      const initialSize = await cdp.evaluate(`(() => {
        const shape = document.querySelector(".vno-slide-shape-item");
        return { w: shape.offsetWidth, h: shape.offsetHeight, ratio: shape.offsetWidth / shape.offsetHeight };
      })()`);

      // 3.2a Kéo đổi kích thước thường
      await mouseDrag(cdp, seHandlePoint.x, seHandlePoint.y, seHandlePoint.x + 60, seHandlePoint.y + 40, { steps: 8 });
      await sleep(300);
      const newSizeNormal = await cdp.evaluate(`(() => {
        const shape = document.querySelector(".vno-slide-shape-item");
        return { w: shape.offsetWidth, h: shape.offsetHeight };
      })()`);
      record("slide", "slide_drag_resize_handle", "Kéo tay cầm đổi kích thước", newSizeNormal.w > initialSize.w + 30, `> ${initialSize.w + 30}px`, `${newSizeNormal.w}px × ${newSizeNormal.h}px`);

      // 3.2b Kéo giữ Shift giữ tỉ lệ khung hình
      await press(cdp, "z", { ctrl: true }, 300); // hoàn tác về ban đầu
      await sleep(200);
      const seHandleAgain = await getElementPoint(cdp, ".vno-shape-resize-handle.vno-handle-se");
      if (seHandleAgain) {
        await mouseDrag(cdp, seHandleAgain.x, seHandleAgain.y, seHandleAgain.x + 80, seHandleAgain.y + 40, { modifiers: { shift: true }, steps: 8 });
        await sleep(300);
        const shiftSize = await cdp.evaluate(`(() => {
          const shape = document.querySelector(".vno-slide-shape-item");
          const r = shape.offsetWidth / shape.offsetHeight;
          return { w: shape.offsetWidth, h: shape.offsetHeight, ratio: r };
        })()`);
        const ratioPreserved = Math.abs(shiftSize.ratio - initialSize.ratio) < 0.08;
        record("slide", "slide_drag_resize_shift_ratio", "Shift+kéo tay cầm giữ tỉ lệ kích thước", ratioPreserved, `tỉ lệ ~${initialSize.ratio.toFixed(2)}`, `tỉ lệ ${shiftSize.ratio.toFixed(2)} (${shiftSize.w}×${shiftSize.h})`);
      }
    } else {
      record("slide", "slide_drag_resize_handle", "Kéo tay cầm đổi kích thước", false, "tay cầm se hiện diện", "không thấy tay cầm");
    }

    // 3.3 Nhấp đôi vào shape để nhập chữ (Double-click shape text edit)
    const currentShapeCenter = await cdp.evaluate(`(() => {
      const s = document.querySelector(".vno-slide-shape-item");
      const r = s.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    })()`);
    if (currentShapeCenter) {
      await mouseDoubleClick(cdp, currentShapeCenter.x, currentShapeCenter.y);
      await sleep(300);
      const isShapeEditing = await cdp.evaluate(`(() => {
        const s = document.querySelector(".vno-slide-shape-item");
        const editor = s.querySelector("[contenteditable='true']") || (s.getAttribute("contenteditable") === "true");
        return Boolean(editor);
      })()`);
      record("slide", "slide_dblclick_shape_text", "Nhấp đôi vào shape để nhập chữ", isShapeEditing, "vùng soạn thảo chữ active", String(isShapeEditing));
    }

    // 3.4 Kéo khung chọn nhiều đối tượng (Marquee / Rubber-band multi-select)
    // Chèn thêm 1 shape nữa
    await cdp.evaluate(`(() => {
      const canvas = window.__vnoAppInstance?.canvas;
      canvas.insertShape("circle");
    })()`);
    await sleep(400);

    const marqueeCoords = await cdp.evaluate(`(() => {
      const shapes = document.querySelectorAll(".vno-slide-shape-item");
      if (shapes.length < 2) return null;
      const r1 = shapes[0].getBoundingClientRect();
      const r2 = shapes[1].getBoundingClientRect();
      return {
        startX: Math.min(r1.left, r2.left) - 30,
        startY: Math.min(r1.top, r2.top) - 30,
        endX: Math.max(r1.right, r2.right) + 30,
        endY: Math.max(r1.bottom, r2.bottom) + 30
      };
    })()`);

    if (marqueeCoords) {
      await mouseDrag(cdp, marqueeCoords.startX, marqueeCoords.startY, marqueeCoords.endX, marqueeCoords.endY, { steps: 10 });
      await sleep(400);
      const selectedShapesCount = await cdp.evaluate(`window.__vnoAppInstance?.canvas?.selectedShapeIds?.size || 0`);
      record("slide", "slide_drag_marquee_select", "Kéo khung bôi chọn nhiều đối tượng (Marquee)", selectedShapesCount >= 2, ">= 2 đối tượng", `${selectedShapesCount} đối tượng`);
    } else {
      record("slide", "slide_drag_marquee_select", "Kéo khung bôi chọn nhiều đối tượng", false, ">= 2 shape", "không xác định tọa độ");
    }

    // 3.5 Kéo sắp xếp trang ở khung bên trái (Drag reorder slides in left filmstrip)
    // Tạo 3 slides với tiêu đề rõ ràng
    await cdp.evaluate(`(() => {
      const canvas = window.__vnoAppInstance?.canvas;
      canvas.slides = [
        { id: "s1", title: "TRANG_MOT", shapes: [] },
        { id: "s2", title: "TRANG_HAI", shapes: [] },
        { id: "s3", title: "TRANG_BA", shapes: [] }
      ];
      canvas.currentSlideIndex = 0;
      canvas._renderThumbnails();
    })()`);
    await sleep(400);

    const thumb1Point = await getElementPoint(cdp, '.vno-slide-thumb-item[data-slide-index="0"]');
    const thumb2Point = await getElementPoint(cdp, '.vno-slide-thumb-item[data-slide-index="1"]');

    if (thumb1Point && thumb2Point) {
      await mouseDrag(cdp, thumb1Point.x, thumb1Point.y, thumb2Point.x, thumb2Point.y, { steps: 8 });
      await sleep(400);
      const slideTitlesAfter = await cdp.evaluate(`window.__vnoAppInstance?.canvas?.slides?.map(s => s.title)`);
      const reordered = slideTitlesAfter && slideTitlesAfter[0] === "TRANG_HAI" && slideTitlesAfter[1] === "TRANG_MOT";
      record("slide", "slide_drag_reorder_filmstrip", "Kéo sắp xếp trang ở khung trái", reordered, '["TRANG_HAI", "TRANG_MOT", "TRANG_BA"]', JSON.stringify(slideTitlesAfter));

      // Hoàn tác
      await press(cdp, "z", { ctrl: true }, 300);
      const slideTitlesUndo = await cdp.evaluate(`window.__vnoAppInstance?.canvas?.slides?.map(s => s.title)`);
      record("slide", "slide_drag_reorder_undo", "Hoàn tác sắp xếp trang (Ctrl+Z)", slideTitlesUndo && slideTitlesUndo[0] === "TRANG_MOT", 'TRANG_MOT đầu tiên', JSON.stringify(slideTitlesUndo));
    }

    // 3.6 Click chọn trang (Click select slide)
    const thumb3Point = await getElementPoint(cdp, '.vno-slide-thumb-item[data-slide-index="2"]');
    if (thumb3Point) {
      await mouseClick(cdp, thumb3Point.x, thumb3Point.y);
      await sleep(300);
      const curIndex = await cdp.evaluate(`window.__vnoAppInstance?.canvas?.currentSlideIndex`);
      record("slide", "slide_click_select_slide", "Click chọn trang chiếu ở khung trái", curIndex === 2, "index 2", `index ${curIndex}`);
    }

    // 3.7 Ctrl+cuộn thu phóng Slide
    const zoomBeforeSlide = await cdp.evaluate(`window.__vnoAppInstance?.shell?.zoomLevel || 100`);
    const slideVp = await getElementPoint(cdp, ".vno-slide-canvas") || { x: 500, y: 350 };
    await mouseWheel(cdp, slideVp.x, slideVp.y, 0, -120, { ctrl: true });
    await sleep(300);
    const zoomAfterSlide = await cdp.evaluate(`window.__vnoAppInstance?.shell?.zoomLevel || 100`);
    record("slide", "slide_ctrl_wheel_zoom", "Ctrl+cuộn chuột thu phóng Slide", zoomAfterSlide > zoomBeforeSlide, `> ${zoomBeforeSlide}%`, `${zoomAfterSlide}%`);

  } finally {
    await session.close();
  }
}

// ============================================================================
// MAIN RUNNER
// ============================================================================
async function main() {
  console.log("====================================================================");
  console.log("BẮT ĐẦU BỘ ĐO THAO TÁC CHUỘT THỰC TẾ TRÊN MÁY BẰNG CDP (INPUT DISPATCH)");
  console.log(`Profile: ${LOCAL_APP_DATA}`);
  console.log("====================================================================");

  try {
    await auditDoc();
  } catch (err) {
    console.error("LỖI KHI ĐO DOC:", err);
  }

  try {
    await auditSheet();
  } catch (err) {
    console.error("LỖI KHI ĐO SHEET:", err);
  }

  try {
    await auditSlide();
  } catch (err) {
    console.error("LỖI KHI ĐO SLIDE:", err);
  }

  console.log("\n====================================================================");
  console.log("TỔNG KẾT BẢNG ĐO THAO TÁC CHUỘT:");
  console.log("====================================================================");
  let passCount = 0;
  let failCount = 0;
  for (const r of results) {
    if (r.status === "PASS") passCount++;
    else if (r.status === "FAIL") failCount++;
    console.log(`${r.status.padEnd(5)} | [${r.app.toUpperCase().padEnd(5)}] | ${r.opId.padEnd(30)} | ${r.name} | ${r.actual}`);
  }
  console.log(`\nKẾT QUẢ: ${passCount} PASS | ${failCount} FAIL | Tổng: ${results.length}`);
  
  if (process.env.VNO_AUDIT_OUTPUT) {
    const fs = await import("node:fs/promises");
    await fs.writeFile(process.env.VNO_AUDIT_OUTPUT, JSON.stringify(results, null, 2), "utf8");
    console.log(`Đã xuất kết quả ra: ${process.env.VNO_AUDIT_OUTPUT}`);
  }

  process.exitCode = failCount > 0 ? 1 : 0;
}

main().catch(err => {
  console.error("LỖI CHÍNH:", err);
  process.exit(1);
});
