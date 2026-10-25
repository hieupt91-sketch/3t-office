/**
 * WORD-W7 Live Desktop CDP Test:
 * 1. Lưu thành (Save As) 7 định dạng (DOCX, DOC, ODT, RTF, PDF, TXT, HTML) -> Đối chiếu Word 2016 COM thật.
 * 2. Bong bóng (Balloons) với 3 chế độ: revisions, inline, comments-only -> UI/DOM & sessionStorage.
 * 3. Menu Tệp -> Thông tin (Info) & Đánh dấu là cuối cùng (Mark as Final) -> Banner mềm, khóa sửa, DOCX d.Final === True trên Word COM.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { launchApp } from "./session.mjs";
import { platformOutputPath } from "./output-path.mjs";

const profile = process.env.VNO_CDP_LOCALAPPDATA || platformOutputPath("E:\\VNOffice-profiles\\W7-cdp", { directory: true });
const tempDir = platformOutputPath("E:\\VNOffice-temp\\w7-audit", { directory: true });
fs.mkdirSync(profile, { recursive: true });
fs.mkdirSync(tempDir, { recursive: true });

const results = [];
function check(id, pass, detail = "") {
  results.push({ id, pass: Boolean(pass), detail });
  console.log(`${pass ? "PASS" : "FAIL"} | ${id}${detail ? ` | ${detail}` : ""}`);
}

function verifyWithWordCom(filePath) {
  const target = path.resolve(filePath).replace(/'/g, "''");
  const psScript = `
    $ErrorActionPreference = 'Stop'
    try {
      $w = New-Object -ComObject Word.Application
      $w.Visible = $false
      $w.DisplayAlerts = 0
      $d = $w.Documents.Open('${target}', $false, $true)
      $paras = [int]$d.Paragraphs.Count
      $tables = [int]$d.Tables.Count
      $words = [int]$d.Words.Count
      $final = [bool]$d.Final
      $d.Close($false)
      $w.Quit()
      [PSCustomObject]@{ ok = $true; paras = $paras; tables = $tables; words = $words; final = $final } | ConvertTo-Json -Compress
    } catch {
      if ($w) { try { $w.Quit() } catch {} }
      [PSCustomObject]@{ ok = $false; error = $_.Exception.Message } | ConvertTo-Json -Compress
    }
  `;
  try {
    const raw = execFileSync("powershell", ["-NoProfile", "-Command", psScript], { encoding: "utf8", timeout: 45000 });
    return JSON.parse(raw.trim());
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

console.log(`Starting VN Writer desktop app with profile: ${profile}`);
const session = await launchApp("writer", {
  localAppData: profile,
  startTimeoutMilliseconds: 180000,
  readyTimeoutMilliseconds: 180000
});

try {
  const { cdp } = session;
  await cdp.waitFor("!!window.__vnoAppInstance?.adapter && !!document.querySelector('.vno-writer-body')", {
    timeoutMilliseconds: 120000
  });

  const run = async (script) => {
    const expr = `(async () => {
      const adapter = window.__vnoAppInstance.adapter;
      const shell = window.__vnoAppInstance.shell;
      const body = document.querySelector('.vno-writer-body');
      ${script}
    })()`;
    const res = await cdp.evaluate(expr, { awaitPromise: true, timeoutMilliseconds: 60000 });
    return typeof res === "string" ? JSON.parse(res) : res;
  };

  // ==========================================
  // PHẦN 1: NẠP VĂN BẢN MẪU ĐẦY ĐỦ TIẾNG VIỆT
  // ==========================================
  console.log("\n--- PHẦN 1: Chuẩn bị nội dung văn bản mẫu ---");
  await run(`
    body.innerHTML = '<h1>BÁO CÁO TỔNG KẾT DỰ ÁN 2026</h1>' +
      '<p>Đây là tài liệu nghiệm thu kỹ thuật của bộ ứng dụng văn phòng tiếng Việt VN Office.</p>' +
      '<table style="width:100%;border-collapse:collapse;margin:12px 0;">' +
      '  <tr><th style="border:1px solid #94a3b8;padding:6px;">Hạng mục</th><th style="border:1px solid #94a3b8;padding:6px;">Tiêu chuẩn</th><th style="border:1px solid #94a3b8;padding:6px;">Trạng thái</th></tr>' +
      '  <tr><td style="border:1px solid #94a3b8;padding:6px;">Lưu thành</td><td style="border:1px solid #94a3b8;padding:6px;">7 định dạng</td><td style="border:1px solid #94a3b8;padding:6px;">Đạt</td></tr>' +
      '  <tr><td style="border:1px solid #94a3b8;padding:6px;">Bong bóng</td><td style="border:1px solid #94a3b8;padding:6px;">3 chế độ</td><td style="border:1px solid #94a3b8;padding:6px;">Đạt</td></tr>' +
      '</table>' +
      '<p>Danh sách các tính năng đã kiểm định:</p>' +
      '<ul><li>Chế độ hiển thị bong bóng thay đổi</li><li>Đánh dấu là bản cuối cùng</li></ul>' +
      '<p>Đoạn có sửa đổi: <del data-vno-change="delete" data-vno-author="Nguyễn Văn An" data-vno-time="2026-10-14T08:00:00Z">nội dung cũ cần xóa</del> và <ins data-vno-change="insert" data-vno-author="Trần Thị Bình" data-vno-time="2026-10-14T08:05:00Z">nội dung mới được bổ sung</ins>.</p>';
    adapter.isDirty = true;
    adapter._renderCommentsPanel();
    return JSON.stringify({ ok: true, textLength: body.innerText.length });
  `);

  // ==========================================
  // PHẦN 2: BONG BÓNG (BALLOONS)
  // ==========================================
  console.log("\n--- PHẦN 2: Kiểm tra chức năng Bong bóng (Balloons) ---");

  // 2.1 Chuyển sang chế độ revisions
  const revRes = await run(`
    adapter.setTrackChangesBalloonsMode('revisions');
    const mode = adapter.getTrackChangesBalloonsMode();
    const domAttr = body.getAttribute('data-vno-balloons');
    const saved = sessionStorage.getItem('vno-writer-balloons-mode');
    const balloonCards = adapter.commentsPanel ? adapter.commentsPanel.querySelectorAll('.vno-revision-balloon').length : 0;
    return JSON.stringify({ mode, domAttr, saved, balloonCards });
  `);
  check("Bong bóng: Chuyển sang chế độ 'revisions' thành công", revRes.mode === "revisions" && revRes.domAttr === "revisions", JSON.stringify(revRes));
  check("Bong bóng: Lưu cấu hình vào sessionStorage", revRes.saved === "revisions");
  check("Bong bóng: Hiển thị thẻ bong bóng cho bản sửa đổi trong panel lề phải", revRes.balloonCards >= 2, `Cards: ${revRes.balloonCards}`);

  // 2.2 Chuyển sang chế độ inline
  const inlineRes = await run(`
    adapter.setTrackChangesBalloonsMode('inline');
    const mode = adapter.getTrackChangesBalloonsMode();
    const domAttr = body.getAttribute('data-vno-balloons');
    const balloonCards = adapter.commentsPanel ? adapter.commentsPanel.querySelectorAll('.vno-revision-balloon').length : 0;
    return JSON.stringify({ mode, domAttr, balloonCards });
  `);
  check("Bong bóng: Chuyển sang chế độ 'inline' thành công", inlineRes.mode === "inline" && inlineRes.domAttr === "inline", JSON.stringify(inlineRes));
  check("Bong bóng: Chế độ inline không hiển thị thẻ bong bóng bản sửa đổi trong panel", inlineRes.balloonCards === 0);

  // 2.3 Chuyển sang chế độ comments-only (mặc định)
  const commRes = await run(`
    adapter.setTrackChangesBalloonsMode('comments-only');
    const mode = adapter.getTrackChangesBalloonsMode();
    const domAttr = body.getAttribute('data-vno-balloons');
    return JSON.stringify({ mode, domAttr });
  `);
  check("Bong bóng: Chuyển sang chế độ 'comments-only' thành công", commRes.mode === "comments-only" && commRes.domAttr === "comments-only", JSON.stringify(commRes));

  // ==========================================
  // PHẦN 3: SAVE AS 7 ĐỊNH DẠNG & ĐỐI CHIẾU WORD COM
  // ==========================================
  console.log("\n--- PHẦN 3: Lưu thành (Save As) 7 định dạng & Word 2016 COM ---");

  const formats = [
    { ext: "docx", name: "audit.docx", wordCom: true },
    { ext: "doc",  name: "audit.doc",  wordCom: true },
    { ext: "odt",  name: "audit.odt",  wordCom: true },
    { ext: "rtf",  name: "audit.rtf",  wordCom: true },
    { ext: "pdf",  name: "audit.pdf",  wordCom: false },
    { ext: "txt",  name: "audit.txt",  wordCom: true },
    { ext: "html", name: "audit.html", wordCom: true }
  ];

  const auditStats = [];

  for (const fmt of formats) {
    const targetPath = path.join(tempDir, fmt.name);
    try { if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath); } catch {}

    const tStart = Date.now();
    const saveRes = await run(`
      const target = ${JSON.stringify(targetPath)};
      const res = await (window.globalUnoBridge || window.__vnoAppInstance.adapter.unoBridge).saveRealFileInPlace(
        'writer',
        adapter._contentForExport(),
        target,
        adapter._sourcePath || null
      );
      return JSON.stringify(res);
    `);
    const elapsedMs = Date.now() - tStart;

    const fileExists = fs.existsSync(targetPath);
    const fileSize = fileExists ? fs.statSync(targetPath).size : 0;
    check(`Save As .${fmt.ext} thành công (${elapsedMs}ms, ${fileSize} bytes)`, fileExists && fileSize > 0, JSON.stringify(saveRes));

    if (fmt.wordCom && fileExists) {
      const wordRes = verifyWithWordCom(targetPath);
      check(`Word 2016 COM mở lại tệp .${fmt.ext} nguyên vẹn`, wordRes.ok, JSON.stringify(wordRes));
      auditStats.push({ format: fmt.ext, size: fileSize, timeMs: elapsedMs, wordOk: wordRes.ok, detail: wordRes });
    } else if (fmt.ext === "pdf" && fileExists) {
      const buf = Buffer.alloc(10);
      const fd = fs.openSync(targetPath, "r");
      fs.readSync(fd, buf, 0, 10, 0);
      fs.closeSync(fd);
      const isPdfMagic = buf.toString("utf8").startsWith("%PDF-");
      check("Tệp PDF có magic bytes chuẩn %PDF-", isPdfMagic, buf.toString("utf8").slice(0, 8));
      auditStats.push({ format: "pdf", size: fileSize, timeMs: elapsedMs, wordOk: isPdfMagic, detail: "PDF 1.7 magic verified" });
    }
  }

  // ==========================================
  // PHẦN 4: THÔNG TIN TỆP & ĐÁNH DẤU LÀ CUỐI CÙNG (MARK AS FINAL)
  // ==========================================
  console.log("\n--- PHẦN 4: Thông tin tệp & Đánh dấu là cuối cùng (Mark as Final) ---");

  // 4.1 Bật Đánh dấu là cuối cùng
  const markRes = await run(`
    adapter.markAsFinal(true);
    const isFinal = adapter.isFinal;
    const contentEditable = body.getAttribute('contenteditable');
    const contentStatus = adapter.documentProperties?.contentStatus;
    const banner = document.querySelector('.vno-notification-bar');
    const bannerText = banner ? banner.textContent : '';
    const hasActionBtn = banner ? !!banner.querySelector('.vno-notification-bar-action-btn') : false;
    return JSON.stringify({ isFinal, contentEditable, contentStatus, hasBanner: !!banner, bannerText, hasActionBtn });
  `);
  check("Đánh dấu là cuối cùng: Trạng thái isFinal = true", markRes.isFinal === true);
  check("Đánh dấu là cuối cùng: Chế độ chỉ đọc mềm (contenteditable = 'false')", markRes.contentEditable === "false");
  check("Đánh dấu là cuối cùng: Ghi contentStatus = 'Final' vào thuộc tính", markRes.contentStatus === "Final");
  check("Đánh dấu là cuối cùng: Xuất hiện thanh thông báo cảnh báo và nút 'Vẫn chỉnh sửa'", markRes.hasBanner && markRes.hasActionBtn, markRes.bannerText.slice(0, 80));

  // 4.2 Lưu sang DOCX khi đang là Final và kiểm tra Word 2016 COM d.Final === True
  const finalDocxPath = path.join(tempDir, "w7-final-test.docx");
  try { if (fs.existsSync(finalDocxPath)) fs.unlinkSync(finalDocxPath); } catch {}
  await run(`
    const target = ${JSON.stringify(finalDocxPath)};
    await window.globalUnoBridge.saveRealFileInPlace('writer', adapter._contentForExport(), target);
    return JSON.stringify({ saved: true });
  `);

  const wordFinalCheck = verifyWithWordCom(finalDocxPath);
  check("Word 2016 COM nhận diện tài liệu Final (d.Final === True)", wordFinalCheck.ok && wordFinalCheck.final === true, JSON.stringify(wordFinalCheck));

  // 4.3 Nhấp 'Vẫn chỉnh sửa' (unmarkFinal)
  const unmarkRes = await run(`
    adapter.unmarkFinal();
    const isFinal = adapter.isFinal;
    const contentEditable = body.getAttribute('contenteditable');
    const contentStatus = adapter.documentProperties?.contentStatus;
    const banner = document.querySelector('.vno-notification-bar');
    return JSON.stringify({ isFinal, contentEditable, contentStatus, hasBanner: !!banner });
  `);
  check("Vẫn chỉnh sửa: Bỏ trạng thái isFinal = false", unmarkRes.isFinal === false);
  check("Vẫn chỉnh sửa: Khôi phục quyền soạn thảo (contenteditable = 'true')", unmarkRes.contentEditable === "true");
  check("Vẫn chỉnh sửa: Xóa contentStatus rỗng", !unmarkRes.contentStatus);
  check("Vẫn chỉnh sửa: Gỡ bỏ thanh thông báo chỉ đọc", unmarkRes.hasBanner === false);

  // 4.4 Lưu lại khi đã gỡ Final và kiểm tra Word COM d.Final === False
  const unfinalDocxPath = path.join(tempDir, "w7-unfinal-test.docx");
  try { if (fs.existsSync(unfinalDocxPath)) fs.unlinkSync(unfinalDocxPath); } catch {}
  await run(`
    const target = ${JSON.stringify(unfinalDocxPath)};
    await window.globalUnoBridge.saveRealFileInPlace('writer', adapter._contentForExport(), target);
    return JSON.stringify({ saved: true });
  `);

  const wordUnfinalCheck = verifyWithWordCom(unfinalDocxPath);
  check("Word 2016 COM nhận diện tài liệu đã gỡ Final (d.Final === False)", wordUnfinalCheck.ok && wordUnfinalCheck.final === false, JSON.stringify(wordUnfinalCheck));

} finally {
  console.log("\nClosing desktop app session...");
  await session.close();
}

console.log("\n==========================================");
const passedCount = results.filter(r => r.pass).length;
console.log(`KẾT QUẢ AUDIT W7: ${passedCount}/${results.length} PASS`);
console.log("==========================================");

if (passedCount < results.length) {
  process.exit(1);
} else {
  process.exit(0);
}
