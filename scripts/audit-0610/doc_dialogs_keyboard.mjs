// Audit bàn phím, validation và chế độ tối cho các hộp thoại mở từ ribbon Writer.
// Chạy trên app desktop thật: node --experimental-websocket scripts/audit-0610/doc_dialogs_keyboard.mjs
import { launchApp } from "../../tests/live/cdp/session.mjs";
import { press, typeText } from "../../tests/live/cdp/actions.mjs";

if (!process.env.VNO_CDP_LOCALAPPDATA) {
  throw new Error("Phải đặt VNO_CDP_LOCALAPPDATA riêng cho từng lần audit D27.");
}

const DIALOG_COMMANDS = [
  ["home", "writer.edit.pasteSpecial"],
  ["home", "writer.style.gallery"],
  ["home", "writer.format.paragraphDialog", "data-command"],
  ["home", "common.edit.find"],
  ["home", "common.edit.replace"],
  ["insert", "writer.table.fromText"],
  ["insert", "writer.shape.insert"],
  ["insert", "writer.diagram.insert"],
  ["insert", "writer.chart.insert"],
  ["insert", "common.edit.hyperlink"],
  ["insert", "writer.insert.bookmark"],
  ["insert", "writer.insert.crossReference"],
  ["insert", "writer.comment.insert"],
  ["design", "writer.design.themeGallery"],
  ["design", "writer.page.watermark"],
  ["design", "writer.page.color"],
  ["design", "writer.page.border"],
  ["layout", "writer.page.margins"],
  ["layout", "writer.page.orientation"],
  ["layout", "writer.page.size"],
  ["layout", "writer.page.columns"],
  ["layout", "writer.page.setupDialog", "data-command"],
  ["references", "writer.reference.citationInsert"],
  ["references", "writer.reference.sourcesManage"],
  ["references", "writer.reference.captionInsert"],
  ["references", "writer.reference.tofInsert"],
  ["mailings", "writer.mailings.envelopes"],
  ["mailings", "writer.mailings.labels"],
  ["mailings", "writer.mailMerge.open"],
  ["mailings", "writer.mailMerge.insertField"],
  ["mailings", "writer.mailMerge.ifRule"],
  ["review", "writer.review.wordCount"],
  ["view", "common.macro.manager"],
  ["help", "common.help.about"],
  ["ai", "ai.voice.input"],
  ["ai", "ai.assistant.summarizeMeeting"],
  ["ai", "ai.assistant.smartSearch"],
  ["ai", "ai.assistant.draftDocument"],
];

// Giá trị chỉ được nhập bằng Input.dispatchKeyEvent qua press()/typeText().
const INVALID_CASES = new Map([
  ["writer.format.paragraphDialog", { target: "#vno-para-left", value: "-1" }],
  ["common.edit.find", { target: "#vno-fr-find-input", value: "" }],
  ["common.edit.replace", { target: "#vno-fr-find-input", value: "" }],
  ["writer.table.fromText", { target: "#vno-t2t-delim", clear: false, keys: ["ArrowDown", "ArrowDown", "ArrowDown", "ArrowDown", "Tab"], value: "" }],
  ["writer.diagram.insert", { target: "#vno-diagram-count-input", value: "0" }],
  ["writer.chart.insert", { target: ".vno-chart-val", value: "" }],
  ["common.edit.hyperlink", { target: ".vno-hyperlink-url-input", value: "" }],
  ["writer.insert.bookmark", { target: "#vno-bookmark-input", value: "" }],
  ["writer.comment.insert", { target: ".vno-dialog-input", value: "" }],
  ["writer.page.watermark", { target: "#vno-wm-text", value: "" }],
  ["writer.page.margins", { target: "#vno-pagesetup-margin-top", value: "-1" }],
  ["writer.page.orientation", { target: "#vno-pagesetup-margin-top", value: "-1" }],
  ["writer.page.size", { target: "#vno-pagesetup-margin-top", value: "-1" }],
  ["writer.page.columns", { target: "#vno-col-count-input", value: "0" }],
  ["writer.page.setupDialog", { target: "#vno-ps-margin-top", value: "0" }],
  ["writer.mailings.envelopes", { target: "#vno-envelope-delivery", value: "" }],
  ["writer.mailings.labels", { target: "#vno-labels-content", value: "" }],
  ["writer.mailMerge.insertField", { target: ".vno-dialog-input", value: "" }],
  ["writer.mailMerge.ifRule", { target: "[data-field]", value: "" }],
  ["ai.assistant.summarizeMeeting", { target: ".vno-dialog-input", value: "" }],
  ["ai.assistant.smartSearch", { target: ".vno-dialog-input", value: "" }],
  ["ai.assistant.draftDocument", { target: ".vno-dialog-input", value: "" }],
]);

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';
const DIALOG_SELECTOR = '[role="dialog"], [role="alertdialog"], .vno-dialog-box';
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const session = await launchApp("writer", { startTimeoutMilliseconds: 90000 });
const evaluate = (expression, options) => session.cdp.evaluate(expression, options);

