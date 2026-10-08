// Functional ribbon audit: real CDP mouse clicks, property assertions, DOCX XML proof and Word COM oracle.
// Usage: node --experimental-websocket scripts/audit-0610/ribbon_functional.mjs tests/live/ribbon-specs/doc-home.json [--runs=2]
import { spawnSync } from "node:child_process";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { launchApp } from "../../tests/live/cdp/session.mjs";
import { click, mouseDrag, press, sleep } from "../../tests/live/cdp/actions.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const specPath = path.resolve(process.argv[2] || "tests/live/ribbon-specs/doc-home.json");
const runs = Number(process.argv.find(value => value.startsWith("--runs="))?.split("=")[1] || 1);
const spec = JSON.parse(await readFile(specPath, "utf8"));
const proofRoot = path.resolve(process.env.VNO_RIBBON_SHOTS || "E:/VNOffice-profiles/ribbon-shots/doc-home");
const docxRoot = path.join(proofRoot, "docx");
await mkdir(docxRoot, { recursive: true });

const safeName = item => [item.commandId, item.args].filter(Boolean).join("-").replace(/[^a-zA-Z0-9._-]/g, "_");
const selectorFor = item => item.action === "dropdown"
  ? `[data-dropdown-id=${JSON.stringify(item.commandId)}]`
  : item.action === "styleCard"
    ? `.vno-style-gallery-strip [data-style-id=${JSON.stringify(item.args)}]`
  : item.action === "launcher"
    ? `.vno-ribbon-group[data-group-id=${JSON.stringify(item.group)}] .vno-ribbon-dialog-launcher`
    : `[data-command-id=${JSON.stringify(item.commandId)}]`;

async function capture(cdp, output) {
  const response = await cdp.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false }, 30000);
  const data = response.result?.data;
  if (!data) throw new Error("Page.captureScreenshot did not return image data.");
  await writeFile(output, Buffer.from(data, "base64"));
}

async function resetSample(cdp, item) {
  await press(cdp, "Escape", {}, 50).catch(() => {});
  await cdp.evaluate(`(() => {
    const body = document.querySelector('.vno-writer-body');
    body.innerHTML = ${JSON.stringify(spec.sample.html)};
    body.focus();
    const target = body.querySelector(${JSON.stringify(spec.sample.selection.selector)});
    const text = document.createTreeWalker(target, NodeFilter.SHOW_TEXT).nextNode();
    const range = document.createRange();
    range.setStart(text, ${spec.sample.selection.start}); range.setEnd(text, ${spec.sample.selection.end});
    const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range);
    body.dispatchEvent(new InputEvent('input', {bubbles:true, inputType:'insertText'}));
    return true;
  })()`);
  if (item.setup === "numbered") {
    await click(cdp, '[data-command-id="writer.list.numbered"]');
    await resetSelection(cdp);
  }
  if (item.setup === "indented") {
    await click(cdp, '[data-command-id="writer.para.indentInc"]');
    await resetSelection(cdp);
  }
  if (item.setup === "styleTitle") {
    await cdp.evaluate(`(() => { const target=document.querySelector('#target'); target.className='vno-style-title'; Object.assign(target.style,{fontSize:'26pt',fontWeight:'bold',color:'#1f4e79',textAlign:'center',marginBottom:'8pt'}); })()`);
    await resetSelection(cdp);
  }
}

async function resetSelection(cdp, collapsed = false, selector = spec.sample.selection.selector) {
  await cdp.evaluate(`(() => {
    const target=document.querySelector(${JSON.stringify(selector)}); if(!target) return false;
    const nodes=[]; const walker=document.createTreeWalker(target,NodeFilter.SHOW_TEXT); let node;
    while((node=walker.nextNode())) nodes.push(node); if(!nodes.length) return false;
    const point=(offset)=>{let rest=offset; for(const n of nodes){if(rest<=n.data.length)return [n,rest];rest-=n.data.length;}return [nodes.at(-1),nodes.at(-1).data.length];};
    const start=point(0), end=point(${collapsed ? 0 : spec.sample.selection.end}); const range=document.createRange();
    range.setStart(start[0],start[1]); range.setEnd(end[0],end[1]);
    const selection=getSelection(); selection.removeAllRanges(); selection.addRange(range); target.closest('[contenteditable]')?.focus(); return true;
  })()`);
}

