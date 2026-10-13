/** 3T Sheet — dependency-free SVG charts for spreadsheet ranges. */
import { extractSheetRangeData, numberValue, SHEET_CHART_TYPES } from "./sheet-chart-data.js";
const COLORS = ["#0f6d38", "#2563eb", "#d97706", "#dc2626", "#7c3aed", "#0891b2"];
const esc = value => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&apos;");

function trapFocus(element, event) {
  if (event.key !== "Tab" || !element) return;
  const focusables = Array.from(element.querySelectorAll(
    'button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
  )).filter(el => el.offsetParent !== null || el.offsetWidth > 0 || el.offsetHeight > 0);
  if (!focusables || focusables.length === 0) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (event.shiftKey) {
    if (document.activeElement === first || !element.contains(document.activeElement)) {
      event.preventDefault();
      last.focus();
    }
  } else {
    if (document.activeElement === last || !element.contains(document.activeElement)) {
      event.preventDefault();
      first.focus();
    }
  }
}

export class SheetChartBuilder {
  static supportedTypes = [...SHEET_CHART_TYPES];

  static extractRangeData(cellsData, range, columns) {
    return extractSheetRangeData(cellsData, range, columns);
  }

  static generateSvg({ type = "bar", title = t("sheetDialogs.chartDefaultTitle"), xAxisTitle = "", yAxisTitle = "", labels = [], data = [] }) {
    if (!SHEET_CHART_TYPES.includes(type)) throw new Error(t("sheetDialogs.chartUnsupported", { type }));
    const values = data.map(numberValue).map(value => value ?? 0);
    const names = values.map((_, index) => esc(labels[index] || t("sheetDialogs.chartItem", { number: index + 1 })));
    const width = 680, height = 360;
    const p = { top: 50, right: 35, bottom: xAxisTitle ? 82 : 65, left: yAxisTitle ? 88 : 70 };
    const chartW = width - p.left - p.right, chartH = height - p.top - p.bottom;
    const heading = `<text data-chart-title x="340" y="28" text-anchor="middle" font-size="16" font-weight="bold" fill="#0f172a">${esc(title)}</text>`;
    const axisTitles = type === "pie" ? "" : `${xAxisTitle ? `<text data-axis-title="x" x="340" y="354" text-anchor="middle" font-size="12" font-weight="600" fill="#334155">${esc(xAxisTitle)}</text>` : ""}${yAxisTitle ? `<text data-axis-title="y" x="15" y="180" text-anchor="middle" font-size="12" font-weight="600" fill="#334155" transform="rotate(-90 15 180)">${esc(yAxisTitle)}</text>` : ""}`;
    const wrap = body => `<svg data-chart-type="${type}" viewBox="0 0 ${width} ${height}" width="100%" height="100%" style="background:#fff">${heading}${axisTitles}${body}</svg>`;
    if (!values.length) return wrap(`<text x="340" y="190" text-anchor="middle" fill="#64748b">${esc(t("sheetDialogs.chartNoNumericData"))}</text>`);

    if (type === "pie") {
      const positive = values.map(value => Math.max(0, value));
      const total = positive.reduce((sum, value) => sum + value, 0);
      if (!total) return wrap(`<text x="340" y="190" text-anchor="middle" fill="#64748b">${esc(t("sheetDialogs.chartPiePositive"))}</text>`);
      let angle = -Math.PI / 2, body = "";
      positive.forEach((value, index) => {
        const next = angle + value / total * Math.PI * 2, cx = 245, cy = 190, radius = 105;
        const x1 = cx + radius * Math.cos(angle), y1 = cy + radius * Math.sin(angle);
        const x2 = cx + radius * Math.cos(next), y2 = cy + radius * Math.sin(next);
        const shape = value === total
          ? `<circle cx="${cx}" cy="${cy}" r="${radius}"`
          : `<path d="M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${next - angle > Math.PI ? 1 : 0} 1 ${x2} ${y2} Z"`;
        body += `${shape} data-value="${value}" fill="${COLORS[index % COLORS.length]}" stroke="#fff" stroke-width="2"><title>${names[index]}: ${value}</title>${value === total ? "</circle>" : "</path>"}`;
        body += `<g transform="translate(430, ${70 + index * 28})"><rect width="14" height="14" rx="3" fill="${COLORS[index % COLORS.length]}"/><text x="22" y="12" font-size="12" fill="#334155">${names[index]} (${Math.round(value / total * 100)}%)</text></g>`;
        angle = next;
      });
      return wrap(body);
    }

    const min = Math.min(0, ...values), max = Math.max(0, ...values), span = max - min || 1;
    const x = index => p.left + (values.length === 1 ? chartW / 2 : index * chartW / (values.length - 1));
    const y = value => p.top + (max - value) / span * chartH;
    const baseline = y(0);
    let body = "";
    for (let step = 0; step <= 4; step++) {
      const value = min + span * step / 4, gridY = y(value);
      body += `<line x1="${p.left}" y1="${gridY}" x2="${width - p.right}" y2="${gridY}" stroke="#e2e8f0"/><text x="${p.left - 8}" y="${gridY + 4}" text-anchor="end" font-size="10" fill="#64748b">${new Intl.NumberFormat("vi-VN", { notation: "compact" }).format(value)}</text>`;
    }
    if (type === "bar") {
      const slot = chartW / values.length, barW = Math.min(56, slot * .62);
      values.forEach((value, index) => {
        const top = Math.min(y(value), baseline), barH = Math.max(1, Math.abs(y(value) - baseline));
        body += `<rect data-point-index="${index}" data-value="${value}" x="${p.left + index * slot + (slot - barW) / 2}" y="${top}" width="${barW}" height="${barH}" rx="3" fill="${COLORS[index % COLORS.length]}"><title>${names[index]}: ${value}</title></rect>`;
      });
    } else {
      const points = values.map((value, index) => `${x(index)},${y(value)}`).join(" ");
      if (type === "area") body += `<polygon data-series="area" points="${p.left},${baseline} ${points} ${x(values.length - 1)},${baseline}" fill="#0f6d38" fill-opacity=".22"/>`;
      body += `<polyline data-series="${type}" points="${points}" fill="none" stroke="#0f6d38" stroke-width="3" stroke-linejoin="round"/>`;
      values.forEach((value, index) => { body += `<circle data-point-index="${index}" data-value="${value}" cx="${x(index)}" cy="${y(value)}" r="4" fill="#fff" stroke="#0f6d38" stroke-width="2"><title>${names[index]}: ${value}</title></circle>`; });
    }
    body += `<line x1="${p.left}" y1="${baseline}" x2="${width - p.right}" y2="${baseline}" stroke="#94a3b8"/>`;
    names.forEach((name, index) => { body += `<text x="${x(index)}" y="332" text-anchor="middle" font-size="11" fill="#475569">${name.slice(0, 14)}</text>`; });
    return wrap(body);
  }

