// Phím tắt gửi theo nền tảng (Ctrl trên Windows, Cmd trên macOS) qua pressShortcut + bảng phím dùng chung.
// Writer: gõ danh sách bằng bàn phím thật — bật danh sách ở dòng trống / sau khi gõ chữ / giữa dòng, Ctrl+Shift+L, tắt rồi bật lại, hoàn tác.
// Lỗi gốc (phát hiện khi soạn thử như người dùng): sau khi bật danh sách con trỏ nhảy về đầu dòng hoặc đoạn trước nên chữ gõ tiếp dính sai chỗ.
import { launchApp } from "./session.mjs";
import { sleep, click, typeText, press, pressShortcut } from "./actions.mjs";

const checks = [];
const check = (name, pass, detail = "") => { checks.push(Boolean(pass)); console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`); };
const session = await launchApp("writer", {});
try {
  const { cdp } = session;
  const ev = (e) => cdp.evaluate(e, { awaitPromise: true, timeoutMilliseconds: 60000 });
  const body = ".vno-writer-body";
  const html = () => ev(`document.querySelector('${body}').innerHTML.replace(/ style="[^"]*"/g, '').replace(/<span class="vno-spelling[^>]*>|<\\/span>|<span>/g, '')`);
  const reset = async () => {
    await ev(`document.querySelector('${body}').innerHTML = '<p>Mở đầu</p>'`);
    await click(cdp, `${body} p`);
    await pressShortcut(cdp, "Ctrl+End", { commandId: "writer.nav.docEnd" });
  };
  const bullet = () => click(cdp, '[data-command-id="writer.list.bullet"]');
  const numbered = () => click(cdp, '[data-command-id="writer.list.numbered"]');
  await sleep(2500);

  await reset(); await press(cdp, "Enter"); await bullet(); await sleep(300);
  await typeText(cdp, "Mục một", 5); await press(cdp, "Enter"); await typeText(cdp, "Mục hai", 5);
  let h = await html();
  check("Dòng trống → bấm nút đầu dòng → gõ 2 mục", h === "<p>Mở đầu</p><ul><li>Mục một</li><li>Mục hai</li></ul>", h);

  await reset(); await press(cdp, "Enter"); await typeText(cdp, "Mục một", 5); await bullet(); await sleep(300);
  await press(cdp, "Enter"); await typeText(cdp, "Mục hai", 5);
  h = await html();
  check("Gõ chữ trước rồi bấm nút → Enter → mục kế tiếp nằm SAU mục một", h === "<p>Mở đầu</p><ul><li>Mục một</li><li>Mục hai</li></ul>", h);

  await reset(); await press(cdp, "Enter"); await pressShortcut(cdp, "Ctrl+Shift+L", { commandId: "writer.list.bullet" }); await sleep(300);
  await typeText(cdp, "Mục một", 5); await press(cdp, "Enter"); await typeText(cdp, "Mục hai", 5);
  h = await html();
  check("Ctrl+Shift+L trên dòng trống cho cùng kết quả", h === "<p>Mở đầu</p><ul><li>Mục một</li><li>Mục hai</li></ul>", h);

  await reset(); await press(cdp, "Enter"); await numbered(); await sleep(300);
  await typeText(cdp, "Một", 5); await press(cdp, "Enter"); await typeText(cdp, "Hai", 5);
  await press(cdp, "Enter"); await press(cdp, "Enter"); await typeText(cdp, "Hết", 5);
  h = await html();
  check("Danh sách đánh số: Enter hai lần thoát danh sách, chữ sau nằm ngoài", /^<p>Mở đầu<\/p><ol><li>Một<\/li><li>Hai<\/li><\/ol><(p|div)>Hết<\/(p|div)>$/.test(h), h);

  await reset(); await press(cdp, "Enter"); await typeText(cdp, "Giữa dòng", 5); await press(cdp, "ArrowLeft"); await press(cdp, "ArrowLeft"); await press(cdp, "ArrowLeft"); await press(cdp, "ArrowLeft");
  await bullet(); await sleep(300); await typeText(cdp, "X", 5);
  h = await html();
  check("Con trỏ giữa dòng giữ nguyên chỗ sau khi bật danh sách (gõ X vào giữa)", h === "<p>Mở đầu</p><ul><li>Giữa Xdòng</li></ul>", h);

  await bullet(); await sleep(300); await typeText(cdp, "Y", 5);
  h = await html();
  check("Tắt danh sách: dòng trở lại đoạn <p>, chữ gõ tiếp đúng chỗ", h === "<p>Mở đầu</p><p>Giữa XYdòng</p>", h);

  await bullet(); await sleep(300); await typeText(cdp, "Z", 5);
  h = await html();
  check("Bật lại danh sách: chữ gõ tiếp đúng chỗ", /^<p>Mở đầu<\/p><ul><li>Giữa XYZdòng<\/li><\/ul>$/.test(h), h);

  // Thoát danh sách rồi DỪNG gõ một lúc (lượt kiểm tra chính tả chạy lúc rảnh) — con trỏ phải ở lại dòng mới
  await reset(); await press(cdp, "Enter"); await bullet(); await sleep(300);
  await typeText(cdp, "Một", 5); await press(cdp, "Enter"); await typeText(cdp, "Hai", 5); await press(cdp, "Enter"); await press(cdp, "Enter");
  await sleep(2500);
  await typeText(cdp, "Sau danh sách", 5);
  h = await html();
  check("Thoát danh sách, dừng 2,5 s rồi gõ: chữ nằm ngoài danh sách (không nhảy về mục cuối)", /^<p>Mở đầu<\/p><ul><li>Một<\/li><li>Hai<\/li><\/ul><(p|div)>Sau danh sách<\/(p|div)>$/.test(h), h);

  await reset(); await press(cdp, "Enter"); await bullet(); await sleep(300);
  await typeText(cdp, "Một", 5); await press(cdp, "Enter"); await typeText(cdp, "Hai", 5);
  await pressShortcut(cdp, "Ctrl+Z", { commandId: "common.edit.undo" }); await pressShortcut(cdp, "Ctrl+Z", { commandId: "common.edit.undo" }); await sleep(300);
  h = await html();
  check("Ctrl+Z hai lần không làm hỏng cấu trúc (không còn mục danh sách chứa chữ cũ)", !/Hai<\/li><li>Hai/.test(h) && !h.includes("undefined"), h);
} catch (error) {
  check("Không phát sinh ngoại lệ", false, error.stack || error.message);
} finally { await session.close().catch(() => {}); }
if (checks.some((c) => !c)) process.exit(1);