// MAC-14: desktop app thật, chỉ gửi bàn phím qua CDP (không AppleScript/cliclick).
import { launchApp } from "./session.mjs";
import { press, sleep, mouseClick } from "./actions.mjs";

const checks = [];
const check = (name, pass, detail = "") => {
  checks.push(Boolean(pass));
  console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`);
};

async function historyLength(cdp) {
  return cdp.evaluate(`(async () => {
    const { globalCommandBus } = await import('/platform/commands/command-bus.js');
    return (globalCommandBus.getHistory ? globalCommandBus.getHistory() : globalCommandBus._history).length;
  })()`, { awaitPromise: true });
}

/** Lệnh chạy SAU mốc lịch sử (bỏ qua lệnh thăm dò định kỳ như writer.ruler.getState). */
async function commandsSince(cdp, mark) {
  return cdp.evaluate(`(async () => {
    const { globalCommandBus } = await import('/platform/commands/command-bus.js');
    const history = globalCommandBus.getHistory ? globalCommandBus.getHistory() : globalCommandBus._history;
    return history.slice(${Number(mark)}).map((item) => item.commandId).filter((id) => !/\\.getState$/.test(id));
  })()`, { awaitPromise: true });
}

async function verify(app, cases, extra = null) {
  const session = await launchApp(app, {});
  try {
    await sleep(800);
    // KEYS-1: cờ capability nền tảng phải được phát hiện là macOS trong runtime thật.
    const platform = await session.cdp.evaluate(`(async () => {
      const { globalShortcutManager } = await import('/platform/commands/shortcut-manager.js');
      return globalShortcutManager.getPlatform();
    })()`, { awaitPromise: true });
    check(`${app}: nền tảng bàn phím = macos`, platform === "macos", `actual=${platform}`);
    for (const item of cases) {
      const mark = await historyLength(session.cdp);
      await press(session.cdp, item.key, item.modifiers);
      const ran = await commandsSince(session.cdp, mark);
      check(`${app}: ${item.label}`, ran.includes(item.commandId), `ran=${ran.join(",") || "none"}`);
    }
    if (extra) await extra(session.cdp);
  } finally {
    await session.close().catch(() => {});
  }
}

try {
  await verify("writer", [
    { label: "Cmd+Option+1", key: "1", modifiers: { meta: true, alt: true }, commandId: "writer.style.heading1" },
    { label: "Cmd+Option+2", key: "2", modifiers: { meta: true, alt: true }, commandId: "writer.style.heading2" },
    { label: "Cmd+Option+3", key: "3", modifiers: { meta: true, alt: true }, commandId: "writer.style.heading3" },
    { label: "Cmd+Shift+L", key: "l", modifiers: { meta: true, shift: true }, commandId: "writer.list.bullet" },
    { label: "Cmd+Shift+E", key: "e", modifiers: { meta: true, shift: true }, commandId: "writer.trackChanges.toggle" }
  ]);
  await verify("sheet", [
    { label: "Cmd+Shift+L đúng scope Sheet", key: "l", modifiers: { meta: true, shift: true }, commandId: "sheet.data.filter" },
    { label: "Cmd+B (Control+B không phải phím chính)", key: "b", modifiers: { meta: true }, commandId: "sheet.cell.bold" }
  ], async (cdp) => {
    // MAC-10: F10 bật KeyTips, Esc tắt.
    await press(cdp, "Escape");
    await press(cdp, "F10");
    const keytipsOn = await cdp.evaluate("!!document.querySelector('#vno-keytips-overlay')");
    check("sheet: F10 hiện KeyTips", keytipsOn);
    await press(cdp, "Escape"); await press(cdp, "Escape");
    // MAC-5: Control+nhấp vào ô mở menu ngữ cảnh, không thêm vùng chọn rời.
    const rect = await cdp.evaluate(`(() => { const el = document.querySelector('[data-coord="C3"]'); if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; })()`);
    if (!rect) { check("sheet: tìm thấy ô C3", false); return; }
    await mouseClick(cdp, rect.x, rect.y);
    await sleep(200);
    await mouseClick(cdp, rect.x, rect.y + 60, { ctrl: true });
    await sleep(400);
    const menu = await cdp.evaluate("!!document.querySelector('.vno-context-menu')");
    check("sheet: Control+nhấp ô mở menu ngữ cảnh", menu);
    const nameBox = await cdp.evaluate("document.querySelector('.vno-sheet-namebox, .vno-name-box, input[aria-label*=\"tên\" i]')?.value || ''");
    check("sheet: Control+nhấp không tạo vùng chọn rời", !String(nameBox).includes(","), `namebox=${nameBox}`);
  });
  await verify("slides", [
    { label: "Option+F10", key: "F10", modifiers: { alt: true }, commandId: "slides.edit.selectionPane" }
  ]);
} catch (error) {
  check("Phiên CDP macOS không phát sinh ngoại lệ", false, error.stack || error.message);
}

console.log(`KEYS-1/MAC-14 CDP: ${checks.filter(Boolean).length}/${checks.length} PASS`);
if (checks.some((value) => !value)) process.exit(1);
