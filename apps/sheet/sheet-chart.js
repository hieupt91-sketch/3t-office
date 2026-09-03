/**
 * VN Sheet — Enterprise Interactive SVG Chart Generator
 * Hỗ trợ vẽ biểu đồ Cột, Đường, Tròn tương thích LibreOffice Object Chart
 */

export class SheetChartBuilder {
  /**
   * Tạo biểu đồ SVG tương tác từ dữ liệu bảng tính
   * @param {Object} options
   * @param {"bar"|"line"|"pie"} options.type
   * @param {string} options.title
   * @param {Array<string>} options.labels
   * @param {Array<number>} options.data
   * @param {string} [options.currency="₫"]
   * @returns {string} SVG HTML string
   */
  static generateSvg({ type = "bar", title = "Biểu đồ phân tích kinh phí", labels = [], data = [], currency = "₫" }) {
    const width = 680;
    const height = 360;
    const padding = { top: 50, right: 40, bottom: 60, left: 90 };
    const chartW = width - padding.left - padding.right;
    const chartH = height - padding.top - padding.bottom;

    const maxVal = Math.max(...data, 10000000);
    const colors = ["#0f6d38", "#2563eb", "#d97706", "#dc2626", "#7c3aed", "#0891b2"];

    if (type === "pie") {
      const total = data.reduce((a, b) => a + b, 0) || 1;
      const cx = width / 2 - 80;
      const cy = height / 2 + 10;
      const r = 100;
      let curAngle = -Math.PI / 2;

      let slicesHtml = "";
      let legendHtml = "";

      data.forEach((val, i) => {
        const sliceAngle = (val / total) * 2 * Math.PI;
        const x1 = cx + r * Math.cos(curAngle);
        const y1 = cy + r * Math.sin(curAngle);
        const nextAngle = curAngle + sliceAngle;
        const x2 = cx + r * Math.cos(nextAngle);
        const y2 = cy + r * Math.sin(nextAngle);
        const largeArc = sliceAngle > Math.PI ? 1 : 0;
        const col = colors[i % colors.length];

        const pathD = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
        slicesHtml += `<path d="${pathD}" fill="${col}" stroke="#ffffff" stroke-width="2"><title>${labels[i]}: ${new Intl.NumberFormat("vi-VN").format(val)} ${currency}</title></path>`;

        legendHtml += `
          <g transform="translate(${width - 200}, ${padding.top + i * 26})">
            <rect width="14" height="14" rx="3" fill="${col}"/>
            <text x="22" y="11" font-size="12" fill="#334155" font-family="sans-serif">${labels[i] || `Mục ${i + 1}`} (${Math.round(val / total * 100)}%)</text>
          </g>
        `;
        curAngle = nextAngle;
      });

      return `
        <svg viewBox="0 0 ${width} ${height}" width="100%" height="100%" style="background:#ffffff; border-radius:8px;">
          <text x="${width / 2}" y="30" text-anchor="middle" font-size="16" font-weight="bold" fill="#0f172a" font-family="sans-serif">${title}</text>
          ${slicesHtml}
          ${legendHtml}
        </svg>
      `;
    }

    // Biểu đồ Cột (Bar Chart)
    const barWidth = Math.min(60, (chartW / (data.length || 1)) * 0.6);
    const gap = chartW / (data.length || 1);

    let barsHtml = "";
    let gridHtml = "";

    // Lưới ngang
    for (let s = 0; s <= 4; s++) {
      const y = padding.top + chartH - (s / 4) * chartH;
      const v = Math.round((s / 4) * maxVal);
      gridHtml += `
        <line x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" stroke="#e2e8f0" stroke-width="1"/>
        <text x="${padding.left - 10}" y="${y + 4}" text-anchor="end" font-size="10" fill="#64748b" font-family="sans-serif">${new Intl.NumberFormat("vi-VN", { notation: "compact" }).format(v)}</text>
      `;
    }

    data.forEach((val, i) => {
      const barH = (val / maxVal) * chartH;
      const x = padding.left + i * gap + (gap - barWidth) / 2;
      const y = padding.top + chartH - barH;
      const col = colors[i % colors.length];

      barsHtml += `
        <rect x="${x}" y="${y}" width="${barWidth}" height="${barH}" rx="4" fill="${col}">
          <title>${labels[i]}: ${new Intl.NumberFormat("vi-VN").format(val)} ${currency}</title>
        </rect>
        <text x="${x + barWidth / 2}" y="${padding.top + chartH + 18}" text-anchor="middle" font-size="11" fill="#475569" font-family="sans-serif">
          ${(labels[i] || "").substring(0, 12)}
        </text>
        <text x="${x + barWidth / 2}" y="${y - 6}" text-anchor="middle" font-size="10" font-weight="bold" fill="#0f172a" font-family="sans-serif">
          ${new Intl.NumberFormat("vi-VN", { notation: "compact" }).format(val)}
        </text>
      `;
    });

    return `
      <svg viewBox="0 0 ${width} ${height}" width="100%" height="100%" style="background:#ffffff; border-radius:8px;">
        <text x="${width / 2}" y="28" text-anchor="middle" font-size="16" font-weight="bold" fill="#0f172a" font-family="sans-serif">${title}</text>
        ${gridHtml}
        ${barsHtml}
      </svg>
    `;
  }

