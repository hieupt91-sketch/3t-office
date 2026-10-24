import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { launchApp } from "./session.mjs";
import { click, press, sleep } from "./actions.mjs";

const profileRoot = process.env.VNO_CDP_LOCALAPPDATA;
if (!profileRoot) throw new Error("Set VNO_CDP_LOCALAPPDATA to a unique profile path before running.");
const outputDir = path.resolve("docs/assets/q54-theme");
mkdirSync(outputDir, { recursive: true });
const sizes = [{ width: 1366, height: 768 }, { width: 1024, height: 600 }];
let assertions = 0;
let failures = 0;

function check(ok, label, detail = {}) {
  assertions++;
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"} | ${label} | ${JSON.stringify(detail)}`);
}

async function screenshot(cdp, name) {
  const result = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  writeFileSync(path.join(outputDir, `${name}.png`), Buffer.from((result.result || result).data, "base64"));
}

async function openPanel(cdp, app, size, mode) {
  await click(cdp, "#vno-customize-theme-btn");
  await sleep(180);
  const state = await cdp.evaluate(`(()=>{const e=document.querySelector('#vno-theme-customization-panel');const r=e?.getBoundingClientRect();return {open:!!e&&getComputedStyle(e).display!=='none',rect:r?.toJSON(),viewport:{width:innerWidth,height:innerHeight},focusInside:!!e&&e.contains(document.activeElement)}})()`);
  await screenshot(cdp, `${app}-panel-${mode}-${size.width}x${size.height}-after`);
  check(state.open && state.focusInside && state.rect.x >= 0 && state.rect.y >= 0 && state.rect.right <= size.width && state.rect.bottom <= size.height,
    `${app} ${size.width}x${size.height} ${mode}: bảng mở, nhận focus và không tràn`, state);
  return state;
}

async function applyTheme(cdp, mode, useEnter = false) {
  await cdp.evaluate(`(()=>{const input=document.querySelector('input[name="vno-opt-theme"][value="${mode}"]');input.checked=true;input.dispatchEvent(new Event('change',{bubbles:true}));input.focus()})()`);
  if (useEnter) await press(cdp, "Enter", {}, 220);
  else await cdp.evaluate("document.querySelector('.vno-options-ok-btn').click()");
  await sleep(140);
}

