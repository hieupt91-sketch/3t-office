// S1: tệp bị đổi từ bên ngoài khi lưu. Kiểm trong ứng dụng thật qua CDP (không dùng thao tác hệ điều hành), khung 1366x768.
// Dùng: node --experimental-websocket save-external-change.desktop.mjs <thư-mục-làm-việc>   (cần VNO_CDP_LOCALAPPDATA)
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, utimesSync, writeFileSync } from "node:fs";
import path from "node:path";
import { launchApp } from "./session.mjs";
import { press, sleep } from "./actions.mjs";

const work = process.argv[2];
const profile = process.env.VNO_CDP_LOCALAPPDATA;
if (!work || !profile) throw new Error("Cần thư mục làm việc và VNO_CDP_LOCALAPPDATA.");
rmSync(work, { recursive: true, force: true });
rmSync(path.join(profile, "VNOffice", "save-backups"), { recursive: true, force: true });
mkdirSync(work, { recursive: true });
const stub = path.join(work, "dialog-stub.json");
process.env.VNO_CDP_FILE_DIALOG_STUB = stub;
const queueDialogAnswer = answer => writeFileSync(stub, JSON.stringify({ responses: [answer] }), "utf8");
queueDialogAnswer(null);

const THEIRS = Buffer.from("noi dung do chuong trinh khac ghi len tep nay");
const results = [];
const check = (name, pass, detail = "") => {
  results.push(pass);
  console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? " | " + detail : ""}`);
};
const OVERLAY = ".vno-dialog-overlay";
const CHOICE = name => `${OVERLAY} [data-unsaved-choice="${name}"]`;
const dialogOpen = cdp => cdp.evaluate(`!!document.querySelector('${CHOICE("save")}')`);
const waitDialog = cdp => cdp.waitFor(`!!document.querySelector('${CHOICE("save")}')`, { timeoutMilliseconds: 240000, intervalMilliseconds: 200 });
const waitNoDialog = cdp => cdp.waitFor(`!document.querySelector('${OVERLAY}')`, { timeoutMilliseconds: 240000, intervalMilliseconds: 200 });

async function shoot(cdp, name) {
  const shot = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  const file = path.join(work, `${name}.png`);
  writeFileSync(file, Buffer.from((shot.result || shot).data, "base64"));
  console.log(`SCREENSHOT ${file}`);
}

function layoutProblems(cdp) {
  return cdp.evaluate(`(() => {
    const problems = [];
    const box = document.querySelector('${OVERLAY} .vno-dialog-box');
    const rect = box.getBoundingClientRect();
    if (rect.left < 0 || rect.top < 0 || rect.right > innerWidth || rect.bottom > innerHeight) problems.push('box outside viewport');
    const parts = [...box.querySelectorAll('.vno-dialog-header, .vno-dialog-body, .vno-dialog-footer')];
    for (const part of parts) {
      const r = part.getBoundingClientRect();
      if (r.left < rect.left - 1 || r.right > rect.right + 1 || r.bottom > rect.bottom + 1) problems.push('section outside box');
      if (part.scrollWidth > part.clientWidth + 1) problems.push('horizontal clipping in ' + part.className);
    }
    const buttons = [...box.querySelectorAll('[data-unsaved-choice]')].map(b => b.getBoundingClientRect());
    buttons.forEach((a, i) => buttons.slice(i + 1).forEach(b => {
      if (a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom) problems.push('buttons overlap');
    }));
    for (const button of box.querySelectorAll('[data-unsaved-choice]')) {
      if (button.scrollWidth > button.clientWidth + 1) problems.push('button text clipped: ' + button.textContent);
    }
    return JSON.stringify(problems);
  })()`).then(JSON.parse);
}

const dialogTexts = cdp => cdp.evaluate(`JSON.stringify({
  title: document.querySelector('${OVERLAY} .vno-dialog-header span')?.textContent,
  body: document.querySelector('${OVERLAY} .vno-dialog-body')?.textContent.trim(),
  buttons: [...document.querySelectorAll('${OVERLAY} [data-unsaved-choice]')].map(b => b.textContent),
  focused: document.activeElement?.getAttribute('data-unsaved-choice'),
  role: document.querySelector('${OVERLAY} .vno-dialog-box')?.getAttribute('role'),
})`).then(JSON.parse);

function backupOf(fileName) {
  const root = path.join(profile, "VNOffice", "save-backups");
  for (const folder of existsSync(root) ? readdirSync(root) : []) {
    const candidate = path.join(root, folder, fileName);
    if (existsSync(candidate)) return readFileSync(candidate);
  }
  return null;
}

async function open(app, filePath) {
  const session = await launchApp(app, { localAppData: profile, filePath, startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 240000 });
  await session.cdp.send("Emulation.setDeviceMetricsOverride", { width: 1366, height: 768, deviceScaleFactor: 1, mobile: false });
  await sleep(1500);
  return session;
}

const LONG_NAME = "Báo cáo tổng hợp & kế hoạch quý 4 năm 2026 của toàn bộ công ty - bản có tên rất dài để kiểm tra việc xuống dòng trong hộp thoại.docx";
const source = path.join(work, LONG_NAME);
let exitCode = 0;
let liveSession = null;
try {
  // 1. Tạo tài liệu thật bằng chính ứng dụng (qua đường Lưu bản sao thật), rồi đóng.
  let session = await open("writer");
  liveSession = session;
  queueDialogAnswer([source]);
  const firstSave = await session.cdp.evaluate(`window.__vnoAppInstance.adapter.saveAs()`, { awaitPromise: true, timeoutMilliseconds: 240000 });
  check("Lưu tài liệu mới vào đường dẫn mới", firstSave === true && existsSync(source));
  await session.close();

  // 2. Mở bằng đường mở thật; không đổi tệp thì Ctrl+S không hỏi.
  session = await open("writer", source);
  liveSession = session;
  const { cdp } = session;
  // Đợi nạp xong: khi nạp xong ứng dụng đặt lại trạng thái "chưa sửa", và tệp phải thật sự có sửa đổi để so sánh.
  await sleep(8000);
  await cdp.evaluate(`(() => { const body = document.querySelector('.vno-writer-body'); body.focus(); const range = document.createRange(); range.selectNodeContents(body.querySelector('p') || body); range.collapse(true); const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range); document.execCommand('insertText', false, 'S1 sua trong app'); window.__vnoAppInstance.adapter.isDirty = true; })()`);
  const edited = await cdp.evaluate(`document.querySelector('.vno-writer-body').textContent.includes('S1 sua trong app')`);
  check("Sửa nội dung trong ứng dụng", edited === true);
  const beforeOwnSave = readFileSync(source);
  await press(cdp, "s", { ctrl: true }, 500);
  const ownSaveStarted = Date.now();
  while (readFileSync(source).equals(beforeOwnSave) && Date.now() - ownSaveStarted < 240000) await sleep(200);
  await cdp.waitFor(`window.__vnoAppInstance.adapter.isDirty === false`, { timeoutMilliseconds: 240000, intervalMilliseconds: 200 });
  check("Tệp không đổi: Ctrl+S lưu, không hiện hộp thoại", !(await dialogOpen(cdp)) && !readFileSync(source).equals(beforeOwnSave));
  const afterOwnSave = readFileSync(source);
  const firstBackup = backupOf(LONG_NAME);
  console.log(`own save: before=${beforeOwnSave.length} after=${afterOwnSave.length} backup=${firstBackup?.length}`);
  check("Bản đã thay thế có trong save-backups, thư mục người dùng không thêm tệp",
    firstBackup !== null && firstBackup.equals(beforeOwnSave) && readdirSync(work).filter(name => name.endsWith(".docx")).length === 1);

  // 3. Đổi tệp từ bên ngoài, Ctrl+S: hiện hộp thoại, tệp vẫn giữ nguyên.
  await cdp.evaluate(`(() => { document.execCommand('insertText', false, ' lan2'); window.__vnoAppInstance.adapter.isDirty = true; })()`);
  writeFileSync(source, THEIRS);
  await press(cdp, "s", { ctrl: true }, 300);
  await waitDialog(cdp);
  let texts = await dialogTexts(cdp);
  console.log(JSON.stringify(texts));
  check("VI: tiêu đề và 3 nút đúng", texts.title === "Tệp đã bị thay đổi"
    && JSON.stringify(texts.buttons) === JSON.stringify(["Hủy", "Ghi đè", "Lưu bản sao"]));
  check("Tên tệp có ký tự & hiển thị nguyên văn", texts.body.includes(LONG_NAME));
  check("Tiêu điểm mặc định là lựa chọn an toàn (Lưu bản sao)", texts.focused === "save");
  check("role=alertdialog", texts.role === "alertdialog");
  let problems = await layoutProblems(cdp);
  check("VI 1366x768: không tràn, không chồng", problems.length === 0, problems.join("; "));
  await shoot(cdp, "writer-dialog-vi-1366x768");
  check("Hộp thoại hiện ra: tệp chưa bị ghi", readFileSync(source).equals(THEIRS));

  // Bẫy phím Tab đủ vòng.
  const order = [];
  for (let index = 0; index < 5; index += 1) {
    await press(cdp, "Tab", {}, 100);
    order.push(await cdp.evaluate(`document.activeElement?.getAttribute('data-unsaved-choice') || document.activeElement?.getAttribute('aria-label') || document.activeElement?.tagName`));
  }
  console.log("TAB ORDER " + JSON.stringify(order));
  check("Tab không thoát khỏi hộp thoại", await cdp.evaluate(`[...document.querySelectorAll('${OVERLAY} button')].includes(document.activeElement)`));

  // Ctrl+S lúc hộp thoại đang mở không được mở chồng thêm hộp thoại.
  await press(cdp, "s", { ctrl: true }, 1500);
  check("Ctrl+S khi hộp thoại đang mở không mở chồng", (await cdp.evaluate(`document.querySelectorAll('${OVERLAY}').length`)) === 1);

  // 4. Esc = Hủy: không ghi, tài liệu vẫn chưa lưu.
  await press(cdp, "Escape", {}, 500);
  await waitNoDialog(cdp);
  check("Esc: tệp giữ nguyên, tài liệu vẫn là chưa lưu",
    readFileSync(source).equals(THEIRS) && (await cdp.evaluate(`window.__vnoAppInstance.adapter.isDirty`)) === true);

  // 5. Ghi đè bằng bàn phím (Tab tới nút rồi Enter).
  await press(cdp, "s", { ctrl: true }, 300);
  await waitDialog(cdp);
  for (let index = 0; index < 6; index += 1) {
    if ((await cdp.evaluate(`document.activeElement?.getAttribute('data-unsaved-choice')`)) === "discard") break;
    await press(cdp, "Tab", {}, 100);
  }
  await press(cdp, "Enter", {}, 300);
  await cdp.waitFor(`window.__vnoAppInstance.adapter.isDirty === false`, { timeoutMilliseconds: 240000, intervalMilliseconds: 200 });
  const overwritten = readFileSync(source);
  check("Ghi đè: tệp là tệp DOCX mới của ứng dụng", overwritten[0] === 0x50 && overwritten[1] === 0x4b && !overwritten.equals(THEIRS) && !overwritten.equals(afterOwnSave));
  const backup = backupOf(LONG_NAME);
  check("Ghi đè: bản của người kia còn trong save-backups", backup !== null && backup.equals(THEIRS));
  check("Sau khi ghi đè không hỏi lại", !(await dialogOpen(cdp)));

  // 6. Lưu bản sao: tệp bị đổi không bị ghi, tài liệu chuyển sang bản sao.
  const copy = path.join(work, "ban-sao.docx");
  await cdp.evaluate(`(() => { document.execCommand('insertText', false, ' lan3'); window.__vnoAppInstance.adapter.isDirty = true; })()`);
  writeFileSync(source, THEIRS);
  queueDialogAnswer([copy]);
  await press(cdp, "s", { ctrl: true }, 300);
  await waitDialog(cdp);
  await press(cdp, "Enter", {}, 300);
  await cdp.waitFor(`window.__vnoAppInstance.adapter.isDirty === false`, { timeoutMilliseconds: 240000, intervalMilliseconds: 200 });
  check("Lưu bản sao: tệp gốc giữ nguyên, bản sao được tạo", readFileSync(source).equals(THEIRS) && existsSync(copy) && statSync(copy).size > 0);
  check("Tài liệu giờ trỏ vào bản sao", (await cdp.evaluate(`window.__vnoAppInstance.adapter._sourcePath`)) === copy);

  // 7. Lưu bản sao rồi hủy hộp thoại chọn tệp: không lưu gì.
  await cdp.evaluate(`(() => { document.execCommand('insertText', false, ' lan4'); window.__vnoAppInstance.adapter.isDirty = true; })()`);
  const copyBytes = THEIRS.toString() + " ban sao";
  writeFileSync(copy, copyBytes);
  queueDialogAnswer(null);
  await press(cdp, "s", { ctrl: true }, 300);
  await waitDialog(cdp);
  await press(cdp, "Enter", {}, 2000);
  await waitNoDialog(cdp);
  check("Hủy hộp thoại Lưu bản sao: không ghi, vẫn chưa lưu",
    readFileSync(copy, "utf8") === copyBytes && (await cdp.evaluate(`window.__vnoAppInstance.adapter.isDirty`)) === true);

  // 8. Tiếng Anh.
  await cdp.evaluate(`import('/platform/i18n/i18n.js').then(m => m.setLocale('en'))`, { awaitPromise: true });
  await press(cdp, "s", { ctrl: true }, 300);
  await waitDialog(cdp);
  texts = await dialogTexts(cdp);
  console.log(JSON.stringify(texts));
  check("EN: tiêu đề và 3 nút đúng", texts.title === "File has changed"
    && JSON.stringify(texts.buttons) === JSON.stringify(["Cancel", "Overwrite", "Save a copy"]));
  problems = await layoutProblems(cdp);
  check("EN 1366x768: không tràn, không chồng", problems.length === 0, problems.join("; "));
  await shoot(cdp, "writer-dialog-en-1366x768");
  await press(cdp, "Escape", {}, 500);
  await waitNoDialog(cdp);
  await cdp.evaluate(`import('/platform/i18n/i18n.js').then(m => m.setLocale('vi'))`, { awaitPromise: true });
  await cdp.evaluate(`window.__vnoAppInstance.adapter.isDirty = false`);
  await session.close();

  // 9. Sheet và Slide đi cùng một luồng.
  for (const [app, ext] of [["sheet", "xlsx"], ["slides", "pptx"]]) {
    const target = path.join(work, `tep-${app}.${ext}`);
    session = await open(app);
    liveSession = session;
    queueDialogAnswer([target]);
    const saved = await session.cdp.evaluate(`window.__vnoAppInstance.adapter.saveAs()`, { awaitPromise: true, timeoutMilliseconds: 240000 });
    check(`${app}: lưu tệp mới`, saved === true && existsSync(target));
    // Tình huống thật: người kia lưu một tệp hợp lệ. Chỉ thời gian sửa đổi khác là đủ để phát hiện.
    const valid = readFileSync(target);
    const later = new Date(statSync(target).mtimeMs + 60000);
    utimesSync(target, later, later);
    await session.cdp.evaluate(`window.__vnoAppInstance.adapter.isDirty = true`);
    await press(session.cdp, "s", { ctrl: true }, 300);
    await waitDialog(session.cdp);
    problems = await layoutProblems(session.cdp);
    check(`${app}: hộp thoại đúng ở 1366x768`, problems.length === 0, problems.join("; "));
    await shoot(session.cdp, `${app}-dialog-vi-1366x768`);
    await press(session.cdp, "Escape", {}, 500);
    await waitNoDialog(session.cdp);
    check(`${app}: Hủy giữ nguyên tệp`, readFileSync(target).equals(valid));
    await press(session.cdp, "s", { ctrl: true }, 300);
    await waitDialog(session.cdp);
    await session.cdp.evaluate(`document.querySelector('${CHOICE("discard")}').click()`);
    await session.cdp.waitFor(`window.__vnoAppInstance.adapter.isDirty === false`, { timeoutMilliseconds: 240000, intervalMilliseconds: 200 });
    const bytes = readFileSync(target);
    check(`${app}: Ghi đè tạo lại tệp thật`, bytes[0] === 0x50 && bytes[1] === 0x4b);
    // Tệp bị thay bằng dữ liệu hỏng: chọn Ghi đè phải kết thúc rõ ràng (lưu xong hoặc báo lỗi), không treo.
    writeFileSync(target, THEIRS);
    await session.cdp.evaluate(`window.__vnoAppInstance.adapter.isDirty = true`);
    await press(session.cdp, "s", { ctrl: true }, 300);
    await waitDialog(session.cdp);
    await session.cdp.evaluate(`document.querySelector('${CHOICE("discard")}').click()`);
    await session.cdp.waitFor(`window.__vnoAppInstance.adapter.isDirty === false || !!document.querySelector('${OVERLAY} .vno-dialog-ok-btn')`, { timeoutMilliseconds: 240000, intervalMilliseconds: 200 });
    const errorText = await session.cdp.evaluate(`document.querySelector('${OVERLAY} .vno-dialog-body')?.textContent.trim() || ""`);
    console.log(`${app}: ghi đè lên tệp hỏng: ${errorText || "đã lưu"}`);
    check(`${app}: ghi đè lên tệp hỏng không treo; lỗi thì tệp không đổi`, errorText ? readFileSync(target).equals(THEIRS) : readFileSync(target)[0] === 0x50);
    await session.cdp.evaluate(`document.querySelector('${OVERLAY} .vno-dialog-ok-btn')?.click(); window.__vnoAppInstance.adapter.isDirty = false`);
    await session.close();
    session = null;
  }
} catch (error) {
  exitCode = 1;
  console.log("FAIL | lỗi kịch bản: " + (error?.stack || error));
  await liveSession?.close().catch(() => {});
}
const failed = results.filter(pass => !pass).length;
console.log(`SUMMARY: ${results.length - failed} PASS, ${failed} FAIL`);
process.exit(failed || exitCode ? 1 : 0);
