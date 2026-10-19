// Writer: gõ danh sách bằng bàn phím thật — bật danh sách ở dòng trống / sau khi gõ chữ / giữa dòng, Ctrl+Shift+L, tắt rồi bật lại, hoàn tác.
// Lỗi gốc (phát hiện khi soạn thử như người dùng): sau khi bật danh sách con trỏ nhảy về đầu dòng hoặc đoạn trước nên chữ gõ tiếp dính sai chỗ.
import { launchApp } from "./session.mjs";
import { sleep, click, typeText, press } from "./actions.mjs";

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
    await press(cdp, "End", { ctrl: true });
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

  await reset(); await press(cdp, "Enter"); await press(cdp, "l", { ctrl: true, shift: true }); await sleep(300);
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

  await press(cdp, "z", { ctrl: true }); await press(cdp, "z", { ctrl: true }); await sleep(300);
  h = await html();
  check("Ctrl+Z hai lần: bỏ chữ Z và bỏ danh sách", h === "<p>Mở đầu</p><p>Giữa XYdòng</p>", h);
} catch (error) {
  check("Không phát sinh ngoại lệ", false, error.stack || error.message);
} finally { await session.close().catch(() => {}); }
if (checks.some((c) => !c)) process.exit(1);