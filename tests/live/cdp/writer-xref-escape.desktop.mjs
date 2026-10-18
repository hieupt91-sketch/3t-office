// Writer: hộp Tham chiếu chéo - chữ tiêu đề chứa ký tự < > phải hiện nguyên văn, không chạy thành thẻ.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { launchApp } from "./session.mjs";

const profile = process.env.VNO_CDP_LOCALAPPDATA || path.join(os.tmpdir(), `vno-xref-${Date.now()}`);
fs.mkdirSync(profile, { recursive: true });
const session = await launchApp("writer", { localAppData: profile, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
const results = [];
const check = (name, pass, detail = "") => { results.push(Boolean(pass)); console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`); };
try {
  const { cdp } = session;
  await cdp.waitFor("!!window.__vnoAppInstance?.adapter && !!document.querySelector('.vno-writer-body')", { timeoutMilliseconds: 120000 });
  const ev = (expr) => cdp.evaluate(expr, { awaitPromise: true, timeoutMilliseconds: 120000 });
  const EVIL = "Muc <img id=zz src=x> va </option><b id=yy>x</b>";
  await ev(`(() => {
    const b = document.querySelector('.vno-writer-body');
    b.innerHTML = '<h1></h1><p>noi dung</p>';
    b.querySelector('h1').textContent = ${JSON.stringify(EVIL)};
    b.dispatchEvent(new Event('input', { bubbles: true }));
    const r = document.createRange(); r.selectNodeContents(b.querySelector('p')); r.collapse(false); const s = getSelection(); s.removeAllRanges(); s.addRange(r); b.focus();
  })()`);
  ev(`window.globalCommandBus.execute("writer.insert.crossReference")`).catch(() => {});
  await cdp.waitFor("document.querySelector('#vno-xref-select')", { timeoutMilliseconds: 15000 });
  const info = JSON.parse(await ev(`JSON.stringify({ injected: !!document.querySelector('#zz, #yy'), options: [...document.querySelectorAll('#vno-xref-select option')].map(o => o.textContent) })`));
  check("Thẻ trong chữ tiêu đề không chạy", info.injected === false, JSON.stringify(info));
  check("Tiêu đề hiện nguyên văn trong danh sách", info.options.some(t => t.includes(EVIL)), JSON.stringify(info.options));
} catch (error) {
  check("Không phát sinh ngoại lệ", false, error.stack || error.message);
} finally { await session.close().catch(() => {}); }
if (results.some(r => !r)) process.exit(1);
