/**
 * Thanh công cụ truy nhanh tùy biến (dùng chung Writer / Sheet / Slides).
 *
 * - Danh sách lệnh lưu theo từng ứng dụng trong localStorage (hoạt động offline, không gửi đi đâu).
 * - Bấm chuột phải (hoặc phím Menu / Shift+F10) vào một nút trên ribbon: "Thêm vào Thanh công cụ truy nhanh".
 * - Bấm chuột phải vào nút trên thanh truy nhanh: "Xóa khỏi Thanh công cụ truy nhanh" / "Đặt lại mặc định".
 * - Mũi tên ▾ cuối thanh: bật/tắt các lệnh phổ biến, đặt lại mặc định.
 * Phần logic thuần (đọc/ghi/thêm/xóa) tách riêng để kiểm thử bằng Node.
 */
import { ICONS } from "../ui-kit/icons.js";
import { resolveIcon } from "../ui-kit/components.js";
import { ContextMenu } from "../ui-kit/context-menu.js";
import { globalCommandBus } from "../commands/command-bus.js";
import { t } from "../i18n/i18n.js";

export const QUICK_ACCESS_DEFAULTS = Object.freeze([
  "common.file.save", "common.edit.undo", "common.edit.redo", "common.file.print"
]);

/** Lệnh phổ biến hiện trong menu ▾ (kèm lệnh người dùng đã thêm). */
export const QUICK_ACCESS_SUGGESTED = Object.freeze([
  "common.file.new", "common.file.open", "common.file.save", "common.file.saveAs",
  "common.file.print", "common.file.exportPdf", "common.edit.undo", "common.edit.redo",
  "common.edit.cut", "common.edit.copy"
]);

export const QUICK_ACCESS_MAX = 20;

const storageKey = appName => `vno.quickAccess.v1.${appName || "app"}`;

function defaultStorage() {
  try { return typeof localStorage !== "undefined" ? localStorage : null; } catch { return null; }
}

export function sanitizeQuickAccess(value) {
  if (!Array.isArray(value)) return null;
  const seen = new Set();
  const list = [];
  for (const item of value) {
    if (typeof item !== "string" || !/^[A-Za-z0-9_.-]{1,80}$/.test(item) || seen.has(item)) continue;
    seen.add(item);
    list.push(item);
    if (list.length >= QUICK_ACCESS_MAX) break;
  }
  return list;
}

export function readQuickAccess(appName, storage = defaultStorage()) {
  try {
    const raw = storage?.getItem(storageKey(appName));
    if (raw) {
      const parsed = sanitizeQuickAccess(JSON.parse(raw));
      if (parsed) return parsed;
    }
  } catch { /* hỏng dữ liệu hoặc bị chặn: dùng mặc định */ }
  return [...QUICK_ACCESS_DEFAULTS];
}

export function writeQuickAccess(appName, ids, storage = defaultStorage()) {
  const list = sanitizeQuickAccess(ids) || [];
  try { storage?.setItem(storageKey(appName), JSON.stringify(list)); } catch { /* không lưu được: giữ trong phiên */ }
  return list;
}

export function addQuickAccess(ids, commandId) {
  const list = sanitizeQuickAccess(ids) || [];
  if (list.includes(commandId) || list.length >= QUICK_ACCESS_MAX) return list;
  return sanitizeQuickAccess([...list, commandId]);
}

export function removeQuickAccess(ids, commandId) {
  return (sanitizeQuickAccess(ids) || []).filter(id => id !== commandId);
}

export function toggleQuickAccess(ids, commandId) {
  return (sanitizeQuickAccess(ids) || []).includes(commandId) ? removeQuickAccess(ids, commandId) : addQuickAccess(ids, commandId);
}

function definitionOf(bus, commandId) {
  return bus?.getDefinition?.(commandId) || null;
}

function labelOf(bus, commandId) {
  const state = bus?.getState?.(commandId);
  const def = definitionOf(bus, commandId);
  return state?.label || def?.label || commandId;
}

function shortcutOf(bus, commandId) {
  const state = bus?.getState?.(commandId);
  const def = definitionOf(bus, commandId);
  return state?.shortcut || def?.shortcut || "";
}

/**
 * Gắn thanh truy nhanh vào phần tử `host` (.vno-quick-tools) của thanh tiêu đề.
 * @returns {{render():void, getIds():string[], destroy():void}}
 */
