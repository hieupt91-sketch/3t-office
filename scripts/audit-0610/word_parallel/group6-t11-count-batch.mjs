import fs from "node:fs/promises";
import path from "node:path";
import { launchApp } from "../../../tests/live/cdp/session.mjs";

const dir = process.env.VNO_CDP_LOCALAPPDATA;
const root = process.env.VNO_APP_ROOT || process.cwd();
const source = path.join(root, "file test", "landocx");
if (!dir) throw new Error("VNO_CDP_LOCALAPPDATA is required.");
const names = ["d01.docx", "d02.docx", "d06.docx", "d07.docx", "d13.docx", "d20.docx", "d24.docx"];
const rows = [];
for (const name of names) {
  const profile = path.join(dir, "group6_profiles", `count-${path.parse(name).name}`);
  const session = await launchApp("writer", { root, filePath: path.join(source, name), localAppData: profile, startTimeoutMilliseconds: 240000, readyTimeoutMilliseconds: 240000 });
  try {
    const cdp = session.cdp;
    await cdp.waitFor("(document.querySelector('.vno-writer-body')?.innerText||'').trim().length>30 && !!window.__vnoAppInstance?.adapter", { timeoutMilliseconds: 240000, intervalMilliseconds: 500 });
    const stats = await cdp.evaluate("window.__vnoAppInstance.adapter.getWordCountStats({preferSelection:false})", { timeoutMilliseconds: 180000 });
    const detail = await cdp.evaluate(`(() => {const b=document.querySelector('.vno-writer-body');const root=b.cloneNode(true);root.querySelectorAll('[data-vno-float]').forEach(x=>x.remove());const raw=root.textContent||'';const clean=root.cloneNode(true);clean.querySelectorAll('[data-vno-auto-page-gap="true"],.vno-section-break,[data-vno-page-break="true"]').forEach(x=>x.remove());const text=clean.textContent||'';const count=x=>x.replace(/[\\r\\n\\u2028\\u2029]/g,'').length;return {rawCharactersWithSpaces:count(raw),cleanCharactersWithSpaces:count(text),rawCharactersNoSpaces:raw.replace(/\\s/g,'').length,cleanCharactersNoSpaces:text.replace(/\\s/g,'').length,autoPageGaps:b.querySelectorAll('[data-vno-auto-page-gap="true"]').length,sectionBreaks:b.querySelectorAll('.vno-section-break').length}})()`);
    rows.push({ name, stats, detail });
    console.log(name, JSON.stringify({ stats, detail }));
  } finally { await session.close(); }
}
await fs.writeFile(path.join(dir, "t11_group6_count_batch.json"), JSON.stringify(rows, null, 2), "utf8");
