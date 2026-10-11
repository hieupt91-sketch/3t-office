import { launchApp } from "../../../tests/live/cdp/session.mjs";
import { mkdirSync } from "node:fs";
const dir = process.env.VNO_WORD_PARALLEL_DIR || "E:\\VNOffice-profiles\\codex-ft7";
process.env.VNO_CDP_LOCALAPPDATA = process.env.VNO_CDP_LOCALAPPDATA || dir;
process.env.VNO_APP_ROOT = process.env.VNO_APP_ROOT || process.cwd();
mkdirSync(dir, { recursive: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const template = dir + "\\template.docx";
const ops = [
  ["bold", "writer.text.bold", null], ["italic", "writer.text.italic", null], ["underline", "writer.text.underline", null],
  ["strike", "writer.text.strike", null], ["subscript", "writer.text.subscript", null], ["superscript", "writer.text.superscript", null],
  ["size16", "writer.font.size", 16], ["fontArial", "writer.font.family", "Arial"],
  ["colorRed", "writer.color.text", "#FF0000"], ["highlightYellow", "writer.color.highlight", "#FFFF00"],
  ["alignCenter", "writer.para.alignCenter", null], ["alignRight", "writer.para.alignRight", null], ["alignJustify", "writer.para.justify", null],
  ["bullet", "writer.list.bullet", null], ["numbered", "writer.list.numbered", null],
  ["indentInc", "writer.para.indentInc", null], ["lineSpacing15", "writer.para.lineSpacing", 1.5],
  ["spaceBefore12", "writer.para.spacingBefore", 12], ["spaceAfter12", "writer.para.spacingAfter", 12], ["caseUpper", "writer.text.changeCase", null],
  ["default", null, null],
];
const only = (process.env.OPS || "").split(",").filter(Boolean);
for (const [name, cmd, arg] of ops) {
  if (only.length && !only.includes(name)) continue;
  const out = dir + "\\app_" + name + ".docx";
  const session = await launchApp("writer", { filePath: template, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
  const ev = (e) => session.cdp.evaluate(e, { awaitPromise: true, timeoutMilliseconds: 240000 });
  try {
    const norm = template.replace(/\\/g, "/").toLowerCase();
    await session.cdp.waitFor(`(() => { const a = window.__vnoAppInstance?.adapter; const p = String(a?._sourcePath || a?.sourceFilePath || '').replace(/\\\\/g, '/').toLowerCase(); return p === ${JSON.stringify(norm)} && document.querySelector('.vno-writer-body')?.textContent.includes('Alpha'); })()`, { timeoutMilliseconds: 240000, intervalMilliseconds: 500 });
    await sleep(2500);
    const status = await ev(`(async () => { const b=document.querySelector('.vno-writer-body'); b.focus(); const p=[...b.querySelectorAll('p')].find(x=>x.textContent.includes('Alpha')); const r=document.createRange(); r.selectNodeContents(p); const s=getSelection(); s.removeAllRanges(); s.addRange(r); let res='no-op'; ${cmd ? `const m=await import('/platform/commands/command-bus.js'); res=m.globalCommandBus.execute(${JSON.stringify(cmd)}, ${JSON.stringify(arg)}); await new Promise(r=>setTimeout(r,400));` : ""} return JSON.stringify({res: String(res), html: p.outerHTML}); })()`);
    const saved = await ev(`(() => { window.__vnoAuditContent = window.__vnoAppInstance.adapter._contentForExport(); return globalThis.globalUnoBridge.saveRealFileInPlace("writer", window.__vnoAuditContent, ${JSON.stringify(out)}, ${JSON.stringify(template)}); })()`);
    console.log(name.padEnd(16), "save=" + (saved && saved.status), "|", status.slice(0, 150));
    if (only.length && ["subscript", "superscript", "highlightYellow"].includes(name)) {
      console.log("HTML " + name + " " + JSON.parse(status).html);
    }
  } catch (e) { console.log(name.padEnd(16), "LOI:", String(e.message).slice(0, 120)); } finally { await session.close(); }
}