export function installQuickAccess({ appName, host, rootEl, bus = globalCommandBus, storage = defaultStorage() }) {
  if (!host) return { render() {}, getIds: () => [], destroy() {} };
  let ids = readQuickAccess(appName, storage);

  const save = next => { ids = writeQuickAccess(appName, next, storage); render(); };

  const menuLabelFor = (commandId, adding) => adding
    ? t("quickAccess.addTo")
    : t("quickAccess.removeFrom");

  const openMenu = (event, items, anchor) => {
    const rect = anchor?.getBoundingClientRect?.();
    const x = event?.clientX && event.clientX > 0 ? event.clientX : (rect ? rect.left : 0);
    const y = event?.clientY && event.clientY > 0 ? event.clientY : (rect ? rect.bottom : 0);
    new ContextMenu({ x, y, items, ariaLabel: t("quickAccess.menuLabel"), previousFocus: anchor || null }).show();
  };

  function render() {
    host.innerHTML = "";
    for (const commandId of ids) {
      const def = definitionOf(bus, commandId);
      if (!def) continue; // lệnh không còn tồn tại: bỏ qua, không làm vỡ thanh
      const label = labelOf(bus, commandId);
      const shortcut = shortcutOf(bus, commandId);
      const name = shortcut ? `${label} (${shortcut})` : label;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "vno-quick-btn";
      btn.setAttribute("data-cmd", commandId);
      btn.setAttribute("aria-label", name);
      btn.title = name;
      btn.innerHTML = resolveIcon(commandId, def.icon || "");
      btn.addEventListener("click", () => bus.execute(commandId));
      btn.addEventListener("contextmenu", event => {
        event.preventDefault();
        openMenu(event, [
          { label: t("quickAccess.removeFrom"), action: () => save(removeQuickAccess(ids, commandId)) },
          { sep: true },
          { label: t("quickAccess.reset"), action: () => save([...QUICK_ACCESS_DEFAULTS]) }
        ], btn);
      });
      host.appendChild(btn);
    }
    const more = document.createElement("button");
    more.type = "button";
    more.className = "vno-quick-btn vno-quick-more";
    more.setAttribute("aria-haspopup", "menu");
    more.setAttribute("aria-label", t("quickAccess.customize"));
    more.title = t("quickAccess.customize");
    more.innerHTML = ICONS.chevronDown || "▾";
    more.addEventListener("click", event => {
      event.stopPropagation();
      const suggested = QUICK_ACCESS_SUGGESTED.filter(id => definitionOf(bus, id));
      const extras = ids.filter(id => !suggested.includes(id) && definitionOf(bus, id));
      const entries = [...suggested, ...extras].map(commandId => ({
        label: `${ids.includes(commandId) ? "✓ " : "  "}${labelOf(bus, commandId)}`,
        shortcut: shortcutOf(bus, commandId),
        action: () => save(toggleQuickAccess(ids, commandId))
      }));
      openMenu(event, [
        { label: t("quickAccess.customize"), disabled: true },
        { sep: true },
        ...entries,
        { sep: true },
        { label: t("quickAccess.reset"), action: () => save([...QUICK_ACCESS_DEFAULTS]) }
      ], more);
    });
    host.appendChild(more);
  }

  // Chuột phải (hoặc phím Menu / Shift+F10) vào nút lệnh bất kỳ trên ribbon.
  const onRibbonContextMenu = event => {
    const target = event.target?.closest?.("[data-command-id]");
    if (!target || !rootEl?.contains?.(target) || host.contains(target)) return;
    const commandId = target.getAttribute("data-command-id");
    if (!commandId || !definitionOf(bus, commandId)) return;
    event.preventDefault();
    const present = ids.includes(commandId);
    openMenu(event, [
      present
        ? { label: t("quickAccess.removeFrom"), action: () => save(removeQuickAccess(ids, commandId)) }
        : { label: menuLabelFor(commandId, true), action: () => save(addQuickAccess(ids, commandId)), disabled: ids.length >= QUICK_ACCESS_MAX }
    ], target);
  };
  rootEl?.addEventListener?.("contextmenu", onRibbonContextMenu);

  render();
  return {
    render,
    getIds: () => [...ids],
    destroy() { rootEl?.removeEventListener?.("contextmenu", onRibbonContextMenu); }
  };
}
