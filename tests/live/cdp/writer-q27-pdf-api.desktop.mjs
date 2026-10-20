import fs from "node:fs/promises";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { launchApp } from "./session.mjs";

const root = process.env.VNO_Q27_WRITER_OUT;
const profileRoot = process.env.VNO_CDP_LOCALAPPDATA;
if (!root || !profileRoot) throw new Error("Set fresh VNO_Q27_WRITER_OUT and VNO_CDP_LOCALAPPDATA");
const docs = [
  { file: "A-cong-van.docx", expectedPages: 2 },
  { file: "B-bien-ban.docx", expectedPages: 2 },
  { file: "C-mau-bieu.docx", expectedPages: 2, landscape: true },
];
const sourceDir = path.resolve("docs/assets/q26-writer-2026-10-20");
await fs.mkdir(root, { recursive: true });
const checks = [];
const check = (name, ok, detail = "") => {
  checks.push(Boolean(ok));
  console.log(`${ok ? "PASS" : "FAIL"} | ${name} | ${JSON.stringify(detail)}`);
};
const inspectPdf = pdfPath => JSON.parse(execFileSync("python", ["-c", [
  "import json,sys",
  "from pypdf import PdfReader",
  "r=PdfReader(sys.argv[1]); p=r.pages[0]; low=[]",
  "p.extract_text(visitor_text=lambda t,cm,tm,fd,fs: low.append(t.strip()) if tm[5] < 55 and t.strip() else None)",
  "print(json.dumps({'pages':len(r.pages),'width':float(p.mediabox.width),'height':float(p.mediabox.height),'text':[x.extract_text() or '' for x in r.pages],'firstPageLowFooterText':low},ensure_ascii=False))",
].join("; "), pdfPath], { encoding: "utf8" }));

for (const [index, item] of docs.entries()) {
  const source = path.join(sourceDir, item.file);
  const pdf = path.join(root, item.file.replace(/\.docx$/i, ".pdf"));
  const session = await launchApp("writer", {
    filePath: source,
    localAppData: path.join(profileRoot, `writer-${index + 1}`),
    startTimeoutMilliseconds: 180000,
    readyTimeoutMilliseconds: 180000,
  });
  try {
    await session.cdp.waitFor(
      `(() => { const a=window.__vnoAppInstance?.adapter; return !!a?._contentForExport?.() && String(a._sourcePath||'').replace(/\\\\/g,'/').toLowerCase().endsWith(${JSON.stringify(item.file.toLowerCase())}); })()`,
      { timeoutMilliseconds: 180000, intervalMilliseconds: 500 },
    );
    const content = await session.cdp.evaluate("window.__vnoAppInstance.adapter._contentForExport()", { awaitPromise: true, timeoutMilliseconds: 180000 });
    const prepared = await session.cdp.evaluate(`window.pywebview.api.prepare_print_document('writer',${JSON.stringify(content)},${JSON.stringify(item.file)},${JSON.stringify(source)},true,{})`, { awaitPromise: true, timeoutMilliseconds: 600000 });
    check(`${item.file}: print_pipeline chuẩn bị được ${item.expectedPages} trang`, prepared?.status === "ok" && prepared.pageCount === item.expectedPages, prepared);
    if (prepared?.status !== "ok") continue;
    const printed = await session.cdp.evaluate(`window.pywebview.api.print_document(${JSON.stringify(prepared.sessionId)},{printer:'Microsoft Print to PDF',copies:1,pageRange:'',destinationPath:${JSON.stringify(pdf)}})`, { awaitPromise: true, timeoutMilliseconds: 600000 });
    check(`${item.file}: API in gửi PDF tới đường dẫn đích`, printed?.status === "ok" && printed.path === pdf, printed);
    if (printed?.status !== "ok") continue;
    const result = inspectPdf(pdf);
    const allText = result.text.join(" ").replace(/\s+/g, " ");
    check(`${item.file}: pypdf đọc đủ trang và có văn bản nhúng`, result.pages === item.expectedPages && allText.length > 100, { pages: result.pages, expected: item.expectedPages, textLength: allText.length });
    if (item.landscape) check(`${item.file}: PDF giữ khổ ngang`, result.width > result.height, { width: result.width, height: result.height });
    if (index === 0) check("A-cong-van.docx: chân trang trang đầu không có số trang riêng", !result.firstPageLowFooterText.some(text => /^\d+$/.test(text)), result.firstPageLowFooterText);
    await session.cdp.evaluate(`window.pywebview.api.cancel_print_document(${JSON.stringify(prepared.sessionId)})`, { awaitPromise: true, timeoutMilliseconds: 30000 }).catch(() => {});
  } catch (error) {
    check(`${item.file}: luồng PDF hoàn tất`, false, error.stack || error.message);
  } finally {
    await session.close().catch(() => {});
  }
}
console.log(`writer-q27-pdf-api: ${checks.filter(Boolean).length}/${checks.length} PASS`);
if (checks.some(ok => !ok)) process.exitCode = 1;