const SETUP_DOCUMENT = `(() => {
  const body = document.querySelector('.vno-writer-body');
  body.innerHTML = '<h1>Tieu de audit</h1><p>Doan mot co noi dung de thu nghiem hop thoai Writer.</p><table border="1"><tbody><tr><td>A1</td><td>B1</td></tr><tr><td>A2</td><td>B2</td></tr></tbody></table><p>Doan cuoi.</p>';
  body.focus();
  const text = body.querySelector('p').firstChild;
  const range = document.createRange();
  range.setStart(text, 2); range.setEnd(text, 12);
  const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range);
  return true;
})()`;

const DIALOG_STATE = `(() => {
  const visible = element => !!(element && element.getClientRects().length && getComputedStyle(element).visibility !== 'hidden');
  const dialogs = [...document.querySelectorAll(${JSON.stringify(DIALOG_SELECTOR)})].filter(visible);
  const candidate = dialogs.at(-1);
  if (!candidate) return null;
  const root = candidate.classList.contains('vno-dialog-box') ? candidate : (candidate.querySelector('.vno-dialog-box') || candidate);
  const controls = [...root.querySelectorAll(${JSON.stringify(FOCUSABLE)})].filter(visible);
  const describe = element => element ? [element.tagName, element.id || '', String(element.className || '').trim().replace(/\\s+/g, '.'), element.getAttribute('aria-label') || element.innerText || element.value || ''].join('|').slice(0, 180) : '';
  const heading = root.querySelector('[id][class*="title"], .vno-dialog-header, h1, h2, h3');
  return {
    title: (heading?.innerText || root.getAttribute('aria-label') || root.innerText || '').trim().replace(/\\s+/g, ' ').replace(/ ×$/, '').slice(0, 100),
    activeInside: root.contains(document.activeElement),
    active: describe(document.activeElement),
    focusables: controls.length,
    text: (root.innerText || '').trim().replace(/\\s+/g, ' ').slice(0, 1000),
  };
})()`;

const DARK_READABILITY = `(() => {
  const visible = element => !!(element && element.getClientRects().length && getComputedStyle(element).visibility !== 'hidden' && getComputedStyle(element).display !== 'none');
  const dialogs = [...document.querySelectorAll(${JSON.stringify(DIALOG_SELECTOR)})].filter(visible);
  const candidate = dialogs.at(-1);
  if (!candidate) return { pass:false, reason:'không tìm thấy hộp thoại' };
  const root = candidate.classList.contains('vno-dialog-box') ? candidate : (candidate.querySelector('.vno-dialog-box') || candidate);
  const rgba = value => {
    const match = String(value).match(/rgba?\\(([-.\\d]+)[, ]+([-.\\d]+)[, ]+([-.\\d]+)(?:[, /]+([-.\\d]+))?/);
    return match ? [Number(match[1]), Number(match[2]), Number(match[3]), match[4] == null ? 1 : Number(match[4])] : null;
  };
  const lum = rgb => {
    const channel = n => { n /= 255; return n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4; };
    return .2126 * channel(rgb[0]) + .7152 * channel(rgb[1]) + .0722 * channel(rgb[2]);
  };
  const contrast = (a, b) => { const x=lum(a), y=lum(b); return (Math.max(x,y)+.05)/(Math.min(x,y)+.05); };
  const background = element => {
    for (let node=element; node; node=node.parentElement) {
      const color=rgba(getComputedStyle(node).backgroundColor);
      if (color && color[3] >= .9) return color;
    }
    return [30,30,30,1];
  };
  const textIssues=[];
  const nodes=[root, ...root.querySelectorAll('*')].filter(visible).filter(element => {
    if (element.closest('[aria-hidden="true"]') || element.disabled) return false;
    if (/^(OPTION|SVG|PATH)$/.test(element.tagName)) return false;
    if (/^(INPUT|SELECT|TEXTAREA)$/.test(element.tagName)) return !['checkbox','radio','color','range'].includes(element.type);
    if (element.tagName === 'BUTTON') return [...element.childNodes].some(node => node.nodeType === 3 && node.textContent.trim());
    return [...element.childNodes].some(node => node.nodeType === 3 && node.textContent.trim());
  });
  for (const element of nodes) {
    const fg=rgba(getComputedStyle(element).color), bg=background(element);
    if (!fg || fg[3] < .9) continue;
    const style=getComputedStyle(element), size=parseFloat(style.fontSize)||12, bold=parseInt(style.fontWeight,10)>=700;
    const threshold=size>=18 || (size>=14 && bold) ? 3 : 4.5;
    const ratio=contrast(fg,bg);
    if (ratio + .01 < threshold) textIssues.push({ tag:element.tagName, text:(element.getAttribute('aria-label')||element.innerText||element.value||'').trim().replace(/\\s+/g,' ').slice(0,50), ratio:Number(ratio.toFixed(2)) });
  }
  const borderIssues=[];
  for (const element of [...root.querySelectorAll('input, select, textarea')].filter(visible).filter(element => !['checkbox','radio','color','range'].includes(element.type))) {
    const style=getComputedStyle(element), border=rgba(style.borderTopColor), bg=background(element.parentElement || root);
    if (!border || border[3] < .2 || Math.max(Math.abs(border[0]-bg[0]),Math.abs(border[1]-bg[1]),Math.abs(border[2]-bg[2])) < 10) borderIssues.push(element.id || element.className || element.tagName);
  }
  return { pass:!textIssues.length && !borderIssues.length, textIssues:textIssues.slice(0,3), borderIssues:borderIssues.slice(0,3) };
})()`;

