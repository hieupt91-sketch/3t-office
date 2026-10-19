// Writer: thanh trạng thái "Trang X / Y" theo vị trí con trỏ và số trang thật (có ngắt trang).
import { launchApp } from "./session.mjs";
import { sleep, click, insertText, press } from "./actions.mjs";
const checks = [];
const check = (name, pass, detail = "") => { checks.push(Boolean(pass)); console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`); };
const session = await launchApp("writer", {});
try {
  const ev = (e) => session.cdp.evaluate(e, { awaitPromise: true, timeoutMilliseconds: 60000 });
  await sleep(2500);
  const status = () => ev(`(document.querySelector('.vno-statusbar')?.textContent || '').replace(/\\s+/g, ' ')`);
  const pageText = async () => (await status()).match(/Trang\s+(\d+)\s*\/\s*(\d+)/)?.slice(1).map(Number) || null;
  check("Tài liệu trống: Trang 1 / 1", JSON.stringify(await pageText()) === "[1,1]", await status());
  // Dựng 3 trang bằng 2 ngắt trang (gõ bằng bàn phím thật qua CDP), con trỏ ở trang cuối
  await click(session.cdp, ".vno-writer-body");
  await insertText(session.cdp, "Trang một");
  await ev(`window.globalCommandBus.execute('writer.page.break')`); await sleep(300);
  await insertText(session.cdp, "Trang hai");
  await ev(`window.globalCommandBus.execute('writer.page.break')`); await sleep(300);
  await insertText(session.cdp, "Trang ba");
  await sleep(2000);
  let p = await pageText();
  check("Sau hai ngắt trang: tổng 3 trang, con trỏ ở trang 3", p && p[1] === 3 && p[0] === 3, JSON.stringify(p) + " | " + await status());
  // Đưa con trỏ về đầu tài liệu
  await ev(`window.globalCommandBus.execute('writer.nav.docStart')`); await sleep(1200);
  p = await pageText();
  check("Ctrl+Home: Trang 1 / 3", p && p[0] === 1 && p[1] === 3, JSON.stringify(p));
  // Con trỏ vào đoạn "Trang hai"
  await ev(`(() => { const ed = document.querySelector('.vno-writer-body'); const w = document.createTreeWalker(ed, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) { if (n.textContent.includes('Trang hai')) { const r = document.createRange(); r.setStart(n, 3); r.collapse(true); const s = getSelection(); s.removeAllRanges(); s.addRange(r); document.dispatchEvent(new Event('selectionchange')); return true; } } return false; })()`);
  await sleep(1200);
  p = await pageText();
  check("Con trỏ trong 'Trang hai': Trang 2 / 3", p && p[0] === 2 && p[1] === 3, JSON.stringify(p) + " | " + await status());
} catch (error) {
  check("Không phát sinh ngoại lệ", false, error.stack || error.message);
} finally { await session.close().catch(() => {}); }
if (checks.some((c) => !c)) process.exit(1);