/**
 * Ngăn chọn đối tượng dùng chung (Slides trước; Writer/Sheet có thể chuyển sang dùng sau).
 * Hiển thị danh sách đối tượng từ trên cùng xuống dưới cùng; nhấp để chọn, nút lên/xuống đổi thứ tự lớp,
 * phím mũi tên chọn đối tượng kế, Ctrl+Shift+mũi tên đổi thứ tự, Esc đóng.
 *
 * items: [{ id, label, selected, hidden }] theo thứ tự TRÊN CÙNG → DƯỚI CÙNG.
 * onRename(id, tên) và onToggleHidden(id, ẩn) là tùy chọn: có thì hiện nút con mắt và cho đổi tên
 * (nhấp đúp hoặc F2 → ô nhập tại chỗ, Enter lưu, Esc hủy).
 */
export function createSelectionPane({ title, hint, emptyText, closeLabel = "Đóng", upLabel = "Đưa lên", downLabel = "Đưa xuống", renameLabel = "Đổi tên", hideLabel = "Ẩn", showLabel = "Hiện", onSelect, onMove, onRename, onToggleHidden, onClose }) {
  const el = document.createElement("aside");
  el.className = "vno-selection-pane";
  el.hidden = true;
  el.setAttribute("role", "region");
  el.setAttribute("aria-label", title);
  el.setAttribute("tabindex", "-1");
  el.innerHTML = `
    <header>
      <strong>${title}</strong>
      <button type="button" class="vno-selection-pane-close" title="${closeLabel}" aria-label="${closeLabel}">×</button>
    </header>
    <p class="vno-selection-pane-hint">${hint}</p>
    <div class="vno-selection-pane-list" role="listbox" aria-label="${title}" aria-live="polite"></div>`;
  const list = el.querySelector(".vno-selection-pane-list");
  let current = [];

  const focusRow = (id) => list.querySelector(`[data-sel-id="${CSS.escape(String(id))}"]`)?.focus?.();

  const startRename = (row) => {
    if (!onRename || !row) return;
    const id = row.getAttribute("data-sel-id");
    const label = row.querySelector(".vno-selection-pane-label");
    const item = current.find((entry) => String(entry.id) === id);
    if (!label || !item || row.querySelector(".vno-selection-pane-rename")) return;
    const input = document.createElement("input");
    input.type = "text";
    input.className = "vno-selection-pane-rename";
    input.value = item.label;
    input.setAttribute("aria-label", renameLabel);
    input.maxLength = 255;
    label.replaceWith(input);
    let finished = false;
    const finish = (commit) => {
      if (finished) return;
      finished = true;
      const value = input.value.trim();
      if (commit && value && value !== item.label) onRename(id, value);
      else setItems(current);
      setTimeout(() => focusRow(id), 0);
    };
    input.addEventListener("keydown", (event) => {
      event.stopPropagation();
      if (event.key === "Enter") { event.preventDefault(); finish(true); }
      else if (event.key === "Escape") { event.preventDefault(); finish(false); }
    });
    input.addEventListener("blur", () => finish(true));
    input.focus();
    input.select();
  };

  el.querySelector(".vno-selection-pane-close").addEventListener("click", () => onClose?.());
  list.addEventListener("click", (event) => {
    const move = event.target.closest?.("[data-sel-move]");
    const eye = event.target.closest?.("[data-sel-hidden]");
    const row = event.target.closest?.(".vno-selection-pane-item");
    if (!row) return;
    const id = row.getAttribute("data-sel-id");
    if (eye) {
      onToggleHidden?.(id, eye.getAttribute("data-sel-hidden") !== "true");
      setTimeout(() => focusRow(id), 0);
      return;
    }
    if (move) {
      onMove?.(id, move.getAttribute("data-sel-move"));
      setTimeout(() => focusRow(id), 0);
      return;
    }
    onSelect?.(id);
  });
  list.addEventListener("dblclick", (event) => {
    if (event.target.closest?.("button,input")) return;
    startRename(event.target.closest?.(".vno-selection-pane-item"));
  });
  el.addEventListener("keydown", (event) => {
    if (event.target.closest?.(".vno-selection-pane-rename")) return;
    if (event.key === "F2") {
      const target = event.target.closest?.(".vno-selection-pane-item");
      if (target) { event.preventDefault(); event.stopPropagation(); startRename(target); return; }
    }
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onClose?.();
      return;
    }
    const row = event.target.closest?.(".vno-selection-pane-item");
    if (!row) return;
    const index = current.findIndex((item) => String(item.id) === row.getAttribute("data-sel-id"));
    const up = event.key === "ArrowUp";
    const down = event.key === "ArrowDown";
    if (!up && !down) {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onSelect?.(row.getAttribute("data-sel-id"));
      }
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    if (event.ctrlKey && event.shiftKey) {
      onMove?.(row.getAttribute("data-sel-id"), up ? "forward" : "backward");
      setTimeout(() => focusRow(row.getAttribute("data-sel-id")), 0);
      return;
    }
    const next = current[Math.max(0, Math.min(current.length - 1, index + (down ? 1 : -1)))];
    if (next) {
      onSelect?.(next.id);
      setTimeout(() => focusRow(next.id), 0);
    }
  });

  function setItems(items) {
    current = items;
    if (!items.length) {
      list.innerHTML = `<div class="vno-selection-pane-empty">${emptyText}</div>`;
      return;
    }
    list.innerHTML = items.map((item, index) => `
      <div class="vno-selection-pane-item${item.selected ? " is-selected" : ""}" role="option" aria-selected="${item.selected ? "true" : "false"}" tabindex="${item.selected || (index === 0 && !items.some((i) => i.selected)) ? "0" : "-1"}" data-sel-id="${String(item.id).replace(/"/g, "&quot;")}">
        <span class="vno-selection-pane-label"></span>
        <span class="vno-selection-pane-actions">
          ${onToggleHidden ? `<button type="button" data-sel-hidden="${item.hidden ? "true" : "false"}" title="${item.hidden ? showLabel : hideLabel}" aria-label="${item.hidden ? showLabel : hideLabel}" aria-pressed="${item.hidden ? "true" : "false"}">${item.hidden ? "🚫" : "👁"}</button>` : ""}
          <button type="button" data-sel-move="forward" title="${upLabel}" aria-label="${upLabel}" ${index === 0 ? "disabled" : ""}>▲</button>
          <button type="button" data-sel-move="backward" title="${downLabel}" aria-label="${downLabel}" ${index === items.length - 1 ? "disabled" : ""}>▼</button>
        </span>
      </div>`).join("");
    // Nhãn gán bằng textContent để tên đối tượng không bao giờ bị hiểu là HTML.
    list.querySelectorAll(".vno-selection-pane-label").forEach((node, index) => {
      node.textContent = items[index].label;
      if (items[index].hidden) node.parentElement.classList.add("is-hidden-shape");
    });
  }

  return { el, setItems, focus: () => (list.querySelector('.vno-selection-pane-item[tabindex="0"]') || el.querySelector(".vno-selection-pane-close"))?.focus?.() };
}
