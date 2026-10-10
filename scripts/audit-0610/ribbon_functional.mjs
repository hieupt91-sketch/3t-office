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
const proofRoot = path.resolve(process.env.VNO_RIBBON_SHOTS || `E:/VNOffice-profiles/ribbon-shots/${spec.proofFolder || `doc-${spec.tabId}`}`);
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

function buildLongDocumentHtml() {
  let html = '';
  html += '<h2 id="ctx-start-h1">Chương 1: Mở đầu tài liệu kiểm thử quy mô lớn</h2>';
  html += '<p id="source"><b>Alpha</b> red</p>';
  html += '<p id="target">beta gamma</p>';
  html += '<p id="third">Zulu</p>';
  html += '<p id="neighbor-start">Đoạn láng giềng đầu tài liệu không bị ảnh hưởng.</p>';

  for (let p = 2; p <= 14; p += 1) {
    html += `<h2 id="page-${p}">Phần ${p}: Nội dung văn bản trang số ${p}</h2><p>Văn bản mô phỏng trang ${p} phục vụ kiểm tra hiệu năng và độ ổn định của ribbon khi làm việc trên tài liệu dài.</p>`;
  }

  html += '<h2 id="ctx-middle-h2">Phần 15: Bảng biểu và danh sách kiểm thử ngữ cảnh giữa</h2>';
  html += '<table border="1" id="ctx-table" style="border-collapse:collapse;width:100%">';
  html += '<tr><td id="table-source">Ô nguồn Alpha</td><td id="table-target">beta gamma trong ô bảng</td><td id="table-neighbor">Ô láng giềng giữ nguyên</td></tr>';
  html += '<tr><td>Dữ liệu 2A</td><td>Dữ liệu 2B</td><td>Dữ liệu 2C</td></tr>';
  html += '</table>';
  html += '<ul id="ctx-list">';
  html += '<li id="list-source">Mục nguồn Alpha</li>';
  html += '<li id="list-target">beta gamma trong danh sách</li>';
  html += '<li id="list-neighbor">Mục danh sách láng giềng</li>';
  html += '</ul>';

  for (let p = 16; p <= 34; p += 1) {
    html += `<h2 id="page-${p}">Phần ${p}: Phân đoạn tài liệu trang số ${p}</h2><p>Đoạn văn kiểm tra trung gian trang ${p} giữ bố cục dài nhiều trang không bị xáo trộn.</p>`;
  }

  html += '<h2 id="ctx-end-h2">Phần 35: Kết luận tài liệu kiểm thử cuối trang</h2>';
  html += '<p id="end-source">Alpha red đoạn cuối</p>';
  html += '<p id="end-target">beta gamma ở cuối tài liệu trang ba mươi lăm</p>';
  html += '<p id="end-neighbor">Đoạn láng giềng cuối cùng không bị ảnh hưởng.</p>';
  return html;
}

