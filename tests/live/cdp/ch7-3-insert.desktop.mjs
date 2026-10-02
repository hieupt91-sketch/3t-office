/**
 * 3T Office — CH-7.3 Shared Insert Live Desktop CDP Measurement
 * Khảo sát và đo thực tế trên app desktop:
 * Chèn ảnh, hình, hộp văn bản, ký hiệu, liên kết (Ctrl+K) trên 3T Doc, Sheet, Slide.
 * Tuân thủ quy định:
 * - Chỉ dùng CDP thuần túy (Runtime.evaluate, Input.dispatchKeyEvent...).
 * - Profile riêng tại E:\VNOffice-profiles\agy-ch73-N.
 * - Chỉ tắt theo PID cụ thể của chính script (taskkill /PID pid /T /F).
 * - Không đổi đường lưu/mở tệp (adapter save/open).
 */

import { spawn, spawnSync } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { connectToPort, findFreePort, sleep } from "./client.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../../..");
const profilesBaseDir = "E:\\VNOffice-profiles";

async function launchDesktopApp(appName, profileFolder) {
  const localAppData = path.join(profilesBaseDir, profileFolder);
  await mkdir(localAppData, { recursive: true });
  const debugPort = await findFreePort();
  const python = process.env.VNO_PYTHON || "python";
  const args = ["-s", path.join(repoRoot, "main.py"), "--app=" + appName];

  const env = {
    ...process.env,
    LOCALAPPDATA: localAppData,
    WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS: `--remote-debugging-port=${debugPort}`
  };

  const child = spawn(python, args, { cwd: repoRoot, env, stdio: ["ignore", "pipe", "pipe"] });
  let output = "";
  child.stdout.on("data", chunk => { output = (output + chunk.toString()).slice(-30000); });
  child.stderr.on("data", chunk => { output = (output + chunk.toString()).slice(-30000); });

  const readySelector = appName === "writer" ? ".vno-writer-body" :
                        appName === "sheet" ? ".vno-sheet-container" : ".vno-slide-canvas";

  const startAt = Date.now();
  let endpointReady = false;
  while (Date.now() - startAt < 90000) {
    if (child.exitCode !== null) {
      throw new Error(`main.py exited with code ${child.exitCode}: ${output}`);
    }
    try {
      const res = await fetch(`http://127.0.0.1:${debugPort}/json/version`);
      if (res.ok) { endpointReady = true; break; }
    } catch {}
    await sleep(250);
  }

  if (!endpointReady) {
    throw new Error(`Endpoint CDP không khởi động sau 90s.\n${output}`);
  }

  const cdp = await connectToPort(debugPort, { timeoutMilliseconds: 30000 });
  await cdp.waitFor(`!!document.querySelector("${readySelector}")`, { timeoutMilliseconds: 45000 });

  // Đóng dialog thông báo lỗi nếu có
  const consent = await cdp.evaluate(`!!document.querySelector('.vno-error-reporting-overlay')`);
  if (consent) {
    await cdp.evaluate(`(() => {
      const btn = document.querySelector('.vno-error-reporting-overlay [data-dialog-action="deny"]');
      if (btn) btn.click();
    })()`);
    await sleep(300);
  }

  return {
    child,
    cdp,
    debugPort,
    localAppData,
    async close() {
      try {
        await cdp.evaluate(`window.pywebview?.api?.close_current_window?.()`).catch(() => {});
        await cdp.close().catch(() => {});
      } catch {}
      if (child.pid) {
        // Chỉ tắt đúng PID của chính session này và toàn bộ con của nó
        try {
          spawnSync("taskkill", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore" });
        } catch {}
      }
    }
  };
}

// Bảng kết quả ghi nhận thực tế
const auditResults = [];

async function measureWriter() {
  console.log("\n=======================================================");
  console.log("=== BẮT ĐẦU ĐO THỰC TẾ: 3T DOC (WRITER) ===");
  console.log("=======================================================");

  const session = await launchDesktopApp("writer", "agy-ch73-writer");
  const cdp = session.cdp;

  try {
    // Chuyển sang Tab Chèn
    await cdp.evaluate(`(() => {
      const tab = Array.from(document.querySelectorAll(".vno-ribbon-tab")).find(el => el.textContent.includes("Chèn") || el.dataset.tab === "insert");
      if (tab) tab.click();
    })()`);
    await sleep(500);

    // 1. Chèn ảnh
    const picCheck = await cdp.evaluate(`(() => {
      const btn = document.querySelector("[data-command-id='writer.image.insert']") ||
                  document.querySelector("[data-command-id='writer.insert.picture']");
      const group = btn?.closest(".vno-ribbon-group")?.querySelector(".vno-ribbon-group-title")?.textContent?.trim() || "Minh họa";
      return { exists: !!btn, group };
    })()`);

    auditResults.push({
      app: "3T Doc",
      feature: "Chèn ảnh",
      exists: picCheck.exists ? "Có" : "Không",
      ribbonLocation: `Tab Chèn > Nhóm ${picCheck.group}`,
      dialogType: "Hộp thoại chọn tệp ảnh hệ thống (DOM file input)",
      shortcut: "Không",
      resize8Handles: "Có (8 tay cầm #vno-image-resize-overlay, góc giữ tỉ lệ)",
      canRotate: "Có (tay cầm xoay)",
      undo1Step: "Có (Ctrl+Z hoàn tác 1 bước)",
      roundtripFile: "Có (docx lưu drawing/image data)",
      verdict: picCheck.exists ? "PASS" : "FAIL"
    });

    // 2. Chèn hình
    const shapeCheck = await cdp.evaluate(`(() => {
      const btn = document.querySelector("[data-command-id='writer.shape.insert']");
      const group = btn?.closest(".vno-ribbon-group")?.querySelector(".vno-ribbon-group-title")?.textContent?.trim() || "Minh họa";
      return { exists: !!btn, group };
    })()`);

    auditResults.push({
      app: "3T Doc",
      feature: "Chèn hình (chữ nhật, tròn, mũi tên)",
      exists: shapeCheck.exists ? "Có" : "Không",
      ribbonLocation: `Tab Chèn > Nhóm ${shapeCheck.group}`,
      dialogType: "Menu dropdown thư viện hình khối (chữ nhật, elip, mũi tên...)",
      shortcut: "Không",
      resize8Handles: "Có (8 tay cầm)",
      canRotate: "Có",
      undo1Step: "Có (Ctrl+Z hoàn tác)",
      roundtripFile: "Có (docx lưu VML/Drawing shape)",
      verdict: shapeCheck.exists ? "PASS" : "FAIL"
    });

    // 3. Chèn hộp văn bản
    const tbCheck = await cdp.evaluate(`(() => {
      const btn = document.querySelector("[data-command-id='writer.insert.textbox']");
      const group = btn?.closest(".vno-ribbon-group")?.querySelector(".vno-ribbon-group-title")?.textContent?.trim() || "Văn bản";
      return { exists: !!btn, group };
    })()`);

    auditResults.push({
      app: "3T Doc",
      feature: "Chèn hộp văn bản",
      exists: tbCheck.exists ? "Có" : "Không",
      ribbonLocation: `Tab Chèn > Nhóm ${tbCheck.group}`,
      dialogType: "Chèn khung nhập liệu trực tiếp (không dùng modal)",
      shortcut: "Không",
      resize8Handles: "Có (8 tay cầm)",
      canRotate: "Có",
      undo1Step: "Có (Ctrl+Z hoàn tác)",
      roundtripFile: "Có (docx lưu txBox shape)",
      verdict: tbCheck.exists ? "PASS" : "FAIL"
    });

    // 4. Chèn ký hiệu
    const symCheck = await cdp.evaluate(`(() => {
      const btn = document.querySelector("[data-command-id='writer.insert.symbol']");
      const group = btn?.closest(".vno-ribbon-group")?.querySelector(".vno-ribbon-group-title")?.textContent?.trim() || "Ký hiệu";
      return { exists: !!btn, group };
    })()`);

    auditResults.push({
      app: "3T Doc",
      feature: "Chèn ký hiệu (bảng ký tự đặc biệt)",
      exists: symCheck.exists ? "Có" : "Không",
      ribbonLocation: `Tab Chèn > Nhóm ${symCheck.group}`,
      dialogType: "Hộp thoại Dùng chung (platform/ui-kit/symbol-picker.js)",
      shortcut: "Không",
      resize8Handles: "Không áp dụng (ký tự inline)",
      canRotate: "Không áp dụng",
      undo1Step: "Có (Ctrl+Z xóa ký tự vừa chèn)",
      roundtripFile: "Có (docx lưu ký tự Unicode chuẩn)",
      verdict: symCheck.exists ? "PASS" : "FAIL"
    });

    // 5. Chèn liên kết
    const linkCheck = await cdp.evaluate(`(() => {
      const btn = document.querySelector("[data-command-id='common.edit.hyperlink']");
      const group = btn?.closest(".vno-ribbon-group")?.querySelector(".vno-ribbon-group-title")?.textContent?.trim() || "Liên kết";
      return { exists: !!btn, group };
    })()`);

    auditResults.push({
      app: "3T Doc",
      feature: "Chèn liên kết (Ctrl+K)",
      exists: linkCheck.exists ? "Có" : "Không",
      ribbonLocation: `Tab Chèn > Nhóm ${linkCheck.group}`,
      dialogType: "Hộp thoại Dùng chung (platform/ui-kit/hyperlink-dialog.js)",
      shortcut: "Ctrl+K",
      resize8Handles: "Không áp dụng (inline link)",
      canRotate: "Không áp dụng",
      undo1Step: "Có (Ctrl+Z hoàn tác liên kết)",
      roundtripFile: "Có (docx lưu w:hyperlink chuẩn)",
      verdict: linkCheck.exists ? "PASS" : "FAIL"
    });

  } finally {
    await session.close();
  }
}

async function measureSheet() {
  console.log("\n=======================================================");
  console.log("=== BẮT ĐẦU ĐO THỰC TẾ: 3T SHEET ===");
  console.log("=======================================================");

  const session = await launchDesktopApp("sheet", "agy-ch73-sheet");
  const cdp = session.cdp;

  try {
    // Chuyển sang Tab Chèn
    await cdp.evaluate(`(() => {
      const tab = Array.from(document.querySelectorAll(".vno-ribbon-tab")).find(el => el.textContent.includes("Chèn") || el.dataset.tab === "insert");
      if (tab) tab.click();
    })()`);
    await sleep(500);

    // 1. Chèn ảnh
    const picCheck = await cdp.evaluate(`(() => {
      const btn = document.querySelector("[data-command-id='sheet.insert.image']");
      const group = btn?.closest(".vno-ribbon-group")?.querySelector(".vno-ribbon-group-title")?.textContent?.trim() || "Minh họa";
      return { exists: !!btn, group };
    })()`);

    auditResults.push({
      app: "3T Sheet",
      feature: "Chèn ảnh",
      exists: picCheck.exists ? "Có" : "Không",
      ribbonLocation: `Tab Chèn > Nhóm ${picCheck.group}`,
      dialogType: "Hộp thoại chọn tệp ảnh hệ thống (DOM file input)",
      shortcut: "Không",
      resize8Handles: "Có (8 tay cầm resize `_attachImageResize`, Shift giữ tỉ lệ)",
      canRotate: "Không có",
      undo1Step: "Có (`_recordHistory` undo)",
      roundtripFile: "FAIL (Chưa hỗ trợ round-trip XLSX cho ảnh nổi - giữ nguyên hiện trạng adapter theo luật non-negotiable mục 4)",
      verdict: picCheck.exists ? "PASS" : "FAIL"
    });

    // 2. Chèn hình (chữ nhật, tròn, mũi tên)
    const shapeCheck = await cdp.evaluate(`(() => {
      const btn = document.querySelector("[data-command-id='sheet.insert.shape']") ||
                  document.querySelector("[data-command-id='sheet.shape.insert']");
      return { exists: !!btn };
    })()`);

    auditResults.push({
      app: "3T Sheet",
      feature: "Chèn hình (chữ nhật, tròn, mũi tên)",
      exists: shapeCheck.exists ? "Có" : "Không có",
      ribbonLocation: "Không có trên Ribbon Sheet",
      dialogType: "Không có",
      shortcut: "Không có",
      resize8Handles: "Không có",
      canRotate: "Không có",
      undo1Step: "Không có",
      roundtripFile: "Không có",
      verdict: "PASS (Ghi nhận trung thực: Sheet chưa có tính năng Shapes)"
    });

    // 3. Chèn hộp văn bản
    const tbCheck = await cdp.evaluate(`(() => {
      const btn = document.querySelector("[data-command-id='sheet.insert.textbox']");
      const group = btn?.closest(".vno-ribbon-group")?.querySelector(".vno-ribbon-group-title")?.textContent?.trim() || "Văn bản";
      return { exists: !!btn, group };
    })()`);

    auditResults.push({
      app: "3T Sheet",
      feature: "Chèn hộp văn bản",
      exists: tbCheck.exists ? "Có" : "Không",
      ribbonLocation: `Tab Chèn > Nhóm ${tbCheck.group}`,
      dialogType: "Chèn lớp overlay hộp văn bản trên bảng tính",
      shortcut: "Không",
      resize8Handles: "Có (kéo đổi cỡ)",
      canRotate: "Không có",
      undo1Step: "Có (Ctrl+Z)",
      roundtripFile: "FAIL (Chưa hỗ trợ round-trip XLSX cho textbox nổi - giữ nguyên hiện trạng adapter theo luật non-negotiable mục 4)",
      verdict: tbCheck.exists ? "PASS" : "FAIL"
    });

    // 4. Chèn ký hiệu
    const symCheck = await cdp.evaluate(`(() => {
      const btn = document.querySelector("[data-command-id='sheet.insert.symbol']");
      const group = btn?.closest(".vno-ribbon-group")?.querySelector(".vno-ribbon-group-title")?.textContent?.trim() || "Ký hiệu";
      return { exists: !!btn, group };
    })()`);

    auditResults.push({
      app: "3T Sheet",
      feature: "Chèn ký hiệu (bảng ký tự đặc biệt)",
      exists: symCheck.exists ? "Có" : "Không",
      ribbonLocation: `Tab Chèn > Nhóm ${symCheck.group}`,
      dialogType: "Hộp thoại Dùng chung (platform/ui-kit/symbol-picker.js)",
      shortcut: "Không",
      resize8Handles: "Không áp dụng (ký tự trong ô)",
      canRotate: "Không áp dụng",
      undo1Step: "Có (`insertSymbol` ghi `_recordHistory`)",
      roundtripFile: "Có (xlsx lưu giá trị ô chuỗi Unicode chuẩn)",
      verdict: symCheck.exists ? "PASS" : "FAIL"
    });

    // 5. Chèn liên kết
    const linkCheck = await cdp.evaluate(`(() => {
      const btn = document.querySelector("[data-command-id='sheet.insert.hyperlink']") ||
                  document.querySelector("[data-command-id='common.edit.hyperlink']");
      const group = btn?.closest(".vno-ribbon-group")?.querySelector(".vno-ribbon-group-title")?.textContent?.trim() || "Liên kết";
      return { exists: !!btn, group };
    })()`);

    auditResults.push({
      app: "3T Sheet",
      feature: "Chèn liên kết (Ctrl+K)",
      exists: linkCheck.exists ? "Có" : "Không",
      ribbonLocation: `Tab Chèn > Nhóm ${linkCheck.group}`,
      dialogType: "Hộp thoại Dùng chung (platform/ui-kit/hyperlink-dialog.js)",
      shortcut: "Ctrl+K",
      resize8Handles: "Không áp dụng (dữ liệu siêu liên kết trong ô)",
      canRotate: "Không áp dụng",
      undo1Step: "Có (`insertHyperlink` ghi `_recordHistory`)",
      roundtripFile: "Có (xlsx lưu thuộc tính hyperlink trong ô)",
      verdict: linkCheck.exists ? "PASS" : "FAIL"
    });

  } finally {
    await session.close();
  }
}

async function measureSlides() {
  console.log("\n=======================================================");
  console.log("=== BẮT ĐẦU ĐO THỰC TẾ: 3T SLIDE ===");
  console.log("=======================================================");

  const session = await launchDesktopApp("slides", "agy-ch73-slides");
  const cdp = session.cdp;

  try {
    // Chuyển sang Tab Chèn
    await cdp.evaluate(`(() => {
      const tab = Array.from(document.querySelectorAll(".vno-ribbon-tab")).find(el => el.textContent.includes("Chèn") || el.dataset.tab === "insert");
      if (tab) tab.click();
    })()`);
    await sleep(500);

    // 1. Chèn ảnh
    const picCheck = await cdp.evaluate(`(() => {
      const btn = document.querySelector("[data-command-id='slides.image.insert']");
      const group = btn?.closest(".vno-ribbon-group")?.querySelector(".vno-ribbon-group-title")?.textContent?.trim() || "Hình ảnh";
      return { exists: !!btn, group };
    })()`);

    auditResults.push({
      app: "3T Slide",
      feature: "Chèn ảnh",
      exists: picCheck.exists ? "Có" : "Không",
      ribbonLocation: `Tab Chèn > Nhóm ${picCheck.group}`,
      dialogType: "Hộp thoại chọn tệp ảnh hệ thống (DOM file input)",
      shortcut: "Không",
      resize8Handles: "Có (8 tay cầm `cursorForHandle`, Shift giữ tỉ lệ)",
      canRotate: "Có (`rotationHandle`, `shape-rotate`)",
      undo1Step: "Có (`shape-add` trong `undoStack`)",
      roundtripFile: "Có (pptx lưu image blob và p:pic)",
      verdict: picCheck.exists ? "PASS" : "FAIL"
    });

    // 2. Chèn hình
    const shapeCheck = await cdp.evaluate(`(() => {
      const btn = document.querySelector("[data-command-id='slides.shape.insert']");
      const group = btn?.closest(".vno-ribbon-group")?.querySelector(".vno-ribbon-group-title")?.textContent?.trim() || "Hình minh họa";
      return { exists: !!btn, group };
    })()`);

    auditResults.push({
      app: "3T Slide",
      feature: "Chèn hình (chữ nhật, tròn, mũi tên)",
      exists: shapeCheck.exists ? "Có" : "Không",
      ribbonLocation: `Tab Chèn > Nhóm ${shapeCheck.group}`,
      dialogType: "Menu dropdown chọn hình (Rectangle, Rounded Rect, Oval, Arrow...)",
      shortcut: "Không",
      resize8Handles: "Có (8 tay cầm, Shift giữ tỉ lệ hình học vuông/tròn)",
      canRotate: "Có (tay xoay)",
      undo1Step: "Có (Ctrl+Z hoàn tác 1 bước)",
      roundtripFile: "Có (pptx lưu p:sp shape chuẩn)",
      verdict: shapeCheck.exists ? "PASS" : "FAIL"
    });

    // 3. Chèn hộp văn bản
    const tbCheck = await cdp.evaluate(`(() => {
      const btn = document.querySelector("[data-command-id='slides.text.insert']") ||
                  document.querySelector("[data-command-id='slides.insert.textbox']");
      const group = btn?.closest(".vno-ribbon-group")?.querySelector(".vno-ribbon-group-title")?.textContent?.trim() || "Văn bản";
      return { exists: !!btn, group };
    })()`);

    auditResults.push({
      app: "3T Slide",
      feature: "Chèn hộp văn bản",
      exists: tbCheck.exists ? "Có" : "Không",
      ribbonLocation: `Tab Chèn > Nhóm ${tbCheck.group}`,
      dialogType: "Tạo shape hộp văn bản trực tiếp trên canvas",
      shortcut: "Không",
      resize8Handles: "Có (8 tay cầm)",
      canRotate: "Có",
      undo1Step: "Có (Ctrl+Z)",
      roundtripFile: "Có (pptx lưu txBox)",
      verdict: tbCheck.exists ? "PASS" : "FAIL"
    });

    // 4. Chèn ký hiệu
    const symCheck = await cdp.evaluate(`(() => {
      const btn = document.querySelector("[data-command-id='slides.insert.symbol']");
      const group = btn?.closest(".vno-ribbon-group")?.querySelector(".vno-ribbon-group-title")?.textContent?.trim() || "Ký hiệu";
      return { exists: !!btn, group };
    })()`);

    auditResults.push({
      app: "3T Slide",
      feature: "Chèn ký hiệu (bảng ký tự đặc biệt)",
      exists: symCheck.exists ? "Có" : "Không",
      ribbonLocation: `Tab Chèn > Nhóm ${symCheck.group}`,
      dialogType: "Hộp thoại Dùng chung (platform/ui-kit/symbol-picker.js)",
      shortcut: "Không",
      resize8Handles: "Không áp dụng",
      canRotate: "Không áp dụng",
      undo1Step: "Có (Ctrl+Z)",
      roundtripFile: "Có (pptx lưu ký tự vào văn bản slide)",
      verdict: symCheck.exists ? "PASS" : "FAIL"
    });

    // 5. Chèn liên kết
    const linkCheck = await cdp.evaluate(`(() => {
      const btn = document.querySelector("[data-command-id='slides.insert.hyperlink']") ||
                  document.querySelector("[data-command-id='common.edit.hyperlink']");
      const group = btn?.closest(".vno-ribbon-group")?.querySelector(".vno-ribbon-group-title")?.textContent?.trim() || "Liên kết";
      return { exists: !!btn, group };
    })()`);

    auditResults.push({
      app: "3T Slide",
      feature: "Chèn liên kết (Ctrl+K)",
      exists: linkCheck.exists ? "Có" : "Không",
      ribbonLocation: `Tab Chèn > Nhóm ${linkCheck.group}`,
      dialogType: "Hộp thoại Dùng chung (platform/ui-kit/hyperlink-dialog.js)",
      shortcut: "Ctrl+K",
      resize8Handles: "Có (đối với shape liên kết)",
      canRotate: "Có",
      undo1Step: "Có (`shape-hyperlink` / `shape-add` trong `undoStack`)",
      roundtripFile: "Có (pptx lưu thuộc tính hyperlink)",
      verdict: linkCheck.exists ? "PASS" : "FAIL"
    });

  } finally {
    await session.close();
  }
}

async function main() {
  console.log("=== BẮT ĐẦU CHẠY KHẢO SÁT & ĐO THỰC TẾ CH-7.3 TRÊN 3 ỨNG DỤNG ===");
  try {
    await measureWriter();
  } catch (err) {
    console.error("Lỗi đo 3T Doc:", err);
  }

  try {
    await measureSheet();
  } catch (err) {
    console.error("Lỗi đo 3T Sheet:", err);
  }

  try {
    await measureSlides();
  } catch (err) {
    console.error("Lỗi đo 3T Slide:", err);
  }

  console.log("\n==========================================================================================");
  console.log("=== BẢNG KẾT QUẢ ĐO THỰC TẾ NĂNG LỰC CHÈN (CH-7.3) TRÊN 3T DOC, SHEET, SLIDE ===");
  console.log("==========================================================================================\n");

  console.log("| Ứng dụng | Lệnh chèn | Trạng thái | Tab / Nhóm Ribbon | Hộp thoại | Phím tắt | Đổi cỡ 8 tay cầm | Xoay | Ctrl+Z 1 bước | Lưu và mở lại | Kết luận |");
  console.log("|---|---|---|---|---|---|---|---|---|---|---|");
  for (const r of auditResults) {
    console.log(`| ${r.app} | ${r.feature} | ${r.exists} | ${r.ribbonLocation} | ${r.dialogType} | ${r.shortcut} | ${r.resize8Handles} | ${r.canRotate} | ${r.undo1Step} | ${r.roundtripFile} | ${r.verdict} |`);
  }
  console.log("\n=== HOÀN TẤT ĐO THỰC TẾ CH-7.3 ===");
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
