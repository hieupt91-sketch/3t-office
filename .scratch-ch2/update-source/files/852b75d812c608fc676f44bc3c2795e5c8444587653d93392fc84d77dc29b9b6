/** Dependency-free chart renderer/dialog for 3T Slide. Sheet source is intentionally not imported. */
export const SLIDES_CHART_TYPES = ["bar", "line", "pie", "area"];

const COLORS = ["#0f6d38", "#2563eb", "#d97706", "#dc2626", "#7c3aed", "#0891b2"];
const esc = (value) => String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");

function numeric(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const parsed = Number(String(value ?? "").trim().replace(/\s/g, "").replace(/[₫%]/g, "").replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", ".").replace(/[^\d.+-]/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

export function normalizeSlidesChart(chart = {}) {
  const type = SLIDES_CHART_TYPES.includes(chart.chartType || chart.type) ? (chart.chartType || chart.type) : "bar";
  const labels = Array.isArray(chart.labels) ? chart.labels.map((item, index) => String(item || `Mục ${index + 1}`)) : [];
  const data = Array.isArray(chart.data) ? chart.data.map(numeric) : [];
  const length = Math.max(labels.length, data.length);
  return {
    chartType: type,
    title: String(chart.title || "Biểu đồ dữ liệu"),
    labels: Array.from({ length }, (_, index) => labels[index] || `Mục ${index + 1}`),
    data: Array.from({ length }, (_, index) => data[index] ?? 0)
  };
}

export function generateSlidesChartSvg(input = {}) {
  const { chartType, title, labels, data } = normalizeSlidesChart(input);
  const names = labels.map(esc);
  const width = 680, height = 360;
  const p = { top: 50, right: 35, bottom: 65, left: 70 };
  const chartW = width - p.left - p.right, chartH = height - p.top - p.bottom;
  const heading = `<text data-chart-title x="340" y="28" text-anchor="middle" font-size="16" font-weight="bold" fill="#0f172a">${esc(title)}</text>`;
  const wrap = (body) => `<svg class="vno-slides-chart-svg" data-chart-type="${chartType}" viewBox="0 0 ${width} ${height}" width="100%" height="100%" role="img" aria-label="${esc(title)}" style="background:#fff">${heading}${body}</svg>`;
  if (!data.length) return wrap(`<text x="340" y="190" text-anchor="middle" fill="#64748b">Không có dữ liệu</text>`);

  if (chartType === "pie") {
    const positive = data.map((value) => Math.max(0, value));
    const total = positive.reduce((sum, value) => sum + value, 0);
    if (!total) return wrap(`<text x="340" y="190" text-anchor="middle" fill="#64748b">Biểu đồ tròn cần giá trị dương</text>`);
    let angle = -Math.PI / 2, body = "";
    positive.forEach((value, index) => {
      const next = angle + value / total * Math.PI * 2, cx = 245, cy = 190, radius = 105;
      const x1 = cx + radius * Math.cos(angle), y1 = cy + radius * Math.sin(angle);
      const x2 = cx + radius * Math.cos(next), y2 = cy + radius * Math.sin(next);
      const shape = value === total ? `<circle cx="${cx}" cy="${cy}" r="${radius}"` : `<path d="M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${next - angle > Math.PI ? 1 : 0} 1 ${x2} ${y2} Z"`;
      body += `${shape} data-point-index="${index}" data-value="${value}" fill="${COLORS[index % COLORS.length]}" stroke="#fff" stroke-width="2"><title>${names[index]}: ${value}</title>${value === total ? "</circle>" : "</path>"}`;
      body += `<g transform="translate(430, ${70 + index * 28})"><rect width="14" height="14" rx="3" fill="${COLORS[index % COLORS.length]}"/><text x="22" y="12" font-size="12" fill="#334155">${names[index]} (${Math.round(value / total * 100)}%)</text></g>`;
      angle = next;
    });
    return wrap(body);
  }

  const min = Math.min(0, ...data), max = Math.max(0, ...data), span = max - min || 1;
  const x = (index) => p.left + (data.length === 1 ? chartW / 2 : index * chartW / (data.length - 1));
  const y = (value) => p.top + (max - value) / span * chartH;
  const baseline = y(0);
  let body = "";
  for (let step = 0; step <= 4; step++) {
    const value = min + span * step / 4, gridY = y(value);
    body += `<line x1="${p.left}" y1="${gridY}" x2="${width - p.right}" y2="${gridY}" stroke="#e2e8f0"/><text x="${p.left - 8}" y="${gridY + 4}" text-anchor="end" font-size="10" fill="#64748b">${new Intl.NumberFormat("vi-VN", { notation: "compact" }).format(value)}</text>`;
  }
  if (chartType === "bar") {
    const slot = chartW / data.length, barW = Math.min(56, slot * .62);
    data.forEach((value, index) => {
      const top = Math.min(y(value), baseline), barH = Math.max(1, Math.abs(y(value) - baseline));
      body += `<rect data-point-index="${index}" data-value="${value}" x="${p.left + index * slot + (slot - barW) / 2}" y="${top}" width="${barW}" height="${barH}" rx="3" fill="${COLORS[index % COLORS.length]}"><title>${names[index]}: ${value}</title></rect>`;
    });
  } else {
    const points = data.map((value, index) => `${x(index)},${y(value)}`).join(" ");
    if (chartType === "area") body += `<polygon data-series="area" points="${p.left},${baseline} ${points} ${x(data.length - 1)},${baseline}" fill="#0f6d38" fill-opacity=".22"/>`;
    body += `<polyline data-series="${chartType}" points="${points}" fill="none" stroke="#0f6d38" stroke-width="3" stroke-linejoin="round"/>`;
    data.forEach((value, index) => { body += `<circle data-point-index="${index}" data-value="${value}" cx="${x(index)}" cy="${y(value)}" r="4" fill="#fff" stroke="#0f6d38" stroke-width="2"><title>${names[index]}: ${value}</title></circle>`; });
  }
  body += `<line x1="${p.left}" y1="${baseline}" x2="${width - p.right}" y2="${baseline}" stroke="#94a3b8"/>`;
  names.forEach((name, index) => { body += `<text x="${x(index)}" y="332" text-anchor="middle" font-size="11" fill="#475569">${name.slice(0, 14)}</text>`; });
  return wrap(body);
}

function trapFocus(element, event) {
  if (event.key !== "Tab") return;
  const items = [...element.querySelectorAll('button:not([disabled]),input:not([disabled]),[tabindex]:not([tabindex="-1"])')];
  if (!items.length) return;
  const first = items[0], last = items.at(-1);
  if ((event.shiftKey && document.activeElement === first) || (!event.shiftKey && document.activeElement === last)) {
    event.preventDefault();
    event.stopPropagation();
    (event.shiftKey ? last : first).focus();
  }
}

export function showSlidesChartDialog(initial = {}) {
  const defaults = normalizeSlidesChart(Object.keys(initial).length ? initial : { chartType: "bar", title: "Biểu đồ dữ liệu", labels: ["Quý 1", "Quý 2", "Quý 3", "Quý 4"], data: [24, 38, 31, 46] });
  if (typeof document === "undefined" || !document.body) return Promise.resolve(defaults);
  return new Promise((resolve) => {
    const previousFocused = document.activeElement;
    const overlay = document.createElement("div");
    overlay.className = "vno-dialog-overlay vno-chart-dialog";
    overlay.dataset.vnoDialog = "slides-chart";
    const typeNames = { bar: "Cột", line: "Đường", pie: "Tròn", area: "Miền" };
    overlay.innerHTML = `<div class="vno-dialog-box" role="dialog" aria-modal="true" aria-labelledby="vno-slides-chart-title">
      <div class="vno-dialog-header"><span id="vno-slides-chart-title">${initial.id ? "Sửa biểu đồ" : "Chèn biểu đồ"}</span><button type="button" class="vno-btn vno-dialog-close-btn" aria-label="Đóng">×</button></div>
      <div class="vno-dialog-body vno-chart-dialog-body">
        <label>Tiêu đề<input data-chart-title-input maxlength="80" value="${esc(defaults.title)}"></label>
        <div class="vno-chart-type-grid" role="radiogroup" aria-label="Kiểu biểu đồ">${SLIDES_CHART_TYPES.map((type) => `<button type="button" role="radio" data-chart-type="${type}" aria-checked="${type === defaults.chartType}" tabindex="${type === defaults.chartType ? "0" : "-1"}" class="vno-chart-type${type === defaults.chartType ? " is-selected" : ""}">${typeNames[type]}</button>`).join("")}</div>
        <div class="vno-chart-dialog-columns"><div><table class="vno-chart-data-table"><thead><tr><th>Nhãn</th><th>Giá trị</th><th></th></tr></thead><tbody></tbody></table><button type="button" class="vno-btn" data-chart-add-row>+ Thêm dòng</button><p class="vno-chart-error" role="alert" aria-live="polite"></p></div><div class="vno-chart-preview" aria-live="polite"></div></div>
      </div><div class="vno-dialog-footer"><button type="button" class="vno-btn" data-chart-cancel>Hủy</button><button type="button" class="vno-btn vno-btn-primary" data-chart-apply>${initial.id ? "Cập nhật" : "Chèn"}</button></div></div>`;
    document.body.appendChild(overlay);
    const box = overlay.querySelector(".vno-dialog-box"), tbody = overlay.querySelector("tbody"), error = overlay.querySelector(".vno-chart-error");
    let chartType = defaults.chartType;
    const addRow = (label = "", value = "") => {
      const row = document.createElement("tr");
      row.innerHTML = `<td><input data-chart-label aria-label="Nhãn dữ liệu" value="${esc(label)}"></td><td><input data-chart-value aria-label="Giá trị" inputmode="decimal" value="${esc(value)}"></td><td><button type="button" data-chart-remove-row aria-label="Xóa dòng">×</button></td>`;
      row.querySelector("[data-chart-remove-row]").addEventListener("click", () => { if (tbody.rows.length > 1) { row.remove(); render(); } });
      row.querySelectorAll("input").forEach((input) => input.addEventListener("input", render));
      tbody.appendChild(row);
    };
    defaults.labels.forEach((label, index) => addRow(label, defaults.data[index]));
    const read = () => ({ chartType, title: overlay.querySelector("[data-chart-title-input]").value.trim() || "Biểu đồ dữ liệu", labels: [...tbody.querySelectorAll("[data-chart-label]")].map((input) => input.value.trim()), data: [...tbody.querySelectorAll("[data-chart-value]")].map((input) => numeric(input.value)) });
    function render() { overlay.querySelector(".vno-chart-preview").innerHTML = generateSlidesChartSvg(read()); error.textContent = ""; }
    overlay.querySelector("[data-chart-title-input]").addEventListener("input", render);
    const typeButtons = Array.from(overlay.querySelectorAll("[data-chart-type]"));
    const selectType = (button) => {
      chartType = button.dataset.chartType;
      typeButtons.forEach((item) => {
        const selected = item === button;
        item.classList.toggle("is-selected", selected);
        item.setAttribute("aria-checked", String(selected));
        item.setAttribute("tabindex", selected ? "0" : "-1");
      });
      render();
    };
    typeButtons.forEach((button) => button.addEventListener("click", () => selectType(button)));
    const typeGrid = overlay.querySelector(".vno-chart-type-grid");
    typeGrid?.addEventListener("keydown", (event) => {
      if (["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"].includes(event.key)) {
        event.preventDefault();
        event.stopPropagation();
        const curIdx = typeButtons.indexOf(document.activeElement);
        let nextIdx;
        if (event.key === "ArrowRight" || event.key === "ArrowDown") {
          nextIdx = curIdx === -1 ? 0 : (curIdx + 1) % typeButtons.length;
        } else {
          nextIdx = curIdx === -1 ? typeButtons.length - 1 : (curIdx - 1 + typeButtons.length) % typeButtons.length;
        }
        selectType(typeButtons[nextIdx]);
        typeButtons[nextIdx]?.focus();
      }
    });
    overlay.querySelector("[data-chart-add-row]").addEventListener("click", () => { addRow(`Mục ${tbody.rows.length + 1}`, 0); render(); tbody.querySelector("tr:last-child input")?.focus(); });
    let closed = false;
    const close = (value) => { if (closed) return; closed = true; document.removeEventListener("keydown", onKey); overlay.remove(); previousFocused?.focus?.(); resolve(value); };
    const commit = () => { const value = read(); if (!value.labels.some(Boolean)) { error.textContent = "Hãy nhập ít nhất một nhãn dữ liệu."; return; } close(value); };
    const onKey = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        close(null);
      } else if (event.key === "Enter" && !event.shiftKey && event.target?.tagName === "INPUT") {
        event.preventDefault();
        event.stopPropagation();
        commit();
      } else trapFocus(box, event);
    };
    document.addEventListener("keydown", onKey);
    overlay.querySelector(".vno-dialog-close-btn").addEventListener("click", () => close(null));
    overlay.querySelector("[data-chart-cancel]").addEventListener("click", () => close(null));
    overlay.querySelector("[data-chart-apply]").addEventListener("click", commit);
    render(); overlay.querySelector("[data-chart-title-input]").focus();
  });
}
