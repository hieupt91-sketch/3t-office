import { mkdir } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { launchApp } from "./session.mjs";
import { press } from "./actions.mjs";
import { sleep } from "./client.mjs";
import { markerPositions, stateForMarkerPosition } from "../../../apps/writer/writer-ruler-controller.js";

const profile = "E:\\VNOffice-profiles\\codex-ruler";
const output = path.join(profile, "ruler-roundtrip.docx");
const results = [];
const near = (actual, expected, tolerance = 0.7) => Math.abs(actual - expected) <= tolerance;
const check = (name, pass, detail) => {
  results.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"} | ${name} | ${detail}`);
};

async function selectParagraph(cdp, index) {
  await cdp.evaluate(`(() => {
    const p = document.querySelectorAll('.vno-writer-body p')[${index}];
    const selection = getSelection(); const range = document.createRange();
    range.selectNodeContents(p); range.collapse(true);
    selection.removeAllRanges(); selection.addRange(range); p.closest('[contenteditable]')?.focus();
    document.dispatchEvent(new Event('selectionchange'));
  })()`);
  await sleep(150);
}

async function readState(cdp) {
  return cdp.evaluate("window.__vnoAppInstance.adapter.getRulerState()");
}

async function dragByMm(cdp, selector, deltaMm) {
  const before = await readState(cdp);
  const geometry = await cdp.evaluate(`(() => {
    const marker = document.querySelector(${JSON.stringify(selector)});
    const page = document.querySelector('.vno-writer-page');
    const m = marker.getBoundingClientRect(), p = page.getBoundingClientRect();
    return { x: m.left + m.width / 2, y: m.top + m.height / 2, pageWidth: p.width };
  })()`);
  const targetX = geometry.x + deltaMm * geometry.pageWidth / before.pageWidthMm;
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x: geometry.x, y: geometry.y, button: "left", buttons: 1 });
  for (let step = 1; step <= 8; step += 1) {
    await cdp.send("Input.dispatchMouseEvent", {
      type: "mouseMoved", x: geometry.x + (targetX - geometry.x) * step / 8, y: geometry.y,
      button: "left", buttons: 1
    });
  }
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: targetX, y: geometry.y, button: "left", buttons: 0 });
  await sleep(250);
  return { before, after: await readState(cdp) };
}

async function saveAs(session) {
  return session.cdp.evaluate(`(async () => {
    const [{globalUnoBridge}, {globalCommandBus}] = await Promise.all([
      import('/adapters/libreoffice/common/uno-bridge.js'), import('/platform/commands/command-bus.js')
    ]);
    const original = globalUnoBridge.saveRealFile;
    globalUnoBridge.saveRealFile = async (kind, content, format, name, source) =>
      globalUnoBridge.saveRealFileInPlace(kind, content, ${JSON.stringify(output)}, source || ${JSON.stringify(output)});
    try { return await globalCommandBus.execute('common.file.saveAs'); }
    finally { globalUnoBridge.saveRealFile = original; }
  })()`, { timeoutMilliseconds: 180000 });
}

