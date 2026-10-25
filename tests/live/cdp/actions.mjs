import { sleep } from "./client.mjs";
import { macCombosForBinding, normalizeMacCombo, normalizeWindowsCombo } from "../../../platform/commands/keymap-macos.js";
export { sleep };

const modifierBits = { alt: 1, ctrl: 2, meta: 4, shift: 8 };
const specialKeys = {
  Enter: { code: "Enter", keyCode: 13, text: "\r" },
  Tab: { code: "Tab", keyCode: 9, text: "\t" },
  Escape: { code: "Escape", keyCode: 27, text: "" },
  Backspace: { code: "Backspace", keyCode: 8, text: "" },
  Delete: { code: "Delete", keyCode: 46, text: "" },
  ArrowLeft: { code: "ArrowLeft", keyCode: 37, text: "" },
  ArrowUp: { code: "ArrowUp", keyCode: 38, text: "" },
  ArrowRight: { code: "ArrowRight", keyCode: 39, text: "" },
  ArrowDown: { code: "ArrowDown", keyCode: 40, text: "" },
  Home: { code: "Home", keyCode: 36, text: "" },
  End: { code: "End", keyCode: 35, text: "" },
  PageUp: { code: "PageUp", keyCode: 33, text: "" },
  PageDown: { code: "PageDown", keyCode: 34, text: "" },
  F2: { code: "F2", keyCode: 113, text: "" },
  F4: { code: "F4", keyCode: 115, text: "" },
  F5: { code: "F5", keyCode: 116, text: "" },
  F10: { code: "F10", keyCode: 121, text: "" },
  F12: { code: "F12", keyCode: 123, text: "" },
  ContextMenu: { code: "ContextMenu", keyCode: 93, text: "" },
};

function keyInfo(value) {
  if (specialKeys[value]) return { key: value, ...specialKeys[value] };
  if (value === " ") return { key: " ", code: "Space", keyCode: 32, text: " " };
  const upper = value.toUpperCase();
  const keyCode = /^[A-Z0-9]$/.test(upper) ? upper.charCodeAt(0)
    : value === "=" || value === "+" ? 187
    : value === "-" || value === "_" ? 189
    : value === "/" || value === "?" ? 191
    : value === "." || value === ">" ? 190
    : value === "," || value === "<" ? 188
    : value === "'" || value === '"' ? 222
    : value === "(" || value === ")" ? 57
    : value === "%" ? 53
    : 0;
  return { key: value, code: /^[A-Z]$/.test(upper) ? "Key" + upper : "", keyCode, text: value };
}

function modifierMask(modifiers = {}) {
  return Object.entries(modifiers).reduce((mask, [name, enabled]) => (
    enabled ? mask | modifierBits[name] : mask
  ), 0);
}

export async function press(cdp, key, modifiers = {}, settleMilliseconds = 250, timeoutMilliseconds = 60000) {
  const info = keyInfo(key);
  const mask = modifierMask(modifiers);
  const text = mask ? "" : info.text;
  await cdp.send("Input.dispatchKeyEvent", {
    type: "keyDown", key: info.key, code: info.code,
    windowsVirtualKeyCode: info.keyCode, modifiers: mask,
    text, unmodifiedText: text,
  }, timeoutMilliseconds);
  await cdp.send("Input.dispatchKeyEvent", {
    type: "keyUp", key: info.key, code: info.code,
    windowsVirtualKeyCode: info.keyCode, modifiers: mask,
  }, timeoutMilliseconds);
  if (settleMilliseconds > 0) await sleep(settleMilliseconds);
}

const CDP_KEY_NAMES = {
  ENTER: "Enter", TAB: "Tab", ESCAPE: "Escape", BACKSPACE: "Backspace", DELETE: "Delete", SPACE: " ",
  UP: "ArrowUp", DOWN: "ArrowDown", LEFT: "ArrowLeft", RIGHT: "ArrowRight",
  HOME: "Home", END: "End", PAGEUP: "PageUp", PAGEDOWN: "PageDown",
};
const COMBO_MODIFIERS = { CMD: "meta", CTRL: "ctrl", ALT: "alt", SHIFT: "shift" };

/**
 * Tổ hợp phím theo nền tảng của máy chạy test, tra từ bảng phím dùng chung (`keymap-macos.js`):
 * viết tổ hợp kiểu Windows ("Ctrl+Shift+L") như trong command definitions; trên macOS trả tổ hợp
 * Mac của đúng lệnh đó (Cmd+Shift+L, Cmd+Enter, Control+Shift+M cho Tăng thụt lề…), nơi khác giữ nguyên.
 * @returns {{ key: string, modifiers: Record<string, boolean>, combo: string }}
 */
export function platformShortcut(windowsCombo, { commandId = null, platform = process.platform } = {}) {
  const combo = platform === "darwin"
    ? normalizeMacCombo(macCombosForBinding(windowsCombo, commandId)[0])
    : normalizeWindowsCombo(windowsCombo);
  const plusKey = combo.endsWith("++");
  const parts = (plusKey ? combo.slice(0, -1) : combo).split("+").filter(Boolean);
  const rawKey = plusKey ? "+" : parts.pop();
  const modifiers = {};
  for (const part of parts) if (COMBO_MODIFIERS[part]) modifiers[COMBO_MODIFIERS[part]] = true;
  const key = CDP_KEY_NAMES[rawKey] || (/^[A-Z]$/.test(rawKey) ? rawKey.toLowerCase() : rawKey);
  return { key, modifiers, combo };
}

