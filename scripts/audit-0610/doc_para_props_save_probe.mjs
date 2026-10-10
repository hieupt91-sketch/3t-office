// Doi dinh dang CAP DOAN tren doan nhap tu DOCX (khong sua chu) roi LUU DOCX that va in w:jc / w:spacing / w:pStyle / w:ind cua doan do.
// Phat hien: tai lieu nhap ma chi doi thuoc tinh doan phai duoc ghi vao tep luu (khong bi khoi phuc ve doan goc).
import { launchApp } from "../../tests/live/cdp/session.mjs";
import { press } from "../../tests/live/cdp/actions.mjs";
import path from "node:path";
import { mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
const file = process.argv.slice(2).find((a) => !a.startsWith("--")) || "E:\\VN OFice\\file test\\landocx\\d07.docx";
const outDir = "E:\\VNOffice-test\\paraprops"; mkdirSync(outDir, { recursive: true });
const session = await launchApp("writer", { filePath: file, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
const ev = (e, o) => session.cdp.evaluate(e, o);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cases = [
  { name: "Ctrl+E can giua", key: "e", mod: { ctrl: true }, expect: /w:jc w:val="center"/ },
  { name: "Ctrl+R can phai", key: "r", mod: { ctrl: true }, expect: /w:jc w:val="(?:right|end)"/ },
  { name: "Ctrl+L can trai", key: "l", mod: { ctrl: true }, expect: /w:jc w:val="(?:left|start)"/ },
  { name: "Ctrl+1 gian dong don", key: "1", mod: { ctrl: true }, expect: /w:spacing[^>]*w:line="(?:240|276)"/ },
  { name: "Ctrl+2 gian dong doi", key: "2", mod: { ctrl: true }, expect: /w:spacing[^>]*w:line="(?:480|552)"/ },
  { name: "Ctrl+5 gian dong 1.5", key: "5", mod: { ctrl: true }, expect: /w:spacing[^>]*w:line="(?:360|414)"/ },
  { name: "Ctrl+M thut le", key: "m", mod: { ctrl: true }, expect: /w:ind[^>]*w:left="720"/ },
  { name: "Ctrl+Alt+1 Heading 1", key: "1", mod: { ctrl: true, alt: true }, expect: /w:pStyle w:val="(?:Heading1|heading1|Tiu1|Ttu1|Heading 1)[^"]*"/i },
];
const SELECT = `(() => {
  const b = document.querySelector('.vno-writer-body');
  const ps = [...b.querySelectorAll(':scope > p')].filter(p => p.textContent.trim().length > 80 && !p.querySelector('img'));
  const p = ps[Math.floor(ps.length / 2)]; p.id = 'probe-target';
  const w = document.createTreeWalker(p, NodeFilter.SHOW_TEXT); let n, tn = null;
  while ((n = w.nextNode())) { if (n.data.trim().length > 25) { tn = n; break; } }
  b.focus(); p.scrollIntoView({ block: 'center' });
  const st = Math.max(0, tn.data.search(/\\S/)); const r = document.createRange(); r.setStart(tn, st); r.setEnd(tn, st + 10);
  const s = getSelection(); s.removeAllRanges(); s.addRange(r); return p.textContent.trim().replace(/\\s+/g, ' ').slice(0, 60); })()`;
const results = [];
try {
  await session.cdp.waitFor("!!document.querySelector('.vno-writer-body') && document.querySelector('.vno-writer-body').textContent.length > 5000", { timeoutMilliseconds: 180000, intervalMilliseconds: 500 });
  await sleep(6000);
  for (let i = 0; i < cases.length; i += 1) {
    const c = cases[i];
    const marker = await ev(SELECT);
    await press(session.cdp, c.key, c.mod, 800);
    const outPath = path.join(outDir, `case${i}.docx`);
    await ev(`(() => { window.__c = window.__vnoAppInstance.adapter._contentForExport(); return window.__c.length; })()`);
    const saved = await ev(`globalThis.globalUnoBridge.saveRealFileInPlace("writer", window.__c, ${JSON.stringify(outPath)}, ${JSON.stringify(file)})`, { timeoutMilliseconds: 1200000 });
    results.push({ ...c, marker, outPath, status: saved && saved.status });
    await press(session.cdp, "z", { ctrl: true }, 600);
  }
} finally { await session.close(); }
// phan tich XML
const py = `
import zipfile, re, sys, json
rows = json.loads(sys.argv[1]); key = sys.argv[2]
def para(path):
    x = zipfile.ZipFile(path).read('word/document.xml').decode('utf8', 'ignore')
    for p in re.findall(r'<w:p[ >].*?</w:p>', x, re.S):
        t = re.sub(r'<[^>]+>', '', p).replace('\\n', ' ')
        if key in t: return p
    return None
for r in rows:
    p = para(r['outPath'])
    if p is None: print('KHONG TIM THAY DOAN |', r['name']); continue
    ppr = re.findall(r'<w:pPr>.*?</w:pPr>', p, re.S)
    ppr = ppr[0] if ppr else ''
    print(('DUNG' if re.search(r['expect'], ppr, re.I) else 'MAT/SAI'), '|', r['name'], '|', re.sub(r'<w:rPr>.*?</w:rPr>', '', ppr)[:170])
`;
import { writeFileSync } from "node:fs";
writeFileSync(path.join(outDir, "check.py"), py, "utf8");
const rows = results.map((r) => ({ name: r.name, outPath: r.outPath, expect: r.expect.source }));
const check = spawnSync("python", [path.join(outDir, "check.py"), JSON.stringify(rows), "Được sử dụng máy tính, điện thoại, máy"], { encoding: "utf8" });
console.log(check.stdout || check.stderr);
