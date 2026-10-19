/**
 * Bảng phím macOS dùng chung. Command definitions giữ tên Ctrl để không đổi
 * metadata/tài liệu Windows; lớp nhập bàn phím coi Command (metaKey) là primary
 * modifier và lớp Help dùng bảng này để hiển thị tên quen thuộc trên Mac.
 */

export const MACOS_SHORTCUTS = Object.freeze([
  { commandId: "writer.style.heading1", windows: "Ctrl+Alt+1", macos: "Cmd+Option+1", scope: "writer" },
  { commandId: "writer.style.heading2", windows: "Ctrl+Alt+2", macos: "Cmd+Option+2", scope: "writer" },
  { commandId: "writer.style.heading3", windows: "Ctrl+Alt+3", macos: "Cmd+Option+3", scope: "writer" },
  { commandId: "writer.list.bullet", windows: "Ctrl+Shift+L", macos: "Cmd+Shift+L", scope: "writer" },
  { commandId: "sheet.data.filter", windows: "Ctrl+Shift+L", macos: "Cmd+Shift+L", scope: "sheet" },
  { commandId: "slides.edit.selectionPane", windows: "Alt+F10", macos: "Option+F10", scope: "slides" },
  { commandId: "writer.trackChanges.toggle", windows: "Ctrl+Shift+E", macos: "Cmd+Shift+E", scope: "writer" }
]);

export function isMacOSRuntime(navigatorLike = globalThis.navigator) {
  const platform = String(navigatorLike?.userAgentData?.platform || navigatorLike?.platform || "").toLowerCase();
  const userAgent = String(navigatorLike?.userAgent || "").toLowerCase();
  return platform.includes("mac") || userAgent.includes("macintosh");
}

export function usesPrimaryModifier(event) {
  return Boolean(event?.ctrlKey || event?.metaKey);
}

export function formatShortcutForMac(shortcut) {
  return String(shortcut || "")
    .replace(/\bCtrl\b/gi, "Cmd")
    .replace(/\bAlt\b/gi, "Option");
}

export function getMacOSShortcut(commandId) {
  return MACOS_SHORTCUTS.find((entry) => entry.commandId === commandId) || null;
}
