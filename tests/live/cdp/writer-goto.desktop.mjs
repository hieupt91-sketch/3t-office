// Writer: Đi đến (Ctrl+G) mở hộp thoại; điều hướng tới đề mục / dòng đưa con trỏ đúng đoạn.
import { launchApp } from "./session.mjs";
import { click, press, sleep } from "./actions.mjs";

const profile = process.env.VNO_CDP_LOCALAPPDATA;
if (!profile) throw new Error("VNO_CDP_LOCALAPPDATA must point to an isolated profile.");
const session = await launchApp("writer", { localAppData: profile });
const { cdp } = session;
const checks = [];
const check = (name, pass, detail = "") => {
  checks.push(Boolean(pass));
  console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`);
};
const caretText = () => cdp.evaluate(`(() => { const n = window.getSelection()?.anchorNode; const el = n && (n.nodeType === 3 ? n.parentElement : n); return (el?.closest('h1,h2,h3,p')?.textContent || '').trim(); })()`);
try {
  await sleep(1500);
  await cdp.evaluate(`(() => { const b = document.querySelector('.vno-writer-body'); b.innerHTML = '<h1>Chuong 1</h1><p>noi dung mot</p><h1>Chuong 2</h1><p>noi dung hai</p><h1>Chuong 3</h1><p>noi dung ba</p>'; b.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await click(cdp, ".vno-writer-body p");
  await sleep(300);
  await press(cdp, "g", { ctrl: true });
  await sleep(500);
  const open = await cdp.evaluate(`!!document.querySelector('.vno-dialog-overlay, [role=dialog]')`);
  check("Ctrl+G mở hộp thoại Đi đến", open === true);
  await press(cdp, "Escape");
  await sleep(300);
  await cdp.evaluate(`window.__vnoAppInstance.adapter.navigateToGoToTarget({ type: 'heading', target: 3 })`);
  await sleep(300);
  check("Đi đến đề mục 3 đưa con trỏ vào «Chuong 3»", (await caretText()).startsWith("Chuong 3"), await caretText());
  await cdp.evaluate(`window.__vnoAppInstance.adapter.navigateToGoToTarget({ type: 'heading', target: 1 })`);
  await sleep(300);
  check("Đi đến đề mục 1 quay lại «Chuong 1»", (await caretText()).startsWith("Chuong 1"), await caretText());
} catch (error) {
  check("Không phát sinh ngoại lệ", false, error.stack || error.message);
} finally {
  await session.close();
}
if (checks.some((c) => !c)) process.exit(1);
