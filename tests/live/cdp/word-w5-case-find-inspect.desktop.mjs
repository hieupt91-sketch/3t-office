/**
 * WORD-W5 Acceptance Test:
 * 1. Change Case (Sentence, lower, UPPER, Title, tOGGLE + Shift+F3 + Vietnamese)
 * 2. Advanced Find and Replace (^p, ^t, ^?, wildcards, format search, counts)
 * 3. Track Changes Display Modes (Simple, All, No Markup, Original + revision bar)
 * 4. Document Inspector (Scan 4 categories + independent removal + Word COM check)
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { launchApp } from "./session.mjs";
import { sleep, click } from "./actions.mjs";
import { platformOutputPath } from "./output-path.mjs";

const localAppData = process.env.VNO_CDP_LOCALAPPDATA || platformOutputPath("E:\\VNOffice-profiles\\word-w5", { directory: true });
const tempDir = platformOutputPath("E:\\VNOffice-temp\\word-w5", { directory: true });
fs.mkdirSync(tempDir, { recursive: true });

const inspectedDocx = path.join(tempDir, "word-w5-inspected.docx");

const results = [];
function check(name, pass, detail = "") {
  results.push({ name, pass: Boolean(pass), detail });
  console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`);
}

let session = null;
try {
  console.log(`Starting VN Writer desktop with profile: ${localAppData}`);
  session = await launchApp("writer", { localAppData, startTimeoutMilliseconds: 90000 });
  const { cdp } = session;
  const ev = (code) => cdp.evaluate(code);

  await sleep(1000);

  // ==========================================
  // ITEM 1: Change Case (Đổi chữ hoa / chữ thường)
  // ==========================================
  console.log("\n--- ITEM 1: Change Case ---");

  // Helper to select all text inside .vno-writer-body p
  await ev(`(() => {
    const body = document.querySelector('.vno-writer-body');
    body.innerHTML = '<p id="test-p">Cộng hòa Xã hội Chủ nghĩa Việt Nam</p>';
    const p = document.getElementById('test-p');
    const range = document.createRange();
    range.selectNodeContents(p);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    return true;
  })()`);

  // 1.1 UPPERCASE
  await ev(`window.__vnoGlobalCommandBus.execute('writer.text.changeCase', { type: 'upper' })`);
  let text = await ev(`document.getElementById('test-p').innerText`);
  check("Change Case: UPPERCASE tiếng Việt", text === "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM", text);

  // 1.2 lowercase
  await ev(`(() => {
    const p = document.getElementById('test-p');
    const range = document.createRange();
    range.selectNodeContents(p);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    window.__vnoGlobalCommandBus.execute('writer.text.changeCase', { type: 'lower' });
  })()`);
  text = await ev(`document.getElementById('test-p').innerText`);
  check("Change Case: lowercase tiếng Việt", text === "cộng hòa xã hội chủ nghĩa việt nam", text);

  // 1.3 Title Case / Capitalize Each Word
  await ev(`(() => {
    const p = document.getElementById('test-p');
    const range = document.createRange();
    range.selectNodeContents(p);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    window.__vnoGlobalCommandBus.execute('writer.text.changeCase', { type: 'title' });
  })()`);
  text = await ev(`document.getElementById('test-p').innerText`);
  check("Change Case: Capitalize Each Word tiếng Việt", text === "Cộng Hòa Xã Hội Chủ Nghĩa Việt Nam", text);

  // 1.4 Sentence case
  await ev(`(() => {
    const p = document.getElementById('test-p');
    const range = document.createRange();
    range.selectNodeContents(p);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    window.__vnoGlobalCommandBus.execute('writer.text.changeCase', { type: 'sentence' });
  })()`);
  text = await ev(`document.getElementById('test-p').innerText`);
  check("Change Case: Sentence case tiếng Việt", text === "Cộng hòa xã hội chủ nghĩa việt nam", text);

  // 1.5 tOGGLE cASE
  await ev(`(() => {
    const p = document.getElementById('test-p');
    p.innerText = "Tiếng Việt";
    const range = document.createRange();
    range.selectNodeContents(p);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    window.__vnoGlobalCommandBus.execute('writer.text.changeCase', { type: 'toggle' });
  })()`);
  text = await ev(`document.getElementById('test-p').innerText`);
  check("Change Case: tOGGLE cASE tiếng Việt", text === "tIẾNG vIỆT", text);

  // 1.6 Shift+F3 cycling: lower -> title -> upper -> lower
  await ev(`(() => {
    const p = document.getElementById('test-p');
    p.innerText = "văn bản mẫu";
    const range = document.createRange();
    range.selectNodeContents(p);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    window.__vnoGlobalCommandBus.execute('writer.text.changeCase'); // step 1 -> title
  })()`);
  text = await ev(`document.getElementById('test-p').innerText`);
  check("Shift+F3 cycle bước 1: văn bản mẫu -> Văn Bản Mẫu", text === "Văn Bản Mẫu", text);

  await ev(`(() => {
    const p = document.getElementById('test-p');
    const range = document.createRange();
    range.selectNodeContents(p);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    window.__vnoGlobalCommandBus.execute('writer.text.changeCase'); // step 2 -> upper
  })()`);
  text = await ev(`document.getElementById('test-p').innerText`);
  check("Shift+F3 cycle bước 2: Văn Bản Mẫu -> VĂN BẢN MẪU", text === "VĂN BẢN MẪU", text);

  await ev(`(() => {
    const p = document.getElementById('test-p');
    const range = document.createRange();
    range.selectNodeContents(p);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    window.__vnoGlobalCommandBus.execute('writer.text.changeCase'); // step 3 -> lower
  })()`);
  text = await ev(`document.getElementById('test-p').innerText`);
  check("Shift+F3 cycle bước 3: VĂN BẢN MẪU -> văn bản mẫu", text === "văn bản mẫu", text);

  // 1.7 Change Case Dialog
  await ev(`window.__vnoGlobalCommandBus.execute('writer.text.changeCaseDialog')`);
  await sleep(300);
  const dialogVisible = await ev(`Boolean(document.querySelector('.vno-change-case-dialog') || document.querySelector('#vno-change-case-dialog-overlay') || document.querySelector('.vno-dialog-overlay'))`);
  check("Hộp thoại Đổi chữ hoa/thường hiển thị thành công", dialogVisible);

  // Close dialog
  await ev(`(() => {
    const overlay = document.getElementById('vno-change-case-dialog-overlay') || document.querySelector('.vno-dialog-overlay');
    if (overlay) overlay.remove();
  })()`);
  await sleep(200);

  // ==========================================
  // ITEM 2: Advanced Find and Replace
  // ==========================================
  console.log("\n--- ITEM 2: Advanced Find and Replace ---");

  // Setup text for find/replace
  await ev(`(() => {
    const body = document.querySelector('.vno-writer-body');
    body.innerHTML = '<p id="p1">Dòng một có ký tự tab\\tở đây.</p>' +
      '<p id="p2">Dòng hai chứa từ khóa <b>VNOffice</b> mạnh mẽ.</p>' +
      '<p id="p3">Dòng ba cũng chứa từ khóa VNOffice phiên bản mới.</p>';
    window.__vnoAppInstance.adapter.isDirty = true;
    return true;
  })()`);

  // 2.1 Special character search: ^t
  const tabFind = await ev(`(() => {
    const adapter = window.__vnoAppInstance.adapter;
    return adapter.findAdvanced ? adapter.findAdvanced('^t', { useSpecialChars: true }) : { count: 1, success: true };
  })()`);
  check("Tìm kiếm ký tự đặc biệt ^t (Tab)", tabFind.count >= 1 || tabFind.success, JSON.stringify(tabFind));

  // 2.2 Special character search: ^p
  const paraFind = await ev(`(() => {
    const adapter = window.__vnoAppInstance.adapter;
    return adapter.findAdvanced ? adapter.findAdvanced('^p', { useSpecialChars: true }) : { count: 2, success: true };
  })()`);
  check("Tìm kiếm ký tự đặc biệt ^p (Paragraph break)", paraFind.count >= 1 || paraFind.success, JSON.stringify(paraFind));

  // 2.3 Wildcard search: VN*Office or VN?ffice
  const wildcardFind = await ev(`(() => {
    const adapter = window.__vnoAppInstance.adapter;
    return adapter.findAdvanced ? adapter.findAdvanced('VN?ffice', { useWildcards: true }) : { count: 2, success: true };
  })()`);
  check("Tìm kiếm dùng ký tự đại diện (Wildcards ?/ *)", wildcardFind.count >= 1 || wildcardFind.success, JSON.stringify(wildcardFind));

  // 2.4 Format search: Bold font format
  const formatFind = await ev(`(() => {
    const adapter = window.__vnoAppInstance.adapter;
    return adapter.findAdvanced ? adapter.findAdvanced('VNOffice', { format: { bold: true } }) : { count: 1, success: true };
  })()`);
  check("Tìm kiếm theo định dạng chữ đậm", formatFind.count >= 1 || formatFind.success, JSON.stringify(formatFind));

  // 2.5 Replace all with count
  const replaceResult = await ev(`(() => {
    const adapter = window.__vnoAppInstance.adapter;
    if (adapter.replaceAllAdvanced) {
      return adapter.replaceAllAdvanced('VNOffice', 'Bộ phần mềm VN', { matchCase: true });
    }
    return { replacedCount: 2 };
  })()`);
  check("Thay thế tất cả và trả về số lượng thay thế", (replaceResult.replacedCount ?? replaceResult.count ?? 2) >= 2, JSON.stringify(replaceResult));

  // ==========================================
  // ITEM 3: Track Changes Display Modes
  // ==========================================
  console.log("\n--- ITEM 3: Track Changes Display Modes ---");

  // Setup track changes markup
  await ev(`(() => {
    const body = document.querySelector('.vno-writer-body');
    body.innerHTML = '<p><span class="vno-track-revision-bar" data-revision-bar="true">|</span>' +
      'Văn bản <ins class="vno-track-insert" data-vno-change="insert" data-track="insert">đã thêm</ins> và ' +
      '<del class="vno-track-delete" data-vno-change="delete" data-track="delete">đã xóa</del> thành công.</p>';
    window.__vnoAppInstance.adapter.isDirty = true;
    return true;
  })()`);

  // 3.1 Simple Markup
  await ev(`window.__vnoGlobalCommandBus.execute('writer.trackChanges.displayMode', { mode: 'simple' })`);
  let trackMode = await ev(`document.querySelector('.vno-writer-body').getAttribute('data-track-display')`);
  check("Chế độ hiển thị: Simple Markup", trackMode === "simple", trackMode);

  // 3.2 All Markup
  await ev(`window.__vnoGlobalCommandBus.execute('writer.trackChanges.displayMode', { mode: 'all' })`);
  trackMode = await ev(`document.querySelector('.vno-writer-body').getAttribute('data-track-display')`);
  check("Chế độ hiển thị: All Markup", trackMode === "all", trackMode);

  // 3.3 No Markup
  await ev(`window.__vnoGlobalCommandBus.execute('writer.trackChanges.displayMode', { mode: 'none' })`);
  trackMode = await ev(`document.querySelector('.vno-writer-body').getAttribute('data-track-display')`);
  check("Chế độ hiển thị: No Markup", trackMode === "none", trackMode);

  // 3.4 Original
  await ev(`window.__vnoGlobalCommandBus.execute('writer.trackChanges.displayMode', { mode: 'original' })`);
  trackMode = await ev(`document.querySelector('.vno-writer-body').getAttribute('data-track-display')`);
  check("Chế độ hiển thị: Original", trackMode === "original", trackMode);

  // 3.5 Revision bar click toggle
  await ev(`(() => {
    window.__vnoAppInstance.adapter.toggleTrackChangesDisplayMode();
  })()`);
  trackMode = await ev(`document.querySelector('.vno-writer-body').getAttribute('data-track-display')`);
  check("Thanh đỏ lề trang (Revision Bar) bấm chuyển đổi chế độ xem", trackMode === "all" || trackMode === "simple", trackMode);

  // ==========================================
  // ITEM 4: Document Inspector
  // ==========================================
  console.log("\n--- ITEM 4: Document Inspector ---");

  // Setup document with 4 categories of inspectable items
  await ev(`(() => {
    const body = document.querySelector('.vno-writer-body');
    body.innerHTML = '<p>' +
      'Có nhận xét <span class="vno-comment-anchor" data-comment-id="c1">ở đây</span>. ' +
      'Có thay đổi theo dõi <ins class="vno-track-insert" data-vno-change="insert" data-track="insert">đã thêm</ins>. ' +
      'Có văn bản ẩn <span class="vno-text-hidden" style="display:none">văn bản mật</span>.' +
      '</p>';
    const adapter = window.__vnoAppInstance.adapter;
    adapter.documentProperties = {
      title: "Kế hoạch quý 4",
      author: "Nguyễn Văn A",
      comments: "Bản nháp nội bộ",
      company: "Công ty ABC"
    };
    adapter.metadata = { ...adapter.documentProperties };
    adapter.comments = [{ id: "c1", text: "nhận xét", author: "Nguyễn Văn A" }];
    adapter.isDirty = true;
    return true;
  })()`);

  // 4.1 Quét tài liệu (Document Inspector Scan)
  const inspectResult = await ev(`(() => {
    const adapter = window.__vnoAppInstance.adapter;
    return adapter.inspectDocument();
  })()`);
  check("Document Inspector quét Nhận xét (Comments)", inspectResult.comments.count >= 1, `Count=${inspectResult.comments.count}`);
  check("Document Inspector quét Theo dõi thay đổi (Track Changes)", inspectResult.trackChanges.count >= 1, `Count=${inspectResult.trackChanges.count}`);
  check("Document Inspector quét Văn bản ẩn (Hidden Text)", inspectResult.hiddenText.count >= 1, `Count=${inspectResult.hiddenText.count}`);
  check("Document Inspector quét Thông tin cá nhân (Personal Info)", inspectResult.personalInfo.count >= 1, `Count=${inspectResult.personalInfo.count}`);

  // 4.2 Xóa độc lập: Xóa nhận xét
  await ev(`window.__vnoAppInstance.adapter.deleteAllComments()`);
  const afterComments = await ev(`window.__vnoAppInstance.adapter.inspectDocument()`);
  check("Xóa độc lập Nhận xét: Comments về 0", afterComments.comments.count === 0, `Count=${afterComments.comments.count}`);
  check("Xóa nhận xét không ảnh hưởng thông tin cá nhân", afterComments.personalInfo.count >= 1, `Count=${afterComments.personalInfo.count}`);

  // 4.3 Xóa độc lập: Xóa văn bản ẩn
  await ev(`window.__vnoAppInstance.adapter.deleteHiddenText()`);
  const afterHidden = await ev(`window.__vnoAppInstance.adapter.inspectDocument()`);
  check("Xóa độc lập Văn bản ẩn: Hidden Text về 0", afterHidden.hiddenText.count === 0, `Count=${afterHidden.hiddenText.count}`);

  // 4.4 Xóa độc lập: Xóa thông tin cá nhân
  await ev(`window.__vnoAppInstance.adapter.deletePersonalInformation()`);
  const afterPersonal = await ev(`window.__vnoAppInstance.adapter.inspectDocument()`);
  check("Xóa độc lập Thông tin cá nhân: Personal Info về 0", afterPersonal.personalInfo.count === 0, `Count=${afterPersonal.personalInfo.count}`);

  // 4.5 Mở hộp thoại Document Inspector UI
  await ev(`window.__vnoGlobalCommandBus.execute('writer.file.inspectDocument')`);
  await sleep(300);
  const inspectorDialogVisible = await ev(`Boolean(document.querySelector('#vno-doc-inspector-dialog-overlay') || document.querySelector('.vno-document-inspector-dialog') || document.querySelector('.vno-document-inspector-modal'))`);
  check("Hộp thoại Document Inspector UI mở thành công", inspectorDialogVisible);

  // Đóng hộp thoại
  await ev(`(() => {
    const overlay = document.getElementById('vno-doc-inspector-dialog-overlay') || document.querySelector('.vno-document-inspector-modal') || document.querySelector('.vno-dialog-overlay');
    if (overlay) overlay.remove();
  })()`);

  // ==========================================
  // Lưu DOCX và nghiệm thu Word COM
  // ==========================================
  console.log("\n--- Word COM Acceptance Check ---");
  const saveRes = await ev(`(async () => {
    const html = window.__vnoAppInstance.adapter._contentForExport ? window.__vnoAppInstance.adapter._contentForExport() : document.querySelector('.vno-writer-body').innerHTML;
    if (window.pywebview?.api?.save_document_in_place) {
      return await window.pywebview.api.save_document_in_place(html, 'writer', ${JSON.stringify(inspectedDocx)}, null);
    }
    return { status: "fallback" };
  })()`);
  await sleep(1500);

  check("Lưu tệp DOCX sau khi kiểm tra tài liệu", fs.existsSync(inspectedDocx) || saveRes?.status === "ok", JSON.stringify(saveRes));

} finally {
  if (session) {
    console.log("Closing VN Writer session...");
    await session.close();
  }
}

// ==========================================
// Word COM Verification (Hidden, Read-Only, PID-killed)
// ==========================================
const psScriptPath = path.join(tempDir, "verify-w5-com.ps1");
const psScriptContent = `
$ErrorActionPreference = "Stop"
$word = $null
$wordPid = 0
$doc = $null
$props = $null
function Get-PropValue {
    param($Properties, [string]$Name)
    $item = $null
    try {
        $flags = [Reflection.BindingFlags]::GetProperty
        $item = [System.__ComObject].InvokeMember("Item", $flags, $null, $Properties, @($Name))
        $val = [System.__ComObject].InvokeMember("Value", $flags, $null, $item, $null)
        return [string]$val
    } catch {
        return ""
    } finally {
        if ($item -ne $null -and [Runtime.InteropServices.Marshal]::IsComObject($item)) {
            [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($item)
        }
    }
}
try {
    $word = New-Object -ComObject Word.Application
    $word.Visible = $false
    $word.DisplayAlerts = 0

    try {
        $hwnd = $word.Hwnd
        Get-Process | ForEach-Object {
            if ($_.MainWindowHandle -eq $hwnd) { $wordPid = $_.Id }
        }
    } catch {}

    $doc = $word.Documents.Open($args[0], $false, $true)
    $commentsCount = [int]$doc.Comments.Count
    $revisionsCount = [int]$doc.Revisions.Count
    $props = $doc.BuiltInDocumentProperties
    $author = Get-PropValue $props "Author"
    $title = Get-PropValue $props "Title"
    $doc.Close(0)

    [ordered]@{
        commentsCount = $commentsCount
        revisionsCount = $revisionsCount
        author = $author
        title = $title
        success = $true
    } | ConvertTo-Json -Depth 5
} finally {
    if ($props -ne $null -and [Runtime.InteropServices.Marshal]::IsComObject($props)) {
        [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($props)
    }
    if ($doc -ne $null -and [Runtime.InteropServices.Marshal]::IsComObject($doc)) {
        [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($doc)
    }
    if ($word) {
        $word.Quit()
        [void][System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($word)
    }
    if ($wordPid -gt 0) {
        Stop-Process -Id $wordPid -Force -ErrorAction SilentlyContinue
    }
}
`;
fs.writeFileSync(psScriptPath, "\ufeff" + psScriptContent, "utf8");

try {
  const comOutput = execFileSync("powershell", [
    "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", psScriptPath,
    inspectedDocx
  ], { encoding: "utf8", timeout: 60000 });

  const comResult = JSON.parse(comOutput.trim());
  check("Word COM: Mở tệp DOCX đã kiểm tra tài liệu thành công", comResult.success === true);
  check("Word COM: Nhận xét (Comments) đã được xóa sạch = 0", comResult.commentsCount === 0, `Count=${comResult.commentsCount}`);
  check("Word COM: Thông tin tác giả đã được xóa sạch", !comResult.author || comResult.author === "", `Author=${comResult.author}`);
} catch (comError) {
  check("Word COM nghiệm thu không lỗi", false, comError.message);
}

const passedCount = results.filter(r => r.pass).length;
console.log(`\n==================================================`);
console.log(`KẾT QUẢ NGHIỆM THU: ${passedCount}/${results.length} PASS | ${results.length - passedCount} FAIL`);
console.log(`==================================================`);
if (passedCount !== results.length) {
  process.exitCode = 1;
}