for (const app of ["writer", "sheet", "slides"]) {
  const localAppData = path.join(profileRoot, app);
  let session = await launchApp(app, { localAppData });
  try {
    const button = await session.cdp.evaluate(`(()=>{const b=document.querySelector('#vno-customize-theme-btn');return {exists:!!b,title:b?.title,rect:b?.getBoundingClientRect().toJSON(),themeToggle:!!document.querySelector('#vno-toggle-theme-btn')}})()`);
    check(button.exists && button.themeToggle && button.rect.width >= 28, `${app}: nút bảng màu cạnh nút Sáng/Tối hiện diện`, button);

    await click(session.cdp, ".vno-ribbon-tab-file");
    await sleep(180);
    await screenshot(session.cdp, `${app}-file-menu-options-route-1366x768-after`);
    const fileOptions = await session.cdp.evaluate("({exists:!!document.querySelector('#vno-backstage-options'),rect:document.querySelector('#vno-backstage-options')?.getBoundingClientRect().toJSON()})");
    check(fileOptions.exists, `${app}: Tệp hiển thị lối vào Tùy chọn`, fileOptions);
    await click(session.cdp, "#vno-backstage-options");
    await sleep(160);
    const samePanel = await session.cdp.evaluate("({open:!!document.querySelector('#vno-theme-customization-panel'),system:!!document.querySelector('input[name=\"vno-opt-theme\"][value=\"system\"]'),header:!!document.querySelector('#vno-opt-header')})");
    await screenshot(session.cdp, `${app}-file-options-theme-panel-1366x768-after`);
    check(samePanel.open && samePanel.system && samePanel.header, `${app}: Tệp > Tùy chọn mở cùng bảng theme`, samePanel);
    await session.cdp.evaluate("document.querySelector('.vno-options-cancel-btn').click()");
    await sleep(100);

    for (const size of sizes) {
      const window = await session.cdp.send("Browser.getWindowForTarget", {});
      await session.cdp.send("Browser.setWindowBounds", { windowId: (window.result || window).windowId, bounds: { windowState: "normal", ...size } });
      await sleep(250);
      await session.cdp.evaluate("if(document.documentElement.dataset.theme==='dark')document.querySelector('#vno-toggle-theme-btn').click()");
      await sleep(100);
      const light = await session.cdp.evaluate("({theme:document.documentElement.dataset.theme,preference:localStorage.getItem('vno-theme')})");
      check(light.theme === "light", `${app} ${size.width}x${size.height}: chế độ Sáng qua nút hiện tại`, light);
      await screenshot(session.cdp, `${app}-light-${size.width}x${size.height}-after`);
      await openPanel(session.cdp, app, size, "light");
      await press(session.cdp, "Tab", {}, 50);
      const tabFocus = await session.cdp.evaluate("document.querySelector('#vno-theme-customization-panel')?.contains(document.activeElement)");
      await press(session.cdp, "Escape", {}, 180);
      const escFocus = await session.cdp.evaluate("({panel:!!document.querySelector('#vno-theme-customization-panel'),id:document.activeElement?.id})");
      check(tabFocus && !escFocus.panel && escFocus.id === "vno-customize-theme-btn", `${app} ${size.width}x${size.height}: Tab, Esc và trả focus`, { tabFocus, escFocus });

      await openPanel(session.cdp, app, size, "light-check");
      await applyTheme(session.cdp, "dark", true);
      const dark = await session.cdp.evaluate("({theme:document.documentElement.dataset.theme,preference:localStorage.getItem('vno-theme')})");
      check(dark.theme === "dark", `${app} ${size.width}x${size.height}: Enter áp dụng Tối`, dark);
      await screenshot(session.cdp, `${app}-dark-${size.width}x${size.height}-after`);
      await openPanel(session.cdp, app, size, "dark");
      await session.cdp.evaluate("document.querySelector('.vno-options-cancel-btn').click()");
      await sleep(120);
      await session.cdp.evaluate("document.querySelector('#vno-toggle-theme-btn').click()");
      await sleep(100);
      check(await session.cdp.evaluate("document.documentElement.dataset.theme==='light'"), `${app} ${size.width}x${size.height}: nút hiện tại chuyển lại Sáng`);
      await screenshot(session.cdp, `${app}-light-final-${size.width}x${size.height}-after`);
    }

    // Confirm the application supports System preference and persists it locally.
    await session.cdp.evaluate("document.querySelector('#vno-customize-theme-btn').click()");
    await session.cdp.evaluate("(()=>{const r=document.querySelector('input[name=\"vno-opt-theme\"][value=\"system\"]');r.checked=true;r.dispatchEvent(new Event('change',{bubbles:true}));document.querySelector('.vno-options-ok-btn').click()})()");
    const system = await session.cdp.evaluate("({preference:localStorage.getItem('vno-theme'),theme:document.documentElement.dataset.theme,systemDark:matchMedia('(prefers-color-scheme: dark)').matches})");
    check(system.preference === "system" && system.theme === (system.systemDark ? "dark" : "light"), `${app}: Theo hệ thống lưu cục bộ và theo màu hệ điều hành`, system);

    // Check all preset colors and a custom color against the actual foreground choice.
    await session.cdp.evaluate("document.querySelector('#vno-customize-theme-btn').click()");
    const contrast = await session.cdp.evaluate(`(()=>{const ratio=(a,b)=>{const L=h=>{const c=h.match(/[0-9a-f]{2}/ig).map(x=>parseInt(x,16)/255).map(v=>v<=.03928?v/12.92:((v+.055)/1.055)**2.4);return .2126*c[0]+.7152*c[1]+.0722*c[2]};const x=L(a),y=L(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)};const swatches=[...document.querySelectorAll('.vno-opt-header-swatch')].map(b=>{const bg=b.dataset.color;const fg=ratio('#ffffff',bg)>=ratio('#000000',bg)?'#ffffff':'#000000';return {bg,fg,ratio:ratio(fg,bg)}});return {swatches,custom:document.querySelector('#vno-opt-header-color').value}})()`);
    check(contrast.swatches.length === 12 && contrast.swatches.every(c => c.ratio >= 4.5), `${app}: 12 màu gợi ý đạt tương phản 4,5:1`, { count: contrast.swatches.length, min: Math.min(...contrast.swatches.map(c => c.ratio)) });
    await session.cdp.evaluate("document.querySelector('input[name=\"vno-opt-header\"][value=\"color\"]').click();const c=document.querySelector('#vno-opt-header-color');c.value='#fef3c7';c.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('#vno-opt-accent-color').value='#e7d58a';document.querySelector('#vno-opt-accent-color').dispatchEvent(new Event('input',{bubbles:true}))");
    await screenshot(session.cdp, `${app}-custom-color-preview-1366x768-after`);
    await session.cdp.evaluate("document.querySelector('.vno-options-ok-btn').click()");
    const custom = await session.cdp.evaluate("({header:document.documentElement.style.getPropertyValue('--vno-header-bg-color'),headerFg:document.documentElement.style.getPropertyValue('--vno-header-fg'),accent:localStorage.getItem('vno-accent-color'),accentFg:document.documentElement.style.getPropertyValue('--vno-accent-fg')})");
    check(custom.header === "#fef3c7" && custom.headerFg === "#000000" && custom.accent === "#e7d58a" && custom.accentFg === "#000000", `${app}: màu tùy ý và màu nhấn xem trước, áp dụng`, custom);

    const currentWindow = await session.cdp.send("Browser.getWindowForTarget", {});
    await session.cdp.send("Browser.setWindowBounds", { windowId: (currentWindow.result || currentWindow).windowId, bounds: { windowState: "normal", width: 1366, height: 768 } });
    await session.cdp.evaluate("document.querySelector('#vno-customize-theme-btn').click()");
    await session.cdp.send("DOM.enable", {});
    const doc = await session.cdp.send("DOM.getDocument", {});
    const fileNode = await session.cdp.send("DOM.querySelector", { nodeId: (doc.result || doc).root.nodeId, selector: "#vno-opt-header-file" });
    await session.cdp.send("DOM.setFileInputFiles", { nodeId: (fileNode.result || fileNode).nodeId, files: [path.resolve("tests/fixtures/real-office-samples/src/sample-writer-image.png")] });
    await sleep(600);
    const imagePreview = await session.cdp.evaluate("(()=>{const p=document.querySelector('#vno-theme-customization-panel').getBoundingClientRect();return {image:document.documentElement.style.getPropertyValue('--vno-header-bg-image').startsWith('linear-gradient'),panel:p.toJSON(),viewport:{width:innerWidth,height:innerHeight},error:document.querySelector('#vno-opt-header-error').textContent}})()");
    await screenshot(session.cdp, `${app}-image-preview-1366x768-after`);
    check(imagePreview.image && imagePreview.panel.right <= 1366 && imagePreview.panel.bottom <= 768 && !imagePreview.error, `${app}: ảnh nền xem trước không phá bố cục`, imagePreview);
    await session.cdp.evaluate("document.querySelector('.vno-options-ok-btn').click()");

    await session.cdp.evaluate("document.querySelector('#vno-customize-theme-btn').click();document.querySelector('#vno-opt-header-reset').click();document.querySelector('.vno-options-ok-btn').click()");
    await sleep(120);
    check(await session.cdp.evaluate("!document.documentElement.hasAttribute('data-vno-header') && localStorage.getItem('vno-accent-color')==='#2563eb'"), `${app}: Đặt lại mặc định bỏ màu/ảnh và đặt lại màu nhấn`);
    await screenshot(session.cdp, `${app}-reset-1366x768-after`);

    // Persist a non-default selection across a full app restart.
    await click(session.cdp, "#vno-customize-theme-btn");
    await session.cdp.evaluate("(()=>{const t=document.querySelector('input[name=\"vno-opt-theme\"][value=\"dark\"]');t.checked=true;t.dispatchEvent(new Event('change',{bubbles:true}));document.querySelector('input[name=\"vno-opt-header\"][value=\"color\"]').click();const h=document.querySelector('#vno-opt-header-color');h.value='#abcddf';h.dispatchEvent(new Event('input',{bubbles:true}));const a=document.querySelector('#vno-opt-accent-color');a.value='#95d5b2';a.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('.vno-options-ok-btn').click()})()");
    await sleep(150);
    const appliedPersistence = await session.cdp.evaluate("({theme:localStorage.getItem('vno-theme'),accent:localStorage.getItem('vno-accent-color'),header:JSON.parse(localStorage.getItem('vno-header-theme')||'null')})");
    check(appliedPersistence.theme === "dark" && appliedPersistence.accent === "#95d5b2" && appliedPersistence.header?.color === "#abcddf", `${app}: lưu cấu hình không mặc định trước khi khởi động lại`, appliedPersistence);
    await screenshot(session.cdp, `${app}-persisted-dark-1366x768-after`);
  } finally {
    await session.close();
  }

  // Relaunch with the same app-local profile to verify persistence after restart.
  session = await launchApp(app, { localAppData });
  try {
    const persisted = await session.cdp.evaluate("({theme:localStorage.getItem('vno-theme'),effective:document.documentElement.dataset.theme,accent:localStorage.getItem('vno-accent-color'),header:JSON.parse(localStorage.getItem('vno-header-theme')||'null')})");
    check(persisted.theme === "dark" && persisted.effective === "dark" && persisted.accent === "#95d5b2" && persisted.header?.mode === "color" && persisted.header?.color === "#abcddf", `${app}: màu và chế độ tùy chỉnh được giữ khi khởi động lại`, persisted);
    await screenshot(session.cdp, `${app}-restart-1366x768-after`);
  } finally {
    await session.close();
  }
}

console.log(`SUMMARY ${assertions - failures}/${assertions} Q54 CDP assertions passed; failures=${failures}`);
if (failures) process.exitCode = 1;