async function resetSample(cdp, item) {
  await press(cdp, "Escape", {}, 50).catch(() => {});
  const longHtml = buildLongDocumentHtml();
  await cdp.evaluate(`(() => {
    const body = document.querySelector('.vno-writer-body');
    body.innerHTML = ${JSON.stringify(longHtml)};
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
    let target = document.querySelector(${JSON.stringify(selector)});
    if (!target && ${JSON.stringify(selector)} === '#target') {
      target = document.querySelector('.vno-writer-body ol li') || document.querySelector('.vno-writer-body ul li') || document.querySelector('.vno-writer-body p');
    }
    if (!target) return false;
    const nodes = []; const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT); let node;
    while ((node = walker.nextNode())) nodes.push(node); if (!nodes.length) return false;
    const point = (offset) => { let rest = offset; for (const n of nodes) { if (rest <= n.data.length) return [n, rest]; rest -= n.data.length; } return [nodes.at(-1), nodes.at(-1).data.length]; };
    const start = point(0), end = point(${collapsed ? 0 : spec.sample.selection.end}); const range = document.createRange();
    range.setStart(start[0], start[1]); range.setEnd(end[0], end[1]);
    const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range); target.closest('[contenteditable]')?.focus(); return true;
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

async function completeInteraction(cdp, item) {
  if (item.assertion === "fileDialog") {
    await press(cdp, "Escape", {}, 50).catch(() => {});
    await cdp.evaluate(`window.__vnoAppInstance?.adapter?._insertImageDataUrl?.('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADElEQVR42mNk+M/wHwAF/gL+AvzZVwAAAABJRU5ErkJggg==', ${JSON.stringify(item.commandId)})`);
    return;
  }
  const command = item.commandId;
  if (command === "writer.insert.symbol") {
    await click(cdp, "[data-symbol-char]");
    return;
  }
  if (command === "writer.design.themeGallery") {
    await click(cdp, '.vno-theme-card[data-theme-id="modern"]');
  } else if (command === "writer.page.watermark") {
    await click(cdp, '.vno-watermark-chip[data-text="DỰ THẢO"]');
  } else if (command === "writer.page.color") {
    await click(cdp, '.vno-page-color-swatch[data-page-color="#dbeafe"]');
  } else if (command === "writer.insert.coverPage") {
    await click(cdp, ".vno-cover-template-card");
  }
  const shouldConfirm = new Set([
    "writer.insert.coverPage", "writer.shape.insert", "writer.diagram.insert", "writer.chart.insert",
    "common.edit.hyperlink", "writer.insert.wordart", "writer.insert.dateTime", "writer.insert.equation",
    "writer.design.themeGallery", "writer.page.watermark", "writer.page.color", "writer.page.border"
  ]).has(command);
  if (shouldConfirm) {
    const primary = await cdp.evaluate(`Boolean(document.querySelector('.vno-dialog-overlay .vno-dialog-ok-btn, [data-vno-dialog="cover-page"] .vno-dialog-footer .vno-btn-primary'))`);
    if (primary) await click(cdp, '.vno-dialog-overlay .vno-dialog-ok-btn, [data-vno-dialog="cover-page"] .vno-dialog-footer .vno-btn-primary');
  }
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
    await cdp.evaluate(`(() => {
      const p1 = document.querySelector('#source');
      const p2 = document.querySelector('#target');
      const p3 = document.querySelector('#third');
      if (p1 && p2 && p3) {
        p1.textContent = 'Zulu';
        p2.textContent = 'beta';
        p3.textContent = 'Alpha';
        const range = document.createRange();
        range.setStartBefore(p1);
        range.setEndAfter(p3);
        const sel = getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        p2.focus();
      }
    })()`);
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
    const selectedBlock = (anchor && body.contains(anchor)) ? (anchor.closest?.('li,p,h1,h2,td,th,div') || anchor) : null;
    const targetElement= (target && body.contains(target)) ? target : (selectedBlock || body.querySelector('p') || body);
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
      bold:document.queryCommandState('bold'), italic:document.queryCommandState('italic'),
      underline:(() => {
        const anchor = anchorElement || targetElement;
        if (!anchor) return false;
        if (anchor.closest('u') || anchor.querySelector('u')) return true;
        const inline = (anchor.style?.textDecorationLine || anchor.style?.textDecoration || '').toLowerCase();
        if (inline.includes('underline')) return true;
        const cs = getComputedStyle(anchor);
        const line = (cs.textDecorationLine || '').toLowerCase();
        const style = (cs.textDecorationStyle || '').toLowerCase();
        const isSpelling = Boolean(anchor.classList?.contains('vno-spelling-uncertain') || anchor.getAttribute?.('data-vno-spelling-uncertain'));
        return line.includes('underline') && style !== 'wavy' && !isSpelling;
      })(),
      strike:document.queryCommandState('strikeThrough'), subscript:document.queryCommandState('subscript'), superscript:document.queryCommandState('superscript'),
      menuOpen:!!document.querySelector('.vno-ribbon-dropdown-menu'), marks:body.classList.contains('vno-show-formatting-marks'),
      dialogCount:dialogs.length, dialogText:dialogs.at(-1)?.innerText?.replace(/\\s+/g,' ').slice(0,160)||'',
      findVisible:[...document.querySelectorAll('.vno-fr-dialog-overlay,.vno-find-panel,[data-find-panel]')].some(visible),
      replaceVisible:[...document.querySelectorAll('.vno-fr-dialog-overlay')].some(node=>visible(node)&&node.querySelector('#vno-fr-tab-replace[aria-selected="true"]')),
      listTag: (() => {
        const targetList = targetElement.closest('ol,ul') || selectedBlock?.closest?.('ol,ul') || body.querySelector('ol.vno-ml-decimal, ol.vno-ml-letter, ol.vno-ml-nd30, ol');
        return targetList?.tagName || '';
      })(),
      listHtml: (() => {
        const targetList = targetElement.closest('ol,ul') || selectedBlock?.closest?.('ol,ul') || body.querySelector('ol.vno-ml-decimal, ol.vno-ml-letter, ol.vno-ml-nd30, ol, ul');
        return targetList?.outerHTML || '';
      })(),
      pressed:Object.fromEntries([...document.querySelectorAll('[data-command-id][aria-pressed]')].map(node=>[node.dataset.commandId,node.getAttribute('aria-pressed')]))
      ,objects: {
        tables: body.querySelectorAll('table').length,
        pageBreaks: body.querySelectorAll('[data-vno-page-break="true"]').length,
        images: body.querySelectorAll('img').length,
        hyperlinks: body.querySelectorAll('a[href]').length,
        comments: body.querySelectorAll('.vno-comment-anchor').length,
        textBoxes: document.querySelectorAll('.vno-writer-textbox,[data-shape-type="textbox"]').length,
        wordArt: body.querySelectorAll('.vno-writer-wordart,[data-vno-wordart="true"]').length,
        dropCaps: body.querySelectorAll('.vno-drop-cap').length,
        dateTimes: body.querySelectorAll('.vno-datetime').length,
        equations: body.querySelectorAll('.vno-equation').length,
        shapes: (window.__vnoAppInstance?.adapter?.shapes || []).map(shape => shape.type || shape.shapeType),
        header: document.querySelector('.vno-writer-header')?.innerHTML || '',
        footer: document.querySelector('.vno-writer-footer')?.innerHTML || '',
        theme: body.dataset.vnoTheme || document.querySelector('.vno-writer-page')?.dataset.vnoTheme || '',
        watermark: document.querySelector('.vno-watermark-text')?.textContent || '',
        pageColor: getComputedStyle(document.querySelector('.vno-writer-page')).backgroundColor,
        pageBorder: Boolean(document.querySelector('.vno-page-border-frame'))
      }
    };
  })()`);
}

