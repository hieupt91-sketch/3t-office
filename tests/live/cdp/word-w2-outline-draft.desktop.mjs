/**
 * WORD-W2 Acceptance Test: Outline view, Draft view, Collapsible headings.
 * Desktop app verification via WebView2 CDP + hidden Word COM.
 * No SendKeys / OS input; only CDP and PID-based process cleanup.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { launchApp } from "./session.mjs";
import { sleep } from "./actions.mjs";

const localAppData = process.env.VNO_CDP_LOCALAPPDATA || "E:\\VNOffice-profiles\\word-w2";
const tempDir = "E:\\VNOffice-temp\\word-w2";
fs.mkdirSync(tempDir, { recursive: true });

const collapsedDocx = path.join(tempDir, "word-w2-live-collapsed.docx");
const outlineDocx = path.join(tempDir, "word-w2-live-outline.docx");
const draftDocx = path.join(tempDir, "word-w2-live-draft.docx");

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

  // Setup initial document with headings and paragraphs
  await ev(`(() => {
    const body = document.querySelector('.vno-writer-body');
    body.innerHTML = '<h1>Chương 1: Tổng quan</h1>' +
      '<p>Nội dung chi tiết của chương 1.</p>' +
      '<h2>Mục 1.1: Khảo sát thực tế</h2>' +
      '<p>Dữ liệu khảo sát chi tiết.</p>' +
      '<h1>Chương 2: Đánh giá</h1>' +
      '<p>Nội dung đánh giá chương 2.</p>';
    window.__vnoAppInstance.adapter.isDirty = true;
    return true;
  })()`);

  // 1. Chế độ xem Dàn bài (Outline View)
  await ev(`window.__vnoGlobalCommandBus.execute('writer.view.outline')`);
  await sleep(300);

  const outlineState = await ev(`(() => {
    const vc = window.__vnoAppInstance.viewController;
    const toolbar = vc.container ? vc.container.querySelector('.vno-writer-outline-toolbar') : document.querySelector('.vno-writer-outline-toolbar');
    return {
      mode: vc.mode,
      hasLayoutClass: vc.container ? vc.container.classList.contains('vno-writer-outline-layout') : false,
      hasToolbar: Boolean(toolbar),
      toolbarButtons: toolbar ? toolbar.querySelectorAll('button').length : 0
    };
  })()`);
  check("Chuyển sang chế độ xem Dàn bài", outlineState.mode === "outline" && outlineState.hasLayoutClass && outlineState.hasToolbar, JSON.stringify(outlineState));

  // Test Promote / Demote in Outline View
  const promoteDemoteState = await ev(`(() => {
    const body = document.querySelector('.vno-writer-body');
    const h2 = body.querySelector('h2');
    const range = document.createRange();
    range.selectNodeContents(h2);
    range.collapse(true);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);

    // Promote H2 -> H1
    window.__vnoGlobalCommandBus.execute('writer.outline.promote');
    const promotedTag = body.children[2]?.tagName;

    // Demote H1 -> H2
    const promotedEl = body.children[2];
    const range2 = document.createRange();
    range2.selectNodeContents(promotedEl);
    range2.collapse(true);
    sel.removeAllRanges();
    sel.addRange(range2);

    window.__vnoGlobalCommandBus.execute('writer.outline.demote');
    const demotedTag = body.children[2]?.tagName;

    return { promotedTag, demotedTag };
  })()`);
  check("Nâng cấp và hạ cấp tiêu đề trong Dàn bài", promoteDemoteState.promotedTag === "H1" && promoteDemoteState.demotedTag === "H2", JSON.stringify(promoteDemoteState));

  // Test Close Outline View
  await ev(`window.__vnoGlobalCommandBus.execute('writer.outline.close')`);
  await sleep(300);
  const closedOutlineState = await ev(`(() => {
    const vc = window.__vnoAppInstance.viewController;
    const toolbar = vc.container ? vc.container.querySelector('.vno-writer-outline-toolbar') : document.querySelector('.vno-writer-outline-toolbar');
    return {
      mode: vc.mode,
      hasLayoutClass: vc.container ? vc.container.classList.contains('vno-writer-outline-layout') : false,
      hasToolbar: Boolean(toolbar)
    };
  })()`);
  check("Đóng chế độ Dàn bài về lại Bố cục in", closedOutlineState.mode === "printLayout" && !closedOutlineState.hasLayoutClass && !closedOutlineState.hasToolbar, JSON.stringify(closedOutlineState));

  // 2. Chế độ xem Bản nháp (Draft View)
  await ev(`window.__vnoGlobalCommandBus.execute('writer.view.draft')`);
  await sleep(300);
  const draftState = await ev(`(() => {
    const vc = window.__vnoAppInstance.viewController;
    return {
      mode: vc.mode,
      hasDraftClass: vc.container ? vc.container.classList.contains('vno-writer-draft-layout') : false
    };
  })()`);
  check("Chuyển sang chế độ xem Bản nháp", draftState.mode === "draft" && draftState.hasDraftClass, JSON.stringify(draftState));

  // Quay lại Bố cục in (Print Layout)
  await ev(`window.__vnoGlobalCommandBus.execute('writer.view.printLayout')`);
  await sleep(300);
  const printState = await ev(`window.__vnoAppInstance.viewController.mode`);
  check("Quay lại Bố cục in", printState === "printLayout", printState);

  // 3. Ẩn/Hiện chi tiết tiêu đề (Collapsible Headings trong Bố cục in)
  const collapseTest = await ev(`(() => {
    const vc = window.__vnoAppInstance.viewController;
    const body = document.querySelector('.vno-writer-body');
    const h1 = body.querySelector('h1');
    vc.toggleHeadingCollapse(h1);

    const isCollapsed = h1.getAttribute('data-vno-collapsed') === 'true' && h1.classList.contains('vno-heading-collapsed');
    const p1 = body.children[1];
    const isP1Hidden = p1.classList.contains('vno-heading-collapsed-body');
    const p1Text = p1.textContent;

    return {
      isCollapsed,
      isP1Hidden,
      p1Text
    };
  })()`);
  check("Thu gọn tiêu đề trong Bố cục in ẩn nội dung con", collapseTest.isCollapsed && collapseTest.isP1Hidden, JSON.stringify(collapseTest));
  check("Nội dung dưới tiêu đề thu gọn vẫn còn nguyên trong DOM", collapseTest.p1Text === "Nội dung chi tiết của chương 1.", collapseTest.p1Text);

  // 4. Lưu DOCX với tiêu đề thu gọn
  const saveCollapsedRes = await ev(`(async () => {
    const html = window.__vnoAppInstance.adapter._contentForExport();
    return await window.pywebview.api.save_document_in_place(html, 'writer', ${JSON.stringify(collapsedDocx)}, null);
  })()`);
  check("Lưu DOCX khi tiêu đề đang thu gọn", saveCollapsedRes?.status === "ok", JSON.stringify(saveCollapsedRes));

  // 5. Lưu DOCX ở chế độ Dàn bài
  await ev(`window.__vnoGlobalCommandBus.execute('writer.view.outline')`);
  await sleep(300);
  const saveOutlineRes = await ev(`(async () => {
    const html = window.__vnoAppInstance.adapter._contentForExport();
    return await window.pywebview.api.save_document_in_place(html, 'writer', ${JSON.stringify(outlineDocx)}, null);
  })()`);
  check("Lưu DOCX ở chế độ Dàn bài", saveOutlineRes?.status === "ok", JSON.stringify(saveOutlineRes));

  // 6. Lưu DOCX ở chế độ Bản nháp
  await ev(`window.__vnoGlobalCommandBus.execute('writer.view.draft')`);
  await sleep(300);
  const saveDraftRes = await ev(`(async () => {
    const html = window.__vnoAppInstance.adapter._contentForExport();
    return await window.pywebview.api.save_document_in_place(html, 'writer', ${JSON.stringify(draftDocx)}, null);
  })()`);
  check("Lưu DOCX ở chế độ Bản nháp", saveDraftRes?.status === "ok", JSON.stringify(saveDraftRes));

} catch (error) {
  check("Kịch bản kiểm thử CDP chạy không lỗi", false, error.stack || error.message);
} finally {
  if (session) {
    await session.close();
  }
}

// 7. Nghiệm thu bằng Word COM (Read-only, PID tracked, Stop-Process -Id $wordPid -Force)
console.log("Tiến hành đối chiếu với Microsoft Word thật qua COM...");
const psScriptPath = path.join(tempDir, "word_com_verify.ps1");
const psScriptContent = `
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = 'Stop'
$existing = @(Get-CimInstance Win32_Process -Filter "Name='WINWORD.EXE'" | ForEach-Object { [int]$_.ProcessId })
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
$wordPid = (Get-CimInstance Win32_Process -Filter "Name='WINWORD.EXE'" | Where-Object { $existing -notcontains $_.ProcessId } | Select-Object -First 1).ProcessId

try {
    # 1. Check Collapsed Docx
    $docCollapsed = $word.Documents.Open($args[0], $false, $true)
    $paras = @()
    for ($i = 1; $i -le $docCollapsed.Paragraphs.Count; $i++) {
        $p = $docCollapsed.Paragraphs.Item($i)
        $paras += [ordered]@{
            outlineLevel = [int]$p.OutlineLevel
            text = ($p.Range.Text -replace '[\\r\\a]', '').Trim()
        }
    }
    $xmlCollapsed = $docCollapsed.WordOpenXML
    $docCollapsed.Close(0)

    # 2. Check Outline Docx
    $docOutline = $word.Documents.Open($args[1], $false, $true)
    $xmlOutline = $docOutline.WordOpenXML
    $docOutline.Close(0)

    # 3. Check Draft Docx
    $docDraft = $word.Documents.Open($args[2], $false, $true)
    $xmlDraft = $docDraft.WordOpenXML
    $docDraft.Close(0)

    [ordered]@{
        paras = $paras
        hasCollapsedXml = ($xmlCollapsed -match '<w15:collapsed')
        outlineHasViewOutline = ($xmlOutline -match '<w:view\\s+w:val="outline"')
        draftHasViewNormal = ($xmlDraft -match '<w:view\\s+w:val="normal"')
    } | ConvertTo-Json -Depth 5
} finally {
    if ($word) {
        $word.Quit()
        [void][System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($word)
    }
    if ($wordPid) {
        Stop-Process -Id $wordPid -Force -ErrorAction SilentlyContinue
    }
}
`;
fs.writeFileSync(psScriptPath, "\ufeff" + psScriptContent, "utf8");

try {
  const comOutput = execFileSync("powershell", [
    "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", psScriptPath,
    collapsedDocx, outlineDocx, draftDocx
  ], { encoding: "utf8", timeout: 60000 });

  const comResult = JSON.parse(comOutput.trim());
  const paras = comResult.paras;

  check("Word COM: Đọc đủ 6 đoạn văn bản (100% không mất nội dung)", paras.length === 6, `Count=${paras.length}`);
  check("Word COM: Tiêu đề 1 có OutlineLevel = 1 (H1)", paras[0].outlineLevel === 1 && paras[0].text.includes("Chương 1"), `Lvl=${paras[0].outlineLevel}`);
  check("Word COM: Nội dung chương 1 được giữ 100% và OutlineLevel = 10", paras[1].outlineLevel === 10 && paras[1].text.includes("Nội dung chi tiết của chương 1"), `Lvl=${paras[1].outlineLevel}`);
  check("Word COM: Tiêu đề 2 có OutlineLevel = 2 (H2)", paras[2].outlineLevel === 2 && paras[2].text.includes("Mục 1.1"), `Lvl=${paras[2].outlineLevel}`);
  check("Word COM: Nội dung mục 1.1 được giữ 100% và OutlineLevel = 10", paras[3].outlineLevel === 10 && paras[3].text.includes("Dữ liệu khảo sát chi tiết"), `Lvl=${paras[3].outlineLevel}`);
  check("Word COM: Tiêu đề 2 có OutlineLevel = 1 (H1)", paras[4].outlineLevel === 1 && paras[4].text.includes("Chương 2"), `Lvl=${paras[4].outlineLevel}`);
  check("Word COM: Nội dung chương 2 được giữ 100% và OutlineLevel = 10", paras[5].outlineLevel === 10 && paras[5].text.includes("Nội dung đánh giá chương 2"), `Lvl=${paras[5].outlineLevel}`);
  check("Word COM: OpenXML chứa thuộc tính w15:collapsed", comResult.hasCollapsedXml === true, `Collapsed=${comResult.hasCollapsedXml}`);
  check("Word COM: Tệp Dàn bài chứa w:view outline", comResult.outlineHasViewOutline === true, `Outline=${comResult.outlineHasViewOutline}`);
  check("Word COM: Tệp Bản nháp chứa w:view normal", comResult.draftHasViewNormal === true, `Draft=${comResult.draftHasViewNormal}`);
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
