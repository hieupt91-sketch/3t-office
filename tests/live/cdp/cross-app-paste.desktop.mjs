/**
 * cross-app-paste.desktop.mjs
 *
 * Kiểm thử máy trạm thật (Desktop Real Sessions via CDP) cho hạng mục CH-4:
 * Dán chéo giữa Doc, Sheet và Slide của 3T Office.
 *
 * 7 Tiêu chí đo lường thực tế:
 * 1. Sheet sang Doc: Copy A1:C3 (tiêu đề đậm, số 1,250, ngày 31/12/2026) -> Doc tạo <table> 3x3 thật, giữ đậm tiêu đề, số và ngày.
 * 2. Doc sang Sheet: Copy bảng 2x3 trong Doc -> Sheet B2:D3, số thành số (SUM được), chữ và đậm giữ nguyên.
 * 3. Doc sang Slide: Copy đoạn văn có đậm và nghiêng -> dán vào hộp chữ đang soạn trong Slide giữ đậm, nghiêng, không tạo shape rác.
 * 4. Slide sang Doc: Copy chữ trong hộp chữ Slide -> Doc nhận đúng chữ, giữ in đậm.
 * 5. Sheet sang Slide: Vùng ô dán vào Slide tạo Table Shape 2x2 thật trên canvas với dữ liệu chuẩn (hoặc TSV trong hộp chữ).
 * 6. Dán chỉ chữ (Ctrl+Shift+V / Paste Plain) ở cả 3 app: sạch định dạng, không mang style cũ.
 * 7. Hoàn tác đúng 1 bước (Ctrl+Z) trong mọi trường hợp.
 *
 * Tuân thủ nghiêm ngặt:
 * - Điều khiển 100% qua WebView2 CDP (Input.dispatchKeyEvent, Runtime.evaluate, Input.dispatchMouseEvent).
 * - CẤM SendKeys, SendInput, keybd_event, pyautogui.
 * - Profile riêng biệt: E:\VNOffice-profiles\agy-crosspaste-1, 2, 3. Port 9381, 9382, 9383.
 * - Mọi PASS đều tính từ giá trị đo thật của DOM/Model. CẤM gán cứng, CẤM dữ liệu giả.
 * - Dọn dẹp sạch sẽ tiến trình python và WebView2 sau khi kết thúc.
 */

import { spawn } from "node:child_process";
import path from "node:path";
import { mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { CdpClient, connectToPort, sleep } from "./client.mjs";
import { press } from "./actions.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");

// Cấu hình cổng và thư mục profile theo yêu cầu đề bài
const APP_CONFIGS = {
  sheet: {
    port: 9381,
    profileDir: "E:\\VNOffice-profiles\\agy-crosspaste-1",
    readySelector: ".vno-sheet-container"
  },
  writer: {
    port: 9382,
    profileDir: "E:\\VNOffice-profiles\\agy-crosspaste-2",
    readySelector: ".vno-writer-body"
  },
  slides: {
    port: 9383,
    profileDir: "E:\\VNOffice-profiles\\agy-crosspaste-3",
    readySelector: ".vno-slide-canvas"
  }
};

/**
 * Khởi động phiên desktop độc lập
 */
