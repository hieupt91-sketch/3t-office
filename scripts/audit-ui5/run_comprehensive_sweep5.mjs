import { spawn } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const targetApp = process.argv[2] || "all";
const basePort = Number(process.argv[3] || "47081");
const outputDir = path.resolve("docs/assets/ui-sweep-5");
mkdirSync(outputDir, { recursive: true });

const APPS_CONFIG = {
  writer: {
    port: basePort,
    tabMap: {
      "writer.table.insert": "insert",
      "writer.view.zoomDialog": "view",
      "writer.page.setupDialog": "layout",
      "writer.insert.equation": "insert",
      "writer.insert.symbol": "insert",
      "writer.insert.crossReference": "insert",
      "writer.reference.captionInsert": "references",
      "writer.review.wordCount": "review",
      "writer.mailMerge.open": "mailings",
      "writer.edit.goTo": "home"
    },
    dialogs: [
      { id: "writer.table.insert", label: "Chèn Bảng", numeric: false },
      { id: "writer.view.zoomDialog", label: "Thu phóng tùy chỉnh", numeric: true, selector: "#vno-writer-zoom-value" },
      { id: "writer.page.setupDialog", label: "Thiết lập trang", numeric: true, selector: "#vno-ps-margin-top" },
      { id: "writer.insert.equation", label: "Phương trình", numeric: false },
      { id: "writer.insert.symbol", label: "Ký hiệu", numeric: false },
      { id: "writer.insert.crossReference", label: "Tham chiếu chéo", numeric: false },
      { id: "writer.reference.captionInsert", label: "Chèn chú thích ảnh", numeric: false },
      { id: "writer.review.wordCount", label: "Đếm từ", numeric: false },
      { id: "writer.mailMerge.open", label: "Nguồn dữ liệu trộn thư", numeric: false },
      { id: "writer.edit.goTo", label: "Đi đến", numeric: false }
    ],
    numericDialogs: [
      { id: "writer.view.zoomDialog", label: "Thu phóng", inputSelector: "#vno-writer-zoom-value", okSelector: "#vno-writer-zoom-apply", errorSelector: "#vno-writer-zoom-error" },
      { id: "writer.page.setupDialog", label: "Thiết lập trang (Lề trên)", inputSelector: "#vno-ps-margin-top", okSelector: ".vno-dialog-ok-btn", errorSelector: "#vno-ps-error" },
      { id: "writer.page.setupDialog", label: "Thiết lập trang (Lề trái)", inputSelector: "#vno-ps-margin-left", okSelector: ".vno-dialog-ok-btn", errorSelector: "#vno-ps-error" }
    ]
  },
  sheet: {
    port: basePort + 1,
    tabMap: {
      "sheet.data.validation": "data",
      "sheet.data.goalSeek": "data",
      "sheet.data.dataTable": "data",
      "sheet.data.scenarioManager": "data",
      "sheet.data.pivotTable": "insert",
      "sheet.format.conditional": "home",
      "sheet.style.formatAsTable": "home",
      "sheet.row.height": "home",
      "sheet.page.margins": "pageLayout",
      "sheet.page.size": "pageLayout"
    },
    dialogs: [
      { id: "sheet.data.validation", label: "Kiểm tra dữ liệu", numeric: false },
      { id: "sheet.data.goalSeek", label: "Dò tìm mục tiêu", numeric: false },
      { id: "sheet.data.dataTable", label: "Bảng dữ liệu", numeric: false },
      { id: "sheet.data.scenarioManager", label: "Trình quản lý kịch bản", numeric: false },
      { id: "sheet.data.pivotTable", label: "Bảng tổng hợp", numeric: false },
      { id: "sheet.format.conditional", label: "Định dạng có điều kiện", numeric: true },
      { id: "sheet.style.formatAsTable", label: "Định dạng thành Bảng", numeric: false },
      { id: "sheet.row.height", label: "Chiều cao hàng", numeric: true },
      { id: "sheet.page.margins", label: "Căn lề", numeric: true },
      { id: "sheet.page.size", label: "Khổ giấy", numeric: true }
    ],
    numericDialogs: [
      { id: "sheet.row.height", label: "Chiều cao hàng", inputSelector: ".vno-prompt-input, .vno-input", okSelector: ".vno-btn-primary", errorSelector: "[role=alert]" },
      { id: "sheet.page.margins", label: "Căn lề (Lề trên)", inputSelector: "input[type=number]", okSelector: ".vno-btn-primary", errorSelector: "[role=alert]" },
      { id: "sheet.page.size", label: "Khổ giấy (Chiều rộng)", inputSelector: "input[type=number]", okSelector: ".vno-btn-primary", errorSelector: "[role=alert]" },
      { id: "sheet.format.conditional", label: "Định dạng có điều kiện (Giá trị)", inputSelector: "input[type=number]", okSelector: "#vno-cf-add-rule, .vno-btn-primary", errorSelector: ".vno-rule-error, [role=alert]" }
    ]
  },
  slides: {
    port: basePort + 2,
    tabMap: {
      "slides.insert.table": "insert",
      "slides.diagram.insert": "insert",
      "slides.insert.headerFooter": "insert",
      "slides.insert.dateTime": "insert",
      "slides.insert.symbol": "insert",
      "slides.insert.wordart": "insert",
      "slides.review.spellCheck": "review",
      "slides.insert.hyperlink": "insert",
      "slides.view.zoomDialog": "view",
      "slides.show.setupShow": "slideshow"
    },
    dialogs: [
      { id: "slides.insert.table", label: "Chèn Bảng", numeric: true },
      { id: "slides.diagram.insert", label: "Chèn Sơ đồ", numeric: true },
      { id: "slides.insert.headerFooter", label: "Đầu trang & Chân trang", numeric: false },
      { id: "slides.insert.dateTime", label: "Ngày & Giờ", numeric: false },
      { id: "slides.insert.symbol", label: "Ký hiệu", numeric: false },
      { id: "slides.insert.wordart", label: "Chữ nghệ thuật", numeric: false },
      { id: "slides.review.spellCheck", label: "Soát lỗi chính tả", numeric: false },
      { id: "slides.insert.hyperlink", label: "Chèn Liên kết", numeric: false },
      { id: "slides.view.zoomDialog", label: "Thu phóng", numeric: true },
      { id: "slides.show.setupShow", label: "Thiết lập trình chiếu", numeric: false }
    ],
    numericDialogs: [
      { id: "slides.insert.table", label: "Chèn Bảng (Số hàng)", inputSelector: "#vno-slide-table-rows", okSelector: ".vno-btn-primary", errorSelector: "#vno-slide-table-error" },
      { id: "slides.insert.table", label: "Chèn Bảng (Số cột)", inputSelector: "#vno-slide-table-cols", okSelector: ".vno-btn-primary", errorSelector: "#vno-slide-table-error" },
      { id: "slides.diagram.insert", label: "Chèn Sơ đồ (Số nút)", inputSelector: "#vno-diagram-count", okSelector: "#vno-diagram-insert", errorSelector: "#vno-diagram-count-error" },
      { id: "slides.view.zoomDialog", label: "Thu phóng (Tỷ lệ)", inputSelector: ".vno-dialog-box input[type=number]", okSelector: ".vno-btn-primary", errorSelector: "[role=alert]" }
    ]
  }
};

