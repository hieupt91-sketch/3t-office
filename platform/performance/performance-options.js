import { globalUnoBridge } from "../../adapters/libreoffice/common/uno-bridge.js";
import { t } from "../i18n/i18n.js";

const mountedRoots = new WeakSet();

export async function mountPerformanceOptions(helpPanel, { bridge = globalUnoBridge, documentRef = globalThis.document } = {}) {
  const root = helpPanel?.root;
  if (!root || mountedRoots.has(root) || !documentRef?.createElement) return false;
  const section = documentRef.createElement("section");
  section.className = "vno-performance-settings";
  section.setAttribute("aria-labelledby", "vno-performance-settings-title");
  section.innerHTML = `
    <h3 id="vno-performance-settings-title">${t("performance.optionsTitle")}</h3>
    <label class="vno-performance-toggle"><input type="checkbox" class="vno-performance-enabled"><span>${t("performance.logToggle")}</span></label>
    <p class="vno-performance-local-only">${t("performance.localOnly")}</p>
    <div class="vno-performance-actions"><button type="button" class="vno-btn vno-performance-open-folder">${t("performance.openFolder")}</button></div>
    <p class="vno-performance-status" role="status" aria-live="polite"></p>`;
  (root.querySelector(".vno-help-article") || root).appendChild(section);
  mountedRoots.add(root);

  const checkbox = section.querySelector(".vno-performance-enabled");
  const status = section.querySelector(".vno-performance-status");
  const desktopAvailable = Boolean(bridge?.desktopApi?.get_performance_log_settings);
  if (!desktopAvailable) {
    checkbox.disabled = true;
    section.querySelector(".vno-performance-open-folder").disabled = true;
    status.textContent = t("performance.desktopOnly");
    return true;
  }

  try {
    const settings = await bridge.getPerformanceLogSettings();
    checkbox.checked = settings?.enabled === true;
    status.textContent = checkbox.checked ? t("performance.enabledStatus") : t("performance.disabledStatus");
  } catch (error) {
    checkbox.disabled = true;
    status.textContent = `Không đọc được tùy chọn nhật ký: ${error?.message || error}`;
  }

  checkbox.addEventListener("change", async () => {
    checkbox.disabled = true;
    try {
      const saved = await bridge.setPerformanceLogSettings({ enabled: checkbox.checked });
      if (saved?.status === "error") throw new Error(saved.message || "Không thể lưu tùy chọn.");
      checkbox.checked = saved?.enabled === true;
      status.textContent = checkbox.checked ? t("performance.enabledStatus") : t("performance.disabledStatus");
    } catch (error) {
      checkbox.checked = !checkbox.checked;
      status.textContent = `Không lưu được tùy chọn: ${error?.message || error}`;
    } finally {
      checkbox.disabled = false;
    }
  });
  section.querySelector(".vno-performance-open-folder").addEventListener("click", async (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    try {
      const result = await bridge.openPerformanceLogFolder();
      if (result?.status !== "ok") throw new Error(result?.message || "Không mở được thư mục nhật ký.");
      status.textContent = t("performance.folderOpened");
    } catch (error) {
      status.textContent = `Không mở được thư mục nhật ký: ${error?.message || error}`;
    } finally {
      button.disabled = false;
    }
  });
  return true;
}