async function chooseSelect(cdp, item) {
  const selector = selectorFor(item);
  const optionIndex = await cdp.evaluate(`(() => {
    const node=document.querySelector(${JSON.stringify(selector)});
    return node ? [...node.options].findIndex(option => option.value === ${JSON.stringify(item.value)}) : -1;
  })()`);
  const currentIndex = await cdp.evaluate(`document.querySelector(${JSON.stringify(selector)})?.selectedIndex ?? -1`);
  if (optionIndex < 0) throw new Error(`Select option not found: ${item.commandId}=${item.value}`);
  await click(cdp, selector);
  await press(cdp, "Escape", {}, 30);
  await cdp.evaluate(`document.querySelector(${JSON.stringify(selector)}).focus()`);
  const direction = optionIndex >= currentIndex ? "ArrowDown" : "ArrowUp";
  for (let index = 0; index < Math.abs(optionIndex - currentIndex); index += 1) await press(cdp, direction, {}, 0);
  await sleep(300);
}

async function clickMenuItem(cdp, item) {
  await click(cdp, `[data-dropdown-id=${JSON.stringify(item.parent)}]`);
  await click(cdp, ".vno-ribbon-dropdown-menu .vno-ribbon-dropdown-item", Number(item.index || 0));
}

async function perform(cdp, item) {
  if (item.action === "select") return chooseSelect(cdp, item);
  if (item.action === "menuItem") return clickMenuItem(cdp, item);
  await click(cdp, selectorFor(item));
}

async function prepareSpecial(cdp, item) {
  if (item.assertion === "paste") {
    await resetSelection(cdp, false, "#source");
    await click(cdp, '[data-command-id="common.edit.copy"]');
    await resetSelection(cdp, true);
  }
  if (item.assertion === "formatPainter") {
    await resetSelection(cdp, false, "#source");
  }
  if (item.assertion === "clearFormat") {
    await click(cdp, '[data-command-id="writer.text.bold"]');
    await resetSelection(cdp);
  }
  if (item.assertion === "sort") {
    await cdp.evaluate(`(() => { const body=document.querySelector('.vno-writer-body'); body.innerHTML='<p>Zulu</p><p>beta</p><p>Alpha</p>'; const range=document.createRange(); range.selectNodeContents(body); const selection=getSelection(); selection.removeAllRanges(); selection.addRange(range); body.focus(); })()`);
  }
}

async function finishSpecial(cdp, item) {
  if (item.assertion === "copy") {
    await resetSelection(cdp, true);
    await click(cdp, '[data-command-id="common.edit.paste"]');
  }
  if (item.assertion === "formatPainter") {
    const points = await cdp.evaluate(`(() => {
      const target=document.querySelector('#target'); const node=document.createTreeWalker(target,NodeFilter.SHOW_TEXT).nextNode(); const range=document.createRange(); range.setStart(node,0); range.setEnd(node,Math.min(4,node.data.length));
      const rect=range.getBoundingClientRect(); return {x1:rect.left+2,y:rect.top+rect.height/2,x2:rect.right-2};
    })()`);
    await mouseDrag(cdp, points.x1, points.y, points.x2, points.y, { steps: 6 });
  }
}

async function state(cdp) {
  return cdp.evaluate(`(() => {
    const body=document.querySelector('.vno-writer-body'); const target=body.querySelector('#target');
    const selection=getSelection(); const anchor=selection?.anchorNode?.nodeType===3?selection.anchorNode.parentElement:selection?.anchorNode;
    const targetElement=target || body.querySelector('li,p') || body;
    const anchorElement=anchor?.nodeType===1 ? anchor : anchor?.parentElement;
    const style=getComputedStyle(anchorElement || targetElement); const targetStyle=getComputedStyle(targetElement);
    const visible=node => !!node && !!node.getClientRects().length;
    const dialogs=[...document.querySelectorAll('[role=dialog],.vno-dialog,.vno-modal,.vno-find-panel')].filter(visible);
    return {
      html:body.innerHTML, text:body.innerText, selected:selection?.toString() || '', targetHtml:targetElement.outerHTML,
      fontFamily:style.fontFamily, fontSize:parseFloat(style.fontSize)*72/96, fontWeight:style.fontWeight,
      fontStyle:style.fontStyle, decoration:style.textDecorationLine, verticalAlign:style.verticalAlign,
      color:style.color, backgroundColor:style.backgroundColor, targetBackground:targetStyle.backgroundColor,
      targetBorder:targetStyle.borderStyle, targetBorderBottom:targetStyle.borderBottomStyle,
      align:targetStyle.textAlign, lineHeight:targetStyle.lineHeight, marginLeft:parseFloat(targetStyle.marginLeft)||0,
      lineHeightToken:targetElement.style.getPropertyValue('--vno-lh') || targetElement.style.lineHeight || '',
      bold:document.queryCommandState('bold'), italic:document.queryCommandState('italic'), underline:document.queryCommandState('underline'),
      strike:document.queryCommandState('strikeThrough'), subscript:document.queryCommandState('subscript'), superscript:document.queryCommandState('superscript'),
      menuOpen:!!document.querySelector('.vno-ribbon-dropdown-menu'), marks:body.classList.contains('vno-show-formatting-marks'),
      dialogCount:dialogs.length, dialogText:dialogs.at(-1)?.innerText?.replace(/\\s+/g,' ').slice(0,160)||'',
      findVisible:[...document.querySelectorAll('.vno-fr-dialog-overlay,.vno-find-panel,[data-find-panel]')].some(visible),
      replaceVisible:[...document.querySelectorAll('.vno-fr-dialog-overlay')].some(node=>visible(node)&&node.querySelector('#vno-fr-tab-replace[aria-selected="true"]')),
      listTag:targetElement.closest('li')?.parentElement?.tagName || body.querySelector('li')?.parentElement?.tagName || '',
      listHtml:targetElement.closest('ol,ul')?.outerHTML || body.querySelector('ol,ul')?.outerHTML || '',
      pressed:Object.fromEntries([...document.querySelectorAll('[data-command-id][aria-pressed]')].map(node=>[node.dataset.commandId,node.getAttribute('aria-pressed')]))
    };
  })()`);
}

