// Writer: Trộn thư > Tô sáng trường trộn - bật/tắt nền màu của trường, không đổi nội dung tài liệu.
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { launchApp } from "./session.mjs";

const profile = process.env.VNO_CDP_LOCALAPPDATA || path.join(os.tmpdir(), `vno-mhl-${Date.now()}`);
fs.mkdirSync(profile, { recursive: true });
const session = await launchApp("writer", { localAppData: profile, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
const results = [];
const check = (name, pass, detail = "") => { results.push(Boolean(pass)); console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`); };
try {
  const { cdp } = session;
  await cdp.waitFor("!!window.__vnoAppInstance?.adapter && !!document.querySelector('.vno-writer-body')", { timeoutMilliseconds: 120000 });
  const ev = (expr) => cdp.evaluate(expr, { awaitPromise: true, timeoutMilliseconds: 120000 });
  await ev(`(() => { const b = document.querySelector('.vno-writer-body'); b.innerHTML = '<p>Kính gửi <span class="vno-merge-field" data-field="HoTen" contenteditable="false">«HoTen»</span></p>'; b.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  const bg = async () => { await new Promise(r => setTimeout(r, 400)); return ev(`getComputedStyle(document.querySelector('.vno-merge-field')).backgroundColor`); };
  const htmlBefore = await ev(`document.querySelector('.vno-writer-body').innerHTML`);
  const on = await bg();
  check("Mặc định: trường có nền màu", on !== "rgba(0, 0, 0, 0)" && on !== "transparent", on);
  await ev(`window.globalCommandBus.execute("writer.mailMerge.highlightFields")`);
  const off = await bg();
  check("Tắt tô sáng: nền trong suốt", off === "rgba(0, 0, 0, 0)" || off === "transparent", off);
  const htmlOff = await ev(`document.querySelector('.vno-writer-body').innerHTML`);
  check("Nội dung tài liệu không đổi khi bật/tắt", htmlOff === htmlBefore, htmlOff === htmlBefore ? "" : htmlBefore.slice(0, 200) + " ## " + htmlOff.slice(0, 200));
  await ev(`window.globalCommandBus.execute("writer.mailMerge.highlightFields")`);
  check("Bật lại: nền màu trở lại", (await bg()) === on);
  const exported = await ev(`window.__vnoAppInstance.adapter._contentForExport ? String(window.__vnoAppInstance.adapter._contentForExport()).includes('vno-merge-plain') : false`);
  check("Trạng thái hiển thị không lọt vào nội dung lưu", exported === false);
} catch (error) {
  check("Không phát sinh ngoại lệ", false, error.stack || error.message);
} finally { await session.close(); }
if (results.some(r => !r)) process.exit(1);
