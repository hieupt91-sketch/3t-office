/** 3T Sheet — dependency-free SVG charts for spreadsheet ranges. */
import { extractSheetChartData, numberValue, SHEET_CHART_TYPES } from "./sheet-chart-data.js";
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
    const result = extractSheetChartData(cellsData, range, columns);
    return { ...result, data: result.series[0]?.values || [] };
  }

  static generateSvg({ type = "bar", title = t("sheetDialogs.chartDefaultTitle"), xAxisTitle = "", yAxisTitle = "", labels = [], data = [], series = [], dataLabels = false, trendline = false }) {
    if (!SHEET_CHART_TYPES.includes(type)) throw new Error(t("sheetDialogs.chartUnsupported", { type }));
    const normalizedSeries = (series?.length ? series : [{ name: title, values: data }]).map((item, seriesIndex) => ({
      name: esc(item?.name || t("sheetDialogs.chartSeries", { number: seriesIndex + 1 })),
      values: (item?.values || []).map(numberValue).map(value => value ?? 0)
    })).filter(item => item.values.length);
    const values = normalizedSeries[0]?.values || [];
    const pointCount = Math.max(labels.length, ...normalizedSeries.map(item => item.values.length), 0);
    const names = Array.from({ length: pointCount }, (_, index) => esc(labels[index] || t("sheetDialogs.chartItem", { number: index + 1 })));
    const width = 680, height = 360;
    const p = { top: 50, right: 35, bottom: xAxisTitle ? 82 : 65, left: yAxisTitle ? 88 : 70 };
    const chartW = width - p.left - p.right, chartH = height - p.top - p.bottom;
    const heading = `<text data-chart-title x="340" y="28" text-anchor="middle" font-size="16" font-weight="bold" fill="#0f172a">${esc(title)}</text>`;
    const axisTitles = type === "pie" ? "" : `${xAxisTitle ? `<text data-axis-title="x" x="340" y="354" text-anchor="middle" font-size="12" font-weight="600" fill="#334155">${esc(xAxisTitle)}</text>` : ""}${yAxisTitle ? `<text data-axis-title="y" x="15" y="180" text-anchor="middle" font-size="12" font-weight="600" fill="#334155" transform="rotate(-90 15 180)">${esc(yAxisTitle)}</text>` : ""}`;
    const wrap = body => `<svg data-chart-type="${type}" viewBox="0 0 ${width} ${height}" width="100%" height="100%" style="background:#fff">${heading}${axisTitles}${body}</svg>`;
    if (!normalizedSeries.length || !pointCount) return wrap(`<text x="340" y="190" text-anchor="middle" fill="#64748b">${esc(t("sheetDialogs.chartNoNumericData"))}</text>`);

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

    const allValues = normalizedSeries.flatMap(item => item.values);
    const stacked = type === "column-stacked" || type === "column-stacked-100";
    const stackTotals = Array.from({ length: pointCount }, (_, point) => normalizedSeries.reduce((sum, item) => sum + Math.max(0, item.values[point] || 0), 0));
    const plottedValues = type === "column-stacked-100" ? [0, 100] : (stacked ? stackTotals : allValues);
    const min = Math.min(0, ...plottedValues), max = Math.max(0, ...plottedValues), span = max - min || 1;
    const x = index => p.left + (values.length === 1 ? chartW / 2 : index * chartW / (values.length - 1));
    const y = value => p.top + (max - value) / span * chartH;
    const baseline = y(0);
    let body = "";
    for (let step = 0; step <= 4; step++) {
      const value = min + span * step / 4, gridY = y(value);
      body += `<line x1="${p.left}" y1="${gridY}" x2="${width - p.right}" y2="${gridY}" stroke="#e2e8f0"/><text x="${p.left - 8}" y="${gridY + 4}" text-anchor="end" font-size="10" fill="#64748b">${new Intl.NumberFormat("vi-VN", { notation: "compact" }).format(value)}</text>`;
    }
    const valueLabel = (value, px, py, suffix = "") => dataLabels ? `<text data-chart-label x="${px}" y="${py}" text-anchor="middle" font-size="10" fill="#334155">${Math.round(value * 100) / 100}${suffix}</text>` : "";
    if (type === "bar-horizontal") {
      const slot = chartH / pointCount, barH = Math.min(38, slot * .58);
      const maxValue = Math.max(1, ...allValues.map(Math.abs));
      values.forEach((value, index) => {
        const barW = Math.max(1, Math.abs(value) / maxValue * chartW);
        const top = p.top + index * slot + (slot - barH) / 2;
        body += `<rect data-point-index="${index}" data-value="${value}" x="${p.left}" y="${top}" width="${barW}" height="${barH}" rx="3" fill="${COLORS[index % COLORS.length]}"><title>${names[index]}: ${value}</title></rect>${valueLabel(value, p.left + barW - 12, top + barH / 2 + 4)}`;
      });
    } else if (["bar", "column-stacked", "column-stacked-100"].includes(type)) {
      const slot = chartW / pointCount;
      const groupedW = Math.min(64, slot * .72);
      if (stacked) {
        Array.from({ length: pointCount }, (_, point) => {
          let cumulative = 0;
          normalizedSeries.forEach((item, seriesIndex) => {
            const raw = Math.max(0, item.values[point] || 0);
            const value = type === "column-stacked-100" ? (stackTotals[point] ? raw / stackTotals[point] * 100 : 0) : raw;
            const top = y(cumulative + value), bottom = y(cumulative);
            body += `<rect data-series-index="${seriesIndex}" data-point-index="${point}" data-value="${raw}" x="${p.left + point * slot + (slot - groupedW) / 2}" y="${top}" width="${groupedW}" height="${Math.max(1, bottom - top)}" fill="${COLORS[seriesIndex % COLORS.length]}"><title>${item.name} — ${names[point]}: ${raw}</title></rect>${valueLabel(raw, p.left + point * slot + slot / 2, top + 13, type === "column-stacked-100" ? "%" : "")}`;
            cumulative += value;
          });
        });
      } else {
        const barW = Math.max(4, groupedW / normalizedSeries.length);
        normalizedSeries.forEach((item, seriesIndex) => item.values.forEach((value, point) => {
          const top = Math.min(y(value), baseline), barH = Math.max(1, Math.abs(y(value) - baseline));
          const px = p.left + point * slot + (slot - groupedW) / 2 + seriesIndex * barW;
          body += `<rect data-series-index="${seriesIndex}" data-point-index="${point}" data-value="${value}" x="${px}" y="${top}" width="${barW - 1}" height="${barH}" rx="2" fill="${COLORS[seriesIndex % COLORS.length]}"><title>${item.name} — ${names[point]}: ${value}</title></rect>${valueLabel(value, px + barW / 2, top - 4)}`;
        }));
      }
    } else if (type === "scatter" || type === "bubble") {
      const xs = normalizedSeries[0]?.values || [];
      const ys = normalizedSeries[1]?.values || values;
      const sizes = normalizedSeries[2]?.values || ys.map(() => 10);
      const xMin = Math.min(0, ...xs), xMax = Math.max(1, ...xs), xSpan = xMax - xMin || 1;
      const yMin = Math.min(0, ...ys), yMax = Math.max(1, ...ys), ySpan = yMax - yMin || 1;
      ys.forEach((value, index) => {
        const px = p.left + ((xs[index] ?? index) - xMin) / xSpan * chartW;
        const py = p.top + (yMax - value) / ySpan * chartH;
        const radius = type === "bubble" ? Math.max(5, Math.min(24, Math.sqrt(Math.abs(sizes[index] || 1)) * 2)) : 5;
        body += `<circle data-point-index="${index}" data-value="${value}" cx="${px}" cy="${py}" r="${radius}" fill="${COLORS[index % COLORS.length]}" fill-opacity=".72"><title>${names[index]}: ${xs[index] ?? index}, ${value}</title></circle>${valueLabel(value, px, py - radius - 3)}`;
      });
    } else if (type === "radar") {
      const cx = p.left + chartW / 2, cy = p.top + chartH / 2, radius = Math.min(chartW, chartH) * .42;
      const radarMax = Math.max(1, ...allValues.map(Math.abs));
      const polar = (point, value) => { const angle = -Math.PI / 2 + point * Math.PI * 2 / pointCount; const r = radius * value / radarMax; return [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r]; };
      normalizedSeries.forEach((item, seriesIndex) => {
        const points = Array.from({ length: pointCount }, (_, point) => polar(point, item.values[point] || 0).join(",")).join(" ");
        body += `<polygon data-series-index="${seriesIndex}" points="${points}" fill="${COLORS[seriesIndex % COLORS.length]}" fill-opacity=".14" stroke="${COLORS[seriesIndex % COLORS.length]}" stroke-width="2"/>`;
      });
    } else {
      normalizedSeries.forEach((item, seriesIndex) => {
        const points = item.values.map((value, index) => `${x(index)},${y(value)}`).join(" ");
        if (type === "area") body += `<polygon data-series="area" points="${p.left},${baseline} ${points} ${x(item.values.length - 1)},${baseline}" fill="${COLORS[seriesIndex % COLORS.length]}" fill-opacity=".18"/>`;
        if (type === "combo" && seriesIndex === 0) {
          const slot = chartW / pointCount, barW = Math.min(52, slot * .55);
          item.values.forEach((value, point) => { const top = Math.min(y(value), baseline); body += `<rect data-series-index="0" data-point-index="${point}" data-value="${value}" x="${p.left + point * slot + (slot - barW) / 2}" y="${top}" width="${barW}" height="${Math.max(1, Math.abs(y(value) - baseline))}" fill="${COLORS[0]}"/>${valueLabel(value, p.left + point * slot + slot / 2, top - 4)}`; });
        } else {
          body += `<polyline data-series="${type}" data-series-index="${seriesIndex}" points="${points}" fill="none" stroke="${COLORS[seriesIndex % COLORS.length]}" stroke-width="3" stroke-linejoin="round"/>`;
          item.values.forEach((value, index) => { body += `<circle data-point-index="${index}" data-value="${value}" cx="${x(index)}" cy="${y(value)}" r="4" fill="#fff" stroke="${COLORS[seriesIndex % COLORS.length]}" stroke-width="2"><title>${item.name} — ${names[index]}: ${value}</title></circle>${valueLabel(value, x(index), y(value) - 8)}`; });
        }
      });
    }
    if (trendline && values.length > 1 && !["pie", "radar", "bubble"].includes(type)) {
      const n = values.length, sx = n * (n - 1) / 2, sy = values.reduce((a, b) => a + b, 0);
      const sxx = values.reduce((sum, _v, index) => sum + index * index, 0), sxy = values.reduce((sum, value, index) => sum + index * value, 0);
      const slope = (n * sxy - sx * sy) / (n * sxx - sx * sx || 1), intercept = (sy - slope * sx) / n;
      body += `<line data-chart-trendline x1="${x(0)}" y1="${y(intercept)}" x2="${x(n - 1)}" y2="${y(intercept + slope * (n - 1))}" stroke="#dc2626" stroke-width="2" stroke-dasharray="6 4"/>`;
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
    const allChartTypes = [["bar", "chartColumn"], ["bar-horizontal", "chartBarHorizontal"], ["column-stacked", "chartColumnStacked"], ["column-stacked-100", "chartColumnStacked100"], ["line", "chartLine"], ["pie", "chartPie"], ["area", "chartArea"], ["scatter", "chartScatter"], ["combo", "chartCombo"], ["radar", "chartRadar"], ["bubble", "chartBubble"]];
    const chartTypes = allChartTypes.filter(([kind]) => !options.types || options.types.includes(kind));
    currentType = chartTypes.some(([kind]) => kind === options.initialType) ? options.initialType : (chartTypes[0]?.[0] || "bar");
    const dialogTitle = options.dialogTitle || t("sheetDialogs.chartInsertFrom", { range });
    const applyLabel = options.applyLabel || t("sheetDialogs.insertIntoSheet", "Chèn vào trang tính");
    modal.innerHTML = `<div class="vno-dialog-box" role="dialog" aria-modal="true" aria-labelledby="vno-chart-title" style="width:760px;max-width:calc(100vw - 32px)"><div class="vno-dialog-header"><span id="vno-chart-title" class="vno-dialog-title" style="font-weight:700;">${esc(dialogTitle)}</span><button type="button" class="vno-btn vno-btn-icon-only vno-dialog-close-btn" data-chart-close title="${esc(t("sheetDialogs.close", "Đóng"))}" aria-label="${esc(t("sheetDialogs.close", "Đóng"))}">&times;</button></div><div class="vno-dialog-body" style="display:flex;flex-direction:column;gap:14px"><div role="group" aria-label="${esc(t("sheetDialogs.chartType", "Kiểu biểu đồ"))}" style="display:flex;gap:8px;flex-wrap:wrap">${chartTypes.map(([kind, key]) => `<button type="button" class="vno-btn${kind === currentType ? " is-checked" : ""}" data-chart-type="${kind}" aria-pressed="${kind === currentType}">${esc(t(`sheetDialogs.${key}`))}</button>`).join("")}</div><div data-chart-preview aria-hidden="true" style="height:340px;border:1px solid var(--vno-border-default);background:var(--vno-bg-surface);border-radius:6px;overflow:hidden"></div></div><div class="vno-dialog-footer"><button type="button" class="vno-btn" data-chart-cancel>${esc(t("sheetDialogs.cancel", "Hủy bỏ"))}</button><button type="button" class="vno-btn vno-btn-primary" data-chart-apply>${esc(applyLabel)}</button></div></div>`;
    const render = () => { modal.querySelector("[data-chart-preview]").innerHTML = this.generateSvg({ type: currentType, title: options.title || t("sheetDialogs.chartDefaultTitle"), labels, data, series: options.series || [] }); };
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