async function run() {
  await mkdir(profile, { recursive: true });
  let session = await launchApp("writer", { root: process.cwd(), localAppData: profile });
  try {
    const { cdp } = session;
    await cdp.evaluate(`(() => {
      const body = document.querySelector('.vno-writer-body');
      body.innerHTML = '<p>Đoạn có thụt dòng đầu.</p><p>Đoạn có thụt lề treo.</p>';
    })()`);
    await selectParagraph(cdp, 0);

    const first = await dragByMm(cdp, '[data-ruler-kind="firstLine"]', 8);
    check("Kéo thụt dòng đầu", near(first.after.paragraph.firstLineMm, first.before.paragraph.firstLineMm + 8), JSON.stringify(first.after.paragraph));

    const left = await dragByMm(cdp, '[data-ruler-kind="leftIndent"]', 6);
    check("Kéo dấu thụt lề trái", near(left.after.paragraph.leftMm, left.before.paragraph.leftMm + 6)
      && near(left.after.paragraph.firstLineMm, left.before.paragraph.firstLineMm), JSON.stringify(left.after.paragraph));

    const right = await dragByMm(cdp, '[data-ruler-kind="rightIndent"]', -7);
    check("Kéo dấu thụt lề phải", near(right.after.paragraph.rightMm, right.before.paragraph.rightMm + 7), JSON.stringify(right.after.paragraph));

    const page = await dragByMm(cdp, '[data-ruler-kind="marginLeft"]', 5);
    check("Kéo mép lề trái trang", near(page.after.margins.left, page.before.margins.left + 5), JSON.stringify(page.after.margins));

    await press(cdp, "z", { ctrl: true });
    const undone = await readState(cdp);
    check("Ctrl+Z hoàn tác đúng một lần kéo lề", near(undone.margins.left, page.before.margins.left), JSON.stringify(undone.margins));
    await dragByMm(cdp, '[data-ruler-kind="marginLeft"]', 5);

    await selectParagraph(cdp, 1);
    const hanging = await dragByMm(cdp, '[data-ruler-kind="hanging"]', 9);
    check("Kéo dấu thụt lề treo", near(markerPositions(hanging.after).firstLine, markerPositions(hanging.before).firstLine)
      && hanging.after.paragraph.firstLineMm < 0, JSON.stringify(hanging.after.paragraph));

    const expectedKeyboard = stateForMarkerPosition(hanging.after, "rightIndent", markerPositions(hanging.after).rightIndent - 1, { fine: true });
    await cdp.evaluate("document.querySelector('[data-ruler-kind=\"rightIndent\"]').focus()");
    await press(cdp, "ArrowLeft");
    const keyboard = await readState(cdp);
    check("Slider bàn phím đổi 1 mm", near(keyboard.paragraph.rightMm, expectedKeyboard.paragraph.rightMm), JSON.stringify(keyboard.paragraph));

    const saveResult = await saveAs(session);
    check("Lưu DOCX qua ứng dụng", saveResult !== false, JSON.stringify(saveResult));
  } finally {
    await session.close();
  }

  const xmlRead = spawnSync("python", ["-c",
    "import sys,zipfile;print(zipfile.ZipFile(sys.argv[1]).read('word/document.xml').decode('utf-8'))", output],
    { encoding: "utf8", windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
  const xml = xmlRead.stdout || "";
  check("DOCX có w:ind left/right/firstLine/hanging", /<w:ind\b[^>]*(?:w:left|w:start)=/.test(xml)
    && /<w:ind\b[^>]*(?:w:right|w:end)=/.test(xml) && /w:firstLine=/.test(xml) && /w:hanging=/.test(xml), "document.xml");
  check("DOCX có w:pgMar", /<w:pgMar\b[^>]*w:left=/.test(xml) && /<w:pgMar\b[^>]*w:right=/.test(xml), "document.xml");

  session = await launchApp("writer", { root: process.cwd(), localAppData: profile, filePath: output });
  try {
    await session.cdp.waitFor("document.querySelectorAll('.vno-writer-body p').length >= 2", { timeoutMilliseconds: 30000 });
    await selectParagraph(session.cdp, 0);
    const first = await readState(session.cdp);
    await selectParagraph(session.cdp, 1);
    const second = await readState(session.cdp);
    check("Mở lại: thước phản ánh lề và hai kiểu thụt lề", first.paragraph.firstLineMm > 0
      && second.paragraph.firstLineMm < 0 && first.margins.left > 30, JSON.stringify({ first, second }));
  } finally {
    await session.close();
  }

  const failed = results.filter(result => !result.pass).length;
  console.log(`KẾT QUẢ RULER DESKTOP: ${results.length - failed}/${results.length} PASS | ${failed} FAIL`);
  if (failed) process.exitCode = 1;
}

run().catch(error => {
  console.error("KẾT QUẢ RULER DESKTOP: 0 PASS | 1 FAIL", error?.stack || error);
  process.exitCode = 1;
});
