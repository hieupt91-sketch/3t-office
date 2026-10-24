import assert from "node:assert/strict";
import { MACOS_SHORTCUTS, formatShortcutForMac, getMacOSShortcut, isMacOSRuntime, usesPrimaryModifier } from "../../platform/commands/keymap-macos.js";
import { ShortcutManager } from "../../platform/commands/shortcut-manager.js";
import { globalCommandBus } from "../../platform/commands/command-bus.js";
import { MACOS_SHORTCUT_HELP_ENTRIES } from "../../platform/help/entries-macos-shortcuts.js";
import {
  MACOS_KEYMAP, MACOS_RESERVED_SHORTCUTS, normalizeMacCombo, normalizeWindowsCombo, isMacOSReservedCombo,
  setKeyboardPlatform, getKeyboardPlatform, getKeyboardCapabilities, isPrimaryModifier, isAdditiveSelect,
  isCopyDrag, isCopyDragKey, isSecondaryClick, matchesShortcut, displayShortcut, detectKeyboardPlatform
} from "../../platform/commands/keymap-macos.js";
import { COMMON_COMMANDS, WRITER_COMMANDS, SHEET_COMMANDS, SLIDES_COMMANDS } from "../../platform/commands/command-definitions.js";
import { globalKeyTipsManager } from "../../platform/ribbon/keytips.js";
import { installSecondaryClickNormalizer } from "../../platform/ui-kit/context-menu.js";
import { isKeyboardContextMenuEvent } from "../../platform/shell/quick-access.js";
import { SheetGridController } from "../../apps/sheet/sheet-grid.js";
import { HELP_ENTRIES } from "../../platform/help/help-catalog.js";

const ALL_COMMANDS = [...COMMON_COMMANDS, ...WRITER_COMMANDS, ...SHEET_COMMANDS, ...SLIDES_COMMANDS];
const scopeOf = (id) => id.startsWith("writer.") ? "writer" : id.startsWith("sheet.") ? "sheet" : id.startsWith("slides.") ? "slides" : "common";

/** Mọi tổ hợp đang khai báo trong platform/commands: [windows, commandId, scope]. */
function declaredBindings() {
  const list = [
    ["Ctrl+0", "common.view.zoomReset", "common"], ["Ctrl+=", "common.view.zoomIn", "common"],
    ["Ctrl++", "common.view.zoomIn", "common"], ["Ctrl+-", "common.view.zoomOut", "common"],
    ["Ctrl+F1", "common.view.ribbonToggle", "common"], ["Alt+F", "common.file.backstage", "common"],
    ["Ctrl+Shift+S", "common.file.saveAs", "common"]
  ];
  for (const cmd of ALL_COMMANDS) {
    if (!cmd.shortcut) continue;
    list.push([cmd.shortcut, cmd.id, scopeOf(cmd.id)]);
    for (const alias of cmd.shortcutAliases || []) list.push([alias, cmd.id, scopeOf(cmd.id)]);
  }
  return list;
}

function makeManager(platform) {
  const manager = new ShortcutManager({ platform });
  for (const [combo, id, scope] of declaredBindings()) manager.bind(combo, id, scope);
  return manager;
}

const CODE_FOR = {
  "-": "Minus", "=": "Equal", "+": "Equal", "[": "BracketLeft", "]": "BracketRight", ";": "Semicolon",
  "`": "Backquote", "/": "Slash", ",": "Comma", "*": "Digit8", ">": "Period", "<": "Comma", "$": "Digit4", "%": "Digit5"
};
const KEY_FOR = { ENTER: "Enter", HOME: "Home", END: "End", PAGEUP: "PageUp", PAGEDOWN: "PageDown", DELETE: "Delete",
  LEFT: "ArrowLeft", RIGHT: "ArrowRight", UP: "ArrowUp", DOWN: "ArrowDown", SPACE: " ", ESCAPE: "Escape", TAB: "Tab" };

