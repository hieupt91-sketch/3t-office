// Thao tac CAP KHOI (bang, danh sach, ngat trang) tren tai lieu NHAP TU DOCX: chay lenh that trong app, LUU DOCX that, doc XML de xem co ghi vao tep khong.
// Moi ca: bang truoc (tep goc) vs sau (tep luu): so hang w:tr, so cot w:gridCol, w:shd, w:numPr, w:br page...
import { launchApp } from "../../tests/live/cdp/session.mjs";
import { press } from "../../tests/live/cdp/actions.mjs";
import path from "node:path";
import { mkdirSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
const file = process.argv.slice(2).find((a) => !a.startsWith("--")) || "E:\\VN OFice\\file test\\landocx\\d07.docx";
const outDir = "E:\\VNOffice-test\\blockedits"; mkdirSync(outDir, { recursive: true });
const session = await launchApp("writer", { filePath: file, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
const ev = (e, o) => session.cdp.evaluate(e, o);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cases = [
  { name: "Chen hang duoi (table.insertRowBelow)", cmd: "writer.table.insertRowBelow", target: "cell", metric: "rows", expectDelta: +1 },
  { name: "Chen cot phai (table.insertColRight)", cmd: "writer.table.insertColRight", target: "cell", metric: "cols", expectDelta: +1 },
  { name: "Xoa hang (table.deleteRow)", cmd: "writer.table.deleteRow", target: "cell", metric: "rows", expectDelta: -1 },
  { name: "To nen o (table.cellBg)", cmd: "writer.table.cellBg", args: "#ffff00", target: "cell", metric: "shd", expectDelta: +1 },
  { name: "Danh sach dau dong (list.bullet)", cmd: "writer.list.bullet", target: "para", metric: "numPr", expectDelta: +1 },
  { name: "Danh sach danh so (list.numbered)", cmd: "writer.list.numbered", target: "para", metric: "numPr", expectDelta: +1 },
  { name: "Ngat trang (page.break)", cmd: "writer.page.break", target: "para", metric: "pagebr", expectDelta: +1 },
];
const SEL_CELL = `(() => {
  const b = document.querySelector('.vno-writer-body');
  const t = [...b.querySelectorAll('table')].find(x => x.rows.length >= 3 && x.rows[1].cells.length >= 2 && x.rows[1].cells[0].textContent.trim().length > 2);
  if (!t) return null; const td = t.rows[1].cells[0]; td.id = 'probe-cell'; t.id = 'probe-table'; b.focus(); td.scrollIntoView({ block: 'center' });
  const w = document.createTreeWalker(td, NodeFilter.SHOW_TEXT); let n, tn = null; while ((n = w.nextNode())) { if (n.data.trim()) { tn = n; break; } }
  const r = document.createRange(); r.setStart(tn || td, 0); r.collapse(true); const s = getSelection(); s.removeAllRanges(); s.addRange(r);
  return { rows: t.rows.length, cols: t.rows[1].cells.length, tableIndex: [...b.querySelectorAll('table')].indexOf(t) }; })()`;
const SEL_PARA = `(() => {
  const b = document.querySelector('.vno-writer-body');
  const ps = [...b.querySelectorAll(':scope > p')].filter(p => p.textContent.trim().length > 80 && !p.querySelector('img'));
  const p = ps[Math.floor(ps.length / 2)]; p.id = 'probe-target';
  const w = document.createTreeWalker(p, NodeFilter.SHOW_TEXT); let n, tn = null; while ((n = w.nextNode())) { if (n.data.trim().length > 25) { tn = n; break; } }
  b.focus(); p.scrollIntoView({ block: 'center' });
  const st = Math.max(0, tn.data.search(/\\S/)); const r = document.createRange(); r.setStart(tn, st); r.collapse(true);
  const s = getSelection(); s.removeAllRanges(); s.addRange(r); return { marker: p.textContent.trim().replace(/\\s+/g, ' ').slice(0, 40) }; })()`;
const results = [];
try {
  await session.cdp.waitFor("!!document.querySelector('.vno-writer-body') && document.querySelector('.vno-writer-body').textContent.length > 5000", { timeoutMilliseconds: 180000, intervalMilliseconds: 500 });
  await sleep(6000);
  const only = (process.env.VNO_CASES || "").split(",").filter(Boolean).map(Number);
  for (let i = 0; i < cases.length; i += 1) {
    if (only.length && !only.includes(i)) continue;
    const c = cases[i];
    const sel = await ev(c.target === "cell" ? SEL_CELL : SEL_PARA);
    if (!sel) { results.push({ ...c, outPath: null, note: "khong chon duoc" }); continue; }
    const exec = await ev(`(async () => { try { const m = await import('/platform/commands/command-bus.js'); const r = await m.globalCommandBus.execute(${JSON.stringify(c.cmd)}, ${JSON.stringify(c.args ?? null)}); return { ok: true, r: String(r).slice(0, 40) }; } catch (e) { return { ok: false, e: String(e).slice(0, 120) }; } })()`, { awaitPromise: true });
    await sleep(900);
    const live = c.target === "cell" ? await ev(`(() => { const t = document.getElementById('probe-table'); const c = document.getElementById('probe-cell'); return t ? { rows: t.rows.length, cols: t.rows[1].cells.length, cellBg: c ? (c.style.backgroundColor || c.getAttribute('bgcolor') || getComputedStyle(c).backgroundColor) : null } : null; })()`) : null;
    const outPath = path.join(outDir, `case${i}.docx`);
    await ev(`(() => { window.__c = window.__vnoAppInstance.adapter._contentForExport(); return window.__c.length; })()`);
    const saved = await ev(`globalThis.globalUnoBridge.saveRealFileInPlace("writer", window.__c, ${JSON.stringify(outPath)}, ${JSON.stringify(file)})`, { timeoutMilliseconds: 1200000 });
    results.push({ ...c, sel, exec, live, outPath, status: saved && saved.status });
    await press(session.cdp, "z", { ctrl: true }, 700);
  }
} finally { await session.close(); }
const py = `
import zipfile, re, sys, json
rows = json.loads(sys.argv[1]); src = sys.argv[2]
def stats(path, tindex):
    x = zipfile.ZipFile(path).read('word/document.xml').decode('utf8', 'ignore')
    tbls = re.findall(r'<w:tbl>.*?</w:tbl>', x, re.S)
    t = tbls[tindex] if tindex is not None and tindex < len(tbls) else ''
    trs = re.findall(r'<w:tr[ >].*?</w:tr>', t, re.S)
    tcs = len(re.findall(r'<w:tc>', trs[1])) if len(trs) > 1 else 0
    return {'rows': len(trs), 'cols': tcs, 'gridCols': len(re.findall(r'<w:gridCol', t)), 'shd': len(re.findall(r'<w:shd ', x)), 'shdInTable': len(re.findall(r'<w:shd ', t)),
            'numPr': len(re.findall(r'<w:numPr>', x)), 'pagebr': len(re.findall(r'<w:br w:type="page"', x)) + len(re.findall(r'<w:pageBreakBefore', x)), 'tables': len(tbls)}
for r in rows:
    if not r.get('outPath'): print('BO QUA |', r['name'], '|', r.get('note')); continue
    ti = r.get('sel', {}).get('tableIndex')
    a = stats(src, ti); b = stats(r['outPath'], ti)
    m = r['metric']; d = b[m] - a[m]
    ok = (d == r['expectDelta']) or (m in ('numPr','pagebr') and d >= 1)
    print(('DUNG' if ok else 'MAT/SAI'), '|', r['name'], '| goc', a[m], '-> luu', b[m], '| live', r.get('live'), '| gridCols', a['gridCols'], '->', b['gridCols'], '| shd(doc)', a['shd'], '->', b['shd'], '| shdInTable', a['shdInTable'], '->', b['shdInTable'])
`;
writeFileSync(path.join(outDir, "check.py"), py, "utf8");
const rows = results.map((r) => ({ name: r.name, outPath: r.outPath, metric: r.metric, expectDelta: r.expectDelta, sel: r.sel, live: r.live, exec: r.exec, note: r.note }));
const check = spawnSync("python", [path.join(outDir, "check.py"), JSON.stringify(rows), file], { encoding: "utf8" });
console.log(check.stdout || check.stderr);
