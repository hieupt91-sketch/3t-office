// Audit end-to-end cho tính năng Trang bìa (Cover Page)
// Chạy: node --experimental-websocket scripts/audit-0610/doc_cover_check.mjs
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { launchApp } from "../../tests/live/cdp/session.mjs";
import { insertText } from "../../tests/live/cdp/actions.mjs";

const execFileAsync = promisify(execFile);
const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "vno-cover-audit-"));
const docxPath = path.join(tempDir, "cover_test.docx");
const screensDir = path.resolve("docs/screens-writer-cover-0610");
await fs.mkdir(screensDir, { recursive: true });

const rows = [];
const rec = (name, ok, value) => {
  rows.push({ name, ok });
  console.log(ok ? "PASS" : "FAIL", "|", name, "|", JSON.stringify(value ?? "").slice(0, 200));
};

let session;
const ev = (expression, options) => session.cdp.evaluate(expression, options);

async function inspectDocx(file) {
  const py = String.raw`import sys, zipfile, re, json
with zipfile.ZipFile(sys.argv[1]) as z:
    xml = z.read('word/document.xml').decode('utf-8')
br_page = xml.count('w:type="page"') + xml.count('<w:pageBreakBefore')
titles = re.findall(r'BÁO CÁO KẾT QUẢ CÔNG TÁC NĂM 2026', xml)
authors = re.findall(r'Nguyễn Văn Trưởng', xml)
cover_pos = xml.find('BÁO CÁO KẾT QUẢ CÔNG TÁC NĂM 2026')
body_pos = xml.find('Nội dung văn bản chính phía sau trang bìa')
out = {
    'hasTitle': len(titles) > 0,
    'hasAuthor': len(authors) > 0,
    'pageBreaks': br_page,
    'coverBeforeBody': (cover_pos != -1 and body_pos != -1 and cover_pos < body_pos)
}
print(json.dumps(out, ensure_ascii=False))`;
  const { stdout } = await execFileAsync(process.env.VNO_PYTHON || "python", ["-c", py, file], { maxBuffer: 8 * 1024 * 1024 });
  return JSON.parse(stdout);
}

