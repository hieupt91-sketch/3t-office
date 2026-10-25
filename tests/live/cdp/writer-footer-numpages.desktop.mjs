// Phím tắt gửi theo nền tảng (Ctrl trên Windows, Cmd trên macOS) qua pressShortcut + bảng phím dùng chung.
// Writer: chân trang có số trang tổng (NUMPAGES) phải theo số trang thật, không luôn ghi "Trang 1 / 1".
import { launchApp } from "./session.mjs";
import { sleep, click, typeText, press, pressShortcut } from "./actions.mjs";
const checks = [];
const check = (name, pass, detail = "") => { checks.push(Boolean(pass)); console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`); };
const session = await launchApp("writer", {});
try {
  const { cdp } = session;
  const ev = (e) => cdp.evaluate(e, { awaitPromise: true, timeoutMilliseconds: 60000 });
  await sleep(2500);
  await ev(`window.globalCommandBus.execute("writer.footer.insert")`); await sleep(500);
  const footer = () => ev(`(document.querySelector('.vno-writer-footer')?.innerText || '').replace(/\\s+/g, ' ').trim()`);
  check("Tài liệu 1 trang: chân trang Trang 1 / 1", /Trang 1 \/ 1/.test(await footer()), await footer());
  await click(cdp, ".vno-writer-body");
  await typeText(cdp, "Trang một", 5);
  await pressShortcut(cdp, "Ctrl+Enter", { commandId: "writer.page.break" }); await typeText(cdp, "Trang hai", 5);
  await pressShortcut(cdp, "Ctrl+Enter", { commandId: "writer.page.break" }); await typeText(cdp, "Trang ba", 5);
  await sleep(2000);
  check("Tài liệu 3 trang: chân trang Trang 1 / 3", /Trang 1 \/ 3/.test(await footer()), await footer());
  // Xóa hết nội dung thân bài: tổng trang trở về 1
  await click(cdp, ".vno-writer-body");
  await pressShortcut(cdp, "Ctrl+A", { commandId: "common.edit.selectAll" }); await press(cdp, "Delete"); await sleep(2500);
  const after = await footer();
  check("Xóa hết nội dung: tổng trang giảm về 1", /Trang 1 \/ 1/.test(after), after);
} catch (error) {
  check("Không phát sinh ngoại lệ", false, error.stack || error.message);
} finally { await session.close().catch(() => {}); }
if (checks.some((c) => !c)) process.exit(1);