/** Sự kiện bàn phím Mac như trình duyệt thật gửi (Option làm `key` thành ký tự khác → để «Dead»). */
function macEvent(combo, target) {
  const norm = normalizeMacCombo(combo);
  const plusKey = norm.endsWith("++");
  const parts = norm.split("+").filter(Boolean);
  const key = plusKey ? "+" : parts[parts.length - 1];
  const mods = new Set(plusKey ? parts : parts.slice(0, -1));
  let code = "";
  let evKey = KEY_FOR[key] || (key.length === 1 ? key.toLowerCase() : key);
  if (/^[A-Z]$/.test(key)) code = `Key${key}`;
  else if (/^\d$/.test(key)) code = `Digit${key}`;
  else if (/^F\d+$/.test(key)) code = key;
  else if (KEY_FOR[key]) code = KEY_FOR[key] === " " ? "Space" : KEY_FOR[key];
  else code = CODE_FOR[key] || "";
  if (mods.has("ALT") && /^[A-Z0-9]$/.test(key)) evKey = "Dead";
  const flags = { prevented: false };
  return {
    flags,
    event: {
      key: evKey, code, target, metaKey: mods.has("CMD"), ctrlKey: mods.has("CTRL"), altKey: mods.has("ALT"), shiftKey: mods.has("SHIFT"),
      preventDefault() { flags.prevented = true; }, stopPropagation() {}
    }
  };
}

const plainTarget = () => ({ tagName: "DIV", isContentEditable: false, closest: () => null, matches: () => false });

