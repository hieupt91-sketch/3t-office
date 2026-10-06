/**
 * VN Writer (3T Doc) — Chức năng TRANG BÌA (Cover Page Gallery & Templates)
 * Thiết kế riêng 3T, tuân thủ văn bản hành chính Việt Nam & báo cáo chuyên nghiệp.
 * Font chữ an toàn: Times New Roman, Arial. Không sử dụng tên/thương hiệu Microsoft.
 */

import { t } from "../../platform/i18n/i18n.js";

/** @typedef {{ title?: string, subtitle?: string, organization?: string, author?: string, date?: string }} CoverPageFields */

export const COVER_PAGE_TEMPLATES = [
  {
    id: "gov_simple",
    name: "Công văn - Quyết định trang trọng đơn giản",
    description: "Khổ chuẩn hành chính Việt Nam: Tên đơn vị góc trái, Quốc hiệu góc phải, tiêu đề chính nổi bật căn giữa.",
    thumbnailSvg: `<svg viewBox="0 0 120 160" width="100" height="130" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="160" rx="3" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.5"/>
      <rect x="10" y="12" width="40" height="4" rx="1" fill="#0F4C81"/>
      <rect x="65" y="12" width="45" height="3" rx="1" fill="#64748B"/>
      <rect x="72" y="18" width="30" height="2" rx="1" fill="#94A3B8"/>
      <line x1="10" y1="28" x2="110" y2="28" stroke="#0F4C81" stroke-width="1.2"/>
      <rect x="25" y="55" width="70" height="8" rx="1.5" fill="#0F4C81"/>
      <rect x="35" y="68" width="50" height="4" rx="1" fill="#94A3B8"/>
      <rect x="70" y="125" width="40" height="3" rx="1" fill="#64748B"/>
      <rect x="70" y="132" width="40" height="3" rx="1" fill="#64748B"/>
      <rect x="70" y="139" width="40" height="3" rx="1" fill="#64748B"/>
    </svg>`,
    generateHtml: (fields = {}) => {
      const title = fields.title || "[Nhập tiêu đề tài liệu]";
      const subtitle = fields.subtitle || "[Nhập phụ đề tài liệu]";
      const org = fields.organization || "[Nhập tên đơn vị / cơ quan]";
      const author = fields.author || "[Nhập tên tác giả]";
      const date = fields.date || "[Ngày ...]";
      return `<div class="vno-cover-page" data-vno-cover-page="true" data-vno-template="gov_simple" contenteditable="true" style="font-family:'Times New Roman',serif; padding:50px 60px; min-height:880px; box-sizing:border-box; background:#ffffff; color:#0f172a; position:relative;">
  <table style="width:100%; border-collapse:collapse; margin-bottom:20px; font-family:'Times New Roman',serif;">
    <tr>
      <td style="width:48%; vertical-align:top; text-align:left;">
        <div data-vno-field="organization" style="font-weight:bold; font-size:13pt; text-transform:uppercase; color:#0f4c81; outline:none;">${org}</div>
      </td>
      <td style="width:52%; vertical-align:top; text-align:center;">
        <div style="font-weight:bold; font-size:12pt; text-transform:uppercase;">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
        <div style="font-weight:bold; font-size:13pt;">Độc lập - Tự do - Hạnh phúc</div>
        <div style="font-size:11pt; margin-top:4px;">---***---</div>
      </td>
    </tr>
  </table>
  <div style="border-bottom:2px solid #0f4c81; margin-bottom:120px;"></div>
  <div style="text-align:center; margin-top:80px; margin-bottom:160px;">
    <h1 data-vno-field="title" style="font-size:26pt; font-weight:bold; text-transform:uppercase; color:#0f4c81; margin:0 0 16px 0; outline:none; line-height:1.3;">${title}</h1>
    <div data-vno-field="subtitle" style="font-size:14pt; font-style:italic; color:#475569; outline:none;">${subtitle}</div>
  </div>
  <div style="position:absolute; bottom:60px; right:60px; text-align:left; font-size:12pt; line-height:1.6;">
    <p style="margin:4px 0;"><span style="font-weight:bold;">Đơn vị:</span> <span data-vno-field="organization_sub" style="outline:none;">${org}</span></p>
    <p style="margin:4px 0;"><span style="font-weight:bold;">Tác giả:</span> <span data-vno-field="author" style="outline:none;">${author}</span></p>
    <p style="margin:4px 0;"><span style="font-weight:bold;">Ngày:</span> <span data-vno-field="date" style="outline:none;">${date}</span></p>
  </div>
</div>`;
    }
  },
  {
    id: "bordered_report",
    name: "Báo cáo có khung viền",
    description: "Khung đôi trang trọng bao quanh toàn trang, bố cục căn giữa hoàn hảo cho báo cáo tổng kết, nghiên cứu.",
    thumbnailSvg: `<svg viewBox="0 0 120 160" width="100" height="130" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="160" rx="3" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.5"/>
      <rect x="6" y="6" width="108" height="148" fill="none" stroke="#0F4C81" stroke-width="1.5"/>
      <rect x="9" y="9" width="102" height="142" fill="none" stroke="#0F4C81" stroke-width="0.8"/>
      <rect x="30" y="22" width="60" height="4" rx="1" fill="#0F4C81"/>
      <rect x="20" y="60" width="80" height="9" rx="1.5" fill="#1E3A8A"/>
      <rect x="35" y="74" width="50" height="4" rx="1" fill="#64748B"/>
      <circle cx="60" cy="90" r="3" fill="#0F4C81"/>
      <rect x="30" y="130" width="60" height="3" rx="1" fill="#64748B"/>
      <rect x="35" y="137" width="50" height="3" rx="1" fill="#94A3B8"/>
    </svg>`,
    generateHtml: (fields = {}) => {
      const title = fields.title || "[Nhập tiêu đề tài liệu]";
      const subtitle = fields.subtitle || "[Nhập phụ đề tài liệu]";
      const org = fields.organization || "[Nhập tên đơn vị / cơ quan]";
      const author = fields.author || "[Nhập tên tác giả]";
      const date = fields.date || "[Ngày ...]";
      return `<div class="vno-cover-page" data-vno-cover-page="true" data-vno-template="bordered_report" contenteditable="true" style="font-family:'Times New Roman',serif; padding:24px; min-height:880px; box-sizing:border-box; background:#ffffff;">
  <div style="border:4px double #0f4c81; padding:45px 35px; min-height:820px; box-sizing:border-box; text-align:center; position:relative;">
    <div data-vno-field="organization" style="font-size:14pt; font-weight:bold; text-transform:uppercase; color:#0f4c81; margin-bottom:120px; outline:none;">${org}</div>
    <div style="margin-top:60px; margin-bottom:100px;">
      <h1 data-vno-field="title" style="font-size:28pt; font-weight:bold; color:#1e3a8a; text-transform:uppercase; margin:0 0 20px 0; outline:none; line-height:1.3;">${title}</h1>
      <div data-vno-field="subtitle" style="font-size:15pt; font-style:italic; color:#334155; margin-bottom:40px; outline:none;">${subtitle}</div>
      <div style="font-size:14pt; color:#0f4c81;">❖ ❖ ❖</div>
    </div>
    <div style="position:absolute; bottom:50px; left:0; right:0; text-align:center; font-size:13pt; line-height:1.6;">
      <p style="margin:6px 0;"><span style="font-weight:bold;">Người thực hiện:</span> <span data-vno-field="author" style="outline:none;">${author}</span></p>
      <p style="margin:6px 0;"><span style="font-weight:bold;">Ngày hoàn thành:</span> <span data-vno-field="date" style="outline:none;">${date}</span></p>
    </div>
  </div>
</div>`;
    }
  },
  {
    id: "modern_band",
    name: "Hiện đại có dải màu",
    description: "Khối dải màu xanh đậm thanh lịch ở đầu trang, bố cục bảng dữ liệu gọn gàng hiện đại.",
    thumbnailSvg: `<svg viewBox="0 0 120 160" width="100" height="130" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="160" rx="3" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.5"/>
      <rect width="120" height="55" fill="#0F4C81"/>
      <rect x="12" y="14" width="40" height="3" rx="1" fill="#93C5FD"/>
      <rect x="12" y="24" width="85" height="8" rx="1.5" fill="#FFFFFF"/>
      <rect x="12" y="36" width="60" height="4" rx="1" fill="#DBEAFE"/>
      <rect x="12" y="70" width="70" height="4" rx="1" fill="#64748B"/>
      <line x1="12" y1="120" x2="108" y2="120" stroke="#E2E8F0" stroke-width="1.5"/>
      <rect x="12" y="130" width="40" height="3" rx="1" fill="#0F4C81"/>
      <rect x="12" y="137" width="30" height="3" rx="1" fill="#64748B"/>
      <rect x="68" y="130" width="40" height="3" rx="1" fill="#0F4C81"/>
      <rect x="68" y="137" width="30" height="3" rx="1" fill="#64748B"/>
    </svg>`,
    generateHtml: (fields = {}) => {
      const title = fields.title || "[Nhập tiêu đề tài liệu]";
      const subtitle = fields.subtitle || "[Nhập phụ đề tài liệu]";
      const org = fields.organization || "[Nhập tên đơn vị / cơ quan]";
      const author = fields.author || "[Nhập tên tác giả]";
      const date = fields.date || "[Ngày ...]";
      return `<div class="vno-cover-page" data-vno-cover-page="true" data-vno-template="modern_band" contenteditable="true" style="font-family:'Times New Roman',serif; min-height:880px; box-sizing:border-box; background:#ffffff; position:relative;">
  <div style="background:#0f4c81; color:#ffffff; padding:65px 50px 45px 50px; border-radius:0 0 6px 6px;">
    <div data-vno-field="organization" style="font-size:12pt; text-transform:uppercase; letter-spacing:1px; opacity:0.92; margin-bottom:25px; outline:none;">${org}</div>
    <h1 data-vno-field="title" style="font-size:26pt; font-weight:bold; margin:0 0 16px 0; color:#ffffff; outline:none; line-height:1.3;">${title}</h1>
  </div>
  <div style="padding:45px 50px;">
    <div data-vno-field="subtitle" style="font-size:15pt; color:#475569; font-style:italic; margin-top:20px; margin-bottom:200px; outline:none;">${subtitle}</div>
    <div style="position:absolute; bottom:60px; left:50px; right:50px; border-top:2px solid #e2e8f0; padding-top:25px;">
      <table style="width:100%; border-collapse:collapse; font-size:12pt; color:#334155;">
        <tr>
          <td style="width:50%; vertical-align:top;">
            <span style="font-weight:bold; color:#0f4c81; font-size:11pt; text-transform:uppercase;">TÁC GIẢ</span>
            <div data-vno-field="author" style="font-size:13pt; font-weight:bold; margin-top:4px; outline:none;">${author}</div>
          </td>
          <td style="width:50%; vertical-align:top;">
            <span style="font-weight:bold; color:#0f4c81; font-size:11pt; text-transform:uppercase;">NGÀY PHÁT HÀNH</span>
            <div data-vno-field="date" style="font-size:13pt; margin-top:4px; outline:none;">${date}</div>
          </td>
        </tr>
      </table>
    </div>
  </div>
</div>`;
    }
  },
  {
    id: "contract_big",
    name: "Hợp đồng có tiêu đề lớn",
    description: "Tiêu đề lớn đậm ấn tượng, đường kẻ phân cách đậm và khung thông tin đối tác cho hợp đồng, thỏa thuận.",
    thumbnailSvg: `<svg viewBox="0 0 120 160" width="100" height="130" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="120" height="160" rx="3" fill="#FFFFFF" stroke="#CBD5E1" stroke-width="1.5"/>
      <rect x="35" y="16" width="50" height="4" rx="1" fill="#0F172A"/>
      <rect x="15" y="45" width="90" height="10" rx="1.5" fill="#0F172A"/>
      <rect x="30" y="60" width="60" height="4" rx="1" fill="#64748B"/>
      <line x1="12" y1="75" x2="108" y2="75" stroke="#0F172A" stroke-width="2"/>
      <rect x="12" y="105" width="96" height="42" rx="2" fill="#F8FAFC" stroke="#CBD5E1" stroke-width="1"/>
      <rect x="20" y="113" width="30" height="3" rx="1" fill="#475569"/>
      <rect x="55" y="113" width="45" height="3" rx="1" fill="#94A3B8"/>
      <rect x="20" y="123" width="30" height="3" rx="1" fill="#475569"/>
      <rect x="55" y="123" width="45" height="3" rx="1" fill="#94A3B8"/>
      <rect x="20" y="133" width="30" height="3" rx="1" fill="#475569"/>
      <rect x="55" y="133" width="45" height="3" rx="1" fill="#94A3B8"/>
    </svg>`,
    generateHtml: (fields = {}) => {
      const title = fields.title || "[Nhập tiêu đề tài liệu]";
      const subtitle = fields.subtitle || "[Nhập phụ đề tài liệu]";
      const org = fields.organization || "[Nhập tên đơn vị / cơ quan]";
      const author = fields.author || "[Nhập tên tác giả]";
      const date = fields.date || "[Ngày ...]";
      return `<div class="vno-cover-page" data-vno-cover-page="true" data-vno-template="contract_big" contenteditable="true" style="font-family:'Times New Roman',serif; padding:55px 45px; min-height:880px; box-sizing:border-box; background:#ffffff; position:relative;">
  <div data-vno-field="organization" style="font-size:14pt; font-weight:bold; text-transform:uppercase; text-align:center; color:#1e293b; margin-bottom:50px; outline:none;">${org}</div>
  <div style="text-align:center; margin-top:40px; margin-bottom:40px;">
    <h1 data-vno-field="title" style="font-size:30pt; font-weight:900; text-transform:uppercase; color:#0f172a; margin:0 0 16px 0; letter-spacing:1px; outline:none; line-height:1.2;">${title}</h1>
    <div data-vno-field="subtitle" style="font-size:14pt; font-weight:bold; color:#475569; outline:none;">${subtitle}</div>
  </div>
  <div style="border-bottom:4px solid #0f172a; margin-bottom:60px;"></div>
  <div style="position:absolute; bottom:60px; left:45px; right:45px; background:#f8fafc; border:1px solid #cbd5e1; border-radius:6px; padding:24px 30px;">
    <table style="width:100%; border-collapse:collapse; font-size:12pt; color:#334155;">
      <tr>
        <td style="padding:8px 0; font-weight:bold; width:140px;">Đơn vị / Cơ quan:</td>
        <td style="padding:8px 0;"><span data-vno-field="organization_sub" style="outline:none;">${org}</span></td>
      </tr>
      <tr>
        <td style="padding:8px 0; font-weight:bold;">Người lập:</td>
        <td style="padding:8px 0;"><span data-vno-field="author" style="outline:none;">${author}</span></td>
      </tr>
      <tr>
        <td style="padding:8px 0; font-weight:bold;">Ngày ký / lập:</td>
        <td style="padding:8px 0;"><span data-vno-field="date" style="outline:none;">${date}</span></td>
      </tr>
    </table>
  </div>
</div>`;
    }
  }
];