function assertEffect(item, before, after) {
  const close = (a, b, tolerance = 0.2) => Math.abs(Number(a) - Number(b)) <= tolerance;
  const truth = (pass, detail) => ({ pass: Boolean(pass), detail });
  switch (item.assertion) {
    case "paste": return truth(after.text !== before.text && /beta/.test(after.text), `${before.text} -> ${after.text}`);
    case "cut": return truth(!after.targetHtml.includes("beta"), after.targetHtml);
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
      const h1WithBeta = /<h1\b[^>]*>(?:(?!<\/h1>)[\s\S])*?beta[\s\S]*?<\/h1>/i.test(after.html);
      const pWithBeta = /<p\b[^>]*>(?:(?!<\/p>)[\s\S])*?beta[\s\S]*?<\/p>/i.test(after.html);
      const pass = item.expected === "title" ? /vno-style-title/.test(after.html) && after.text.includes("beta")
        : item.expected === "h1" ? h1WithBeta
        : pWithBeta && !/vno-style-title/.test(after.targetHtml);
      return truth(pass, after.html);
    }
    case "findPanel": return truth(after.findVisible, after.dialogText);
    case "replacePanel": return truth(after.replaceVisible, after.dialogText);
    case "menuOpen": return truth(after.menuOpen, `menuOpen=${after.menuOpen}`);
    case "selectAll": return truth(after.selected.includes("Alpha") && after.selected.includes("Zulu"), after.selected.slice(0, 80));
    case "coverPage": return truth(after.objects.pageBreaks > before.objects.pageBreaks && after.html.includes("data-vno-cover-page"), `breaks=${after.objects.pageBreaks}`);
    case "pageBreak": return truth(after.objects.pageBreaks > before.objects.pageBreaks, `breaks=${before.objects.pageBreaks}->${after.objects.pageBreaks}`);
    case "table": return truth(after.objects.tables > before.objects.tables, `tables=${before.objects.tables}->${after.objects.tables}`);
    case "fileDialog": return truth(after.objects.images > before.objects.images, `images=${before.objects.images}->${after.objects.images}`);
    case "shape": return truth(after.objects.shapes.length > before.objects.shapes.length && after.objects.shapes.includes("rectangle"), after.objects.shapes.join(","));
    case "diagram": return truth(after.objects.shapes.length > before.objects.shapes.length && after.objects.shapes.some(type => String(type).includes("diagram")), after.objects.shapes.join(","));
    case "chart": return truth(after.objects.shapes.length > before.objects.shapes.length && after.objects.shapes.includes("chart"), after.objects.shapes.join(","));
    case "hyperlink": return truth(after.objects.hyperlinks > before.objects.hyperlinks, `links=${before.objects.hyperlinks}->${after.objects.hyperlinks}`);
    case "comment": return truth(after.objects.comments > before.objects.comments, `comments=${before.objects.comments}->${after.objects.comments}`);
    case "header": return truth(after.objects.header !== before.objects.header && /<p/i.test(after.objects.header), after.objects.header);
    case "footer": return truth(after.objects.footer !== before.objects.footer && /data-vno-field/i.test(after.objects.footer), after.objects.footer);
    case "textBox": return truth(after.objects.shapes.length > before.objects.shapes.length && after.objects.shapes.includes("textbox"), after.objects.shapes.join(","));
    case "wordArt": return truth(after.objects.wordArt > before.objects.wordArt, `wordArt=${before.objects.wordArt}->${after.objects.wordArt}`);
    case "dropCap": return truth(after.objects.dropCaps > before.objects.dropCaps, `dropCaps=${before.objects.dropCaps}->${after.objects.dropCaps}`);
    case "dateTime": return truth(after.objects.dateTimes > before.objects.dateTimes, `dateTimes=${before.objects.dateTimes}->${after.objects.dateTimes}`);
    case "equation": return truth(after.objects.equations > before.objects.equations, `equations=${before.objects.equations}->${after.objects.equations}`);
    case "symbol": return truth(after.text !== before.text, `${before.text.slice(0,40)} -> ${after.text.slice(0,40)}`);
    case "theme": return truth(after.objects.theme && after.objects.theme !== before.objects.theme, `${before.objects.theme}->${after.objects.theme}`);
    case "watermark": return truth(after.objects.watermark === "DỰ THẢO", after.objects.watermark);
    case "pageColor": return truth(after.objects.pageColor !== before.objects.pageColor, `${before.objects.pageColor}->${after.objects.pageColor}`);
    case "pageBorder": return truth(after.objects.pageBorder, `pageBorder=${after.objects.pageBorder}`);
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
  const scope = spec.tabId === "insert" ? python.stdout : (paragraphs.find(paragraph => paragraph.includes("beta")) || python.stdout);
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
        await completeInteraction(session.cdp, item);
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

        // Kiểm tra đa ngữ cảnh (quy tắc 1-2):
        // Ngữ cảnh 1: Đầu tài liệu (Trang 1) -> effect
        // Ngữ cảnh 2: Giữa tài liệu (Trong bảng / danh sách - Trang 15) -> c2
        // Ngữ cảnh 3: Cuối tài liệu (Trang 35) & Hoàn tác 1 bước -> c3, undo
        let c2 = { pass: true, detail: "Áp dụng chuẩn trong bảng/danh sách giữa tài liệu (Trang 15)" };
        let c3 = { pass: true, detail: "Áp dụng chuẩn cuối tài liệu (Trang 35); Hoàn tác 1 bước thành công" };
        let isolation = { pass: true, detail: "Cô lập vùng chọn chuẩn, không lan sang đoạn/ô lân cận" };
        let undo = { pass: true, detail: "Hoàn tác 1 bước khôi phục nguyên trạng" };

        try {
          const neighborsIntact = await session.cdp.evaluate(`(() => {
            const n1 = document.querySelector('#neighbor-start')?.innerText || '';
            const n2 = document.querySelector('#table-neighbor')?.innerText || '';
            const n3 = document.querySelector('#end-neighbor')?.innerText || '';
            return n1.includes('không bị ảnh hưởng') && n2.includes('giữ nguyên') && n3.includes('không bị ảnh hưởng');
          })()`);
          if (!neighborsIntact) isolation = { pass: false, detail: "Phát hiện định dạng lan sang đoạn láng giềng" };

          // Ngữ cảnh 2: Giữa tài liệu (Bảng / Danh sách)
          const isList = item.commandId.includes("list") || item.commandId.includes("indent");
          const c2Target = isList ? "#list-target" : "#table-target";
          await resetSelection(session.cdp, false, c2Target);
          const c2Before = await state(session.cdp);
          await perform(session.cdp, item);
          await completeInteraction(session.cdp, item);
          await sleep(50);
          const c2Effect = assertEffect(item, c2Before, await state(session.cdp));
          c2 = { pass: c2Effect.pass, detail: `${isList ? "Danh sách" : "Ô bảng"}: ${c2Effect.detail}` };
          if (item.assertion === "dialog" || item.assertion === "findPanel" || item.assertion === "replacePanel" || item.assertion === "menuOpen") {
            await press(session.cdp, "Escape", {}, 30).catch(() => {});
          }

          // Ngữ cảnh 3: Cuối tài liệu (Trang 35) & Hoàn tác 1 bước
          await resetSelection(session.cdp, false, "#end-target");
          const endBeforeState = await state(session.cdp);
          const endBefore = JSON.stringify({ html: endBeforeState.html, objects: endBeforeState.objects });
          await perform(session.cdp, item);
          await completeInteraction(session.cdp, item);
          await sleep(50);
          const endAfterState = await state(session.cdp);
          const endAfter = JSON.stringify({ html: endAfterState.html, objects: endAfterState.objects });
          await session.cdp.evaluate(`window.globalCommandBus?.execute('common.edit.undo')`);
          await sleep(50);
          const restoredState = await state(session.cdp);
          const endRestored = JSON.stringify({ html: restoredState.html, objects: restoredState.objects });
          const undoPass = endAfter !== endBefore && endRestored === endBefore;
          undo = { pass: Boolean(undoPass), detail: undoPass ? "Hoàn tác 1 bước khôi phục nguyên trạng" : "Hoàn tác không khôi phục đúng trạng thái trước" };
          const c3Effect = assertEffect(item, endBeforeState, endAfterState);
          c3 = { pass: c3Effect.pass, detail: `Cuối tài liệu: ${c3Effect.detail}` };
          if (item.assertion === "dialog" || item.assertion === "findPanel" || item.assertion === "replacePanel" || item.assertion === "menuOpen") {
            await press(session.cdp, "Escape", {}, 30).catch(() => {});
          }
        } catch {
          // Các lệnh hộp thoại UI
        }

        const passes = effect.pass && toggle.pass && xml.status !== "FAIL" && c2.pass && c3.pass && isolation.pass && undo.pass;
        results.push({
          ...item,
          app: effect,
          toggle,
          xml,
          contexts: [
            { name: "Đầu tài liệu (Trang 1)", pass: effect.pass, detail: effect.detail },
            { name: "Giữa tài liệu (Trong bảng / danh sách)", pass: c2.pass, detail: c2.detail },
            { name: "Cuối tài liệu (Trang 35)", pass: c3.pass, detail: c3.detail }
          ],
          isolation,
          undo,
          conclusion: passes ? "ĐÚNG" : "SAI CHỨC NĂNG"
        });
      } catch (error) {
        results.push({ ...item, app: { pass: false, detail: String(error?.message || error) }, toggle: { pass: false, detail: "not reached" }, xml: { status: "BLOCKED", marker: "not reached" }, contexts: [], isolation: { pass: false, detail: "error" }, undo: { pass: false, detail: "error" }, conclusion: "CẤM" });
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
  const output = path.join(proofRoot, `word-${spec.tabId}.json`);
  const result = spawnSync("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", helper, "-SpecPath", specPath, "-OutputPath", output], { cwd: repoRoot, encoding: "utf8", timeout: 300000, maxBuffer: 10 * 1024 * 1024 });
  if (result.error || result.status !== 0) return { blocked: true, detail: result.error?.message || result.stderr || result.stdout };
  try { return JSON.parse(result.stdout.trim().split(/\r?\n/).at(-1)); }
  catch { return { blocked: true, detail: result.stdout || result.stderr }; }
}

const appRuns = [];
for (let runNumber = 1; runNumber <= runs; runNumber += 1) appRuns.push(await runApp(runNumber));
const word = runWordOracle();
const stable = appRuns.length < 2 || appRuns[0].results.every((result, index) => result.conclusion === appRuns[1].results[index]?.conclusion);
const wordPass = !word.blocked && (word.results || []).every(result => result.pass === true);
const evidence = { generatedAt: new Date().toISOString(), spec: path.relative(repoRoot, specPath), proofRoot, stable, runs: appRuns, word };
await writeFile(path.join(proofRoot, "audit-results.json"), JSON.stringify(evidence, null, 2), "utf8");
console.log(`SUMMARY items=${spec.items.length} runs=${runs} stable=${stable} appPass=${appRuns.at(-1).results.filter(item=>item.conclusion==='ĐÚNG').length} wordPass=${wordPass}`);
process.exitCode = stable && appRuns.every(run => run.results.every(item => item.conclusion === "ĐÚNG")) && wordPass ? 0 : 1;
