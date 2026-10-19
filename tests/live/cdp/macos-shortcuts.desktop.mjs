// MAC-14: desktop app thật, chỉ gửi bàn phím qua CDP (không AppleScript/cliclick).
import { launchApp } from "./session.mjs";
import { press, sleep } from "./actions.mjs";

const checks = [];
const check = (name, pass, detail = "") => {
  checks.push(Boolean(pass));
  console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`);
};

async function lastCommand(cdp) {
  return cdp.evaluate(`(async () => {
    const { globalCommandBus } = await import('/platform/commands/command-bus.js');
    const history = globalCommandBus.getHistory ? globalCommandBus.getHistory() : globalCommandBus._history;
    return history?.at(-1)?.commandId || null;
  })()`, { awaitPromise: true });
}

async function verify(app, cases) {
  const session = await launchApp(app, {});
  try {
    await sleep(800);
    for (const item of cases) {
      await press(session.cdp, item.key, item.modifiers);
      const actual = await lastCommand(session.cdp);
      check(`${app}: ${item.label}`, actual === item.commandId, `actual=${actual}`);
    }
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
    { label: "Cmd+Shift+L đúng scope Sheet", key: "l", modifiers: { meta: true, shift: true }, commandId: "sheet.data.filter" }
  ]);
  await verify("slides", [
    { label: "Option+F10", key: "F10", modifiers: { alt: true }, commandId: "slides.edit.selectionPane" }
  ]);
} catch (error) {
  check("Phiên CDP macOS không phát sinh ngoại lệ", false, error.stack || error.message);
}

console.log(`MAC-14 CDP: ${checks.filter(Boolean).length}/${checks.length} PASS`);
if (checks.some((value) => !value)) process.exit(1);
