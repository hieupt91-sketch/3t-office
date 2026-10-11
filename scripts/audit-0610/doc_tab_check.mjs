// Phím Tab trong tài liệu mới phải ra w:tab trong DOCX (trước đây thành dấu cách), và pPr không có phần tử trùng. Chỉ CDP.
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { launchApp } from "../../tests/live/cdp/session.mjs";
import { insertText, press } from "../../tests/live/cdp/actions.mjs";

const execFileAsync = promisify(execFile);
const docx = path.join(await fs.mkdtemp(path.join(os.tmpdir(), "vno-tabchk-")), "tab.docx");
let session, failed = 0;
const rec = (name, ok, value) => { if (!ok) failed += 1; console.log(ok ? "PASS" : "FAIL", "|", name, "|", JSON.stringify(value).slice(0, 300)); };
try {
  session = await launchApp("writer", { startTimeoutMilliseconds: 90000 });
  const ev = (e, o) => session.cdp.evaluate(e, o);
  await ev(`document.querySelector('.vno-writer-body')?.focus()`);
  await insertText(session.cdp, "KINH_GUI:");
  await press(session.cdp, "Tab");
  await insertText(session.cdp, "UBND");
  await press(session.cdp, "Enter");
  await insertText(session.cdp, "A");
  await press(session.cdp, "Tab");
  await press(session.cdp, "Tab");
  await insertText(session.cdp, "B");
  const saved = await ev(`globalThis.globalUnoBridge.saveRealFileInPlace("writer",window.__vnoAppInstance.adapter._contentForExport(),${JSON.stringify(docx)},null)`, { timeoutMilliseconds: 1200000 });
  rec("Lưu DOCX", saved?.status === "ok", saved?.status);
  const py = String.raw`import sys,zipfile,re,json
x=zipfile.ZipFile(sys.argv[1]).read('word/document.xml').decode('utf-8')
paras=re.findall(r'<w:p[ >].*?</w:p>',x,re.S)
out={'tabs':[p.count('<w:tab/>') for p in paras if 'KINH_GUI' in p or ('>A<' in p and '>B<' in p)],'dupJc':[len(re.findall(r'<w:jc\b',re.search(r'<w:pPr>.*?</w:pPr>',p,re.S).group(0))) for p in paras if re.search(r'<w:pPr>',p)],'jcBeforeRpr':all(not re.search(r'<w:rPr>.*<w:jc\b',re.search(r'<w:pPr>.*?</w:pPr>',p,re.S).group(0),re.S) for p in paras if re.search(r'<w:pPr>',p))}
print(json.dumps(out))`;
  const { stdout } = await execFileAsync(process.env.VNO_PYTHON || "python", ["-c", py, docx]);
  const x = JSON.parse(stdout);
  rec("DOCX: Tab giữ thành w:tab (1 và 2 ký tự Tab)", JSON.stringify(x.tabs) === "[1,2]", x.tabs);
  rec("DOCX: mỗi đoạn tối đa 1 w:jc và w:jc đứng trước w:rPr", x.dupJc.every(n => n <= 1) && x.jcBeforeRpr, x);
} catch (error) {
  rec("Lỗi chạy", false, String(error?.stack || error));
} finally { await session?.close?.(); }
console.log(failed ? `TONG: ${failed} FAIL` : "TONG: tat ca PASS");
process.exit(failed ? 1 : 0);