export const COVER_PAGE_BREAK_HTML = `<p data-vno-page-break="true" aria-hidden="true" style="page-break-before:always; break-before:page; border-top:2px dashed #94a3b8; margin:24px 0; user-select:none;"><br></p>`;

/**
 * Dựng HTML đầy đủ gồm trang bìa + ngắt trang phía sau.
 * @param {string} templateId
 * @param {CoverPageFields} [fields]
 * @returns {string}
 */
export function generateCoverPageHtml(templateId, fields = {}) {
  const template = COVER_PAGE_TEMPLATES.find(t => t.id === templateId) || COVER_PAGE_TEMPLATES[0];
  const coverHtml = template.generateHtml(fields);
  return coverHtml + "\n" + COVER_PAGE_BREAK_HTML;
}

/**
 * Mở hộp thoại Thư viện Trang bìa (Cover Page Gallery Dialog).
 * Hỗ trợ bàn phím đầy đủ: Tab / Shift+Tab, Phím mũi tên chọn mẫu, Enter xác nhận, Esc hủy.
 * @param {Object} [options]
 * @param {boolean} [options.hasExistingCover=false]
 * @param {string} [options.currentTitle=""]
 * @param {string} [options.currentSubtitle=""]
 * @param {string} [options.currentOrganization=""]
 * @param {string} [options.currentAuthor=""]
 * @param {string} [options.currentDate=""]
 * @returns {Promise<{ action: "insert"|"remove", templateId?: string, fieldValues?: CoverPageFields } | null>}
 */