  static showChartModal(dataItems, onInsert, options = {}) {
    if (typeof document === "undefined") return null;
    const previousFocused = document.activeElement;
    const modal = document.createElement("div");
    modal.className = "vno-dialog-overlay";
    const labels = dataItems.map(item => item.label), data = dataItems.map(item => item.value);
    let currentType = "bar";
    const range = options.rangeLabel || t("sheetDialogs.selectedRange");
    const allChartTypes = [["bar", "chartColumn"], ["line", "chartLine"], ["pie", "chartPie"], ["area", "chartArea"]];
    const chartTypes = allChartTypes.filter(([kind]) => !options.types || options.types.includes(kind));
    currentType = chartTypes.some(([kind]) => kind === options.initialType) ? options.initialType : (chartTypes[0]?.[0] || "bar");
    const dialogTitle = options.dialogTitle || t("sheetDialogs.chartInsertFrom", { range });
    const applyLabel = options.applyLabel || t("sheetDialogs.insertIntoSheet", "Chèn vào trang tính");
    modal.innerHTML = `<div class="vno-dialog-box" role="dialog" aria-modal="true" aria-labelledby="vno-chart-title" style="width:760px;max-width:calc(100vw - 32px)"><div class="vno-dialog-header"><span id="vno-chart-title" class="vno-dialog-title" style="font-weight:700;">${esc(dialogTitle)}</span><button type="button" class="vno-btn vno-btn-icon-only vno-dialog-close-btn" data-chart-close title="${esc(t("sheetDialogs.close", "Đóng"))}" aria-label="${esc(t("sheetDialogs.close", "Đóng"))}">&times;</button></div><div class="vno-dialog-body" style="display:flex;flex-direction:column;gap:14px"><div role="group" aria-label="${esc(t("sheetDialogs.chartType", "Kiểu biểu đồ"))}" style="display:flex;gap:8px;flex-wrap:wrap">${chartTypes.map(([kind, key]) => `<button type="button" class="vno-btn${kind === currentType ? " is-checked" : ""}" data-chart-type="${kind}" aria-pressed="${kind === currentType}">${esc(t(`sheetDialogs.${key}`))}</button>`).join("")}</div><div data-chart-preview aria-hidden="true" style="height:340px;border:1px solid var(--vno-border-default);background:var(--vno-bg-surface);border-radius:6px;overflow:hidden"></div></div><div class="vno-dialog-footer"><button type="button" class="vno-btn" data-chart-cancel>${esc(t("sheetDialogs.cancel", "Hủy bỏ"))}</button><button type="button" class="vno-btn vno-btn-primary" data-chart-apply>${esc(applyLabel)}</button></div></div>`;
    const render = () => { modal.querySelector("[data-chart-preview]").innerHTML = this.generateSvg({ type: currentType, title: options.title || t("sheetDialogs.chartDefaultTitle"), labels, data }); };
    const onKeyDown = event => {
      if (event.key === "Escape") close();
      else if (event.key === "Enter") {
        if (event.target && !event.target.matches("[data-chart-cancel], [data-chart-close]")) {
          event.preventDefault();
          onInsert?.(currentType);
          close();
        }
      } else if (event.key === "Tab") trapFocus(modal.querySelector(".vno-dialog-box"), event);
    };
    const close = () => {
      document.removeEventListener("keydown", onKeyDown);
      modal.remove();
      if (previousFocused && typeof previousFocused.focus === "function") {
        try { previousFocused.focus(); } catch (_) {}
      }
    };
    modal.querySelectorAll("[data-chart-type]").forEach(button => button.addEventListener("click", () => {
      currentType = button.dataset.chartType;
      modal.querySelectorAll("[data-chart-type]").forEach(item => { item.classList.toggle("is-checked", item === button); item.setAttribute("aria-pressed", String(item === button)); });
      render();
    }));
    modal.querySelector("[data-chart-close]").addEventListener("click", close);
    modal.querySelector("[data-chart-cancel]").addEventListener("click", close);
    modal.querySelector("[data-chart-apply]").addEventListener("click", () => { onInsert?.(currentType); close(); });
    document.addEventListener("keydown", onKeyDown);
    document.body.appendChild(modal); render(); modal.querySelector("[data-chart-type]")?.focus();
    return modal;
  }