export async function runMacOSKeymapTests() {
  const results = [];
  const test = async (name, fn) => {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.stack || error.message });
    }
  };

  await test("MAC-14: bảng macOS đủ bảy command và tên Cmd/Option chính xác", () => {
    assert.equal(MACOS_SHORTCUTS.length, 7);
    assert.equal(getMacOSShortcut("writer.style.heading1")?.macos, "Cmd+Option+1");
    assert.equal(getMacOSShortcut("writer.list.bullet")?.macos, "Cmd+Shift+L");
    assert.equal(getMacOSShortcut("sheet.data.filter")?.macos, "Cmd+Shift+L");
    assert.equal(getMacOSShortcut("slides.edit.selectionPane")?.macos, "Option+F10");
    assert.equal(getMacOSShortcut("writer.trackChanges.toggle")?.macos, "Cmd+Shift+E");
    assert.equal(formatShortcutForMac("Ctrl+Alt+3"), "Cmd+Option+3");
  });

  await test("MAC-14: nhận diện Mac và primary modifier không làm mất Ctrl Windows", () => {
    assert.equal(isMacOSRuntime({ platform: "MacIntel" }), true);
    assert.equal(isMacOSRuntime({ userAgentData: { platform: "macOS" } }), true);
    assert.equal(isMacOSRuntime({ platform: "Win32" }), false);
    assert.equal(usesPrimaryModifier({ metaKey: true, ctrlKey: false }), true);
    assert.equal(usesPrimaryModifier({ metaKey: false, ctrlKey: true }), true);
  });

  await test("MAC-14: Cmd chạy đúng command theo scope Writer/Sheet/Slides", async () => {
    const manager = new ShortcutManager();
    const calls = [];
    const originalExecute = globalCommandBus.execute;
    globalCommandBus.execute = (commandId) => { calls.push(commandId); return true; };
    const target = { tagName: "DIV", isContentEditable: false, closest: () => null, matches: () => false };
    const press = (key, modifiers = {}) => manager._handleKeyDown({
      key, target, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false,
      preventDefault() {}, stopPropagation() {}, ...modifiers
    });
    try {
      manager.bind("Ctrl+Alt+1", "writer.style.heading1", "writer");
      manager.bind("Ctrl+Shift+L", "writer.list.bullet", "writer");
      manager.bind("Ctrl+Shift+L", "sheet.data.filter", "sheet");
      manager.bind("Alt+F10", "slides.edit.selectionPane", "slides");
      manager.bind("Ctrl+Shift+E", "writer.trackChanges.toggle", "writer");

      manager.setActiveScope("writer");
      press("1", { metaKey: true, altKey: true });
      press("l", { metaKey: true, shiftKey: true });
      press("e", { metaKey: true, shiftKey: true });
      manager.setActiveScope("sheet");
      press("l", { metaKey: true, shiftKey: true });
      manager.setActiveScope("slides");
      press("F10", { altKey: true });
      assert.deepEqual(calls, [
        "writer.style.heading1", "writer.list.bullet", "writer.trackChanges.toggle",
        "sheet.data.filter", "slides.edit.selectionPane"
      ]);
    } finally {
      globalCommandBus.execute = originalExecute;
    }
  });

  await test("MAC-14: Ctrl trên Windows vẫn khớp command cũ", () => {
    const manager = new ShortcutManager();
    manager.bind("Ctrl+Shift+E", "writer.trackChanges.toggle", "writer");
    manager.setActiveScope("writer");
    assert.equal(manager._shortcuts.get(manager._normalizeCombo("Ctrl+Shift+E")), "writer.trackChanges.toggle");
  });

  await test("MAC-14: Help VI hướng dẫn đủ Doc, Sheet, Slide và Fn+F10", () => {
    const source = JSON.stringify(MACOS_SHORTCUT_HELP_ENTRIES);
    for (const token of ["Cmd+Option+1", "Cmd+Shift+L", "Cmd+Shift+E", "Option+F10", "Doc", "Sheet", "Slide", "Fn"]) {
      assert.match(source, new RegExp(token.replaceAll("+", "\\+"), "i"), `Help thiếu ${token}`);
    }
  });

  // ======================================================================= KEYS-1
  const withCalls = async (fn) => {
    const calls = [];
    const originalExecute = globalCommandBus.execute;
    globalCommandBus.execute = (commandId) => { calls.push(commandId); return true; };
    try { await fn(calls); } finally { globalCommandBus.execute = originalExecute; }
    return calls;
  };

  await test("KEYS-1: mọi tổ hợp khai báo trong platform/commands có đúng một dòng bảng phím macOS và ngược lại", () => {
    const declared = declaredBindings();
    const key = (windows, id) => `${normalizeWindowsCombo(windows)}|${id}`;
    const rowKeys = new Set(MACOS_KEYMAP.map((row) => key(row.windows, row.commandId)));
    const missing = declared.filter(([windows, id]) => !rowKeys.has(key(windows, id)));
    assert.deepEqual(missing, [], `thiếu dòng macOS: ${JSON.stringify(missing)}`);
    const declaredKeys = new Set(declared.map(([windows, id]) => key(windows, id)));
    const orphan = MACOS_KEYMAP.filter((row) => !declaredKeys.has(key(row.windows, row.commandId)));
    assert.deepEqual(orphan.map((row) => row.commandId), [], "dòng bảng không ứng với tổ hợp đã khai báo");
    for (const row of MACOS_KEYMAP) {
      assert.ok(row.task && row.source && ["office-mac", "apple", "pending"].includes(row.status), `${row.commandId} thiếu task/nguồn`);
      if (row.status === "pending") assert.match(row.source, /chờ xác minh|Apple/, `${row.commandId}: nguồn pending phải ghi rõ`);
    }
  });

  await test("KEYS-1: không dòng nào trong bảng macOS dùng tổ hợp hệ thống macOS", () => {
    const clashes = [];
    for (const row of MACOS_KEYMAP) for (const combo of row.macos) if (isMacOSReservedCombo(combo)) clashes.push(`${row.commandId}=${combo}`);
    assert.deepEqual(clashes, []);
    for (const combo of ["Cmd+H", "Cmd+M", "Cmd+Q", "Cmd+,", "Cmd+Space", "Ctrl+Space", "Cmd+`", "Cmd+Option+D", "Cmd+Option+H", "Cmd+Option+M", "Cmd+Shift+3", "Cmd+Shift+4", "Cmd+Shift+5", "Cmd+Tab", "F11", "Ctrl+F2", "Cmd+Option+F5"]) {
      assert.ok(isMacOSReservedCombo(combo), `${combo} phải nằm trong danh sách hệ thống`);
    }
    assert.ok(MACOS_RESERVED_SHORTCUTS.length >= 30);
  });

  await test("KEYS-1: trong từng app, một tổ hợp Mac không trỏ tới hai lệnh khác nhau (trừ khi Windows cũng ghi đè)", () => {
    for (const scope of ["writer", "sheet", "slides"]) {
      const effective = new Map(); // windowsNorm -> commandId (app ghi đè chung)
      for (const row of MACOS_KEYMAP) if (row.scope === "common") effective.set(normalizeWindowsCombo(row.windows), row);
      for (const row of MACOS_KEYMAP) if (row.scope === scope) effective.set(normalizeWindowsCombo(row.windows), row);
      const macOwner = new Map();
      for (const row of effective.values()) {
        for (const combo of row.macos) {
          const norm = normalizeMacCombo(combo);
          const prev = macOwner.get(norm);
          assert.ok(!prev || prev === row.commandId, `${scope}: ${combo} trùng giữa ${prev} và ${row.commandId}`);
          macOwner.set(norm, row.commandId);
        }
      }
    }
  });

  await test("KEYS-1: mỗi tổ hợp Mac trong bảng chạy đúng lệnh theo scope (sự kiện Cmd/Control/Option thật)", async () => {
    const manager = makeManager("macos");
    const failures = [];
    let checked = 0;
    await withCalls(async (calls) => {
      for (const row of MACOS_KEYMAP) {
        for (const combo of row.macos) {
          manager.setActiveScope(row.scope === "common" ? null : row.scope);
          calls.length = 0;
          const { event, flags } = macEvent(combo, plainTarget());
          manager._handleKeyDown(event);
          checked += 1;
          // F1/Cmd+? đi qua Trợ giúp theo ngữ cảnh: chạy `<app>.help.open` nếu app đã gắn handler, nếu không thì common.help.open.
          const ok = calls[0] === row.commandId || (row.commandId.endsWith(".help.open") && calls[0] === "common.help.open");
          if (!ok || !flags.prevented) failures.push(`${row.scope}:${combo} → ${calls[0] || "none"} (cần ${row.commandId})`);
        }
      }
    });
    assert.deepEqual(failures, []);
    assert.equal(checked, MACOS_KEYMAP.reduce((sum, row) => sum + row.macos.length, 0));
    assert.ok(checked >= 140, `chỉ kiểm ${checked} tổ hợp`);
  });

  await test("KEYS-1: phím hệ thống macOS không bị app chặn (không preventDefault, không chạy lệnh)", async () => {
    const manager = makeManager("macos");
    const calls = await withCalls(async (calls) => {
      for (const scope of ["writer", "sheet", "slides"]) {
        manager.setActiveScope(scope);
        for (const combo of ["Cmd+H", "Cmd+M", "Cmd+Q", "Cmd+Space", "Ctrl+Space", "Cmd+`", "Cmd+Shift+4", "Cmd+Option+H", "Cmd+Option+M", "Cmd+Option+D", "F11", "Ctrl+F1"]) {
          const { event, flags } = macEvent(combo, plainTarget());
          manager._handleKeyDown(event);
          assert.equal(flags.prevented, false, `${scope}: ${combo} bị chặn`);
        }
      }
    });
    assert.deepEqual(calls, []);
  });

  await test("KEYS-1: trên Mac Control không phải phím chính; Option+chữ trong ô nhập vẫn gõ ký tự", async () => {
    const manager = makeManager("macos");
    manager.setActiveScope("writer");
    const input = { tagName: "DIV", isContentEditable: true, closest: () => null, matches: () => false };
    const calls = await withCalls(async () => {
      for (const combo of ["Ctrl+B", "Ctrl+S", "Option+F", "Option+J", "Option+="]) {
        const { event, flags } = macEvent(combo, input);
        manager._handleKeyDown(event);
        assert.equal(flags.prevented, false, `${combo} không được chặn`);
      }
      manager._handleKeyDown(macEvent("Cmd+B", input).event);
    });
    assert.deepEqual(calls, ["writer.text.bold"]);
  });

  await test("KEYS-1: Windows giữ nguyên — mọi tổ hợp Windows trong bảng chạy đúng lệnh với Ctrl/Alt", async () => {
    const manager = makeManager("windows");
    const failures = [];
    await withCalls(async (calls) => {
      for (const row of MACOS_KEYMAP) {
        manager.setActiveScope(row.scope === "common" ? null : row.scope);
        const norm = normalizeWindowsCombo(row.windows);
        const plusKey = norm.endsWith("++");
        const parts = norm.split("+").filter(Boolean);
        const k = plusKey ? "+" : parts[parts.length - 1];
        const mods = new Set(plusKey ? parts : parts.slice(0, -1));
        calls.length = 0;
        manager._handleKeyDown({
          key: KEY_FOR[k] || (k.length === 1 ? k.toLowerCase() : k), target: plainTarget(),
          ctrlKey: mods.has("CTRL"), altKey: mods.has("ALT"), shiftKey: mods.has("SHIFT"), metaKey: false,
          preventDefault() {}, stopPropagation() {}
        });
        const ok = calls[0] === row.commandId || (row.commandId.endsWith(".help.open") && calls[0] === "common.help.open");
        if (!ok) failures.push(`${row.scope}:${row.windows} → ${calls[0] || "none"}`);
      }
    });
    assert.deepEqual(failures, []);
  });

  await test("KEYS-1 (áp lại 525884d2): Option đơn không bật KeyTips trên Mac; Alt đơn vẫn bật trên Windows; F10 bật ở cả hai", () => {
    const original = globalKeyTipsManager.toggle;
    let toggles = 0;
    globalKeyTipsManager.toggle = () => { toggles += 1; };
    const alt = (type, mgr) => mgr[type]({ key: "Alt", ctrlKey: false, shiftKey: false, metaKey: false, altKey: type === "_handleKeyDown", target: null, preventDefault() {}, stopPropagation() {} });
    try {
      const mac = makeManager("macos");
      alt("_handleKeyDown", mac); alt("_handleKeyUp", mac);
      assert.equal(toggles, 0, "Mac: Option đơn không được bật KeyTips");
      const win = makeManager("windows");
      alt("_handleKeyDown", win); alt("_handleKeyUp", win);
      assert.equal(toggles, 1, "Windows: Alt đơn phải bật KeyTips");
      for (const mgr of [mac, win]) {
        const { event, flags } = macEvent("F10", plainTarget());
        mgr._handleKeyDown(event);
        assert.ok(flags.prevented);
      }
      assert.equal(toggles, 3, "F10 phải bật KeyTips trên cả Mac và Windows");
      assert.equal(getKeyboardCapabilities("macos").soloAltShowsKeyTips, false);
      assert.equal(getKeyboardCapabilities("windows").soloAltShowsKeyTips, true);
    } finally {
      globalKeyTipsManager.toggle = original;
    }
  });

  await test("KEYS-1 (MAC-10): F1 và Cmd+? mở Trợ giúp trên Mac; Cmd+? không mở trên Windows", () => {
    const opened = [];
    const mac = makeManager("macos");
    const win = makeManager("windows");
    mac.openContextualHelp = () => opened.push("mac");
    win.openContextualHelp = () => opened.push("win");
    mac._handleKeyDown(macEvent("F1", plainTarget()).event);
    mac._handleKeyDown({ ...macEvent("Cmd+Shift+/", plainTarget()).event, key: "?" });
    win._handleKeyDown(macEvent("F1", plainTarget()).event);
    win._handleKeyDown({ ...macEvent("Cmd+Shift+/", plainTarget()).event, key: "?" });
    assert.deepEqual(opened, ["mac", "mac", "win"]);
  });

  await test("KEYS-1 (MAC-5): Control+nhấp trên Mac thành nhấp phải, không lọt nhấp trái; Windows và nhấp phải thật không đổi", () => {
    const makeWindow = () => {
      const listeners = new Map();
      class FakeMouseEvent { constructor(type, init) { Object.assign(this, init, { type }); } }
      return {
        listeners, MouseEvent: FakeMouseEvent, PointerEvent: FakeMouseEvent,
        addEventListener(type, fn, capture) { assert.equal(capture, true); listeners.set(type, fn); },
        removeEventListener(type) { listeners.delete(type); }
      };
    };
    const makeEvent = (type, extra = {}) => {
      const dispatched = [];
      const ev = {
        type, button: 0, ctrlKey: true, metaKey: false, shiftKey: false, altKey: false, clientX: 10, clientY: 20, detail: 1,
        stopped: false, prevented: false, dispatched,
        target: { dispatchEvent: (clone) => dispatched.push(clone) },
        stopImmediatePropagation() { this.stopped = true; }, preventDefault() { this.prevented = true; },
        ...extra
      };
      return ev;
    };
    const macWin = makeWindow();
    const remove = installSecondaryClickNormalizer(macWin, { capabilities: getKeyboardCapabilities("macos") });
    for (const type of ["mousedown", "pointerdown", "mouseup", "pointerup"]) {
      const ev = makeEvent(type);
      macWin.listeners.get(type)(ev);
      assert.ok(ev.stopped, `${type} trái phải bị chặn`);
      assert.equal(ev.dispatched.length, 1);
      assert.equal(ev.dispatched[0].button, 2);
      assert.equal(ev.dispatched[0].ctrlKey, false);
      assert.equal(isSecondaryClick(ev.dispatched[0], "macos"), true);
      // bản phát lại không bị xử lý lại
      const again = { ...ev.dispatched[0], stopImmediatePropagation() { throw new Error("lặp"); } };
      macWin.listeners.get(type)(again);
    }
    const click = makeEvent("click");
    macWin.listeners.get("click")(click);
    assert.ok(click.stopped && click.prevented, "click của Control+nhấp không được chạy như nhấp thường");
    for (const extra of [{ button: 2 }, { metaKey: true, ctrlKey: false }, { ctrlKey: false }]) {
      const ev = makeEvent("mousedown", extra);
      macWin.listeners.get("mousedown")(ev);
      assert.ok(!ev.stopped && ev.dispatched.length === 0, `không được đụng ${JSON.stringify(extra)}`);
    }
    remove();
    assert.equal(macWin.listeners.size, 0);
    const winWin = makeWindow();
    installSecondaryClickNormalizer(winWin, { capabilities: getKeyboardCapabilities("windows") });
    const winEv = makeEvent("mousedown");
    winWin.listeners.get("mousedown")(winEv);
    assert.ok(!winEv.stopped && winEv.dispatched.length === 0, "Windows: Ctrl+nhấp giữ nguyên (chọn thêm)");
    assert.equal(isKeyboardContextMenuEvent({ key: "F10", shiftKey: true }), true);
    assert.equal(isKeyboardContextMenuEvent({ key: "ContextMenu" }), true);
    assert.equal(isKeyboardContextMenuEvent({ key: "F10", shiftKey: true, metaKey: true }), false);
  });

  await test("KEYS-1 (MAC-4): hàm dùng chung theo nền tảng — Cmd+nhấp chọn thêm, Option+kéo sao chép, nhãn ⌘", () => {
    assert.equal(isAdditiveSelect({ metaKey: true }, "macos"), true);
    assert.equal(isAdditiveSelect({ ctrlKey: true }, "macos"), false);
    assert.equal(isAdditiveSelect({ ctrlKey: true }, "windows"), true);
    assert.equal(isPrimaryModifier({ metaKey: true, ctrlKey: true }, "macos"), false);
    assert.equal(isCopyDrag({ altKey: true }, "macos"), true);
    assert.equal(isCopyDrag({ metaKey: true }, "macos"), false);
    assert.equal(isCopyDrag({ ctrlKey: true }, "windows"), true);
    assert.equal(isCopyDrag({ altKey: true }, "windows"), false);
    assert.equal(isCopyDragKey("Alt", "macos"), true);
    assert.equal(isCopyDragKey("Control", "macos"), false);
    assert.equal(isCopyDragKey("Control", "windows"), true);
    assert.equal(isSecondaryClick({ button: 0, ctrlKey: true }, "macos"), true);
    assert.equal(isSecondaryClick({ button: 0, ctrlKey: true }, "windows"), false);
    assert.equal(matchesShortcut({ key: "v", metaKey: true, ctrlKey: true, code: "KeyV" }, "Ctrl+Alt+V", { commandId: "sheet.edit.pasteSpecial", platform: "macos" }), true);
    assert.equal(matchesShortcut({ key: "v", ctrlKey: true, altKey: true }, "Ctrl+Alt+V", { commandId: "sheet.edit.pasteSpecial", platform: "windows" }), true);
    assert.equal(displayShortcut("Ctrl+S", "common.file.save", "macos"), "⌘S");
    assert.equal(displayShortcut("Ctrl+Alt+1", "writer.style.heading1", "macos"), "⌥⌘1");
    assert.equal(displayShortcut("Ctrl+H", "common.edit.replace", "macos"), "⌃H");
    assert.equal(displayShortcut("Ctrl+Space", "writer.text.clearFormat", "macos"), "");
    assert.equal(displayShortcut("Ctrl+S", "common.file.save", "windows"), "Ctrl+S");
    assert.equal(detectKeyboardPlatform({ platform: "MacIntel" }), "macos");
    assert.equal(detectKeyboardPlatform({ platform: "Win32" }), "windows");
    assert.equal(getKeyboardPlatform(), "windows", "mặc định Node/test phải là windows");
  });

  await test("KEYS-1 (áp lại 652fc182): lưới Sheet trên Mac — Cmd+1/D/R, Cmd+Control+V, Cmd+mũi tên; Control+D không điền; Windows Ctrl giữ nguyên", async () => {
    const container = { setAttribute() {}, focus() {}, querySelector() { return null; }, querySelectorAll() { return []; }, addEventListener() {}, classList: { add() {}, remove() {}, toggle() {} } };
    const grid = new SheetGridController(container);
    const actions = [];
    grid.showFormatCellsDialog = () => actions.push("format");
    grid.fillDown = () => actions.push("down");
    grid.fillRight = () => actions.push("right");
    grid._findNextCtrlArrowRow = () => { actions.push("jump"); return 1; };
    grid._bindGridKeyboardNavigation();
    const press = (key, mods = {}) => grid._gridKeydownHandler({ key, code: /^[a-z]$/i.test(key) ? `Key${key.toUpperCase()}` : (/^\d$/.test(key) ? `Digit${key}` : key), ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, preventDefault() {}, stopPropagation() {}, ...mods });
    const calls = await withCalls(async () => {
      try {
        setKeyboardPlatform("macos");
        press("1", { metaKey: true });
        press("d", { metaKey: true });
        press("R", { metaKey: true });
        press("d", { ctrlKey: true });
        press("v", { metaKey: true, ctrlKey: true });
        press("ArrowDown", { metaKey: true });
        setKeyboardPlatform("windows");
        press("d", { ctrlKey: true });
        press("v", { ctrlKey: true, altKey: true });
        press("D", { ctrlKey: true, shiftKey: true });
      } finally {
        setKeyboardPlatform("windows");
      }
    });
    assert.deepEqual(actions.filter((a) => a !== "jump"), ["format", "down", "right", "down"]);
    assert.ok(actions.includes("jump"), "Cmd+↓ phải nhảy tới ranh giới vùng dữ liệu");
    assert.deepEqual(calls, ["sheet.edit.pasteSpecial", "sheet.edit.pasteSpecial"]);
  });

  await test("KEYS-1: Trợ giúp tiếng Việt có bảng Doc/Sheet/Slide, chuột Ctrl+nhấp/Option+kéo, KeyTips F10/Fn/F1, không lộ nguồn tài liệu", () => {
    const ids = ["common.help.macosShortcutsCommon", "writer.help.macosShortcuts", "sheet.help.macosShortcuts", "slides.help.macosShortcuts", "common.help.macosMouse", "common.help.macosKeyboardAccess"];
    for (const id of ids) assert.ok(HELP_ENTRIES.some((entry) => entry.id === id), `catalog thiếu ${id}`);
    const blob = JSON.stringify(MACOS_SHORTCUT_HELP_ENTRIES);
    for (const token of ["Control+nhấp", "hai ngón", "Option (⌥) trong lúc kéo", "Shift+kéo", "Fn+F10", "Cmd+?", "Shift+F10", "Ctrl+H", "Cmd+Option+R", "Cmd+Shift+N"]) {
      assert.ok(blob.includes(token), `Trợ giúp thiếu ${token}`);
    }
    assert.doesNotMatch(blob, /\b(Word|Excel|PowerPoint)\b|Office for Mac|chờ xác minh|HIG|strman/);
    const writerRows = MACOS_SHORTCUT_HELP_ENTRIES.find((entry) => entry.id === "writer.help.macosShortcuts").steps;
    assert.ok(writerRows.length >= 50, `bảng Doc chỉ có ${writerRows.length} dòng`);
  });

  return results;
}
