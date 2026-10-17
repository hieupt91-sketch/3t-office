import { launchApp } from "./session.mjs";
import { click, press, sleep } from "./actions.mjs";
import path from "node:path";

const file = process.argv[2];
if (!file) throw new Error("Usage: writer-styles-reopen.desktop.mjs <saved.docx>");
const session = await launchApp("writer", { filePath: path.resolve(file), startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
const checks = [];
const check = (name, pass, detail = "") => {
  checks.push({ name, pass: Boolean(pass) });
  console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`);
};
const ev = (expression) => session.cdp.evaluate(expression, { awaitPromise: true, timeoutMilliseconds: 60000 });
try {
  await session.cdp.waitFor("(document.querySelector('.vno-writer-body')?.textContent || '').replace(/\\s+/g, ' ').includes('Đoạn kiểm tra kiểu mới')", { timeoutMilliseconds: 180000, intervalMilliseconds: 500 });
  await sleep(900);
  await click(session.cdp, ".vno-writer-body [data-vno-style-id=\"VnoKieuthu1\"]");
  await press(session.cdp, "s", { ctrl: true, alt: true, shift: true });
  await session.cdp.waitFor("!!document.querySelector('.vno-writer-styles-pane')", { timeoutMilliseconds: 8000 });
  const result = await ev(`(() => { const a=window.__vnoAppInstance.adapter, p=document.querySelector('.vno-writer-body [data-vno-style-id="VnoKieuthu1"]'); return {listed:[...document.querySelectorAll('.vno-writer-styles-pane [role=option]')].some(e=>e.dataset.styleId==='VnoKieuthu1' && e.textContent==='Kiểu thử 1'),current:a.getCurrentParagraphStyle(), font:p?.style.fontFamily,size:p?.style.fontSize,bold:p?.style.fontWeight,align:p?.style.textAlign,after:p?.style.marginBottom,style:a._customParagraphStyles?.find(s=>s.id==='VnoKieuthu1')?.name}; })()`);
  check("DOCX mở lại và kiểu tùy chỉnh hiện trong Ngăn Kiểu", result?.listed && result.style === "Kiểu thử 1", JSON.stringify(result));
  check("Đoạn vẫn liên kết đúng kiểu và định dạng", result?.current === "VnoKieuthu1" && /Arial/i.test(result.font || "") && result.size === "13pt" && result.bold === "700" && result.align === "center" && result.after === "12pt", JSON.stringify(result));
} catch (error) {
  check("Không phát sinh ngoại lệ", false, error.stack || error.message);
} finally {
  await session.close();
}
if (checks.some((item) => !item.pass)) process.exit(1);
console.log(`Writer styles reopen: ${checks.length}/${checks.length} PASS`);