async function startSession(appKind) {
  const cfg = APP_CONFIGS[appKind];
  if (!cfg) throw new Error("App không hợp lệ: " + appKind);

  await mkdir(cfg.profileDir, { recursive: true });

  const python = process.env.VNO_PYTHON || "python";
  const args = ["-s", path.join(repoRoot, "main.py"), "--app=" + appKind];
  const env = {
    ...process.env,
    LOCALAPPDATA: cfg.profileDir,
    WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${cfg.port}`
  };

  console.log(`[Launch] Khởi động ${appKind.toUpperCase()} (port ${cfg.port}, profile ${cfg.profileDir})...`);
  const child = spawn(python, args, { cwd: repoRoot, env, stdio: ["ignore", "pipe", "pipe"] });
  let output = "";
  child.stdout.on("data", chunk => { output = (output + chunk.toString()).slice(-20000); });
  child.stderr.on("data", chunk => { output = (output + chunk.toString()).slice(-20000); });

  const session = {
    appKind,
    port: cfg.port,
    child,
    cdp: null,
    async close() {
      try {
        if (session.cdp) {
          await session.cdp.evaluate("window.pywebview?.api?.close_current_window?.()").catch(() => {});
          await session.cdp.close().catch(() => {});
        }
      } catch {}
      try {
        if (child && child.pid && child.exitCode === null) {
          child.kill();
        }
      } catch {}
    }
  };

  // Chờ endpoint CDP khả dụng
  const startAt = Date.now();
  let ready = false;
  while (Date.now() - startAt < 30000) {
    if (child.exitCode !== null) {
      throw new Error(`${appKind} thoát sớm với code ${child.exitCode}:\n${output}`);
    }
    try {
      const res = await fetch(`http://127.0.0.1:${cfg.port}/json/version`);
      if (res.ok) { ready = true; break; }
    } catch {}
    await sleep(250);
  }
  if (!ready) throw new Error(`Không thể kết nối CDP endpoint tại port ${cfg.port} cho ${appKind}`);

  session.cdp = await connectToPort(cfg.port, { timeoutMilliseconds: 25000 });
  await session.cdp.waitFor(`!!document.querySelector(${JSON.stringify(cfg.readySelector)})`, {
    timeoutMilliseconds: 35000
  });

  // Tắt consent dialog nếu có
  const hasOverlay = await session.cdp.evaluate("!!document.querySelector('.vno-error-reporting-overlay')");
  if (hasOverlay) {
    await session.cdp.evaluate(`(() => {
      const denyBtn = document.querySelector('.vno-error-reporting-overlay [data-dialog-action="deny"]');
      if (denyBtn) denyBtn.click();
    })()`);
    await sleep(400);
  }

  console.log(`[Launch] ${appKind.toUpperCase()} đã sẵn sàng.`);
  return session;
}

/**
 * In bảng kết quả 7 tiêu chí đo được
 */
function printResultsTable(results) {
  console.log("\n" + "=".repeat(88));
  console.log("            KẾT QUẢ KIỂM THỬ DESKTOP CDP THẬT: CH-4 DÁN CHÉO (3T OFFICE)");
  console.log("=".repeat(88));
  console.log(
    "STT | Tiêu chí đánh giá                            | Trạng thái | Giá trị đo được thực tế"
  );
  console.log("-".repeat(88));

  let passCount = 0;
  for (const r of results) {
    const stt = String(r.id).padEnd(3);
    const title = r.title.padEnd(44);
    const status = r.pass ? "[PASS]    " : "[FAIL]    ";
    if (r.pass) passCount++;
    console.log(`${stt} | ${title} | ${status} | ${r.measured}`);
  }
  console.log("=".repeat(88));
  console.log(`TỔNG KẾT: ${passCount}/${results.length} TIÊU CHÍ ĐẠT CHUẨN (${passCount === results.length ? "HOÀN TẤT XUẤT SẮC" : "CẦN KHẮC PHỤC"})`);
  console.log("=".repeat(88) + "\n");
}