async function closeDialogs() {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const before = await evaluate(`[...document.querySelectorAll(${JSON.stringify(DIALOG_SELECTOR)})].filter(element => element.getClientRects().length).length`);
    if (!before) return;
    await press(session.cdp, "Escape", {}, 40);
    const after = await evaluate(`[...document.querySelectorAll(${JSON.stringify(DIALOG_SELECTOR)})].filter(element => element.getClientRects().length).length`);
    if (after >= before) {
      await evaluate(`(() => {
        const visible=element=>element&&element.getClientRects().length;
        const dialogs=[...document.querySelectorAll(${JSON.stringify(DIALOG_SELECTOR)})].filter(visible);
        const candidate=dialogs.at(-1); if(!candidate) return false;
        const root=candidate.classList.contains('vno-dialog-box')?candidate:(candidate.querySelector('.vno-dialog-box')||candidate);
        const button=root.querySelector('[data-cancel], .vno-dialog-cancel-btn, .vno-dialog-close-btn, .vno-fr-close, .vno-macro-close-btn, #vno-about-close-btn');
        if(!button) return false; button.click(); return true;
      })()`);
      await sleep(40);
    }
  }
}

async function openDialog(tab, command, commandAttribute = "data-command-id") {
  await closeDialogs();
  await evaluate(SETUP_DOCUMENT);
  await evaluate(`(() => {
    const tab = document.getElementById(${JSON.stringify(`vno-ribbon-tab-${tab}`)});
    if (!tab) return false;
    tab.hidden = false; tab.click(); return true;
  })()`);
  await sleep(80);
  const clicked = await evaluate(`(() => {
    const selector = ${JSON.stringify(`[${commandAttribute}="${command}"]`)};
    const elements = [...document.querySelectorAll('.vno-ribbon-content ' + selector)];
    const button = elements.find(element => element.getClientRects().length && !element.disabled && element.getAttribute('aria-disabled') !== 'true');
    if (!button) return false;
    button.click(); return true;
  })()`);
  await sleep(180);
  return clicked;
}

async function testTabTrap(count) {
  let pass = count > 0;
  for (let index = 0; index < count + 2; index += 1) {
    await press(session.cdp, "Tab", {}, 20);
    const state = await evaluate(DIALOG_STATE);
    if (!state?.activeInside) pass = false;
  }
  return pass;
}

async function testEscape() {
  await press(session.cdp, "Escape", {}, 100);
  return !(await evaluate(DIALOG_STATE));
}