export function showCoverPageGalleryDialog(options = {}) {
  if (typeof document === "undefined" || !document.body) {
    return Promise.resolve({
      action: "insert",
      templateId: "gov_simple",
      fieldValues: {
        title: options.currentTitle || "[Nhập tiêu đề tài liệu]",
        subtitle: options.currentSubtitle || "[Nhập phụ đề tài liệu]",
        organization: options.currentOrganization || "[Nhập tên đơn vị / cơ quan]",
        author: options.currentAuthor || "[Nhập tên tác giả]",
        date: options.currentDate || new Date().toLocaleDateString("vi-VN")
      }
    });
  }

  return new Promise((resolve) => {
    const previousFocused = document.activeElement;

    // Helper tạo element DOM
    const make = (tag, className, label) => {
      const el = document.createElement(tag);
      if (className) el.className = className;
      if (label != null) el.textContent = label;
      return el;
    };

    const overlay = make("div", "vno-dialog-overlay vno-cover-dialog-overlay");
    overlay.dataset.vnoDialog = "cover-page";

    const box = make("div", "vno-dialog-box vno-cover-page-dialog");
    box.style.width = "min(840px, calc(100vw - 32px))";
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-modal", "true");
    box.setAttribute("aria-labelledby", "vno-cover-dialog-title");

    // Header
    const header = make("div", "vno-dialog-header");
    const title = make("span", "", t("writer.insert.coverPage", "Thư viện trang bìa"));
    title.id = "vno-cover-dialog-title";
    title.style.fontWeight = "bold";
    title.style.fontSize = "15px";

    const closeBtn = make("button", "vno-btn vno-btn-icon-only vno-dialog-close-btn", "×");
    closeBtn.type = "button";
    closeBtn.title = t("common.close") || "Đóng";
    closeBtn.setAttribute("aria-label", t("common.close") || "Đóng");
    header.append(title, closeBtn);

    // Body
    const body = make("div", "vno-dialog-body vno-cover-dialog-body");
    body.style.padding = "20px";
    body.style.display = "flex";
    body.style.flexDirection = "column";
    body.style.gap = "16px";
    body.style.maxHeight = "calc(88vh - 120px)";
    body.style.overflowY = "auto";

    if (options.hasExistingCover) {
      const alertBox = make("div", "vno-cover-dialog-alert");
      alertBox.style.background = "#eff6ff";
      alertBox.style.border = "1px solid #93c5fd";
      alertBox.style.borderRadius = "6px";
      alertBox.style.padding = "10px 14px";
      alertBox.style.fontSize = "13px";
      alertBox.style.color = "#1e40af";
      alertBox.style.display = "flex";
      alertBox.style.alignItems = "center";
      alertBox.style.gap = "8px";
      alertBox.innerHTML = `<strong>Lưu ý:</strong> Tài liệu hiện đã có trang bìa. Chọn mẫu mới sẽ THAY THẾ trang bìa cũ.`;
      body.appendChild(alertBox);
    }

    // Grid 4 Mẫu trang bìa
    const gridLabel = make("div", "", "Chọn mẫu trang bìa:");
    gridLabel.style.fontWeight = "bold";
    gridLabel.style.fontSize = "14px";
    gridLabel.style.color = "#334155";
    body.appendChild(gridLabel);

    const grid = make("div", "vno-cover-templates-grid");
    grid.style.display = "grid";
    grid.style.gridTemplateColumns = "repeat(auto-fit, minmax(180px, 1fr))";
    grid.style.gap = "14px";

    let selectedTemplateId = COVER_PAGE_TEMPLATES[0].id;
    const templateCards = [];

    COVER_PAGE_TEMPLATES.forEach((tpl, idx) => {
      const card = make("button", "vno-cover-template-card");
      card.type = "button";
      card.dataset.templateId = tpl.id;
      card.setAttribute("tabindex", idx === 0 ? "0" : "-1");
      card.style.display = "flex";
      card.style.flexDirection = "column";
      card.style.alignItems = "center";
      card.style.padding = "12px";
      card.style.border = idx === 0 ? "2px solid #0f4c81" : "1px solid #cbd5e1";
      card.style.borderRadius = "8px";
      card.style.background = idx === 0 ? "#f0f9ff" : "#ffffff";
      card.style.cursor = "pointer";
      card.style.textAlign = "center";
      card.style.transition = "all 0.15s ease";
      card.style.outline = "none";

      const svgWrap = make("div", "vno-cover-card-svg");
      svgWrap.innerHTML = tpl.thumbnailSvg;
      svgWrap.style.marginBottom = "8px";

      const cardTitle = make("div", "vno-cover-card-title", tpl.name);
      cardTitle.style.fontWeight = "bold";
      cardTitle.style.fontSize = "12px";
      cardTitle.style.color = "#0f172a";
      cardTitle.style.marginBottom = "4px";

      const cardDesc = make("div", "vno-cover-card-desc", tpl.description);
      cardDesc.style.fontSize = "11px";
      cardDesc.style.color = "#64748b";
      cardDesc.style.lineHeight = "1.3";

      card.append(svgWrap, cardTitle, cardDesc);
      grid.appendChild(card);
      templateCards.push(card);

      card.addEventListener("click", () => {
        selectCard(idx);
      });
    });

    body.appendChild(grid);

    function selectCard(index) {
      templateCards.forEach((c, i) => {
        if (i === index) {
          c.style.border = "2px solid #0f4c81";
          c.style.background = "#f0f9ff";
          c.setAttribute("tabindex", "0");
          c.focus();
          selectedTemplateId = COVER_PAGE_TEMPLATES[i].id;
        } else {
          c.style.border = "1px solid #cbd5e1";
          c.style.background = "#ffffff";
          c.setAttribute("tabindex", "-1");
        }
      });
    }

    // Direct Arrow Key navigation for Grid Cards
    grid.addEventListener("keydown", (e) => {
      const currentIdx = templateCards.findIndex(c => c === document.activeElement);
      if (currentIdx === -1) return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        const next = (currentIdx + 1) % templateCards.length;
        selectCard(next);
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        const prev = (currentIdx - 1 + templateCards.length) % templateCards.length;
        selectCard(prev);
      }
    });

    // Inputs Section (Các trường thông tin)
    const fieldsLabel = make("div", "", "Thông tin nhập sẵn trên trang bìa:");
    fieldsLabel.style.fontWeight = "bold";
    fieldsLabel.style.fontSize = "14px";
    fieldsLabel.style.color = "#334155";
    fieldsLabel.style.marginTop = "6px";
    body.appendChild(fieldsLabel);

    const fieldsContainer = make("div", "vno-cover-fields-form");
    fieldsContainer.style.display = "grid";
    fieldsContainer.style.gridTemplateColumns = "1fr 1fr";
    fieldsContainer.style.gap = "12px";

    const createFieldInput = (id, labelText, defaultValue, isFullWidth = false) => {
      const wrap = make("div");
      if (isFullWidth) wrap.style.gridColumn = "1 / -1";
      wrap.style.display = "flex";
      wrap.style.flexDirection = "column";
      wrap.style.gap = "4px";

      const lbl = make("label", "", labelText);
      lbl.htmlFor = id;
      lbl.style.fontSize = "12px";
      lbl.style.fontWeight = "600";
      lbl.style.color = "#475569";

      const inp = make("input", "vno-dialog-input");
      inp.id = id;
      inp.type = "text";
      inp.value = defaultValue || "";
      inp.style.padding = "6px 10px";
      inp.style.border = "1px solid #cbd5e1";
      inp.style.borderRadius = "4px";
      inp.style.fontSize = "13px";

      wrap.append(lbl, inp);
      return { wrap, inp };
    };

    const todayStr = options.currentDate || new Date().toLocaleDateString("vi-VN");
    const titleField = createFieldInput("vno-cover-input-title", "Tiêu đề tài liệu:", options.currentTitle || "[Nhập tiêu đề tài liệu]", true);
    const subtitleField = createFieldInput("vno-cover-input-subtitle", "Phụ đề:", options.currentSubtitle || "[Nhập phụ đề tài liệu]", true);
    const orgField = createFieldInput("vno-cover-input-org", "Đơn vị / Cơ quan:", options.currentOrganization || "[Nhập tên đơn vị / cơ quan]");
    const authorField = createFieldInput("vno-cover-input-author", "Tác giả / Người lập:", options.currentAuthor || "[Nhập tên tác giả]");
    const dateField = createFieldInput("vno-cover-input-date", "Ngày lập / phát hành:", todayStr, true);

    fieldsContainer.append(
      titleField.wrap,
      subtitleField.wrap,
      orgField.wrap,
      authorField.wrap,
      dateField.wrap
    );
    body.appendChild(fieldsContainer);

    box.appendChild(header);
    box.appendChild(body);

    // Footer Buttons
    const footer = make("div", "vno-dialog-footer");
    footer.style.display = "flex";
    footer.style.justify = "space-between";
    footer.style.alignItems = "center";
    footer.style.padding = "14px 20px";
    footer.style.borderTop = "1px solid #e2e8f0";
    footer.style.background = "#f8fafc";

    const leftGroup = make("div");
    leftGroup.style.display = "flex";
    leftGroup.style.gap = "8px";

    if (options.hasExistingCover) {
      const removeBtn = make("button", "vno-btn vno-btn-danger", "Gỡ trang bìa");
      removeBtn.type = "button";
      removeBtn.style.background = "#ef4444";
      removeBtn.style.color = "#ffffff";
      removeBtn.style.border = "none";
      removeBtn.style.padding = "6px 14px";
      removeBtn.style.borderRadius = "4px";
      removeBtn.style.cursor = "pointer";
      removeBtn.style.fontSize = "13px";
      removeBtn.addEventListener("click", () => {
        closeDialog({ action: "remove" });
      });
      leftGroup.appendChild(removeBtn);
    }

    const rightGroup = make("div");
    rightGroup.style.display = "flex";
    rightGroup.style.gap = "10px";

    const cancelBtn = make("button", "vno-btn vno-btn-secondary", t("common.cancel") || "Hủy");
    cancelBtn.type = "button";
    cancelBtn.style.padding = "6px 16px";
    cancelBtn.style.border = "1px solid #cbd5e1";
    cancelBtn.style.borderRadius = "4px";
    cancelBtn.style.background = "#ffffff";
    cancelBtn.style.cursor = "pointer";
    cancelBtn.style.fontSize = "13px";
    cancelBtn.addEventListener("click", () => {
      closeDialog(null);
    });

    const submitBtn = make("button", "vno-btn vno-btn-primary", options.hasExistingCover ? "Thay thế trang bìa" : "Chèn trang bìa");
    submitBtn.type = "button";
    submitBtn.style.padding = "6px 18px";
    submitBtn.style.border = "none";
    submitBtn.style.borderRadius = "4px";
    submitBtn.style.background = "#0f4c81";
    submitBtn.style.color = "#ffffff";
    submitBtn.style.fontWeight = "bold";
    submitBtn.style.cursor = "pointer";
    submitBtn.style.fontSize = "13px";

    const handleConfirm = () => {
      const fieldValues = {
        title: titleField.inp.value.trim() || "[Nhập tiêu đề tài liệu]",
        subtitle: subtitleField.inp.value.trim() || "[Nhập phụ đề tài liệu]",
        organization: orgField.inp.value.trim() || "[Nhập tên đơn vị / cơ quan]",
        author: authorField.inp.value.trim() || "[Nhập tên tác giả]",
        date: dateField.inp.value.trim() || todayStr
      };
      closeDialog({ action: "insert", templateId: selectedTemplateId, fieldValues });
    };

    submitBtn.addEventListener("click", handleConfirm);

    rightGroup.append(cancelBtn, submitBtn);
    footer.append(leftGroup, rightGroup);
    box.appendChild(footer);
    overlay.appendChild(box);

    function closeDialog(result) {
      document.removeEventListener("keydown", keyHandler);
      overlay.remove();
      if (previousFocused && typeof previousFocused.focus === "function") {
        try { previousFocused.focus(); } catch {}
      }
      resolve(result);
    }

    function keyHandler(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        closeDialog(null);
      } else if (e.key === "Enter" && !e.shiftKey && e.target.tagName !== "TEXTAREA") {
        e.preventDefault();
        handleConfirm();
      } else if (e.key === "Tab") {
        // Focus trap
        const focusables = Array.from(box.querySelectorAll(
          'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )).filter(el => el.offsetWidth > 0 || el.offsetHeight > 0);
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener("keydown", keyHandler);
    closeBtn.addEventListener("click", () => closeDialog(null));

    document.body.appendChild(overlay);
    templateCards[0].focus();
  });
}