const INVALID_CASES = [
  { name: "rỗng (empty)", value: "" },
  { name: "âm (negative)", value: "-1" },
  { name: ">1e9 (lớn quá mức)", value: "1000000001" },
  { name: "chữ (letters)", value: "abc" },
  { name: "5000 ký tự (overflow)", value: "9".repeat(5000) },
  { name: "ký tự đặc biệt (special)", value: "<>&\"" }
];

async function runAuditForApp(appKey) {
  const config = APPS_CONFIG[appKey];
  const port = config.port;
  const profileRoot = `E:\\VNOffice-profiles\\agy-ui5-${appKey}-${Date.now()}`;
  mkdirSync(profileRoot, { recursive: true });

  console.log(`\n======================================================`);
  console.log(`=== BẮT ĐẦU RÀ SOÁT: ${appKey.toUpperCase()} (Port ${port}) ===`);
  console.log(`======================================================\n`);

  const env = { ...process.env, VNO_CDP_LOCALAPPDATA: profileRoot };
  const serverChild = spawn(
    process.execPath,
    ["--experimental-websocket", "scripts/audit-0610/app_session_server.mjs", appKey, "--port=" + port],
    { env, stdio: ["ignore", "pipe", "pipe"] }
  );

  serverChild.stdout.on("data", (d) => {
    if (d.toString().includes("APP MO")) console.log(`[SERVER ${appKey}] ${d.toString().trim()}`);
  });

  async function api(endpoint, body = {}) {
    const url = `http://127.0.0.1:${port}/${endpoint}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!data.ok) throw new Error(`API ${endpoint} failed: ${data.error}`);
    return data.result;
  }

  async function waitReady(timeoutMs = 60000) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      try {
        const res = await fetch(`http://127.0.0.1:${port}/wait`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ms: 50 }),
        });
        if (res.ok) return true;
      } catch {}
      await new Promise((r) => setTimeout(r, 500));
    }
    return false;
  }

  const ready = await waitReady();
  if (!ready) {
    console.error(`[ERROR] Failed to start server for ${appKey}`);
    serverChild.kill();
    return null;
  }

  async function saveShot(name) {
    const res = await api("shot", { name });
    const src = res.file;
    const dst = path.join(outputDir, `${name}.png`);
    copyFileSync(src, dst);
    return `${name}.png`;
  }

  async function setSize(width, height) {
    return await api("size", { width, height });
  }

  async function setTheme(theme) {
    await api("eval", { expr: `document.documentElement.setAttribute('data-theme', ${JSON.stringify(theme)})` });
    await api("wait", { ms: 120 });
  }

  const result = {
    app: appKey,
    tooltips: [],
    toasts: [],
    dialogs: [],
    invalidInputs: []
  };

  try {
    // -----------------------------------------------------------------
    // (1) TOOLTIPS 3 NÚT ĐẦU MỖI TAB RIBBON
    // -----------------------------------------------------------------
    console.log(`--- [1] RÀ SOÁT TOOLTIPS: ${appKey} ---`);
    for (const size of [{ w: 1366, h: 768 }, { w: 1024, h: 600 }]) {
      await setSize(size.w, size.h);
      for (const theme of ["light", "dark"]) {
        await setTheme(theme);
        const tabs = await api("eval", {
          expr: `([...document.querySelectorAll('.vno-ribbon-tab')]).map(t => ({ id: t.dataset.tabId, text: (t.innerText || '').trim() }))`
        });

        for (const tab of tabs) {
          if (!tab.id) continue;
          await api("eval", { expr: `document.getElementById('vno-ribbon-tab-${tab.id}')?.click()` });
          await api("wait", { ms: 120 });

          const buttons = await api("eval", {
            expr: `(() => {
              const btns = [...document.querySelectorAll('.vno-ribbon-content [data-command-id]')].filter(e => {
                const r = e.getBoundingClientRect();
                return r.width > 0 && r.height > 0;
              }).slice(0, 3);
              return btns.map(e => {
                const r = e.getBoundingClientRect();
                const d = window.globalCommandBus?.getDefinition(e.dataset.commandId);
                return {
                  commandId: e.dataset.commandId,
                  title: e.getAttribute('title') || '',
                  ariaLabel: e.getAttribute('aria-label') || '',
                  shortcut: d?.shortcut || '',
                  label: d?.label || '',
                  rect: { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height }
                };
              });
            })()`
          });

          for (let i = 0; i < buttons.length; i++) {
            const btn = buttons[i];
            const hasTooltip = (btn.title && btn.title.trim().length > 0) || (btn.ariaLabel && btn.ariaLabel.trim().length > 0);
            
            // Check for English leftover
            const enWords = ["Cut", "Copy", "Paste", "Bold", "Italic", "Underline", "Save", "Open", "Print"];
            const textToCheck = (btn.title || btn.ariaLabel || "");
            const hasEnglishSot = enWords.some(w => textToCheck.includes(w));
            const insideViewport = btn.rect.left >= 0 && btn.rect.top >= 0 && btn.rect.right <= size.w && btn.rect.bottom <= size.h;
            const pass = hasTooltip && !hasEnglishSot && insideViewport;

            result.tooltips.push({
              tab: tab.text,
              buttonIndex: i + 1,
              commandId: btn.commandId,
              title: btn.title,
              ariaLabel: btn.ariaLabel,
              hasTooltip,
              hasEnglishSot,
              insideViewport,
              size: `${size.w}x${size.h}`,
              theme,
              pass
            });
          }

          const shot = `tooltip-${appKey}-${tab.id}-${size.w}x${size.h}-${theme}`;
          await saveShot(shot);
        }
      }
    }

    // -----------------------------------------------------------------
    // (2) TOAST / NOTIFICATION AUDIT
    // -----------------------------------------------------------------
    console.log(`--- [2] RÀ SOÁT TOAST: ${appKey} ---`);
    for (const size of [{ w: 1366, h: 768 }, { w: 1024, h: 600 }]) {
      await setSize(size.w, size.h);
      for (const theme of ["light", "dark"]) {
        await setTheme(theme);
        for (const [type, msg] of [
          ["info", "Đã lưu bản sao lưu tự động."],
          ["success", "Đã lưu tài liệu thành công."],
          ["warning", "Tệp đang mở ở chế độ chỉ đọc."],
          ["error", "Không thể kết nối đến máy in."]
        ]) {
          await api("eval", {
            expr: `window.__vnoAppInstance?.shell?.showNotification({ type: ${JSON.stringify(type)}, message: ${JSON.stringify(msg)} })`
          });
          await api("wait", { ms: 120 });

          const state = await api("eval", {
            expr: `(() => {
              const bar = document.querySelector('.vno-notification-bar');
              if (!bar) return { visible: false };
              const r = bar.getBoundingClientRect();
              const ribbonButtons = [...document.querySelectorAll('.vno-ribbon-content [data-command-id]')].filter(e => {
                const br = e.getBoundingClientRect();
                return br.width > 0 && br.height > 0;
              }).map(e => e.getBoundingClientRect());
              const overlapsRibbon = ribbonButtons.some(b => r.top < b.bottom && r.bottom > b.top && r.left < b.right && r.right > b.left);
              return {
                visible: true,
                role: bar.getAttribute('role'),
                live: bar.getAttribute('aria-live'),
                rect: { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height },
                overlapsRibbon,
                viewport: { w: window.innerWidth, h: window.innerHeight }
              };
            })()`
          });

          const shot = `toast-${appKey}-${type}-${size.w}x${size.h}-${theme}`;
          await saveShot(shot);

          await api("wait", { ms: 2500 });
          const persistentAfter2500 = await api("eval", { expr: `!!document.querySelector('.vno-notification-bar')` });
          await api("eval", { expr: `window.__vnoAppInstance?.shell?.clearNotification()` });
          await api("wait", { ms: 100 });

          const inside = state.visible && state.rect.left >= 0 && state.rect.right <= size.w && state.rect.top >= 0 && state.rect.bottom <= size.h;
          const pass = state.visible && inside && !state.overlapsRibbon;

          result.toasts.push({
            type,
            size: `${size.w}x${size.h}`,
            theme,
            rect: state.rect,
            inside,
            overlapsRibbon: state.overlapsRibbon,
            persistentAfter2500,
            pass,
            shot
          });
        }
      }
    }

    // -----------------------------------------------------------------
    // (3) TAB / SHIFT+TAB / ENTER / ESC & FOCUS RETURN CHO 10 HỘP THOẠI
    // -----------------------------------------------------------------
    console.log(`--- [3] RÀ SOÁT 10 HỘP THOẠI (PHÍM & FOCUS): ${appKey} ---`);
    await setSize(1366, 768);
    await setTheme("light");

    for (const d of config.dialogs) {
      console.log(`> Hộp thoại: ${d.label} (${d.id})`);
      const tabName = config.tabMap[d.id] || "home";

      // 1. Chuyển đến tab tương ứng
      await api("eval", { expr: `document.getElementById('vno-ribbon-tab-${tabName}')?.click()` });
      await api("wait", { ms: 150 });

      // 2. Tìm nút trên ribbon và focus vào nó
      const focusBtnResult = await api("eval", {
        expr: `(() => {
          const btn = document.querySelector('[data-command-id="${d.id}"]');
          if (btn) {
            btn.focus();
            return { found: true, id: btn.dataset.commandId };
          }
          return { found: false };
        })()`
      });

      // 3. Mở hộp thoại (thử Enter trên ribbon trước, nếu không mở thì kích hoạt qua setTimeout execute)
      let openedViaRibbonEnter = false;
      if (focusBtnResult.found) {
        await api("press", { key: "Enter", settle: 350 });
        const checkOpen = await api("eval", {
          expr: `(() => !!document.querySelector('[role="dialog"],[role="alertdialog"],.vno-dialog-box,.vno-dialog-overlay,#vno-wordcount-overlay'))()`
        });
        openedViaRibbonEnter = checkOpen;
      }

      if (!openedViaRibbonEnter) {
        // Mở qua execute bất đồng bộ
        await api("eval", {
          expr: `(() => {
            setTimeout(() => {
              window.globalCommandBus.execute(${JSON.stringify(d.id)});
            }, 0);
          })()`
        });
        await api("wait", { ms: 400 });
      }

      // Xử lý phụ trợ nếu là hộp thoại đặc biệt
      if (appKey === "writer" && d.id === "writer.mailMerge.open") {
        await api("eval", {
          expr: `(() => [...document.querySelectorAll('[role="dialog"] button,.vno-dialog-box button')].find(b => (b.innerText||'').includes('Dán dữ liệu mẫu'))?.click())()`
        });
        await api("wait", { ms: 250 });
      }

      // Kiểm tra hộp thoại đã mở chưa
      const openState = await api("eval", {
        expr: `(() => {
          const visible = e => !!(e && e.getClientRects().length && getComputedStyle(e).display !== 'none');
          const d = [...document.querySelectorAll('[role="dialog"],[role="alertdialog"],.vno-dialog-box,.vno-dialog-overlay,#vno-wordcount-overlay')].filter(visible).at(-1);
          const root = d?.classList.contains('vno-dialog-box') ? d : (d?.querySelector('.vno-dialog-box') || d);
          if (!root) return { open: false };
          const focusables = [...root.querySelectorAll('button,input,select,textarea,[tabindex]:not([tabindex="-1"])')].filter(visible);
          const r = root.getBoundingClientRect();
          return {
            open: true,
            title: (root.querySelector('h1,h2,h3,[class*=title]')?.innerText || '').trim(),
            focusablesCount: focusables.length,
            rect: { left: r.left, top: r.top, right: r.right, bottom: r.bottom, width: r.width, height: r.height }
          };
        })()`
      });

      if (!openState.open) {
        console.log(`[FAIL] Không thể mở hộp thoại: ${d.label} (${d.id})`);
        result.dialogs.push({
          id: d.id,
          label: d.label,
          opened: false,
          openedViaRibbonEnter,
          pass: false,
          error: "Không mở được hộp thoại"
        });
        continue;
      }

      // Chụp ảnh 4 trạng thái: 1366x768 light, dark; 1024x600 light, dark
      const shot1366Light = `dialog-${appKey}-${d.id.split('.').pop()}-1366x768-light`;
      await saveShot(shot1366Light);

      await setTheme("dark");
      const shot1366Dark = `dialog-${appKey}-${d.id.split('.').pop()}-1366x768-dark`;
      await saveShot(shot1366Dark);

      await setSize(1024, 600);
      const shot1024Dark = `dialog-${appKey}-${d.id.split('.').pop()}-1024x600-dark`;
      await saveShot(shot1024Dark);

      await setTheme("light");
      const shot1024Light = `dialog-${appKey}-${d.id.split('.').pop()}-1024x600-light`;
      await saveShot(shot1024Light);

      await setSize(1366, 768);

      // Thử Tab
      const focusBeforeTab = await api("eval", {
        expr: `(() => ({ tag: document.activeElement?.tagName, id: document.activeElement?.id, cls: document.activeElement?.className, text: document.activeElement?.innerText?.slice(0, 30) }))()`
      });
      await api("press", { key: "Tab", times: 1, settle: 100 });
      const focusAfterTab = await api("eval", {
        expr: `(() => ({ tag: document.activeElement?.tagName, id: document.activeElement?.id, cls: document.activeElement?.className, text: document.activeElement?.innerText?.slice(0, 30) }))()`
      });
      const tabMoved = JSON.stringify(focusBeforeTab) !== JSON.stringify(focusAfterTab);

      // Thử Shift+Tab
      await api("press", { key: "Tab", mods: { shiftKey: true }, times: 1, settle: 100 });
      const focusAfterShiftTab = await api("eval", {
        expr: `(() => ({ tag: document.activeElement?.tagName, id: document.activeElement?.id, cls: document.activeElement?.className, text: document.activeElement?.innerText?.slice(0, 30) }))()`
      });
      const shiftTabMoved = JSON.stringify(focusAfterShiftTab) !== JSON.stringify(focusAfterTab);

      // Thử Esc để đóng
      await api("press", { key: "Escape", times: 1, settle: 200 });
      const closeState = await api("eval", {
        expr: `(() => {
          const visible = e => !!(e && e.getClientRects().length && getComputedStyle(e).display !== 'none');
          const dialogs = [...document.querySelectorAll('[role="dialog"],[role="alertdialog"],.vno-dialog-box,.vno-dialog-overlay,#vno-wordcount-overlay')].filter(visible);
          const active = document.activeElement;
          return {
            closed: dialogs.length === 0,
            activeTag: active?.tagName,
            activeId: active?.id,
            activeCommandId: active?.dataset?.commandId || null,
            activeClass: active?.className,
            isEditorOrBody: active === document.body || active?.classList.contains('vno-writer-body') || active?.classList.contains('vno-sheet-container') || active?.classList.contains('vno-slide-canvas')
          };
        })()`
      });

      // Nếu chưa đóng bằng Esc, đóng cưỡng bức để tiếp tục
      if (!closeState.closed) {
        await api("eval", {
          expr: `(() => {
            const btn = document.querySelector('.vno-dialog-close-btn, .vno-dialog-cancel-btn, #vno-diagram-cancel, #vno-setup-cancel');
            btn?.click();
            document.querySelectorAll('.vno-dialog-overlay, #vno-wordcount-overlay').forEach(e => e.remove());
          })()`
        });
      }

      const focusReturned = focusBtnResult.found ? (closeState.activeCommandId === d.id) : !closeState.isEditorOrBody;

      result.dialogs.push({
        id: d.id,
        label: d.label,
        opened: true,
        openedViaRibbonEnter,
        tabMoved,
        shiftTabMoved,
        escClosed: closeState.closed,
        focusReturned,
        afterEscFocus: {
          tag: closeState.activeTag,
          id: closeState.activeId,
          commandId: closeState.activeCommandId,
          isEditorOrBody: closeState.isEditorOrBody
        },
        shots: [shot1366Light, shot1366Dark, shot1024Light, shot1024Dark],
        pass: closeState.closed && tabMoved && focusReturned
      });
    }

    // -----------------------------------------------------------------
    // (4) NHẬP SAI CHO HỘP THOẠI CÓ Ô SỐ
    // -----------------------------------------------------------------
    console.log(`--- [4] RÀ SOÁT NHẬP SAI: ${appKey} ---`);
    for (const numD of config.numericDialogs) {
      console.log(`> Thử nhập sai: ${numD.label} (${numD.id})`);

      for (const tc of INVALID_CASES) {
        // Mở hộp thoại
        await api("eval", {
          expr: `(() => {
            setTimeout(() => {
              window.globalCommandBus.execute(${JSON.stringify(numD.id)});
            }, 0);
          })()`
        });
        await api("wait", { ms: 350 });

        // Nhập giá trị sai và kiểm tra phản hồi
        const checkResult = await api("eval", {
          expr: `(() => {
            const visible = e => !!(e && e.getClientRects().length && getComputedStyle(e).display !== 'none');
            const dialogs = [...document.querySelectorAll('[role="dialog"],[role="alertdialog"],.vno-dialog-box,.vno-dialog-overlay')].filter(visible);
            const root = dialogs.at(-1);
            if (!root) return { error: "Không tìm thấy hộp thoại" };
            
            const input = root.querySelector(${JSON.stringify(numD.inputSelector)});
            if (!input) return { error: "Không tìm thấy ô nhập liệu: " + ${JSON.stringify(numD.inputSelector)} };

            const set = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), "value")?.set;
            set?.call(input, ${JSON.stringify(tc.value)});
            input.dispatchEvent(new Event("input", { bubbles: true }));
            input.dispatchEvent(new Event("change", { bubbles: true }));

            const errorEl = root.querySelector(${JSON.stringify(numD.errorSelector)});
            const errorText = (errorEl?.innerText || errorEl?.textContent || "").trim();
            const badInput = input.validity?.badInput;
            const valid = input.checkValidity ? input.checkValidity() : true;
            
            const okBtn = root.querySelector(${JSON.stringify(numD.okSelector)});
            const isOkDisabled = okBtn ? (okBtn.disabled || okBtn.getAttribute("aria-disabled") === "true") : null;
            const okText = okBtn?.innerText?.trim() || "";

            return {
              inputValue: input.value,
              badInput,
              valid,
              errorText,
              hasErrorMessage: errorText.length > 0,
              isOkDisabled,
              okText
            };
          })()`
        });

        // Chụp ảnh với trường hợp âm và ký tự đặc biệt
        let shotName = null;
        if (tc.name.includes("âm") || tc.name.includes("đặc biệt")) {
          const safeTc = tc.name.replace(/[^a-z0-9]/gi, "-");
          shotName = `invalid-${appKey}-${numD.id.split('.').pop()}-${safeTc}-1366x768-light`;
          await saveShot(shotName);
        }

        // Thử nhấn Enter khi đang invalid xem có chặn không
        await api("press", { key: "Enter", times: 1, settle: 150 });
        const staysOpenOnEnter = await api("eval", {
          expr: `(() => {
            const visible = e => !!(e && e.getClientRects().length && getComputedStyle(e).display !== 'none');
            return [...document.querySelectorAll('[role="dialog"],[role="alertdialog"],.vno-dialog-box,.vno-dialog-overlay')].some(visible);
          })()`
        });

        // Đóng hộp thoại
        await api("press", { key: "Escape", times: 1, settle: 100 });
        await api("eval", {
          expr: `(() => {
            document.querySelectorAll('.vno-dialog-overlay').forEach(e => e.remove());
          })()`
        });

        const isProtected = (checkResult.isOkDisabled === true || checkResult.hasErrorMessage || checkResult.valid === false || checkResult.badInput === true) && staysOpenOnEnter;
        result.invalidInputs.push({
          dialogId: numD.id,
          dialogLabel: numD.label,
          testCase: tc.name,
          inputValue: tc.value,
          checkResult,
          staysOpenOnEnter,
          isProtected,
          shot: shotName,
          pass: isProtected
        });
      }
    }

  } finally {
    console.log(`[CLOSING] Đóng phiên kiểm tra ${appKey}...`);
    try {
      await api("close", {});
    } catch {}
  }

  const resultPath = path.resolve(`scripts/audit-ui5/audit_result_${appKey}.json`);
  writeFileSync(resultPath, JSON.stringify(result, null, 2), "utf8");
  console.log(`[HOÀN TẤT] Đã lưu kết quả ${appKey} vào ${resultPath}`);
  return result;
}

const appsToRun = targetApp === "all" ? ["writer", "sheet", "slides"] : [targetApp];
for (const a of appsToRun) {
  await runAuditForApp(a);
}
console.log("\n>>> TOÀN BỘ QUÁ TRÌNH KIỂM KÊ HOÀN TẤT <<<");