try {
  session = await launchApp("writer", { startTimeoutMilliseconds: 90000 });
  await ev(`document.querySelector('.vno-writer-body')?.focus()`);

  // 1. Nhập văn bản chính ban đầu
  await insertText(session.cdp, "Nội dung văn bản chính phía sau trang bìa");
  const initText = await ev(`document.querySelector('.vno-writer-body').innerText`);
  rec("Đã nhập văn bản chính ban đầu", initText.includes("Nội dung văn bản chính"), initText);

  // 2. Mở hộp thoại Thư viện Trang bìa
  ev(`globalThis.__vnoGlobalCommandBus.execute('writer.insert.coverPage')`).catch(() => {});
  await session.cdp.waitFor(`!!document.querySelector('.vno-cover-page-dialog')`, { timeoutMilliseconds: 15000 });

  const dialogVisible = await ev(`!!document.querySelector('.vno-cover-page-dialog')`);
  rec("Hộp thoại Thư viện Trang bìa hiển thị", dialogVisible === true, dialogVisible);

  const tplCount = await ev(`document.querySelectorAll('.vno-cover-template-card').length`);
  rec("Hộp thoại chứa đủ 4 mẫu trang bìa", tplCount === 4, tplCount);

  // Chụp ảnh màn hình hộp thoại trang bìa
  const shot1 = await session.cdp.send("Page.captureScreenshot", { format: "png" });
  const shot1Data = shot1?.result?.data || shot1?.data || "";
  const shot1Buf = Buffer.from(shot1Data, "base64");
  const shot1Path = path.join(screensDir, "cover_dialog.png");
  await fs.writeFile(shot1Path, shot1Buf);
  rec("Đã lưu ảnh hộp thoại (< 200KB)", shot1Buf.length > 0 && shot1Buf.length < 200 * 1024, `${Math.round(shot1Buf.length / 1024)} KB`);

  // 3. Nhập dữ liệu các trường trên hộp thoại
  await ev(`(() => {
    document.querySelector('#vno-cover-input-title').value = "BÁO CÁO KẾT QUẢ CÔNG TÁC NĂM 2026";
    document.querySelector('#vno-cover-input-subtitle').value = "Kế hoạch và Phương hướng 2027";
    document.querySelector('#vno-cover-input-org').value = "TỔNG CỤC 3T";
    document.querySelector('#vno-cover-input-author').value = "Nguyễn Văn Trưởng";
    document.querySelector('#vno-cover-input-date').value = "06/10/2026";
  })()`);

  // Bấm Chèn trang bìa
  await ev(`document.querySelector('.vno-cover-page-dialog .vno-btn-primary').click()`);
  await session.cdp.waitFor(`!document.querySelector('.vno-cover-page-dialog')`, { timeoutMilliseconds: 10000 });

  // 4. Kiểm tra DOM sau khi chèn
  const coverDom = await ev(`(() => {
    const body = document.querySelector('.vno-writer-body');
    const cover = body?.querySelector('[data-vno-cover-page="true"]');
    const pageBreak = body?.querySelector('[data-vno-page-break="true"]');
    const isFirst = body?.firstElementChild === cover;
    const isBreakSecond = cover?.nextElementSibling === pageBreak;
    return {
      hasCover: !!cover,
      hasBreak: !!pageBreak,
      isFirst,
      isBreakSecond,
      titleText: cover?.querySelector('[data-vno-field="title"]')?.textContent,
      authorText: cover?.querySelector('[data-vno-field="author"]')?.textContent
    };
  })()`);

  rec("Trang bìa ở ĐẦU tài liệu và có ngắt trang phía sau", coverDom?.hasCover && coverDom?.hasBreak && coverDom?.isFirst && coverDom?.isBreakSecond, coverDom);
  rec("Trang bìa chứa tiêu đề và tên tác giả nhập vào", coverDom?.titleText?.includes("BÁO CÁO KẾT QUẢ CÔNG TÁC") && coverDom?.authorText?.includes("Nguyễn Văn Trưởng"), coverDom);

  // Chụp ảnh tài liệu kèm trang bìa
  const shot2 = await session.cdp.send("Page.captureScreenshot", { format: "png" });
  const shot2Data = shot2?.result?.data || shot2?.data || "";
  const shot2Buf = Buffer.from(shot2Data, "base64");
  const shot2Path = path.join(screensDir, "cover_document.png");
  await fs.writeFile(shot2Path, shot2Buf);
  rec("Đã lưu ảnh tài liệu có trang bìa (< 200KB)", shot2Buf.length > 0 && shot2Buf.length < 200 * 1024, `${Math.round(shot2Buf.length / 1024)} KB`);

  // 5. Thử chèn lại mẫu thứ hai -> Thay thế trang bìa cũ, không tạo 2 trang bìa
  ev(`globalThis.__vnoGlobalCommandBus.execute('writer.insert.coverPage')`).catch(() => {});
  await session.cdp.waitFor(`!!document.querySelector('.vno-cover-page-dialog')`, { timeoutMilliseconds: 10000 });
  const alertText = await ev(`document.querySelector('.vno-cover-dialog-alert')?.textContent || ''`);
  rec("Hộp thoại cảnh báo thay thế trang bìa cũ", alertText.includes("Lưu ý"), alertText);
  await ev(`document.querySelectorAll('.vno-cover-template-card')[1].click()`);
  await ev(`document.querySelector('.vno-cover-page-dialog .vno-btn-primary').click()`);
  await session.cdp.waitFor(`!document.querySelector('.vno-cover-page-dialog')`, { timeoutMilliseconds: 10000 });

  const replaceDom = await ev(`(() => {
    const body = document.querySelector('.vno-writer-body');
    const covers = body?.querySelectorAll('[data-vno-cover-page="true"]').length || 0;
    const breaks = body?.querySelectorAll('[data-vno-page-break="true"]').length || 0;
    return { covers, breaks };
  })()`);
  rec("Thay thế thành công: chỉ duy nhất 1 trang bìa và 1 ngắt trang", replaceDom?.covers === 1 && replaceDom?.breaks === 1, replaceDom);

  // 6. Thử Hoàn tác (Ctrl+Z) 1 bước
  await ev(`globalThis.__vnoGlobalCommandBus.execute('common.edit.undo')`);
  await new Promise(r => setTimeout(r, 300));
  const undoneDom = await ev(`(() => {
    const body = document.querySelector('.vno-writer-body');
    const cover = body?.querySelector('[data-vno-cover-page="true"]');
    return { title: cover?.querySelector('[data-vno-field="title"]')?.textContent };
  })()`);
  rec("Hoàn tác 1 bước khôi phục trạng thái trước", undoneDom?.title?.includes("BÁO CÁO KẾT QUẢ CÔNG TÁC"), undoneDom);

  // Làm lại (Ctrl+Y)
  await ev(`globalThis.__vnoGlobalCommandBus.execute('common.edit.redo')`);
  await new Promise(r => setTimeout(r, 300));

  // 7. Thử lệnh Gỡ trang bìa
  await ev(`globalThis.__vnoGlobalCommandBus.execute('writer.insert.removeCoverPage')`);
  await new Promise(r => setTimeout(r, 300));
  const removedDom = await ev(`(() => {
    const body = document.querySelector('.vno-writer-body');
    return {
      hasCover: !!body?.querySelector('[data-vno-cover-page="true"]'),
      hasBreak: !!body?.querySelector('[data-vno-page-break="true"]')
    };
  })()`);
  rec("Gỡ trang bìa xóa thành công trang bìa và ngắt trang kèm theo", !removedDom?.hasCover && !removedDom?.hasBreak, removedDom);

  // Re-insert trang bìa để lưu DOCX
  await ev(`globalThis.__vnoAppInstance.adapter.insertCoverPage("gov_simple", {
    title: "BÁO CÁO KẾT QUẢ CÔNG TÁC NĂM 2026",
    author: "Nguyễn Văn Trưởng",
    organization: "TỔNG CỤC 3T",
    date: "06/10/2026"
  })`);
  await new Promise(r => setTimeout(r, 300));

  // 8. Lưu tệp DOCX thực tế và kiểm tra XML
  const saved = await ev(`globalThis.globalUnoBridge.saveRealFileInPlace("writer", window.__vnoAppInstance.adapter._contentForExport(), ${JSON.stringify(docxPath)}, null)`, { timeoutMilliseconds: 1200000 });
  rec("Lưu DOCX qua luồng của app", saved?.status === "ok", saved?.status);

  const xmlAudit = await inspectDocx(docxPath);
  rec("DOCX XML: chứa Tiêu đề và Tác giả trang bìa", xmlAudit.hasTitle && xmlAudit.hasAuthor, xmlAudit);
  rec("DOCX XML: chứa ngắt trang (w:br page / pageBreakBefore)", xmlAudit.pageBreaks >= 1, xmlAudit.pageBreaks);
  rec("DOCX XML: Trang bìa xuất hiện ở ĐẦU tài liệu XML (trước nội dung chính)", xmlAudit.coverBeforeBody === true, xmlAudit);

} catch (error) {
  rec("Lỗi chạy kiểm tra", false, String(error?.stack || error));
} finally {
  await session?.close?.();
  try { await fs.rm(tempDir, { recursive: true, force: true }); } catch {}
}

const failed = rows.filter(r => !r.ok).length;
console.log(`TONG: ${rows.length - failed} PASS, ${failed} FAIL`);
process.exit(failed ? 1 : 0);
