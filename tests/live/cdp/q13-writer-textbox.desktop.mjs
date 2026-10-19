import { launchApp } from "./session.mjs";
import { typeText } from "./actions.mjs";

const session = await launchApp("writer", { startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
try {
  const cdp = session.cdp;
  const result = await cdp.evaluate(`(async () => {
    const a = window.__vnoAppInstance.adapter;
    const body = a.bodyDom;
    body.innerHTML = '<p>Đoạn văn bản cần giữ nguyên khi chèn hộp.</p>';
    const p = body.querySelector('p');
    const range = document.createRange();
    range.selectNodeContents(p);
    range.collapse(false);
    const selection = window.getSelection();
    selection.removeAllRanges(); selection.addRange(range);
    a.insertTextBox();
    await new Promise(resolve => setTimeout(resolve, 100));
    const shape = a.shapes.findLast(item => item.type === 'textbox');
    const holder = [...a.editorDom.querySelectorAll('[data-shape-id]')].find(node => node.dataset.shapeId === shape.id);
    const textBox = holder?.querySelector('.vno-writer-textbox-body');
    const pRect = p.getBoundingClientRect(), boxRect = textBox.getBoundingClientRect();
    const overlaps = pRect.left < boxRect.right && pRect.right > boxRect.left && pRect.top < boxRect.bottom && pRect.bottom > boxRect.top;
    return { paragraph: p.innerText, placeholder: textBox?.innerText, overlaps, box: {x:boxRect.x,y:boxRect.y,w:boxRect.width,h:boxRect.height}, paragraphRect: {x:pRect.x,y:pRect.y,w:pRect.width,h:pRect.height} };
  })()`, { awaitPromise: true, timeoutMilliseconds: 30000 });
  const checks = [
    ["Textbox placeholder is shown", result.placeholder === "Nhập văn bản"],
    ["Inserted textbox does not cover the current paragraph", !result.overlaps],
    ["Source paragraph remains unchanged", result.paragraph === "Đoạn văn bản cần giữ nguyên khi chèn hộp."],
  ];
  for (const [name, passed] of checks) console.log(`${passed ? "PASS" : "FAIL"} ${name}`);
  console.log(JSON.stringify(result));
  if (checks.some(([, passed]) => !passed)) process.exitCode = 1;
} finally { await session.close(); }
