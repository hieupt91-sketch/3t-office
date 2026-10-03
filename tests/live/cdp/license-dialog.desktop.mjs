// Desktop (WebView2 + CDP) test of Tệp > Tài khoản và bản quyền in Doc, Sheet and Slide.
// No OS-level input: typing/keys go through CDP only. The license server address points at a closed local port,
// so the live server is never contacted.
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { launchApp, repoRoot } from "./session.mjs";
import { sleep } from "./client.mjs";

const VALID_KEY = "3TO-ABCDE-FGHJK-MNPQR-STVW1";
const BAD_CHECKSUM_KEY = "3TO-ABCDE-FGHJK-MNPQR-STVWZ";
const APPS = [["writer", "Doc"], ["sheet", "Sheet"], ["slides", "Slide"]];
const shots = path.join(repoRoot, "docs", "screens-license");
mkdirSync(shots, { recursive: true });

const results = [];
const record = (app, name, pass, detail = "") => {
  results.push({ app, name, pass });
  console.log(`${pass ? "PASS" : "FAIL"} | ${app} | ${name}${detail ? " | " + detail : ""}`);
};

process.env.VNO_LICENSE_API_BASE = "http://127.0.0.1:9/api/v1/license";

async function until(cdp, expression, timeout = 15000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const value = await cdp.evaluate(expression);
    if (value) return value;
    await sleep(120);
  }
  return null;
}

async function typeText(cdp, text) {
  await cdp.send("Input.insertText", { text });
  await sleep(250);
}

async function pressKey(cdp, key, code, vk) {
  for (const type of ["keyDown", "keyUp"]) {
    await cdp.send("Input.dispatchKeyEvent", { type, key, code, windowsVirtualKeyCode: vk });
  }
}