  /**
   * Mở hộp thoại chèn biểu đồ
   */
  static showChartModal(dataItems, onInsert) {
    const modal = document.createElement("div");
    modal.className = "vno-dialog-overlay";

    const labels = dataItems.map(d => d.label);
    const data = dataItems.map(d => d.value);

    let curType = "bar";

    const renderPreview = () => {
      const svg = SheetChartBuilder.generateSvg({
        type: curType,
        title: "BIỂU ĐỒ DỰ TOÁN KINH PHÍ PHÁT TRIỂN VN OFFICE 2026",
        labels: labels,
        data: data
      });
      modal.querySelector("#vno-chart-preview-container").innerHTML = svg;
    };

    modal.innerHTML = `
      <div class="vno-dialog-box" style="width:750px;max-width:95vw;">
        <div class="vno-dialog-header">
          <span>Chèn Biểu đồ Dữ liệu (LibreOffice Chart Engine)</span>
          <button class="vno-btn" id="vno-chart-close" style="font-size:16px;">&times;</button>
        </div>
        <div class="vno-dialog-body" style="display:flex;flex-direction:column;gap:14px;">
          <div style="display:flex;align-items:center;gap:12px;">
            <span style="font-weight:600;font-size:12px;">Kiểu biểu đồ:</span>
            <button class="vno-btn is-checked" id="vno-type-bar">📊 Biểu đồ Cột</button>
            <button class="vno-btn" id="vno-type-pie">🍩 Biểu đồ Tròn</button>
          </div>
          <div id="vno-chart-preview-container" style="height:340px;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;"></div>
        </div>
        <div class="vno-dialog-footer">
          <button class="vno-btn" id="vno-chart-cancel">Đóng</button>
          <button class="vno-btn vno-btn-primary" id="vno-chart-apply">Chèn vào Bảng tính</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    renderPreview();

    const close = () => { if (modal.parentNode) modal.parentNode.removeChild(modal); };
    modal.querySelector("#vno-chart-close").addEventListener("click", close);
    modal.querySelector("#vno-chart-cancel").addEventListener("click", close);

    const btnBar = modal.querySelector("#vno-type-bar");
    const btnPie = modal.querySelector("#vno-type-pie");

    btnBar.addEventListener("click", () => {
      curType = "bar";
      btnBar.classList.add("is-checked");
      btnPie.classList.remove("is-checked");
      renderPreview();
    });

    btnPie.addEventListener("click", () => {
      curType = "pie";
      btnPie.classList.add("is-checked");
      btnBar.classList.remove("is-checked");
      renderPreview();
    });

    modal.querySelector("#vno-chart-apply").addEventListener("click", () => {
      close();
      if (onInsert) onInsert(curType);
    });
  }
}
