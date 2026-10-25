// Writer: Ctrl+End / Ctrl+Home (macOS: Cmd+End / Cmd+Home = Fn+Cmd+→ / Fn+Cmd+←) đưa con trỏ tới cuối / đầu tài liệu.
// Lỗi gốc D9 (soạn thử trên macOS 25/10/2026): khi tài liệu có chú thích cuối trang, khung chú thích
// `contenteditable="false"` nằm cuối thân bài → con trỏ bị Chromium dời về ĐẦU tài liệu.
// Phím tắt gửi theo nền tảng qua pressShortcut + bảng phím dùng chung (keymap-macos.js).
import { launchApp } from "./session.mjs";
import { sleep, click, typeText, press, pressShortcut } from "./actions.mjs";

const checks = [];
const check = (name, pass, detail = "") => { checks.push(Boolean(pass)); console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`); };
const session = await launchApp("writer", {});
try {
  const { cdp } = session;
  const ev = (e) => cdp.evaluate(e, { awaitPromise: true, timeoutMilliseconds: 60000 });
  const body = ".vno-writer-body";
  const html = () => ev(`document.querySelector('${body}').innerHTML.replace(/ style="[^"]*"/g, '').replace(/<button[\\s\\S]*?<\\/button>/g, '').replace(/<span class="vno-spell[^>]*>|<\\/span>/g, '')`);
  const docEnd = () => pressShortcut(cdp, "Ctrl+End", { commandId: "writer.nav.docEnd" });
  const docStart = () => pressShortcut(cdp, "Ctrl+Home", { commandId: "writer.nav.docStart" });
  const base = "<h1>Tiêu đề tài liệu</h1><p>Đoạn một</p><h2>Tiêu đề 2</h2>";
  await sleep(2500);

  // Tài liệu có chú thích cuối trang, chèn bằng lệnh thật của app.
  await ev(`document.querySelector('${body}').innerHTML = ${JSON.stringify(base + "<p>Đoạn có chú thích</p>")}`);
  await click(cdp, `${body} p:last-of-type`); await press(cdp, "End");
  await ev(`window.globalCommandBus.execute('writer.reference.footnoteInsert')`); await sleep(800);
  await typeText(cdp, "Nội dung chú thích", 5); await sleep(300);
  const hasFootnote = await ev(`!!document.querySelector('${body} [data-vno-footnotes="true"]')`);
  check("Đã chèn chú thích cuối trang (khung chú thích ở cuối thân bài)", hasFootnote);

  await click(cdp, `${body} h2`); await docEnd(); await sleep(300);
  await typeText(cdp, "Z", 5); await sleep(300);
  let h = await html();
  check("Có chú thích: Ctrl/Cmd+End rồi gõ → chữ ở cuối đoạn cuối (sau số chú thích), không ở đầu tài liệu",
    /<h1>Tiêu đề tài liệu<\/h1>/.test(h) && /Đoạn có chú thích<sup[^>]*>1<\/sup>Z<\/p>/.test(h), h.slice(0, 400));

  await click(cdp, `${body} h2`); await docStart(); await sleep(300);
  await typeText(cdp, "A", 5); await sleep(300);
  h = await html();
  check("Ctrl/Cmd+Home rồi gõ → chữ ở đầu tiêu đề tài liệu", /<h1>ATiêu đề tài liệu<\/h1>/.test(h), h.slice(0, 200));

  // Bảng cuối tài liệu: không gõ ra ngoài bảng thành chữ trơ trọi trong thân bài.
  await ev(`document.querySelector('${body}').innerHTML = ${JSON.stringify(base + "<table><tbody><tr><td>a</td><td>b</td></tr><tr><td>c</td><td>Ô cuối</td></tr></tbody></table>")}`);
  await click(cdp, `${body} h2`); await docEnd(); await sleep(200);
  await typeText(cdp, "Z", 5); await sleep(300);
  h = await html();
  check("Bảng cuối: Ctrl/Cmd+End rồi gõ → chữ ở cuối ô cuối", /<td>Ô cuốiZ<\/td><\/tr><\/tbody><\/table>$/.test(h), h.slice(-120));

  // Danh sách cuối tài liệu.
  await ev(`document.querySelector('${body}').innerHTML = ${JSON.stringify(base + "<ul><li>Mục một</li><li>Mục cuối</li></ul>")}`);
  await click(cdp, `${body} h2`); await docEnd(); await sleep(200);
  await typeText(cdp, "Z", 5); await sleep(300);
  h = await html();
  check("Danh sách cuối: Ctrl/Cmd+End rồi gõ → chữ ở cuối mục cuối", /<li>Mục cuốiZ<\/li><\/ul>$/.test(h), h.slice(-120));
} catch (error) {
  check("Không phát sinh ngoại lệ", false, error.stack || error.message);
} finally { await session.close().catch(() => {}); }
if (checks.some((c) => !c)) process.exit(1);