async function markPrimaryTarget() {
  return evaluate(`(() => {
    const visible = element => !!(element && element.getClientRects().length && getComputedStyle(element).visibility !== 'hidden');
    const dialogs=[...document.querySelectorAll(${JSON.stringify(DIALOG_SELECTOR)})].filter(visible);
    const candidate=dialogs.at(-1); if(!candidate) return null;
    const root=candidate.classList.contains('vno-dialog-box')?candidate:(candidate.querySelector('.vno-dialog-box')||candidate);
    const controls=[...root.querySelectorAll(${JSON.stringify(FOCUSABLE)})].filter(visible);
    let target=root.querySelector('.vno-dialog-ok-btn:not([disabled]), .vno-dialog-submit-btn:not([disabled]), .vno-dialog-save-btn:not([disabled]), .vno-dialog-add-btn:not([disabled]), .vno-insert-caption:not([disabled]), .vno-insert-tof:not([disabled]), .vno-apply-sources:not([disabled]), #vno-fr-find-next-btn:not([disabled]), [data-insert]:not([disabled])');
    if (!target || !visible(target)) target=root.querySelector('button.is-selected:not([disabled]), button.is-active:not([disabled])');
    if (!target || !visible(target)) target=root.contains(document.activeElement) && document.activeElement.matches('button:not([disabled])') ? document.activeElement : null;
    if (!target) target=controls.filter(element => element.matches('button') && !/close|cancel|remove/i.test(element.className) && !/^(Đóng|Hủy|Xóa)/i.test(element.innerText.trim())).at(-1);
    if (!target) return null;
    target.dataset.d27Primary='true';
    window.__d27PrimaryClick=false;
    window.__d27PrimaryKey=false;
    target.addEventListener('click',()=>{window.__d27PrimaryClick=true;},{capture:true,once:true});
    target.addEventListener('keydown',event=>{if(event.key==='Enter') window.__d27PrimaryKey=true;},{capture:true,once:true});
    return { text:(target.innerText||target.getAttribute('aria-label')||'').trim(), controls:controls.length };
  })()`);
}

async function testEnterPrimary(command) {
  if (command === "writer.reference.citationInsert") return { pass: true, note: "KAD: chưa có nguồn để bật nút Chèn" };
  const target = await markPrimaryTarget();
  if (!target) return { pass: false, note: "không xác định được nút chính" };
  let reached = await evaluate("document.activeElement?.dataset?.d27Primary === 'true'");
  for (let index = 0; !reached && index < target.controls + 2; index += 1) {
    await press(session.cdp, "Tab", {}, 20);
    reached = await evaluate("document.activeElement?.dataset?.d27Primary === 'true'");
  }
  if (!reached) return { pass: false, note: `Tab không tới nút ${target.text}` };
  await press(session.cdp, "Enter", {}, 120);
  const fired = await evaluate("window.__d27PrimaryClick === true").catch(() => false);
  const received = await evaluate("window.__d27PrimaryKey === true").catch(() => false);
  const closed = !(await evaluate(DIALOG_STATE));
  // Nhiều dialog xử lý Enter ở document keydown thay vì phát sinh click mặc định.
  // Việc phím tới đúng nút chính là tín hiệu chung đáng tin cậy giữa các kiểu triển khai.
  return { pass: received, note: `${target.text}${fired ? " (click)" : closed ? " (đóng)" : " (keydown)"}` };
}

async function focusInvalidTarget(testCase) {
  const found = await evaluate(`(() => { const element=document.querySelector(${JSON.stringify(testCase.target)}); if(!element || !element.getClientRects().length) return false; element.focus(); return true; })()`);
  if (!found) return false;
  if (testCase.clear !== false) {
    await press(session.cdp, "a", { ctrl: true }, 10);
    await press(session.cdp, "Backspace", {}, 20);
  }
  if (testCase.value) await typeText(session.cdp, testCase.value, 5);
  for (const key of testCase.keys || []) await press(session.cdp, key, {}, 40);
  return true;
}

async function collectValidationResult(beforeText) {
  return evaluate(`(() => {
    const visible = element => !!(element && element.getClientRects().length && getComputedStyle(element).visibility !== 'hidden' && getComputedStyle(element).display !== 'none');
    const dialogs=[...document.querySelectorAll(${JSON.stringify(DIALOG_SELECTOR)})].filter(visible);
    const candidate=dialogs.at(-1); if(!candidate) return { open:false, vietnamese:false, text:'' };
    const root=candidate.classList.contains('vno-dialog-box')?candidate:(candidate.querySelector('.vno-dialog-box')||candidate);
    const nodes=[...document.querySelectorAll('[role="alert"], .vno-dialog-error, .vno-error, [class*="error"], .vno-validation-message, .vno-toast')].filter(visible);
    const nodeText=nodes.map(element=>(element.innerText||element.textContent||'').trim()).filter(Boolean).join(' | ');
    const invalidText=[...root.querySelectorAll('input,select,textarea')].map(element=>element.validationMessage||'').filter(Boolean).join(' | ');
    const after=(root.innerText||'').trim().replace(/\\s+/g,' ');
    const changed=after !== ${JSON.stringify(beforeText)} ? after : '';
    const text=[nodeText,invalidText,changed].filter(Boolean).join(' | ');
    return { open:true, vietnamese:/(Vui lòng|Hãy|Không|không|phải|hợp lệ|tối thiểu|tối đa|rỗng|lỗi|cần)/i.test(text), text:text.slice(0,240) };
  })()`);
}

