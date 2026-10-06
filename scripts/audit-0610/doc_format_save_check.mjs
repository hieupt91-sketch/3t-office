// D15: dinh dang ky tu/doan luu DOCX dung - moi dinh dang tren mot cum chu rieng, doc lai rPr/pPr trong XML.
// Chay: node --experimental-websocket scripts/audit-0610/doc_format_save_check.mjs
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { launchApp } from "../../tests/live/cdp/session.mjs";
const run = promisify(execFile);
const docx = path.join(await fs.mkdtemp(path.join(os.tmpdir(), "vno-fmt-")), "fmt.docx");
let failed = 0;
const rec = (name, ok, value) => { if (!ok) failed += 1; console.log(ok ? "PASS" : "FAIL", "|", name, "|", JSON.stringify(value).slice(0, 220)); };
const session = await launchApp("writer", { startTimeoutMilliseconds: 90000 });
try {
  const ev = (e, o) => session.cdp.evaluate(e, o);
  const MARKS = ["FBOLD", "FITAL", "FUNDER", "FSTRIKE", "FSUP", "FSUB", "FARIAL", "FSZ14", "FRED", "FHILITE", "FCENTER", "FRIGHT", "FBULLET", "FNUMBER", "FHEAD1"];
  await ev(`(() => { const b=document.querySelector('.vno-writer-body'); b.innerHTML=${JSON.stringify(MARKS.map(m => `<p>${m}</p>`).join(""))}; b.focus(); })()`);
  const sel = (m) => ev(`(() => { const b=document.querySelector('.vno-writer-body'); const w=document.createTreeWalker(b,NodeFilter.SHOW_TEXT); let n; while(n=w.nextNode()){ if(n.data.trim()===${JSON.stringify(m)}){ const r=document.createRange(); r.selectNodeContents(n); const s=getSelection(); s.removeAllRanges(); s.addRange(r); return true; } } return false; })()`);
  const cmd = async (m, id, arg) => { await sel(m); await ev(`window.__vnoGlobalCommandBus.execute(${JSON.stringify(id)}, ${JSON.stringify(arg ?? null)}); true`); await new Promise(r => setTimeout(r, 150)); };
  await cmd("FBOLD", "writer.text.bold");
  await cmd("FITAL", "writer.text.italic");
  await cmd("FUNDER", "writer.text.underline");
  await cmd("FSTRIKE", "writer.text.strike");
  await cmd("FSUP", "writer.text.superscript");
  await cmd("FSUB", "writer.text.subscript");
  await cmd("FARIAL", "writer.font.family", "Arial");
  await cmd("FSZ14", "writer.font.size", "14");
  await cmd("FRED", "writer.color.text", "#ff0000");
  await cmd("FHILITE", "writer.color.highlight", "#ffff00");
  await cmd("FCENTER", "writer.para.alignCenter");
  await cmd("FRIGHT", "writer.para.alignRight");
  await cmd("FBULLET", "writer.list.bullet");
  await cmd("FNUMBER", "writer.list.numbered");
  await cmd("FHEAD1", "writer.style.apply", "heading1");
  const saved = await ev(`globalThis.globalUnoBridge.saveRealFileInPlace("writer",window.__vnoAppInstance.adapter._contentForExport(),${JSON.stringify(docx)},null)`, { timeoutMilliseconds: 1200000 });
  rec("Luu DOCX", saved?.status === "ok", saved?.status);
  const py = String.raw`import sys,zipfile,re,json
z=zipfile.ZipFile(sys.argv[1]); x=z.read('word/document.xml').decode('utf-8'); num=z.read('word/numbering.xml').decode('utf-8') if 'word/numbering.xml' in z.namelist() else ''
out={}
for m in sys.argv[2].split(','):
    i=x.find(m)
    if i<0: out[m]=None; continue
    ps=max(x.rfind('<w:p>',0,i),x.rfind('<w:p ',0,i)); pe=x.find('</w:p>',i)
    p=x[ps:pe]; ri=p.find('<w:t'); rs=p.rfind('<w:r>',0,ri); rs2=p.rfind('<w:r ',0,ri); rs=max(rs,rs2)
    out[m]={'ppr':(re.search(r'<w:pPr>.*?</w:pPr>',p,re.S) or [''])[0] if re.search(r'<w:pPr>.*?</w:pPr>',p,re.S) else '', 'rpr':(re.search(r'<w:rPr>.*?</w:rPr>',p[rs:],re.S).group(0) if re.search(r'<w:rPr>.*?</w:rPr>',p[rs:],re.S) else '')}
print(json.dumps(out))`;
  const { stdout } = await run(process.env.VNO_PYTHON || "python", ["-c", py, docx, MARKS.join(",")], { encoding: "utf8", maxBuffer: 1 << 24 });
  const o = JSON.parse(stdout);
  const r = (m) => o[m]?.rpr || "", p = (m) => o[m]?.ppr || "";
  rec("Dam -> w:b", /<w:b\b/.test(r("FBOLD")), r("FBOLD"));
  rec("Nghieng -> w:i", /<w:i\b/.test(r("FITAL")), r("FITAL"));
  rec("Gach chan -> w:u", /<w:u\b/.test(r("FUNDER")), r("FUNDER"));
  rec("Gach ngang -> w:strike", /<w:strike\b/.test(r("FSTRIKE")), r("FSTRIKE"));
  rec("Chi so tren -> vertAlign superscript", /vertAlign w:val="superscript"/.test(r("FSUP")), r("FSUP"));
  rec("Chi so duoi -> vertAlign subscript", /vertAlign w:val="subscript"/.test(r("FSUB")), r("FSUB"));
  rec("Phong Arial -> rFonts Arial", /rFonts[^>]*Arial/.test(r("FARIAL")), r("FARIAL"));
  rec("Co chu 14 -> w:sz", /<w:sz w:val="\d+"/.test(r("FSZ14")), r("FSZ14"));
  rec("Mau chu do -> w:color FF0000", /w:color w:val="FF0000"/i.test(r("FRED")), r("FRED"));
  rec("To sang -> highlight/shd", /<w:highlight\b|<w:shd\b/.test(r("FHILITE")), r("FHILITE"));
  rec("Can giua -> jc center", /w:jc w:val="center"/.test(p("FCENTER")), p("FCENTER"));
  rec("Can phai -> jc right", /w:jc w:val="right"/.test(p("FRIGHT")), p("FRIGHT"));
  rec("Dau dau dong -> numPr", /<w:numPr>/.test(p("FBULLET")), p("FBULLET"));
  rec("Danh so -> numPr", /<w:numPr>/.test(p("FNUMBER")), p("FNUMBER"));
  rec("Tieu de 1 -> pStyle Heading1", /pStyle w:val="Heading1"/i.test(p("FHEAD1")), p("FHEAD1"));
} catch (error) { rec("Loi chay", false, String(error?.stack || error)); } finally { await session.close(); }
console.log(failed ? `TONG: ${failed} FAIL` : "TONG: tat ca PASS");
process.exit(failed ? 1 : 0);