(() => {
  "use strict";

  const root = document.documentElement;
  const state = { keyboardInset: 0, formatOpen: false };
  const labels = {
    writer: ["Doc", "Soạn thảo"],
    sheet: ["Sheet", "Bảng tính"],
    slides: ["Slide", "Trình chiếu"]
  };

  const svg = path => `<svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
  const icon = name => ({
    apps: svg('<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>'),
    format: '<b class="vno-mobile-aa" aria-hidden="true">Aa</b>',
    undo: svg('<path d="M9 7 4 12l5 5"/><path d="M5 12h8a6 6 0 0 1 6 6"/>'),
    redo: svg('<path d="m15 7 5 5-5 5"/><path d="M19 12h-8a6 6 0 0 0-6 6"/>'),
    sidebar: svg('<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M9 4v16"/>'),
    more: svg('<circle cx="5" cy="12" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="19" cy="12" r="1" fill="currentColor"/>')
  })[name];

  function activeApp() {
    return document.querySelector("#vno-app-root")?.dataset.app || "writer";
  }

  function invoke(command) {
    const target = document.querySelector(`[data-cmd="${command}"]`);
    if (target && !target.disabled) target.click();
  }

  function switchApp(app) {
    const target = document.querySelector(`.vno-switcher-item[data-switch="${app}"]`);
    if (target) target.click();
  }

  function toggleFormat(button) {
    state.formatOpen = !state.formatOpen;
    root.dataset.vnoFormatOpen = String(state.formatOpen);
    button.setAttribute("aria-pressed", String(state.formatOpen));
  }

  function toggleSidebar(button) {
    const shell = document.querySelector(".vno-shell");
    const hidden = shell?.dataset.mobileSidebarHidden !== "true";
    if (shell) shell.dataset.mobileSidebarHidden = String(hidden);
    button.setAttribute("aria-pressed", String(hidden));
  }

  function createButton(action, label, glyph) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `vno-mobile-action is-${action}`;
    button.dataset.mobileAction = action;
    button.setAttribute("aria-label", label);
    button.innerHTML = `<span aria-hidden="true">${glyph}</span><small>${label}</small>`;
    return button;
  }

  function mountChrome() {
    if (document.querySelector("#vno-mobile-command-dock")) return;
    const shell = document.querySelector(".vno-shell");
    if (!shell) return;

    const dock = document.createElement("nav");
    dock.id = "vno-mobile-command-dock";
    dock.className = "vno-mobile-command-dock";
    dock.setAttribute("aria-label", "Công cụ nhanh trên thiết bị di động");
    dock.append(
      createButton("apps", "Ứng dụng", icon("apps")),
      createButton("format", "Định dạng", icon("format")),
      createButton("undo", "Hoàn tác", icon("undo")),
      createButton("redo", "Làm lại", icon("redo")),
      createButton("more", "Thêm", icon("more"))
    );
    shell.appendChild(dock);

    const sidebar = createButton("sidebar", "Thanh bên", icon("sidebar"));
    sidebar.id = "vno-ipad-sidebar-toggle";
    sidebar.classList.add("vno-ipad-sidebar-toggle");
    shell.appendChild(sidebar);

    dock.addEventListener("click", event => {
      const button = event.target.closest("[data-mobile-action]");
      if (!button) return;
      const action = button.dataset.mobileAction;
      if (action === "apps") document.querySelector("#vno-switcher-toggle")?.click();
      else if (action === "format") toggleFormat(button);
      else if (action === "undo") invoke("common.edit.undo");
      else if (action === "redo") invoke("common.edit.redo");
      else if (action === "more") document.querySelector(".vno-ribbon-tab-file")?.click();
    });
    sidebar.addEventListener("click", () => toggleSidebar(sidebar));
    updateChrome();
  }

  function updateChrome() {
    const app = activeApp();
    if (root.dataset.vnoActiveApp !== app) root.dataset.vnoActiveApp = app;
    const appButton = document.querySelector('.vno-mobile-action[data-mobile-action="apps"] small');
    const label = labels[app]?.[0] || "Ứng dụng";
    if (appButton && appButton.textContent !== label) appButton.textContent = label;
  }

  window.__vnoSetKeyboardInset = pixels => {
    state.keyboardInset = Math.max(0, Number(pixels) || 0);
    root.style.setProperty("--vno-keyboard-inset", `${state.keyboardInset}px`);
    root.dataset.vnoKeyboard = state.keyboardInset > 0 ? "visible" : "hidden";
  };

  window.__vnoSetNativeLayout = layout => {
    root.dataset.vnoNativeWidth = layout?.compact ? "compact" : "regular";
    root.dataset.vnoPointer = layout?.pointer ? "available" : "touch";
    root.dataset.vnoTextSize = layout?.textSize || "normal";
  };

  const observer = new MutationObserver(() => {
    mountChrome();
    updateChrome();
  });
  observer.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-app"] });
  mountChrome();
})();