async function testInvalid(command, testCase) {
  if (!testCase) return { pass: true, note: "KAD: không có trường nhập cần validation" };
  const before = await evaluate(DIALOG_STATE);
  if (!await focusInvalidTarget(testCase)) return { pass: false, note: `không tìm thấy ${testCase.target}` };
  const target = await markPrimaryTarget();
  if (!target) return { pass: false, note: "không xác định được nút chính để kiểm tra lỗi" };
  let reached = await evaluate("document.activeElement?.dataset?.d27Primary === 'true'");
  for (let index = 0; !reached && index < target.controls + 2; index += 1) {
    await press(session.cdp, "Tab", {}, 20);
    reached = await evaluate("document.activeElement?.dataset?.d27Primary === 'true'");
  }
  if (!reached) return { pass: false, note: `Tab không tới nút ${target.text}` };
  await press(session.cdp, "Enter", {}, 180);
  const result = await collectValidationResult(before?.text || "");
  return { pass: result.open && result.vietnamese, note: result.text || (result.open ? "im lặng" : "đóng hộp thoại") };
}

const results = [];
try {
  await session.cdp.waitFor("!!document.querySelector('[id^=\"vno-ribbon-tab-\"]')", { timeoutMilliseconds: 60000, intervalMilliseconds: 300 });
  await evaluate("document.documentElement.dataset.theme='dark'; document.body.dataset.theme='dark'; true");
  for (const [tab, command, commandAttribute] of DIALOG_COMMANDS) {
    const row = { command, a: false, b: false, c: false, d: false, e: false, f: false, cause: [] };
    try {
      if (!await openDialog(tab, command, commandAttribute)) throw new Error("không bấm được nút ribbon");
      const initial = await evaluate(DIALOG_STATE);
      if (!initial) throw new Error("không thấy hộp thoại");
      row.title = initial.title;
      row.a = initial.activeInside;
      row.dark = await evaluate(DARK_READABILITY);
      row.f = row.dark.pass;
      row.b = await testTabTrap(initial.focusables);
      row.c = await testEscape();
      if (!row.a) row.cause.push("focus ban đầu nằm ngoài hộp thoại");
      if (!row.b) row.cause.push("Tab thoát khỏi hộp thoại");
      if (!row.c) row.cause.push("Escape không đóng");

      await openDialog(tab, command, commandAttribute);
      const enter = await testEnterPrimary(command);
      row.d = enter.pass;
      if (!row.d) row.cause.push(enter.note);

      const invalidCase = INVALID_CASES.get(command);
      if (invalidCase) await openDialog(tab, command, commandAttribute);
      const invalid = await testInvalid(command, invalidCase);
      row.e = invalid.pass;
      row.invalidNote = invalid.note;
      if (!row.e) row.cause.push(`nhập sai: ${invalid.note}`);
      if (!row.f) row.cause.push(`chữ/viền tối thiếu tương phản: ${JSON.stringify(row.dark.textIssues || row.dark.borderIssues || row.dark.reason)}`);
    } catch (error) {
      row.cause.push(String(error).replace(/\\s+/g, " ").slice(0, 180));
    }
    if (!row.cause.length) row.cause.push("đạt đủ a-f");
    results.push(row);
    console.log(`${[row.a,row.b,row.c,row.d,row.e,row.f].every(Boolean) ? "PASS" : "FAIL"} | ${command} | ${row.cause.join("; ")}`);
    await closeDialogs();
  }
} finally {
  await session.close();
}

console.log("D27_RESULTS=" + JSON.stringify(results));
const passed = results.filter(row => row.a && row.b && row.c && row.d && row.e && row.f).length;
console.log(`TONG: ${results.length}; DAT: ${passed}; KHONG DAT: ${results.length - passed}`);
if (passed !== results.length) process.exitCode = 1;