function assertEffect(item, before, after) {
  const close = (a, b, tolerance = 0.2) => Math.abs(Number(a) - Number(b)) <= tolerance;
  const truth = (pass, detail) => ({ pass: Boolean(pass), detail });
  switch (item.assertion) {
    case "paste": return truth(after.text !== before.text && /beta/.test(after.text), `${before.text} -> ${after.text}`);
    case "cut": return truth(!after.text.includes("beta gamma"), after.text);
    case "copy": return truth(after.text.length > before.text.length && after.text.includes("beta"), after.text);
    case "formatPainter": return truth(/<(b|strong)[^>]*>[\s\S]*beta/i.test(after.html), after.html);
    case "fontFamily": return truth(after.fontFamily.toLowerCase().includes(String(item.expected).toLowerCase()), after.fontFamily);
    case "fontSize": return truth(close(after.fontSize, item.expected), `${after.fontSize}pt`);
    case "fontGrow": return truth(after.fontSize > before.fontSize, `${before.fontSize}->${after.fontSize}pt`);
    case "fontShrink": return truth(after.fontSize < before.fontSize, `${before.fontSize}->${after.fontSize}pt`);
    case "toggleBold": return truth(after.bold || Number(after.fontWeight) >= 600, `bold=${after.bold}, weight=${after.fontWeight}`);
    case "toggleItalic": return truth(after.italic || after.fontStyle === "italic", `italic=${after.italic}`);
    case "toggleUnderline": return truth(after.underline || after.decoration.includes("underline"), `underline=${after.underline}`);
    case "toggleStrike": return truth(after.strike || after.decoration.includes("line-through"), `strike=${after.strike}`);
    case "toggleSubscript": return truth(after.subscript || after.verticalAlign === "sub", `subscript=${after.subscript}`);
    case "toggleSuperscript": return truth(after.superscript || after.verticalAlign === "super", `superscript=${after.superscript}`);
    case "changeCase": return truth(after.text.includes("BETA"), after.text);
    case "clearFormat": return truth(!/<(?:b|i|u|strike|sub|sup)\b[^>]*>[^<]+/i.test(after.targetHtml) && !/style=["'][^"']*(?:font|color|background|text-decoration)/i.test(after.targetHtml), after.targetHtml);
    case "highlight": return truth(after.backgroundColor === "rgb(255, 205, 0)" || /background-color:\s*rgb\(255,\s*205,\s*0\)/i.test(after.html), after.backgroundColor);
    case "textColor": return truth(after.color !== before.color, `${before.color}->${after.color}`);
    case "bullet": return truth(after.listTag === "UL", after.listHtml);
    case "numbered": return truth(after.listTag === "OL", after.listHtml);
    case "multilevel": return truth(after.listTag === "OL" && after.listHtml.toLowerCase().includes(String(item.expected).toLowerCase()), after.listHtml);
    case "indentInc": return truth(after.marginLeft > before.marginLeft || (after.html !== before.html && /blockquote|margin-left/i.test(after.html)), `${before.marginLeft}->${after.marginLeft}px; ${after.html}`);
    case "indentDec": return truth(after.marginLeft < before.marginLeft || (after.html !== before.html && !/blockquote/i.test(after.html)), `${before.marginLeft}->${after.marginLeft}px; ${after.html}`);
    case "sort": return truth(after.text.indexOf("Alpha") < after.text.indexOf("beta") && after.text.indexOf("beta") < after.text.indexOf("Zulu"), after.text);
    case "toggleMarks": return truth(after.marks && after.pressed[item.commandId] === "true", `marks=${after.marks}, pressed=${after.pressed[item.commandId]}`);
    case "restartNumbering": return truth(after.listTag === "OL" && /start=["']1/i.test(after.listHtml), after.listHtml);
    case "continueNumbering": return truth(after.listTag === "OL", after.listHtml);
    case "align": return truth(after.align === item.expected || (item.expected === "left" && ["left", "start"].includes(after.align)), after.align);
    case "lineHeight": return truth(close(parseFloat(after.lineHeightToken), Number(item.expected), 0.01) || after.html.includes(`--vno-lh: ${item.expected}`), `${after.lineHeight}/${after.lineHeightToken}; ${after.html}`);
    case "shading": return truth(after.targetBackground !== before.targetBackground && after.targetBackground !== "rgba(0, 0, 0, 0)", after.targetBackground);
    case "borders": return truth(after.targetBorder !== "none" || after.targetBorderBottom !== "none", `${after.targetBorder}/${after.targetBorderBottom}`);
    case "dialog": return truth(after.dialogCount > before.dialogCount, after.dialogText);
    case "style": {
      const pass = item.expected === "title" ? /vno-style-title/.test(after.html) && after.text.includes("beta")
        : item.expected === "h1" ? /<h1[^>]*>[\s\S]*beta/i.test(after.html)
        : /<p[^>]*>[\s\S]*beta/i.test(after.html) && !/vno-style-title/.test(after.html);
      return truth(pass, after.html);
    }
    case "findPanel": return truth(after.findVisible, after.dialogText);
    case "replacePanel": return truth(after.replaceVisible, after.dialogText);
    case "menuOpen": return truth(after.menuOpen, `menuOpen=${after.menuOpen}`);
    case "selectAll": return truth(after.selected.includes("Alpha") && after.selected.includes("Zulu"), after.selected.slice(0, 80));
    default: return truth(false, `Unknown assertion ${item.assertion}`);
  }
}

const toggleAssertions = new Set(["toggleBold", "toggleItalic", "toggleUnderline", "toggleStrike", "toggleSubscript", "toggleSuperscript", "toggleMarks"]);
function assertToggleOff(item, second) {
  const map = { toggleBold: "bold", toggleItalic: "italic", toggleUnderline: "underline", toggleStrike: "strike", toggleSubscript: "subscript", toggleSuperscript: "superscript", toggleMarks: "marks" };
  const key = map[item.assertion];
  return { pass: !second[key] && second.pressed[item.commandId] !== "true", detail: `${key}=${second[key]}, pressed=${second.pressed[item.commandId]}, html=${second.targetHtml}` };
}

async function saveAndReadXml(cdp, item, runNumber) {
  if (!item.xml) return { status: "N/A", marker: "" };
  const output = path.join(docxRoot, `${safeName(item)}-run${runNumber}.docx`);
  await unlink(output).catch(error => { if (error?.code !== "ENOENT") throw error; });
  const result = await cdp.evaluate(`(async()=>{
    const [{globalUnoBridge}] = await Promise.all([import('/adapters/libreoffice/common/uno-bridge.js')]);
    const adapter=window.__vnoAppInstance?.adapter; const content=adapter?._contentForExport?.();
    return globalUnoBridge.saveRealFileInPlace('writer', content, ${JSON.stringify(output)}, ${JSON.stringify(output)});
  })()`, { timeoutMilliseconds: 240000 });
  if (result?.status !== "ok") return { status: "BLOCKED", marker: JSON.stringify(result) };
  const python = spawnSync("python", ["-c", "import sys,zipfile;print(zipfile.ZipFile(sys.argv[1]).read('word/document.xml').decode('utf-8'))", output], { encoding: "utf8", maxBuffer: 20 * 1024 * 1024 });
  if (python.status !== 0) return { status: "BLOCKED", marker: python.stderr.trim() };
  const paragraphs = python.stdout.match(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g) || [];
  const scope = paragraphs.find(paragraph => paragraph.includes("beta")) || python.stdout;
  const pattern = item.xmlPattern ? new RegExp(item.xmlPattern, "i") : new RegExp(`<${item.xml}(?:\\s|/|>)`, "i");
  const present = pattern.test(scope);
  return { status: present ? "PASS" : "FAIL", marker: item.xmlPattern || item.xml, output };
}

async function discoverDom(cdp) {
  const direct = await cdp.evaluate(`(() => [...document.querySelectorAll('.vno-ribbon-content button,.vno-ribbon-content select')]
    .filter(node=>node.getClientRects().length).map(node=>({commandId:node.dataset.commandId||'',dropdown:node.dataset.dropdownId||'',label:node.getAttribute('aria-label')||node.title||node.innerText.trim()})))()`);
  const menus = [];
  for (const parent of direct.filter(item => item.dropdown)) {
    await click(cdp, `[data-dropdown-id=${JSON.stringify(parent.dropdown)}]`);
    menus.push(...await cdp.evaluate(`[...document.querySelectorAll('.vno-ribbon-dropdown-item')].map(node=>({commandId:node.dataset.commandId,label:node.innerText.trim()}))`));
    await press(cdp, "Escape", {}, 30);
  }
  return { direct, menus, count: direct.length + menus.length };
}

async function runApp(runNumber) {
  const session = await launchApp(spec.app, { startTimeoutMilliseconds: 90000 });
  const results = [];
  try {
    await session.cdp.waitFor(`document.getElementById('vno-ribbon-tab-${spec.tabId}')`, { timeoutMilliseconds: 30000 });
    await click(session.cdp, `#vno-ribbon-tab-${spec.tabId}`);
    const dom = await discoverDom(session.cdp);
    for (const item of spec.items) {
      const key = safeName(item);
      try {
        await resetSample(session.cdp, item);
        await prepareSpecial(session.cdp, item);
        const before = await state(session.cdp);
        await capture(session.cdp, path.join(proofRoot, `${key}-truoc.png`));
        await perform(session.cdp, item);
        await finishSpecial(session.cdp, item);
        await sleep(180);
        const after = await state(session.cdp);
        await capture(session.cdp, path.join(proofRoot, `${key}-sau.png`));
        const effect = assertEffect(item, before, after);
        const xml = await saveAndReadXml(session.cdp, item, runNumber);
        let toggle = { pass: true, detail: "N/A" };
        if (toggleAssertions.has(item.assertion)) {
          await resetSelection(session.cdp);
          await perform(session.cdp, item);
          toggle = assertToggleOff(item, await state(session.cdp));
        }
        results.push({ ...item, app: effect, toggle, xml, conclusion: effect.pass && toggle.pass && xml.status !== "FAIL" ? "ĐÚNG" : "SAI CHỨC NĂNG" });
      } catch (error) {
        results.push({ ...item, app: { pass: false, detail: String(error?.message || error) }, toggle: { pass: false, detail: "not reached" }, xml: { status: "BLOCKED", marker: "not reached" }, conclusion: "CẤM" });
      }
      console.log(`${results.at(-1).conclusion.padEnd(16)} | ${item.commandId}${item.args ? ":" + item.args : ""} | ${results.at(-1).app.detail.slice(0, 100)}`);
    }
    return { run: runNumber, appPid: session.child.pid, dom, results };
  } finally {
    await session.close();
  }
}

function runWordOracle() {
  const helper = path.join(repoRoot, "scripts/audit-0610/word_home_oracle.ps1");
  const output = path.join(proofRoot, "word-home.json");
  const result = spawnSync("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", helper, "-SpecPath", specPath, "-OutputPath", output], { cwd: repoRoot, encoding: "utf8", timeout: 300000, maxBuffer: 10 * 1024 * 1024 });
  if (result.error || result.status !== 0) return { blocked: true, detail: result.error?.message || result.stderr || result.stdout };
  try { return JSON.parse(result.stdout.trim().split(/\r?\n/).at(-1)); }
  catch { return { blocked: true, detail: result.stdout || result.stderr }; }
}

const appRuns = [];
for (let runNumber = 1; runNumber <= runs; runNumber += 1) appRuns.push(await runApp(runNumber));
const word = runWordOracle();
const stable = appRuns.length < 2 || appRuns[0].results.every((result, index) => result.conclusion === appRuns[1].results[index]?.conclusion);
const evidence = { generatedAt: new Date().toISOString(), spec: path.relative(repoRoot, specPath), proofRoot, stable, runs: appRuns, word };
await writeFile(path.join(proofRoot, "audit-results.json"), JSON.stringify(evidence, null, 2), "utf8");
console.log(`SUMMARY items=${spec.items.length} runs=${runs} stable=${stable} appPass=${appRuns.at(-1).results.filter(item=>item.conclusion==='ĐÚNG').length} wordBlocked=${Boolean(word.blocked)}`);
process.exitCode = stable && appRuns.every(run => run.results.every(item => item.conclusion === "ĐÚNG")) && !word.blocked ? 0 : 1;
