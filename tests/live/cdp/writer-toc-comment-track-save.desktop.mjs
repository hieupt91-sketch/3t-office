import { launchApp } from "./session.mjs";
import { sleep } from "./actions.mjs";
import path from "node:path";
import os from "node:os";
import { execFileSync } from "node:child_process";
import { writeFileSync, unlinkSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const outputPath = process.env.VNO_TOC_REVIEW_OUT || path.join(os.tmpdir(), `writer-toc-comment-track-save-${process.pid}.docx`);
const checks = [];
const check = (name, pass, detail = "") => {
  checks.push(Boolean(pass));
  console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`);
};
const session = await launchApp("writer", { localAppData: process.env.VNO_CDP_LOCALAPPDATA });
try {
  const { cdp } = session;
  await sleep(1200);
  const result = await cdp.evaluate(`(async () => {
    const adapter = window.__vnoAppInstance?.adapter;
    const body = document.querySelector('.vno-writer-body');
    if (!adapter || !body) throw new Error('Writer document is not ready');
    body.innerHTML = '<h1>Tiêu đề chính</h1><p>Nội dung thân bài ban đầu.</p>';
    adapter.updateTableOfContents();
    adapter.insertTableOfContents();
    const toc = body.querySelector('[data-vno-toc="true"]');
    if (!toc) throw new Error('Không tạo được mục lục');
    adapter.trackChangesEnabled = true;
    const tocEntry = toc.querySelector('.vno-toc-text');
    if (tocEntry) tocEntry.innerHTML = '<ins data-vno-change="insert" data-vno-author="Tác giả">Tiêu đề chính</ins>';
    const paragraph = body.querySelector('p');
    paragraph.innerHTML = '<del data-vno-change="delete" data-vno-author="Tác giả">ban đầu</del><ins data-vno-change="insert" data-vno-author="Tác giả">đã sửa</ins>.';
    const text = paragraph.querySelector('ins').firstChild;
    const range = document.createRange(); range.selectNodeContents(text);
    const commentId = await adapter.insertComment({ range, content: 'Ghi chú ở thân bài' });
    const html = adapter._contentForExport();
    const save = await window.pywebview.api.save_document_in_place(html, 'writer', ${JSON.stringify(outputPath)}, null);
    return { status: save.status, commentId: Boolean(commentId), html, tocText: toc.innerText, bodyText: paragraph.innerText };
  })()`, { awaitPromise: true, timeoutMilliseconds: 600000 });
  check("Tạo mục lục và thêm nhận xét ở thân bài", result.commentId && result.tocText.includes("Tiêu đề chính"), JSON.stringify({ commentId: result.commentId, tocText: result.tocText }));
  check("Lưu DOCX thành công", result.status === "ok", JSON.stringify({ status: result.status, path: outputPath }));
  const tocStart = result.html.search(/<div\b[^>]*data-vno-toc=["']true["'][^>]*>/i);
  let tocEnd = -1;
  if (tocStart >= 0) {
    let depth = 0;
    const tags = /<\/?div\b[^>]*>/gi;
    tags.lastIndex = tocStart;
    let match;
    while ((match = tags.exec(result.html))) {
      if (match[0].startsWith("</")) depth -= 1;
      else depth += 1;
      if (depth === 0) { tocEnd = tags.lastIndex; break; }
    }
  }
  const tocHtml = tocStart >= 0 && tocEnd > tocStart ? result.html.slice(tocStart, tocEnd) : "";
  check("Mục lục không chứa dấu theo dõi/chú thích", Boolean(tocHtml) && !/<(?:ins|del|mark)\b|vno-review-(?:start|end)-/i.test(tocHtml), tocHtml.slice(0, 260));
} catch (error) {
  check("Kịch bản CDP không có ngoại lệ", false, error.stack || error.message);
} finally {
  console.log(`CDP_PORT ${session.debugPort} | PROFILE ${session.localAppData}`);
  await session.close().catch(() => {});
}

const readbackScript = path.join(os.tmpdir(), `writer-toc-review-readback-${process.pid}.ps1`);
writeFileSync(readbackScript, String.raw`$ErrorActionPreference = 'Stop'
$word = New-Object -ComObject Word.Application
try {
  $word.Visible = $false
  $word.DisplayAlerts = 0
  $document = $word.Documents.Open($env:VNO_TOC_REVIEW_OUT, $false, $true)
  try {
    $toc = $document.TablesOfContents.Item(1).Range
    $tocRevisions = 0
    $bodyRevisions = 0
    foreach ($revision in $document.Revisions) {
      if ($revision.Range.Start -ge $toc.Start -and $revision.Range.End -le $toc.End) { $tocRevisions++ }
      else { $bodyRevisions++ }
    }
    $comment = $document.Comments.Item(1).Scope
    [ordered]@{
      tocs = $document.TablesOfContents.Count
      revisions = $document.Revisions.Count
      tocRevisions = $tocRevisions
      bodyRevisions = $bodyRevisions
      comments = $document.Comments.Count
      commentInBody = ($comment.Start -ge $toc.End -or $comment.End -le $toc.Start)
    } | ConvertTo-Json -Compress
  } finally { $document.Close(0) }
} finally { $word.Quit() }
`, "utf-8");
try {
  const readback = execFileSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", readbackScript], {
    encoding: "utf8",
    env: { ...process.env, VNO_TOC_REVIEW_OUT: outputPath }
  });
  const report = JSON.parse(readback.trim());
  check("Word: mục lục không có revision, nhận xét và revision thân bài còn nguyên", report.tocs === 1 && report.tocRevisions === 0 && report.comments === 1 && report.commentInBody && report.bodyRevisions >= 2, JSON.stringify(report));
} catch (error) {
  check("Word COM đọc lại DOCX", false, error.stdout || error.message);
} finally {
  try { unlinkSync(readbackScript); } catch {}
}
if (checks.some(pass => !pass)) process.exit(1);