/** Bấm một phím tắt ứng dụng bằng tổ hợp đúng nền tảng (xem `platformShortcut`). */
export async function pressShortcut(cdp, windowsCombo, { commandId = null, settleMilliseconds = 250 } = {}) {
  const { key, modifiers } = platformShortcut(windowsCombo, { commandId });
  await press(cdp, key, modifiers, settleMilliseconds);
}

export async function typeText(cdp, value, delayMilliseconds = 50) {
  for (const character of String(value)) {
    const info = keyInfo(character);
    await cdp.send("Input.dispatchKeyEvent", {
      type: "keyDown", key: info.key, code: info.code,
      windowsVirtualKeyCode: info.keyCode,
      text: character, unmodifiedText: character,
    });
    await cdp.send("Input.dispatchKeyEvent", {
      type: "keyUp", key: info.key, code: info.code,
      windowsVirtualKeyCode: info.keyCode,
    });
    if (delayMilliseconds > 0) await new Promise(resolve => setTimeout(resolve, delayMilliseconds));
  }
  await sleep(300);
}

export async function insertText(cdp, text) {
  await cdp.send("Input.insertText", { text: String(text) });
  await sleep(200);
}

export async function click(cdp, selector, index = 0) {
  const point = await cdp.evaluate(
    "(() => { const nodes = [...document.querySelectorAll(" + JSON.stringify(selector) + ")];"
    + " const node = nodes[" + Number(index) + "]; if (!node) return null;"
    + " const rect = node.getBoundingClientRect(); if (!rect.width || !rect.height) return null;"
    + " return {x: rect.left + rect.width / 2, y: rect.top + rect.height / 2}; })()",
  );
  if (!point) throw new Error("Could not find a visible element for click: " + selector);
  await mouseClick(cdp, point.x, point.y);
  return point;
}

export async function mouseClick(cdp, x, y, modifiers = {}) {
  const mask = modifierMask(modifiers);
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1, modifiers: mask });
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", buttons: 0, clickCount: 1, modifiers: mask });
  await sleep(300);
}

export async function mouseDoubleClick(cdp, x, y, modifiers = {}) {
  const mask = modifierMask(modifiers);
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1, modifiers: mask });
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", buttons: 0, clickCount: 1, modifiers: mask });
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 2, modifiers: mask });
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", buttons: 0, clickCount: 2, modifiers: mask });
  await sleep(300);
}

export async function mouseTripleClick(cdp, x, y, modifiers = {}) {
  const mask = modifierMask(modifiers);
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 1, modifiers: mask });
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", buttons: 0, clickCount: 1, modifiers: mask });
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 2, modifiers: mask });
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", buttons: 0, clickCount: 2, modifiers: mask });
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "left", buttons: 1, clickCount: 3, modifiers: mask });
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "left", buttons: 0, clickCount: 3, modifiers: mask });
  await sleep(300);
}

export async function mouseRightClick(cdp, x, y, modifiers = {}) {
  const mask = modifierMask(modifiers);
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x, y, button: "right", buttons: 2, clickCount: 1, modifiers: mask });
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x, y, button: "right", buttons: 0, clickCount: 1, modifiers: mask });
  await sleep(300);
}

export async function mouseMove(cdp, x, y, modifiers = {}) {
  const mask = modifierMask(modifiers);
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x, y, modifiers: mask });
  await sleep(150);
}

export async function mouseDrag(cdp, startX, startY, endX, endY, options = {}) {
  const mask = modifierMask(options.modifiers || {});
  const steps = options.steps || 8;
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: startX, y: startY, modifiers: mask });
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x: startX, y: startY, button: "left", buttons: 1, clickCount: 1, modifiers: mask });
  for (let step = 1; step <= steps; step += 1) {
    const curX = startX + (endX - startX) * step / steps;
    const curY = startY + (endY - startY) * step / steps;
    await cdp.send("Input.dispatchMouseEvent", {
      type: "mouseMoved",
      x: curX,
      y: curY,
      button: "left",
      buttons: 1,
      modifiers: mask,
    });
    if (options.delayPerStep) await sleep(options.delayPerStep);
  }
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: endX, y: endY, button: "left", buttons: 0, clickCount: 1, modifiers: mask });
  await sleep(options.settleMs || 300);
}

export async function mouseWheel(cdp, x, y, deltaX, deltaY, modifiers = {}) {
  const mask = modifierMask(modifiers);
  await cdp.send("Input.dispatchMouseEvent", {
    type: "mouseWheel",
    x, y, deltaX, deltaY, modifiers: mask
  });
  await sleep(300);
}

export async function drag(cdp, fromSelector, toSelector) {
  const getPoint = selector => cdp.evaluate(
    "(() => { const node = document.querySelector(" + JSON.stringify(selector) + ");"
    + " if (!node) return null; const rect = node.getBoundingClientRect();"
    + " return {x: rect.left + rect.width / 2, y: rect.top + rect.height / 2}; })()",
  );
  const start = await getPoint(fromSelector);
  const end = await getPoint(toSelector);
  if (!start || !end) throw new Error("Could not find drag endpoints: " + fromSelector + " -> " + toSelector);
  await cdp.send("Input.dispatchMouseEvent", { type: "mousePressed", x: start.x, y: start.y, button: "left", buttons: 1 });
  for (let step = 1; step <= 8; step += 1) {
    await cdp.send("Input.dispatchMouseEvent", {
      type: "mouseMoved",
      x: start.x + (end.x - start.x) * step / 8,
      y: start.y + (end.y - start.y) * step / 8,
      button: "left", buttons: 1,
    });
  }
  await cdp.send("Input.dispatchMouseEvent", { type: "mouseReleased", x: end.x, y: end.y, button: "left", buttons: 0 });
  await sleep(300);
  return { start, end };
}

export async function readState(cdp, expression) {
  return await cdp.evaluate(expression);
}