  static showAxisTitlesModal(chart, onApply) {
    if (typeof document === "undefined" || !chart || chart.type === "pie") return null;
    const previousFocused = document.activeElement;
    const modal = document.createElement("div");
    modal.className = "vno-dialog-overlay vno-chart-axis-dialog";
    modal.innerHTML = `<div class="vno-dialog-box" role="dialog" aria-modal="true" aria-labelledby="vno-chart-axis-title" style="width:460px;max-width:calc(100vw - 32px)"><div class="vno-dialog-header"><span id="vno-chart-axis-title" class="vno-dialog-title">${esc(t("sheetDialogs.chartAxisTitlesEdit"))}</span><button type="button" class="vno-btn vno-btn-icon-only vno-dialog-close-btn" data-axis-close title="${esc(t("sheetDialogs.close"))}" aria-label="${esc(t("sheetDialogs.close"))}">&times;</button></div><div class="vno-dialog-body" style="display:grid;gap:12px"><label for="vno-chart-axis-x">${esc(t("sheetDialogs.chartHorizontalAxis"))}</label><input id="vno-chart-axis-x" class="vno-input" type="text" maxlength="255" value="${esc(chart.xAxisTitle || "")}" placeholder="${esc(t("sheetDialogs.chartAxisHorizontalPlaceholder"))}"><label for="vno-chart-axis-y">${esc(t("sheetDialogs.chartVerticalAxis"))}</label><input id="vno-chart-axis-y" class="vno-input" type="text" maxlength="255" value="${esc(chart.yAxisTitle || "")}" placeholder="${esc(t("sheetDialogs.chartAxisVerticalPlaceholder"))}"></div><div class="vno-dialog-footer"><button type="button" class="vno-btn" data-axis-cancel>${esc(t("sheetDialogs.cancel"))}</button><button type="button" class="vno-btn vno-btn-primary" data-axis-apply>${esc(t("sheetDialogs.chartAxisApply"))}</button></div></div>`;
    const close = () => {
      document.removeEventListener("keydown", onKeyDown);
      modal.remove();
      previousFocused?.focus?.();
    };
    const apply = () => {
      onApply?.({
        xAxisTitle: modal.querySelector("#vno-chart-axis-x")?.value?.trim() || "",
        yAxisTitle: modal.querySelector("#vno-chart-axis-y")?.value?.trim() || ""
      });
      close();
    };
    const onKeyDown = event => {
      if (event.key === "Escape") close();
      else if (event.key === "Enter") { event.preventDefault(); apply(); }
      else if (event.key === "Tab") trapFocus(modal.querySelector(".vno-dialog-box"), event);
    };
    modal.querySelector("[data-axis-close]")?.addEventListener("click", close);
    modal.querySelector("[data-axis-cancel]")?.addEventListener("click", close);
    modal.querySelector("[data-axis-apply]")?.addEventListener("click", apply);
    document.addEventListener("keydown", onKeyDown);
    document.body.appendChild(modal);
    modal.querySelector("#vno-chart-axis-x")?.focus();
    return modal;
  }
}
import { t } from "../../platform/i18n/i18n.js";
