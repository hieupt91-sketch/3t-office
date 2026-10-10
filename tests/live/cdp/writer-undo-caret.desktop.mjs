import { launchApp } from "./session.mjs";
import { insertText, press, sleep } from "./actions.mjs";

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok: Boolean(ok), detail });
  console.log(`${ok ? "PASS" : "FAIL"} | ${name}${detail ? " | " + detail : ""}`);
};
const session = await launchApp("writer", {
  localAppData: process.env.VNO_CDP_LOCALAPPDATA,
});
const { cdp } = session;

async function undo() { await press(cdp, "z", { ctrl: true }, 900); }
async function redo() { await press(cdp, "y", { ctrl: true }, 900); }
async function endOfDocument() {
  await cdp.evaluate("document.querySelector('.vno-writer-body')?.focus()");
  await press(cdp, "End", { ctrl: true }, 250);
}
async function state() {
  return cdp.evaluate(`(() => {
    const body = document.querySelector('.vno-writer-body');
    const selection = getSelection();
    const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
    let offset = null;
    if (range && body.contains(range.startContainer)) {
      const prefix = document.createRange();
      prefix.selectNodeContents(body);
      prefix.setEnd(range.startContainer, range.startOffset);
      offset = prefix.toString().length;
    }
    return {
      text: body?.innerText || '',
      offset,
      anchorType: selection?.anchorNode?.nodeType || null,
      anchorInBody: Boolean(selection?.anchorNode && body?.contains(selection.anchorNode)),
      html: body?.innerHTML || '',
      tables: body?.querySelectorAll('table').length || 0,
    };
  })()`);
}

try {
  await sleep(1500);
  await endOfDocument();
  await insertText(cdp, "Chuong 1");
  await sleep(900);
  const before = await state();
  await insertText(cdp, " ABC");
  await sleep(800);
  await undo();
  const undone = await state();
  check("Ctrl+Z đưa nội dung về trước phần gõ", undone.text === before.text,
    `chars=${before.text.length}->${undone.text.length}`);
  check("Ctrl+Z khôi phục caret vào nội dung tại cuối tài liệu", undone.anchorType === 3 && undone.anchorInBody && undone.offset === before.text.length,
    `anchorType=${undone.anchorType}, inBody=${undone.anchorInBody}, offset=${undone.offset}, expected=${before.text.length}`);
  await insertText(cdp, "Z");
  const afterRetype = await state();
  check("Gõ tiếp sau Ctrl+Z chèn đúng cuối tài liệu", afterRetype.text === before.text + "Z",
    `endsWithZ=${afterRetype.text.endsWith("Z")}, startsWithZ=${afterRetype.text.startsWith("Z")}`);
  await undo();

  await endOfDocument();
  await insertText(cdp, "A");
  await sleep(750);
  await insertText(cdp, "B");
  await sleep(750);
  await undo();
  await undo();
  const multiUndone = await state();
  check("Hai lần Ctrl+Z hoàn tác hai cụm gõ theo thứ tự", multiUndone.text === before.text,
    `chars=${multiUndone.text.length}, expected=${before.text.length}`);
  await redo();
  await redo();
  const multiRedone = await state();
  check("Hai lần Ctrl+Y làm lại hai cụm gõ", multiRedone.text === before.text + "AB",
    `endsWithAB=${multiRedone.text.endsWith("AB")}`);

  await endOfDocument();
  await press(cdp, "ArrowLeft", { shift: true }, 100);
  await cdp.evaluate("import('/platform/commands/command-bus.js').then(m => m.globalCommandBus.execute('writer.text.bold'))");
  await sleep(800);
  const formatted = await state();
  await undo();
  const formatUndone = await state();
  check("Undo định dạng hoàn tác chữ đậm và giữ selection trong nội dung",
    formatted.html !== formatUndone.html && formatUndone.anchorInBody,
    `htmlChanged=${formatted.html !== formatUndone.html}, anchorInBody=${formatUndone.anchorInBody}, offset=${formatUndone.offset}`);

  await endOfDocument();
  const tableCountBefore = (await state()).tables;
  await cdp.evaluate("import('/platform/commands/command-bus.js').then(m => m.globalCommandBus.execute('writer.table.insert'))");
  await sleep(500);
  const tableInserted = await state();
  await undo();
  const tableUndone = await state();
  await redo();
  const tableRedone = await state();
  check("Undo thao tác trong tài liệu có bảng khôi phục vị trí caret", tableUndone.anchorInBody && tableUndone.anchorType === 3,
    `anchorType=${tableUndone.anchorType}, inBody=${tableUndone.anchorInBody}, offset=${tableUndone.offset}`);
  check("Undo/Redo chèn bảng khôi phục đúng số bảng", tableInserted.tables === tableCountBefore + 1 && tableUndone.tables === tableCountBefore && tableRedone.tables === tableCountBefore + 1,
    `tables=${tableCountBefore}->${tableInserted.tables}->${tableUndone.tables}->${tableRedone.tables}`);
} catch (error) {
  check("Kịch bản CDP Writer Undo/Caret chạy không ngoại lệ", false, error.stack || error.message);
} finally {
  await session.close();
}

if (results.some(result => !result.ok)) process.exit(1);
