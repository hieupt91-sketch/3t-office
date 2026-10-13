import fs from "node:fs/promises";
import path from "node:path";
import { launchApp } from "./session.mjs";
import { click, sleep, typeText } from "./actions.mjs";
import {
  phraseToImeEvents,
  replayImeEventsCdp,
  replayWindowsImeCompositionCdp
} from "./vietnamese-ime-simulator.mjs";

const outputRoot = process.env.VNO_WORD_W1_OUTPUT || "E:\\VNOffice-temp\\word-w1";
const outputDocx = path.join(outputRoot, "word-w1-properties.docx");
await fs.mkdir(outputRoot, { recursive: true });
await fs.rm(outputDocx, { force: true });

const results = [];
const record = (name, ok, evidence) => {
  results.push({ name, status: ok ? "PASS" : "FAIL", evidence });
  console.log(`${ok ? "PASS" : "FAIL"} | ${name} | ${JSON.stringify(evidence)}`);
};

const session = await launchApp("writer", { startTimeoutMilliseconds: 120000 });
const { cdp } = session;
const ev = (expression, options) => cdp.evaluate(expression, options);

async function setupBlank() {
  await ev(`(() => {
    const body=document.querySelector('.vno-writer-body');
    body.innerHTML='<p><br></p>'; body.focus();
    const p=body.querySelector('p'); const range=document.createRange();
    range.selectNodeContents(p); range.collapse(true);
    const selection=getSelection(); selection.removeAllRanges(); selection.addRange(range);
    return true;
  })()`);
}

async function text() {
  return ev(`document.querySelector('.vno-writer-body')?.innerText || ''`);
}

async function checkTyped(name, typed, expected) {
  await setupBlank();
  await typeText(cdp, typed, 25);
  const actual = await text();
  record(name, actual === expected, { typed, expected, actual });
}

async function openOptionsFromFileMenu() {
  await ev(`window.__vnoGlobalCommandBus.execute('common.file.backstage'); true`);
  await cdp.waitFor(`!!document.querySelector('#vno-backstage-options')`, { timeoutMilliseconds: 15000 });
  await click(cdp, "#vno-backstage-options");
  await cdp.waitFor(`!!document.querySelector('#vno-opt-writer-autocorrect')`, { timeoutMilliseconds: 15000 });
}