async function runApp([app, label]) {
  const session = await launchApp(app, { startTimeoutMilliseconds: 120000 });
  const { cdp } = session;
  try {
    await sleep(1500);
    await cdp.evaluate(`import('/platform/commands/command-bus.js').then(m => m.globalCommandBus.execute('common.file.backstage')); 1`);
    const hasAccount = await until(cdp, `!!document.querySelector('#vno-backstage-account')`);
    record(label, "Menu Tệp có mục Tài khoản và bản quyền", !!hasAccount,
      await cdp.evaluate(`document.querySelector('#vno-backstage-account')?.textContent.trim() ?? ''`));
    await cdp.evaluate(`document.querySelector('#vno-backstage-account')?.click(); 1`);
    const opened = await until(cdp, `!!document.querySelector('.vno-license-dialog')`);
    record(label, "Hộp bản quyền mở được", !!opened);
    const status = await until(cdp, `document.querySelector('#vno-license-status .vno-license-badge')?.textContent ?? ''`);
    const statusText = await cdp.evaluate(`document.querySelector('#vno-license-status')?.innerText ?? ''`);
    record(label, "Trạng thái dùng thử 30 ngày", status === "Dùng thử" && /30 ngày/.test(statusText), statusText.replace(/\s+/g, " ").slice(0, 80));

    const focusOnInput = await cdp.evaluate(`document.activeElement?.id === 'vno-license-key'`);
    record(label, "Ô mã kích hoạt được focus sẵn", focusOnInput === true);

    await typeText(cdp, "3to abcde-fghjk mnpqr stvwz");
    const typed = await cdp.evaluate(`document.querySelector('#vno-license-key').value`);
    record(label, "Ô nhập tự chuẩn hóa chữ hoa và dấu gạch", typed === BAD_CHECKSUM_KEY, typed);
    const hintBad = await until(cdp, `/chưa đúng/.test(document.querySelector('#vno-license-key-hint')?.textContent ?? '') ? document.querySelector('#vno-license-key-hint').textContent : ''`);
    const disabledBad = await cdp.evaluate(`document.querySelector('#vno-license-activate').disabled`);
    record(label, "Sai checksum: báo lỗi gõ và khóa nút Kích hoạt", !!hintBad && disabledBad === true);

    await cdp.evaluate(`(() => { const i = document.querySelector('#vno-license-key'); i.value=''; i.dispatchEvent(new Event('input', {bubbles:true})); i.focus(); return 1; })()`);
    await typeText(cdp, VALID_KEY);
    const hintOk = await until(cdp, `/hợp lệ/.test(document.querySelector('#vno-license-key-hint')?.textContent ?? '') ? 1 : 0`);
    const enabledOk = await cdp.evaluate(`!document.querySelector('#vno-license-activate').disabled`);
    record(label, "Đúng checksum: báo hợp lệ và mở nút Kích hoạt", !!hintOk && enabledOk === true,
      await cdp.evaluate(`JSON.stringify({value: document.querySelector('#vno-license-key').value, hint: document.querySelector('#vno-license-key-hint').textContent.slice(0, 40), disabled: document.querySelector('#vno-license-activate').disabled})`));

    await cdp.evaluate(`document.querySelector('#vno-license-activate').click(); 1`);
    const netMessage = await until(cdp, `document.querySelector('#vno-license-message:not([hidden])')?.textContent ?? ''`, 20000);
    record(label, "Mất mạng: thông báo tiếng Việt rõ ràng, trạng thái giữ nguyên", /Không kết nối được máy chủ bản quyền/.test(netMessage || "")
      && /Dùng thử/.test(await cdp.evaluate(`document.querySelector('#vno-license-status')?.innerText ?? ''`)), netMessage || "");

    await cdp.evaluate(`document.querySelector('#vno-license-offline').open = true; 1`);
    const deviceCode = await cdp.evaluate(`document.querySelector('#vno-license-device-code')?.textContent ?? ''`);
    record(label, "Mã thiết bị ngoại tuyến đúng dạng 3TD-…", /^3TD(-[0-9A-HJKMNP-TV-Z]{5}){5}$/.test(deviceCode), deviceCode);
    await cdp.evaluate(`document.querySelector('#vno-license-offline-code').value = 'abc.def'; document.querySelector('#vno-license-apply-offline').click(); 1`);
    const offlineMessage = await until(cdp, `/không đúng hoặc không dành cho máy này/.test(document.querySelector('#vno-license-message')?.textContent ?? '') ? document.querySelector('#vno-license-message').textContent : ''`);
    record(label, "Mã ngoại tuyến sai bị từ chối", !!offlineMessage, offlineMessage || "");

    // Keyboard: Tab never leaves the dialog.
    await cdp.evaluate(`document.querySelector('#vno-license-key').focus(); 1`);
    let escaped = false;
    for (let i = 0; i < 20 && !escaped; i++) {
      await pressKey(cdp, "Tab", "Tab", 9);
      escaped = !(await cdp.evaluate(`!!document.activeElement?.closest('.vno-license-dialog')`));
    }
    record(label, "Phím Tab được giữ trong hộp (không rơi ra tài liệu)", !escaped);

    // 360 px wide window: no horizontal overflow inside the dialog.
    await cdp.send("Emulation.setDeviceMetricsOverride", { width: 360, height: 700, deviceScaleFactor: 1, mobile: false });
    await sleep(400);
    const overflow = await cdp.evaluate(`(() => { const d = document.querySelector('.vno-license-dialog'); const b = d.querySelector('.vno-license-body'); return { dialog: d.scrollWidth - d.clientWidth, body: b.scrollWidth - b.clientWidth, width: d.getBoundingClientRect().width }; })()`);
    record(label, "Cửa sổ 360 px: không tràn ngang", overflow.dialog <= 1 && overflow.body <= 1, JSON.stringify(overflow));
    await cdp.send("Emulation.clearDeviceMetricsOverride");
    await sleep(300);

    const shot = await cdp.send("Page.captureScreenshot", { format: "png" });
    const data = shot.result?.data ?? shot.data;
    if (data) writeFileSync(path.join(shots, `${app}-license-dialog.png`), Buffer.from(data, "base64"));

    await pressKey(cdp, "Escape", "Escape", 27);
    const closed = await until(cdp, `!document.querySelector('.vno-license-dialog')`);
    record(label, "Esc đóng hộp", !!closed);
  } finally {
    await session.close();
  }
}

try {
  for (const entry of APPS) await runApp(entry);
} finally {
  delete process.env.VNO_LICENSE_API_BASE;
}
const failed = results.filter((r) => !r.pass).length;
console.log(`KẾT QUẢ HỘP BẢN QUYỀN: ${results.length - failed}/${results.length} PASS | ${failed} FAIL`);
process.exit(failed ? 1 : 0);