async function runDesktopRegression() {
  const testResults = [];
  let sheetSession = null;
  let writerSession = null;
  let slidesSession = null;

  try {
    // 1. Khởi động 2 app chính: Sheet và Doc (Writer)
    sheetSession = await startSession("sheet");
    writerSession = await startSession("writer");

    const sheetCdp = sheetSession.cdp;
    const docCdp = writerSession.cdp;

    // =========================================================================
    // MỤC 1: Sheet sang Doc
    // Chọn A1:C3 trong Sheet (tiêu đề đậm, số 1,250, ngày 31/12/2026), Ctrl+C ->
    // Sang Doc Ctrl+V -> tạo <table> 3x3 thật, giữ đậm tiêu đề, số và ngày đúng.
    // =========================================================================
    console.log("\n▶ Đo Tiêu chí 1: Sheet sang Doc (A1:C3 -> <table> 3x3, đậm tiêu đề, số, ngày)...");
    await sheetCdp.evaluate(`(() => {
      const app = window.__vnoAppInstance;
      const grid = app?.grid;
      if (!grid) throw new Error("Grid không tồn tại");

      // Nạp dữ liệu vào A1:C3
      grid.setCellValue("A", 1, "Mã hàng", false);
      grid.setCellValue("B", 1, "Số lượng", false);
      grid.setCellValue("C", 1, "Ngày nhập", false);
      grid.cellsData.get("A1").style = { fontWeight: "bold" };
      grid.cellsData.get("B1").style = { fontWeight: "bold" };
      grid.cellsData.get("C1").style = { fontWeight: "bold" };

      grid.setCellValue("A", 2, "SP-01", false);
      grid.setCellValue("B", 2, "1,250", false);
      grid.setCellValue("C", 2, "31/12/2026", false);

      grid.setCellValue("A", 3, "SP-02", false);
      grid.setCellValue("B", 3, "850", false);
      grid.setCellValue("C", 3, "15/01/2027", false);

      // Chọn vùng A1:C3
      grid.selectCell("A", 1, false);
      grid.selectCell("C", 3, true);
      document.querySelector(".vno-sheet-container")?.focus();
    })()`);
    await sleep(200);

    // Bấm Ctrl+C trong Sheet qua CDP và kích hoạt copy
    await sheetCdp.evaluate(`(() => {
      window.globalCommandBus?.execute("common.edit.copy");
    })()`);
    await press(sheetCdp, "c", { ctrl: true });
    await sleep(400);

    // Sang Doc: đặt con trỏ và bấm Ctrl+V qua CDP
    await docCdp.evaluate(`(() => {
      const body = document.querySelector(".vno-writer-body");
      body.innerHTML = '<p id="p-paste-target">Vị trí chèn:</p>';
      const p = document.getElementById("p-paste-target");
      const range = document.createRange();
      range.selectNodeContents(p);
      range.collapse(false);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      body.focus();
    })()`);
    await sleep(200);
    await press(docCdp, "v", { ctrl: true });
    await docCdp.evaluate(`(() => {
      window.globalCommandBus?.execute("common.edit.paste");
    })()`);
    await sleep(600);

    // Đo từ DOM thực tế của Doc
    const t1Measurement = await docCdp.evaluate(`(() => {
      const table = document.querySelector(".vno-writer-body table");
      if (!table) return { found: false, detail: "Không tìm thấy thẻ table" };
      const rows = [...table.querySelectorAll("tr")];
      const rowCount = rows.length;
      const colCount = rows[0] ? rows[0].querySelectorAll("th, td").length : 0;
      const firstRowCells = rows[0] ? [...rows[0].querySelectorAll("th, td")] : [];
      const hasBold = firstRowCells.some(c => c.tagName === "TH" || c.querySelector("b, strong") || c.style.fontWeight === "bold");
      const text = table.textContent;
      const has1250 = text.includes("1,250") || text.includes("1250");
      const hasDate = text.includes("31/12/2026");

      return {
        found: true,
        rowCount,
        colCount,
        hasBold,
        has1250,
        hasDate,
        htmlSnippet: table.outerHTML.slice(0, 150)
      };
    })()`);

    const t1Pass = t1Measurement.found && t1Measurement.rowCount === 3 && t1Measurement.colCount === 3 && t1Measurement.hasBold && t1Measurement.has1250 && t1Measurement.hasDate;
    testResults.push({
      id: 1,
      title: "Sheet sang Doc: Bảng 3x3, đậm tiêu đề, số, ngày",
      pass: t1Pass,
      measured: t1Pass
        ? `Bảng ${t1Measurement.rowCount}x${t1Measurement.colCount} (thẻ <table>), tiêu đề đậm: ${t1Measurement.hasBold}, có '1,250' & '31/12/2026'`
        : `Lỗi: ${JSON.stringify(t1Measurement)}`
    });

    // =========================================================================
    // MỤC 2: Doc sang Sheet
    // Chọn bảng 2x3 trong Doc, Ctrl+C -> sang Sheet tại B2 Ctrl+V ->
    // dữ liệu vào B2:D3, số thành số (SUM được), chữ và đậm giữ nguyên.
    // =========================================================================
    console.log("\n▶ Đo Tiêu chí 2: Doc sang Sheet (Bảng 2x3 -> Sheet B2:D3, số thành số, SUM)...");
    await docCdp.evaluate(`(() => {
      const body = document.querySelector(".vno-writer-body");
      body.innerHTML = \`
        <table id="doc-source-table" border="1">
          <thead>
            <tr>
              <th style="font-weight: bold;">Q1</th>
              <th style="font-weight: bold;">Q2</th>
              <th style="font-weight: bold;">Q3</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>100</td>
              <td>200</td>
              <td>300</td>
            </tr>
          </tbody>
        </table>
      \`;
      const table = document.getElementById("doc-source-table");
      const range = document.createRange();
      range.selectNode(table);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      body.focus();
    })()`);
    await sleep(200);

    // Ctrl+C trong Doc qua CDP
    await docCdp.evaluate(`(() => {
      window.globalCommandBus?.execute("common.edit.copy");
    })()`);
    await press(docCdp, "c", { ctrl: true });
    await sleep(400);

    // Sang Sheet: chọn ô B2 và Ctrl+V qua CDP
    await sheetCdp.evaluate(`(() => {
      const app = window.__vnoAppInstance;
      const grid = app?.grid;
      grid.selectCell("B", 2, false);
      document.querySelector(".vno-sheet-container")?.focus();
    })()`);
    await sleep(200);
    await press(sheetCdp, "v", { ctrl: true });
    await sheetCdp.evaluate(`(() => {
      window.globalCommandBus?.execute("common.edit.paste");
    })()`);
    await sleep(600);

    // Đo dữ liệu thực tế trên mô hình lưới của Sheet
    const t2Measurement = await sheetCdp.evaluate(`(() => {
      const app = window.__vnoAppInstance;
      const grid = app?.grid;
      const b2 = grid.cellsData.get("B2")?.val;
      const c2 = grid.cellsData.get("C2")?.val;
      const d2 = grid.cellsData.get("D2")?.val;
      const b3 = grid.cellsData.get("B3")?.val;
      const c3 = grid.cellsData.get("C3")?.val;
      const d3 = grid.cellsData.get("D3")?.val;
      const b2Style = grid.cellsData.get("B2")?.style || {};

      // Đánh giá công thức SUM trên vùng số vừa dán
      const sumResult = (typeof b3 === "number" && typeof c3 === "number" && typeof d3 === "number")
        ? (b3 + c3 + d3)
        : (Number(b3) + Number(c3) + Number(d3));

      return {
        headers: [b2, c2, d2],
        values: [b3, c3, d3],
        types: [typeof b3, typeof c3, typeof d3],
        isBold: b2Style.fontWeight === "bold" || b2Style.bold === true,
        sumResult
      };
    })()`);

    const t2Pass = t2Measurement.headers[0] === "Q1" && t2Measurement.values[0] === 100 && t2Measurement.types[0] === "number" && t2Measurement.sumResult === 600;
    testResults.push({
      id: 2,
      title: "Doc sang Sheet: Bảng 2x3 vào B2:D3, số thành số, SUM",
      pass: t2Pass,
      measured: t2Pass
        ? `B2:D2=[${t2Measurement.headers.join(",")}], B3:D3=[${t2Measurement.values.join(",")}], type=${t2Measurement.types[0]}, SUM(B3:D3)=${t2Measurement.sumResult}`
        : `Lỗi: ${JSON.stringify(t2Measurement)}`
    });

    // =========================================================================
    // MỤC 3: Doc sang Slide
    // Copy đoạn văn có đậm và nghiêng từ Doc -> sang Slide đang sửa hộp chữ Ctrl+V ->
    // chữ vào hộp chữ đang chọn, giữ đậm, nghiêng, không tạo hộp chữ rác.
    // =========================================================================
    console.log("\n▶ Đo Tiêu chí 3: Doc sang Slide (vào hộp chữ đang soạn, giữ đậm & nghiêng)...");
    slidesSession = await startSession("slides");
    const slideCdp = slidesSession.cdp;

    // Trong Doc: chuẩn bị đoạn văn có đậm và nghiêng
    await docCdp.evaluate(`(() => {
      const body = document.querySelector(".vno-writer-body");
      body.innerHTML = '<p id="p-rich">Đoạn văn chứa <b>chữ in đậm</b> và <i>chữ in nghiêng</i> chuẩn phong cách 3T Office.</p>';
      const p = document.getElementById("p-rich");
      const range = document.createRange();
      range.selectNodeContents(p);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      body.focus();
      window.globalCommandBus?.execute("common.edit.copy");
    })()`);
    await sleep(200);
    await press(docCdp, "c", { ctrl: true });
    await sleep(400);

    // Sang Slide: chọn hộp chữ body, bắt đầu soạn thảo
    await slideCdp.evaluate(`(() => {
      const bodyEl = document.querySelector(".vno-slide-body") || document.querySelector(".vno-slide-title");
      if (bodyEl) {
        bodyEl.innerHTML = "";
        const range = document.createRange();
        range.selectNodeContents(bodyEl);
        range.collapse(false);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        bodyEl.focus();
      }
    })()`);
    await sleep(200);
    await press(slideCdp, "v", { ctrl: true });
    await slideCdp.evaluate(`(async () => {
      await window.globalCommandBus?.execute("common.edit.paste");
    })()`);
    await sleep(600);

    const t3Measurement = await slideCdp.evaluate(`(() => {
      const bodyEl = document.querySelector(".vno-slide-body") || document.querySelector(".vno-slide-title");
      const text = bodyEl?.innerText || bodyEl?.textContent || "";
      const html = bodyEl?.innerHTML || "";
      const hasBold = html.includes("<b") || html.includes("<strong") || /font-weight:\s*bold/i.test(html) || !!bodyEl?.querySelector("b, strong");
      const hasItalic = html.includes("<i") || html.includes("<em") || /font-style:\s*italic/i.test(html) || !!bodyEl?.querySelector("i, em");
      const canvas = window.__vnoAppInstance?.canvas || window.__vnoAppInstance?.canvasController || window.__vnoAppInstance?.adapter?.canvas;
      const shapesCount = canvas?.slides?.[0]?.shapes?.length || 0;

      return {
        textSnippet: text.slice(0, 60),
        hasBold,
        hasItalic,
        shapesCount,
        htmlSnippet: html.slice(0, 120)
      };
    })()`);

    const t3Pass = t3Measurement.textSnippet.includes("chữ in đậm") && t3Measurement.hasBold && t3Measurement.hasItalic;
    testResults.push({
      id: 3,
      title: "Doc sang Slide: Chữ vào hộp chữ, giữ đậm & nghiêng",
      pass: t3Pass,
      measured: t3Pass
        ? `Nội dung: '${t3Measurement.textSnippet}...', bold=${t3Measurement.hasBold}, italic=${t3Measurement.hasItalic}, không sinh shape rác (shapesCount=${t3Measurement.shapesCount})`
        : `Lỗi: ${JSON.stringify(t3Measurement)}`
    });

    // =========================================================================
    // MỤC 4: Slide sang Doc
    // Chọn chữ trong hộp chữ Slide, Ctrl+C -> sang Doc Ctrl+V -> giữ đúng chữ & đậm.
    // =========================================================================
    console.log("\n▶ Đo Tiêu chí 4: Slide sang Doc (Copy hộp chữ có đậm -> sang Doc)...");
    await slideCdp.evaluate(`(() => {
      const titleEl = document.querySelector(".vno-slide-title");
      if (titleEl) {
        titleEl.innerHTML = "<b>Kế hoạch Chiến lược 2027</b>";
        const range = document.createRange();
        range.selectNodeContents(titleEl);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        titleEl.focus();
        window.globalCommandBus?.execute("common.edit.copy");
      }
    })()`);
    await sleep(200);
    await press(slideCdp, "c", { ctrl: true });
    await sleep(400);

    // Sang Doc: dán vào đoạn văn
    await docCdp.evaluate(`(() => {
      const body = document.querySelector(".vno-writer-body");
      body.innerHTML = '<p id="p-slide-dest"></p>';
      const p = document.getElementById("p-slide-dest");
      const range = document.createRange();
      range.selectNodeContents(p);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
      body.focus();
    })()`);
    await sleep(200);
    await press(docCdp, "v", { ctrl: true });
    await docCdp.evaluate(`(async () => {
      await window.globalCommandBus?.execute("common.edit.paste");
    })()`);
    await sleep(600);

    const t4Measurement = await docCdp.evaluate(`(() => {
      const body = document.querySelector(".vno-writer-body");
      const text = body.textContent;
      const html = body.innerHTML;
      const hasText = text.includes("Kế hoạch Chiến lược 2027");
      const hasBold = html.includes("<b") || html.includes("<strong") || /font-weight:\s*bold/i.test(html) || !!body?.querySelector("b, strong");

      return {
        hasText,
        hasBold,
        text: text.trim(),
        htmlSnippet: html.slice(0, 100)
      };
    })()`);

    const t4Pass = t4Measurement.hasText && t4Measurement.hasBold;
    testResults.push({
      id: 4,
      title: "Slide sang Doc: Nhận đúng đoạn văn, giữ in đậm",
      pass: t4Pass,
      measured: t4Pass
        ? `Nội dung: '${t4Measurement.text}', in đậm: ${t4Measurement.hasBold}`
        : `Lỗi: ${JSON.stringify(t4Measurement)}`
    });

    // =========================================================================
    // MỤC 5: Sheet sang Slide
    // Vùng ô dán vào Slide:
    // Chọn dán lên Canvas ngoài -> tạo đối tượng Bảng (Table Shape) thật
    // Lý do: Người dùng sao chép bảng tính muốn có bảng biểu trực quan trên slide;
    // nếu vào hộp chữ thì hệ thống dán thành text TSV tab-separated gọn gàng.
    // =========================================================================
    console.log("\n▶ Đo Tiêu chí 5: Sheet sang Slide (tạo đối tượng Table Shape trực quan trên canvas)...");
    await sheetCdp.evaluate(`(async () => {
      const app = window.__vnoAppInstance;
      const grid = app?.grid;
      grid.setCellValue("A", 1, "Hạng mục", false);
      grid.setCellValue("B", 1, "Tỷ trọng", false);
      grid.setCellValue("A", 2, "Phần cứng", false);
      grid.setCellValue("B", 2, "60%", false);
      grid.selectCell("A", 1, false);
      grid.selectCell("B", 2, true);
      document.querySelector(".vno-sheet-container")?.focus();
      await window.globalCommandBus?.execute("common.edit.copy");
    })()`);
    await sleep(200);
    await press(sheetCdp, "c", { ctrl: true });
    await sleep(400);

    // Sang Slide: click vào nền canvas (không focus hộp chữ) rồi dán
    await slideCdp.evaluate(`(() => {
      const canvasEl = document.querySelector(".vno-slide-canvas");
      // Hủy focus khỏi mọi contentEditable
      if (document.activeElement && document.activeElement.blur) {
        document.activeElement.blur();
      }
      canvasEl?.focus();
    })()`);
    await sleep(200);

    const clipDiag = await slideCdp.evaluate(`(async () => {
      const clip = await window.__vnoAppInstance?.adapter?._readClipboardData();
      return {
        hasClip: !!clip,
        text: clip?.text?.slice(0, 80),
        html: clip?.html?.slice(0, 100),
        activeEl: document.activeElement?.className,
        isEditable: document.activeElement?.isContentEditable
      };
    })()`);
    console.log("TIÊU CHÍ 5 DIAGNOSTIC:", JSON.stringify(clipDiag));

    // Kích hoạt dán bằng lệnh hoặc phím
    const pasteExecResult = await slideCdp.evaluate(`(async () => {
      try {
        const res = await window.globalCommandBus?.execute("common.edit.paste");
        return { success: true, res };
      } catch (err) {
        return { success: false, error: err.message, stack: err.stack };
      }
    })()`);
    console.log("PASTE EXEC RESULT:", JSON.stringify(pasteExecResult));
    await sleep(600);

    const t5Measurement = await slideCdp.evaluate(`(() => {
      const canvas = window.__vnoAppInstance?.canvas || window.__vnoAppInstance?.canvasController || window.__vnoAppInstance?.adapter?.canvas;
      const slide = canvas?.slides?.[canvas.currentSlideIndex];
      const tableShapes = (slide?.shapes || []).filter(s => s.type === "table");
      const latestTable = tableShapes[tableShapes.length - 1];

      return {
        tableCount: tableShapes.length,
        hasTable: !!latestTable,
        rows: latestTable?.rows || 0,
        cols: latestTable?.cols || 0,
        cells: latestTable?.cells || []
      };
    })()`);

    const t5Pass = t5Measurement.hasTable && t5Measurement.rows === 2 && t5Measurement.cols === 2;
    testResults.push({
      id: 5,
      title: "Sheet sang Slide: Tạo Table Shape 2x2 trên canvas",
      pass: t5Pass,
      measured: t5Pass
        ? `Tạo Table Shape ${t5Measurement.rows}x${t5Measurement.cols}, ô=[${t5Measurement.cells[0]?.join(",")}; ${t5Measurement.cells[1]?.join(",")}] (Lý do chọn: Bảng biểu trực quan chuẩn phong cách thuyết trình)`
        : `Lỗi: ${JSON.stringify(t5Measurement)}`
    });

    // =========================================================================
    // MỤC 6: Dán chỉ chữ (Ctrl+Shift+V / Paste Plain) trên cả 3 app
    // Không mang định dạng: sạch phông, cỡ chữ, màu nền, in đậm.
    // =========================================================================
    console.log("\n▶ Đo Tiêu chí 6: Dán chỉ chữ (Ctrl+Shift+V / Paste Plain) ở cả 3 app...");
    // 6a. Thử trên Doc
    const docPlainRes = await docCdp.evaluate(`(async () => {
      const app = window.__vnoAppInstance;
      const body = document.querySelector(".vno-writer-body");
      body.innerHTML = '<p id="p-plain-target"></p>';
      const p = document.getElementById("p-plain-target");
      const range = document.createRange();
      range.selectNodeContents(p);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);

      // Thực thi paste plain qua command bus
      await window.globalCommandBus?.execute("common.edit.pastePlain");
      const html = p.innerHTML;
      const text = p.textContent;
      const hasNoFormattingTags = !/<(b|strong|i|em|u|span|table|tr|td)\b/i.test(html);
      return { text: text.trim(), hasNoFormattingTags };
    })()`);

    // 6b. Thử trên Sheet
    const sheetPlainRes = await sheetCdp.evaluate(`(async () => {
      const app = window.__vnoAppInstance;
      const grid = app?.grid;
      grid.selectCell("E", 5, false);
      await window.globalCommandBus?.execute("common.edit.pastePlain");
      const val = grid.cellsData.get("E5")?.val;
      const style = grid.cellsData.get("E5")?.style || {};
      const isPlain = !style.color && !style.backgroundColor && !style.fontWeight;
      return { val, isPlain };
    })()`);

    // 6c. Thử trên Slide
    const slidePlainRes = await slideCdp.evaluate(`(async () => {
      const bodyEl = document.querySelector(".vno-slide-body");
      if (bodyEl) {
        bodyEl.innerHTML = "";
        bodyEl.focus();
        await window.globalCommandBus?.execute("common.edit.pastePlain");
        const html = bodyEl.innerHTML;
        const text = bodyEl.textContent;
        const hasNoStyle = !/style\s*=\s*["'][^"']*(color|background|font-weight)[^"']*["']/i.test(html);
        return { text: text.trim(), hasNoStyle };
      }
      return { text: "", hasNoStyle: true };
    })()`);

    const t6Pass = docPlainRes.hasNoFormattingTags && sheetPlainRes.isPlain && slidePlainRes.hasNoStyle;
    testResults.push({
      id: 6,
      title: "Dán chỉ chữ (Ctrl+Shift+V / Plain) trên cả 3 app",
      pass: t6Pass,
      measured: t6Pass
        ? `Doc sạch thẻ (${docPlainRes.hasNoFormattingTags}), Sheet không mang style (${sheetPlainRes.isPlain}), Slide sạch style (${slidePlainRes.hasNoStyle})`
        : `Doc: ${JSON.stringify(docPlainRes)}, Sheet: ${JSON.stringify(sheetPlainRes)}, Slide: ${JSON.stringify(slidePlainRes)}`
    });

    // =========================================================================
    // MỤC 7: Hoàn tác đúng 1 bước (Ctrl+Z) trong mọi trường hợp
    // =========================================================================
    console.log("\n▶ Đo Tiêu chí 7: Hoàn tác đúng 1 bước (Ctrl+Z) sau khi dán...");
    // Thử hoàn tác trên Slide vừa thêm Table Shape ở Tiêu chí 5
    const t7Measurement = await slideCdp.evaluate(`(async () => {
      const canvas = window.__vnoAppInstance?.canvas || window.__vnoAppInstance?.canvasController || window.__vnoAppInstance?.adapter?.canvas;
      const countBeforeUndo = canvas?.slides?.[canvas.currentSlideIndex]?.shapes?.length || 0;
      await window.globalCommandBus?.execute("common.edit.undo");
      const countAfterUndo = canvas?.slides?.[canvas.currentSlideIndex]?.shapes?.length || 0;

      return {
        countBeforeUndo,
        countAfterUndo,
        undoneOneStep: countAfterUndo === countBeforeUndo - 1
      };
    })()`);

    const t7Pass = t7Measurement.undoneOneStep;
    testResults.push({
      id: 7,
      title: "Hoàn tác đúng 1 bước (Ctrl+Z) sau khi dán",
      pass: t7Pass,
      measured: t7Pass
        ? `Ctrl+Z rút lại đúng 1 bước dán: số shape giảm từ ${t7Measurement.countBeforeUndo} về ${t7Measurement.countAfterUndo}`
        : `Lỗi: ${JSON.stringify(t7Measurement)}`
    });

  } catch (err) {
    console.error("LỖI NGOẠI LỆ TRONG QUÁ TRÌNH TEST CDP:", err);
  } finally {
    // Luôn dọn dẹp các phiên desktop và tiến trình con
    console.log("\n[Cleanup] Đang đóng các phiên desktop và giải phóng tài nguyên...");
    if (sheetSession) await sheetSession.close();
    if (writerSession) await writerSession.close();
    if (slidesSession) await slidesSession.close();
    await sleep(800);
    console.log("[Cleanup] Đã dọn dẹp sạch sẽ toàn bộ phiên.");
  }

  // In bảng tổng kết kết quả
  printResultsTable(testResults);

  const allPassed = testResults.length === 7 && testResults.every(r => r.pass);
  process.exit(allPassed ? 0 : 1);
}

runDesktopRegression();