try {
  await checkTyped("Ngoặc kép thông minh", '"xin chào"', "“xin chào”");
  await checkTyped("Nháy đơn thông minh", "'xin chào'", "‘xin chào’");
  await checkTyped("Hai gạch nối thành en-dash", "a--", "a–");
  await checkTyped("Phân số 1/2 thành ký tự", "1/2", "½");
  await checkTyped("(c) thành ký hiệu bản quyền", "(c)", "©");
  await checkTyped("Bảng thay thế mặc định", "teh ", "The ");
  await checkTyped("Tự viết hoa đầu câu", "xin chào. việt ", "Xin chào. Việt ");

  await setupBlank();
  const telexExpected = "tiếng";
  await replayImeEventsCdp(cdp, phraseToImeEvents(telexExpected, { mode: "telex", encoding: "nfc" }), 25);
  let actual = await text();
  record("Telex qua CDP từng ký tự không hỏng chữ đang đặt dấu", actual === telexExpected, { expected: telexExpected, actual });

  await setupBlank();
  await replayImeEventsCdp(cdp, phraseToImeEvents("Việt", { mode: "vni", encoding: "nfd" }), 25);
  actual = (await text()).normalize("NFC");
  record("VNI/NFD qua CDP từng ký tự được giữ đúng", actual === "Việt", { expected: "Việt", actual });

  await setupBlank();
  await replayWindowsImeCompositionCdp(cdp, "đang gõ", 25);
  actual = await text();
  record("Composition IME chỉ sửa sau khi chốt", actual === "Đang gõ", { expected: "Đang gõ", actual });

  await openOptionsFromFileMenu();
  await ev(`document.querySelector('.vno-autocorrect-add').scrollIntoView({block:'center'}); true`);
  await click(cdp, ".vno-autocorrect-add");
  const rowCount = await ev(`document.querySelectorAll('.vno-autocorrect-replacement-row').length`);
  await ev(`document.querySelectorAll('.vno-autocorrect-from')[${rowCount - 1}].focus(); true`);
  await typeText(cdp, "abc", 25);
  await ev(`document.querySelectorAll('.vno-autocorrect-to')[${rowCount - 1}].focus(); true`);
  await typeText(cdp, "xyz", 25);
  const customRow = await ev(`(() => {
    const rows=[...document.querySelectorAll('.vno-autocorrect-replacement-row')];
    const row=rows[rows.length-1];
    return {from:row?.querySelector('.vno-autocorrect-from')?.value,to:row?.querySelector('.vno-autocorrect-to')?.value};
  })()`);
  record("Nhập dòng thay thế tùy chỉnh", customRow.from === "abc" && customRow.to === "xyz", customRow);
  await click(cdp, ".vno-options-ok-btn");
  await sleep(300);
  const savedReplacement = await ev(`window.__vnoAppInstance.autoCorrectPreferences.getReplacements().find(entry=>entry.from==='abc') || null`);
  record("Lưu dòng thay thế tùy chỉnh", savedReplacement?.to === "xyz", savedReplacement);
  await checkTyped("Bảng thay thế tùy chỉnh trong Tệp > Tùy chọn", "abc ", "Xyz ");

  await openOptionsFromFileMenu();
  await ev(`(() => { const input=document.querySelector('[name="vno-autocorrect-enabled"]'); input.click(); return input.checked; })()`);
  await click(cdp, ".vno-options-ok-btn");
  await checkTyped("Tắt toàn bộ Tự sửa lỗi gõ", "(c) 1/2 a-- ", "(c) 1/2 a-- ");

  // Re-enable before saving the document so the isolated profile remains reusable.
  await openOptionsFromFileMenu();
  await ev(`(() => { const input=document.querySelector('[name="vno-autocorrect-enabled"]'); if(!input.checked) input.click(); return input.checked; })()`);
  await click(cdp, ".vno-options-ok-btn");

  await ev(`window.__vnoGlobalCommandBus.execute('common.file.backstage'); true`);
  await cdp.waitFor(`!!document.querySelector('#vno-backstage-writer-info')`, { timeoutMilliseconds: 15000 });
  await click(cdp, "#vno-backstage-writer-info");
  await cdp.waitFor(`!!document.querySelector('.vno-document-properties-overlay')`, { timeoutMilliseconds: 15000 });
  const properties = {
    title: "Kế hoạch chuyển đổi số",
    creator: "Nguyễn Văn An",
    subject: "Quý IV năm 2026",
    keywords: "chuyển đổi số; nội bộ",
    description: "Tài liệu kiểm thử thuộc tính"
  };
  for (const [name, value] of Object.entries(properties)) {
    await ev(`(() => { const input=document.querySelector('[name=${JSON.stringify(name)}]'); input.focus(); input.select(); return true; })()`);
    await typeText(cdp, value, 10);
  }
  await click(cdp, ".vno-document-properties-save");
  await setupBlank();
  await typeText(cdp, "Nội dung kiểm thử", 15);
  const saved = await ev(
    `globalThis.globalUnoBridge.saveRealFileInPlace('writer',window.__vnoAppInstance.adapter._contentForExport(),${JSON.stringify(outputDocx)},null)`,
    { timeoutMilliseconds: 1200000 }
  );
  record("Lưu DOCX có thuộc tính", saved?.status === "ok", { saved, outputDocx });
} catch (error) {
  record("Audit desktop không phát sinh ngoại lệ", false, String(error?.stack || error));
} finally {
  await session.close();
}

if (!results.some(item => item.status === "FAIL")) {
  const reopened = await launchApp("writer", { filePath: outputDocx, startTimeoutMilliseconds: 120000 });
  try {
    await reopened.cdp.waitFor(
      `window.__vnoAppInstance?.adapter?._sourcePath?.toLowerCase()===${JSON.stringify(outputDocx.toLowerCase())}`,
      { timeoutMilliseconds: 120000 }
    );
    const state = await reopened.cdp.evaluate(`({
      properties:window.__vnoAppInstance.adapter.documentProperties,
      text:document.querySelector('.vno-writer-body')?.innerText || ''
    })`);
    const expected = {
      title: "Kế hoạch chuyển đổi số",
      creator: "Nguyễn Văn An",
      subject: "Quý IV năm 2026",
      keywords: "chuyển đổi số; nội bộ",
      description: "Tài liệu kiểm thử thuộc tính"
    };
    record("Mở lại DOCX nạp đúng thuộc tính", JSON.stringify(state.properties) === JSON.stringify(expected), { expected, state });
  } catch (error) {
    record("Mở lại DOCX nạp đúng thuộc tính", false, String(error?.stack || error));
  } finally {
    await reopened.close();
  }
}

const failed = results.filter(item => item.status === "FAIL");
console.log(`TOTAL ${results.length - failed.length}/${results.length} PASS`);
process.exit(failed.length ? 1 : 0);
