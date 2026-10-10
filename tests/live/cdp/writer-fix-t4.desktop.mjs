import { launchApp } from "./session.mjs";
import { click, typeText, sleep } from "./actions.mjs";

const results = [];
const check = (name, passed, detail) => {
  results.push({ name, passed: Boolean(passed) });
  console.log(`${passed ? "PASS" : "FAIL"} | ${name} | ${detail}`);
};
const session = await launchApp("writer", { localAppData: process.env.VNO_CDP_LOCALAPPDATA });
const { cdp } = session;

try {
  await sleep(900);
  const start = await cdp.evaluate(`(() => {
    const body = document.querySelector('.vno-writer-body');
    const paragraph = body?.querySelector('p');
    if (!paragraph) return null;
    const rect = paragraph.getBoundingClientRect();
    return { x: rect.left + Math.min(24, rect.width / 4), y: rect.top + Math.min(12, rect.height / 2) };
  })()`);
  if (!start) throw new Error("Không tìm thấy đoạn đầu tiên trong Writer");
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x: start.x, y: start.y, button: "left", buttons: 1, clickCount: 1 });
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: start.x, y: start.y, button: "left", buttons: 0, clickCount: 1 });
  await typeText(cdp, "Đoạn đầu T4");
  await cdp.send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, text: "\r" });
  await cdp.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
  await typeText(cdp, "Neo con trỏ T4");

  const target = await cdp.evaluate(`(() => {
    const paragraph = [...document.querySelectorAll('.vno-writer-body p')].find(p => p.textContent.includes('Neo con trỏ T4'));
    const rect = paragraph?.getBoundingClientRect();
    return rect ? { x: rect.left + Math.min(48, rect.width / 3), y: rect.top + Math.min(12, rect.height / 2) } : null;
  })()`);
  if (!target) throw new Error("Không tìm thấy đoạn cần neo hộp văn bản");
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x: target.x, y: target.y, button: "left", buttons: 1, clickCount: 1 });
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: target.x, y: target.y, button: "left", buttons: 0, clickCount: 1 });
  const caret = await cdp.evaluate(`(() => {
    const selection = window.getSelection();
    const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
    const rect = range?.getBoundingClientRect();
    return rect ? { x: rect.left, y: rect.top } : null;
  })()`);
  await click(cdp, "#vno-ribbon-tab-insert");
  await click(cdp, '[data-command-id="writer.insert.textbox"]');
  await sleep(250);

  const textbox = await cdp.evaluate(`(() => {
    const body = document.querySelector('.vno-writer-textbox-body');
    const rect = body?.closest('.vno-writer-shape-item')?.getBoundingClientRect();
    return body && rect ? {
      text: body.textContent,
      selected: window.getSelection()?.toString(),
      focused: document.activeElement === body,
      activeTag: document.activeElement?.tagName,
      activeClass: document.activeElement?.className,
      bodyEditable: body.isContentEditable,
      adapterShapeCount: window.__vnoAppInstance.adapter.shapes.length,
      editorHasTextbox: window.__vnoAppInstance.adapter.editorDom.contains(body),
      x: rect.left,
      y: rect.top
    } : null;
  })()`);
  check("Hộp văn bản neo gần vị trí caret bằng chuột", Boolean(caret && textbox && Math.abs(textbox.x - caret.x) < 36 && Math.abs(textbox.y - caret.y) < 36), JSON.stringify({ caret, textbox }));
  check("Chữ mẫu được chọn và sẵn sàng ghi đè", textbox?.text === "Nhập văn bản" && textbox.selected === "Nhập văn bản" && textbox.focused, JSON.stringify(textbox));

  await typeText(cdp, "Hộp T4 đã thay mẫu");
  const edited = await cdp.evaluate("document.querySelector('.vno-writer-textbox-body')?.textContent || ''");
  check("Gõ trực tiếp thay chữ mẫu", edited === "Hộp T4 đã thay mẫu", JSON.stringify(edited));

  const html = await cdp.evaluate("window.__vnoAppInstance.adapter._contentForExport()");
  const save = await cdp.evaluate(`globalThis.globalUnoBridge.saveRealFileInPlace(
    "writer", ${JSON.stringify(html)},
    "E:/VNOffice-profiles/codex-ft4/fix-t4-textbox.docx", null
  )`);
  check("Lưu DOCX thật sau khi sửa hộp văn bản", save?.status === "ok", JSON.stringify(save));
} catch (error) {
  check("Kịch bản CDP không có ngoại lệ", false, error.stack || error.message);
} finally {
  console.log(`CDP_PORT ${session.debugPort} | PROFILE ${session.localAppData}`);
  await session.close();
}

const passed = results.filter(result => result.passed).length;
console.log(`SUMMARY ${passed}/${results.length} PASS | ${results.length - passed} FAIL`);
if (passed !== results.length) process.exitCode = 1;
