/**
 * 3T Office — 3T Doc Paragraph Dialog (hộp thoại Đoạn văn)
 * Căn lề, thụt lề, khoảng cách đoạn và giãn dòng trong một hộp thoại như Word: Tab Trang đầu ▸ Đoạn văn ▸ Hộp thoại,
 * hoặc nhấp chuột phải ▸ Đoạn văn…
 */

export const LINE_MODES = [
  { id: "single", label: "Đơn", value: 1 },
  { id: "onehalf", label: "1,5 dòng", value: 1.5 },
  { id: "double", label: "Kép (2 dòng)", value: 2 },
  { id: "multiple", label: "Nhiều dòng" },
  { id: "exact", label: "Chính xác" }
];

export const ALIGN_OPTIONS = [
  { id: "left", label: "Trái" },
  { id: "center", label: "Giữa" },
  { id: "right", label: "Phải" },
  { id: "justify", label: "Đều hai bên" }
];

export const OUTLINE_OPTIONS = [{ id: 0, label: "Nội dung văn bản" }, ...Array.from({ length: 9 }, (_, i) => ({ id: i + 1, label: `Mức ${i + 1}` }))];

export const SPECIAL_OPTIONS = [
  { id: "none", label: "(Không có)" },
  { id: "firstLine", label: "Dòng đầu" },
  { id: "hanging", label: "Treo" }
];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

function numberOr(value, fallback) {
  const parsed = Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Chuẩn hóa giá trị người dùng nhập; trả về { values } hợp lệ hoặc { error } bằng tiếng Việt.
 * Đơn vị: thụt lề cm, khoảng cách và giãn dòng "chính xác" pt, "nhiều dòng" là hệ số.
 */
export function normalizeParagraphDialogValues(raw = {}, contentWidthMm = 160) {
  const align = ALIGN_OPTIONS.some(item => item.id === raw.align) ? raw.align : "left";
  const leftCm = clamp(numberOr(raw.leftCm, 0), 0, 50);
  const rightCm = clamp(numberOr(raw.rightCm, 0), 0, 50);
  const special = SPECIAL_OPTIONS.some(item => item.id === raw.special) ? raw.special : "none";
  const specialCm = special === "none" ? 0 : clamp(numberOr(raw.specialCm, 1.27), 0, 50);
  const beforePt = clamp(numberOr(raw.beforePt, 0), 0, 240);
  const afterPt = clamp(numberOr(raw.afterPt, 0), 0, 240);
  const lineMode = LINE_MODES.some(item => item.id === raw.lineMode) ? raw.lineMode : "single";
  let lineValue = numberOr(raw.lineValue, lineMode === "exact" ? 18 : 1);
  if (lineMode === "multiple") lineValue = clamp(lineValue, 0.5, 10);
  if (lineMode === "exact") lineValue = clamp(lineValue, 1, 1584);
  if ((leftCm + rightCm) * 10 > contentWidthMm - 10) {
    return { error: "Tổng thụt lề trái và phải quá lớn so với bề rộng trang. Hãy giảm thụt lề." };
  }
  if (special === "hanging" && leftCm - specialCm < 0) {
    return { error: "Thụt lề treo không được lớn hơn thụt lề trái. Hãy tăng Trái hoặc giảm Giá trị." };
  }
  return {
    values: {
      align,
      leftMm: Math.round(leftCm * 100) / 10,
      rightMm: Math.round(rightCm * 100) / 10,
      firstLineMm: special === "firstLine" ? Math.round(specialCm * 100) / 10 : special === "hanging" ? -Math.round(specialCm * 100) / 10 : 0,
      beforePt,
      afterPt,
      lineMode,
      lineValue,
      // Tab "Ngắt dòng và ngắt trang": mặc định giống Word (kiểm soát dòng mồ côi/góa bật, các tùy chọn khác tắt)
      outlineLevel: clamp(Math.round(numberOr(raw.outlineLevel, 0)), 0, 9),
      widowControl: raw.widowControl === undefined ? true : Boolean(raw.widowControl),
      keepNext: Boolean(raw.keepNext),
      keepLines: Boolean(raw.keepLines),
      pageBreakBefore: Boolean(raw.pageBreakBefore)
    }
  };
}

function trapFocus(dialogBox, event) {
  if (event.key !== "Tab") return;
  const focusables = Array.from(dialogBox.querySelectorAll("button:not([disabled]), input:not([disabled]), select:not([disabled])"))
    .filter(el => el.offsetParent !== null || el.offsetWidth > 0 || el.offsetHeight > 0);
  if (!focusables.length) return;
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  if (event.shiftKey && (document.activeElement === first || !dialogBox.contains(document.activeElement))) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && (document.activeElement === last || !dialogBox.contains(document.activeElement))) {
    event.preventDefault();
    first.focus();
  }
}

/**
 * @param {object} [current] giá trị hiện tại: { align, leftCm, rightCm, special, specialCm, beforePt, afterPt, lineMode, lineValue, contentWidthMm }
 * @returns {Promise<object|null>} giá trị đã chuẩn hóa (xem normalizeParagraphDialogValues) hoặc null nếu hủy
 */
export async function showParagraphDialog(current = {}) {
  if (typeof document === "undefined" || !document.body) return null;
  return new Promise(resolve => {
    const previousFocused = document.activeElement;
    const overlay = document.createElement("div");
    overlay.className = "vno-dialog-overlay";
    const cur = {
      align: "left", leftCm: 0, rightCm: 0, special: "none", specialCm: 1.27,
      beforePt: 0, afterPt: 0, lineMode: "single", lineValue: 1, contentWidthMm: 160,
      outlineLevel: 0, widowControl: true, keepNext: false, keepLines: false, pageBreakBefore: false, ...current
    };
    const checked = value => (value ? " checked" : "");
    const tabStyle = "padding:6px 14px; border:1px solid #cbd5e1; border-bottom:none; background:#f1f5f9; border-radius:4px 4px 0 0; cursor:pointer; font-size:13px;";
    const fieldStyle = "font-size:12px; font-weight:600; display:block; margin-bottom:4px;";
    const inputStyle = "width:100%; box-sizing:border-box; font-size:13px; padding:5px 8px;";
    const options = (list, selected) => list.map(item => `<option value="${item.id}"${item.id === selected ? " selected" : ""}>${item.label}</option>`).join("");
    overlay.innerHTML = `
      <div class="vno-dialog-box vno-paragraph-dialog" style="width: 520px;" role="dialog" aria-modal="true" aria-labelledby="vno-para-dialog-title">
        <div class="vno-dialog-header">
          <span id="vno-para-dialog-title">Đoạn văn</span>
          <button type="button" class="vno-btn vno-btn-icon-only vno-dialog-close-btn" title="Đóng" aria-label="Đóng">&times;</button>
        </div>
        <div class="vno-dialog-body" style="display:flex; flex-direction:column; gap:14px;">
          <div role="tablist" aria-label="Nhóm tùy chọn đoạn văn" style="display:flex; gap:4px; border-bottom:1px solid #cbd5e1; margin-bottom:-6px;">
            <button type="button" role="tab" id="vno-para-tab-indent" aria-selected="true" aria-controls="vno-para-panel-indent" class="vno-para-tab" style="${tabStyle}">Thụt lề và khoảng cách</button>
            <button type="button" role="tab" id="vno-para-tab-flow" aria-selected="false" aria-controls="vno-para-panel-flow" tabindex="-1" class="vno-para-tab" style="${tabStyle}">Ngắt dòng và ngắt trang</button>
          </div>
          <div id="vno-para-panel-flow" role="tabpanel" aria-labelledby="vno-para-tab-flow" hidden style="display:none; flex-direction:column; gap:10px; min-height:200px;">
            <label style="font-size:13px; display:flex; gap:8px; align-items:flex-start;"><input type="checkbox" id="vno-para-widow"${checked(cur.widowControl)} /> <span><b>Kiểm soát dòng mồ côi/góa</b><br /><span style="color:#64748b; font-size:12px;">Không để một dòng đơn lẻ nằm cuối hoặc đầu trang.</span></span></label>
            <label style="font-size:13px; display:flex; gap:8px; align-items:flex-start;"><input type="checkbox" id="vno-para-keepnext"${checked(cur.keepNext)} /> <span><b>Giữ cùng trang với đoạn kế tiếp</b><br /><span style="color:#64748b; font-size:12px;">Hay dùng cho tiêu đề để không bị tách khỏi nội dung phía dưới.</span></span></label>
            <label style="font-size:13px; display:flex; gap:8px; align-items:flex-start;"><input type="checkbox" id="vno-para-keeplines"${checked(cur.keepLines)} /> <span><b>Giữ các dòng liền nhau</b><br /><span style="color:#64748b; font-size:12px;">Không ngắt đoạn này giữa hai trang.</span></span></label>
            <label style="font-size:13px; display:flex; gap:8px; align-items:flex-start;"><input type="checkbox" id="vno-para-pagebefore"${checked(cur.pageBreakBefore)} /> <span><b>Ngắt trang trước</b><br /><span style="color:#64748b; font-size:12px;">Bắt đầu đoạn này ở một trang mới.</span></span></label>
          </div>
          <div id="vno-para-panel-indent" role="tabpanel" aria-labelledby="vno-para-tab-indent" style="display:flex; flex-direction:column; gap:14px;">
          <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
            <div>
              <label for="vno-para-align" style="${fieldStyle}">Căn lề</label>
              <select id="vno-para-align" class="vno-dialog-input" style="${inputStyle}">${options(ALIGN_OPTIONS, cur.align)}</select>
            </div>
            <div>
              <label for="vno-para-outline" style="${fieldStyle}">Mức đại cương</label>
              <select id="vno-para-outline" class="vno-dialog-input" style="${inputStyle}">${OUTLINE_OPTIONS.map(item => `<option value="${item.id}"${Number(cur.outlineLevel) === item.id ? " selected" : ""}>${item.label}</option>`).join("")}</select>
            </div>
            <div>
              <label for="vno-para-left" style="${fieldStyle}">Thụt lề trái (cm)</label>
              <input type="number" id="vno-para-left" class="vno-dialog-input" min="0" max="50" step="0.1" value="${cur.leftCm}" style="${inputStyle}" />
            </div>
            <div>
              <label for="vno-para-right" style="${fieldStyle}">Thụt lề phải (cm)</label>
              <input type="number" id="vno-para-right" class="vno-dialog-input" min="0" max="50" step="0.1" value="${cur.rightCm}" style="${inputStyle}" />
            </div>
            <div>
              <label for="vno-para-special" style="${fieldStyle}">Đặc biệt</label>
              <select id="vno-para-special" class="vno-dialog-input" style="${inputStyle}">${options(SPECIAL_OPTIONS, cur.special)}</select>
            </div>
            <div>
              <label for="vno-para-special-by" style="${fieldStyle}">Giá trị (cm)</label>
              <input type="number" id="vno-para-special-by" class="vno-dialog-input" min="0" max="50" step="0.1" value="${cur.specialCm}" style="${inputStyle}" />
            </div>
            <div>
              <label for="vno-para-before" style="${fieldStyle}">Cách đoạn trước (pt)</label>
              <input type="number" id="vno-para-before" class="vno-dialog-input" min="0" max="240" step="1" value="${cur.beforePt}" style="${inputStyle}" />
            </div>
            <div>
              <label for="vno-para-after" style="${fieldStyle}">Cách đoạn sau (pt)</label>
              <input type="number" id="vno-para-after" class="vno-dialog-input" min="0" max="240" step="1" value="${cur.afterPt}" style="${inputStyle}" />
            </div>
            <div>
              <label for="vno-para-line" style="${fieldStyle}">Giãn dòng</label>
              <select id="vno-para-line" class="vno-dialog-input" style="${inputStyle}">${options(LINE_MODES, cur.lineMode)}</select>
            </div>
            <div>
              <label for="vno-para-line-by" id="vno-para-line-by-label" style="${fieldStyle}">Giá trị</label>
              <input type="number" id="vno-para-line-by" class="vno-dialog-input" min="0.5" max="1584" step="0.1" value="${cur.lineValue}" style="${inputStyle}" />
            </div>
          </div>
          <div style="border-top:1px solid #e2e8f0; padding-top:10px;">
            <span style="${fieldStyle}">Xem trước</span>
            <div id="vno-para-preview" style="background:#fff; border:1px solid #cbd5e1; border-radius:3px; padding:8px 10px; height:110px; overflow:hidden; font-size:12px; color:#334155;" aria-hidden="true">
              <div style="color:#94a3b8;">Đoạn văn trước đó. Đoạn văn trước đó. Đoạn văn trước đó.</div>
              <div id="vno-para-preview-sample" style="background:#eff6ff;">Đoạn văn đang chọn. Đoạn văn đang chọn. Đoạn văn đang chọn. Đoạn văn đang chọn. Đoạn văn đang chọn.</div>
              <div style="color:#94a3b8;">Đoạn văn kế tiếp. Đoạn văn kế tiếp. Đoạn văn kế tiếp.</div>
            </div>
          </div>
          </div>
          <div id="vno-para-error" role="alert" style="color:#b91c1c; font-size:12px; min-height:16px;"></div>
        </div>
        <div class="vno-dialog-footer" style="display:flex; justify-content:flex-end; gap:8px;">
          <button type="button" class="vno-btn" id="vno-para-tabs-btn" style="margin-right:auto;" title="Mở hộp thoại Dừng tab sau khi áp dụng các thiết lập đoạn văn">Dừng tab…</button>
          <button type="button" class="vno-btn vno-dialog-cancel-btn">Hủy</button>
          <button type="button" class="vno-btn vno-btn-primary vno-dialog-ok-btn">Áp dụng</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const dialogBox = overlay.querySelector(".vno-dialog-box");
    const el = id => overlay.querySelector(id);
    const lineBy = el("#vno-para-line-by");
    const lineSelect = el("#vno-para-line");
    const specialSelect = el("#vno-para-special");
    const specialBy = el("#vno-para-special-by");
    const errorBox = el("#vno-para-error");
    const sample = el("#vno-para-preview-sample");

    const read = () => ({
      align: el("#vno-para-align").value,
      leftCm: el("#vno-para-left").value,
      rightCm: el("#vno-para-right").value,
      special: specialSelect.value,
      specialCm: specialBy.value,
      beforePt: el("#vno-para-before").value,
      afterPt: el("#vno-para-after").value,
      lineMode: lineSelect.value,
      lineValue: lineBy.value,
      outlineLevel: el("#vno-para-outline").value,
      widowControl: el("#vno-para-widow").checked,
      keepNext: el("#vno-para-keepnext").checked,
      keepLines: el("#vno-para-keeplines").checked,
      pageBreakBefore: el("#vno-para-pagebefore").checked
    });

    const tabs = [
      { button: el("#vno-para-tab-indent"), panel: el("#vno-para-panel-indent") },
      { button: el("#vno-para-tab-flow"), panel: el("#vno-para-panel-flow") }
    ];
    const selectTab = index => {
      tabs.forEach((tab, position) => {
        const active = position === index;
        tab.button.setAttribute("aria-selected", active ? "true" : "false");
        tab.button.tabIndex = active ? 0 : -1;
        tab.button.style.background = active ? "#fff" : "#f1f5f9";
        tab.button.style.fontWeight = active ? "700" : "400";
        tab.panel.hidden = !active;
        tab.panel.style.display = active ? "flex" : "none";
      });
    };
    tabs.forEach((tab, index) => {
      tab.button.addEventListener("click", () => selectTab(index));
      tab.button.addEventListener("keydown", event => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        const next = (index + (event.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length;
        selectTab(next);
        tabs[next].button.focus();
      });
    });
    selectTab(0);

    const syncEnabled = () => {
      const mode = lineSelect.value;
      const preset = LINE_MODES.find(item => item.id === mode);
      const editable = mode === "multiple" || mode === "exact";
      lineBy.disabled = !editable;
      if (!editable && preset?.value) lineBy.value = String(preset.value);
      if (mode === "exact" && Number(lineBy.value) < 6) lineBy.value = "18";
      el("#vno-para-line-by-label").textContent = mode === "exact" ? "Giá trị (pt)" : "Giá trị (hệ số)";
      specialBy.disabled = specialSelect.value === "none";
    };

    const updatePreview = () => {
      const result = normalizeParagraphDialogValues(read(), Number(cur.contentWidthMm) || 160);
      errorBox.textContent = result.error || "";
      if (!result.values) return;
      const v = result.values;
      const mmToPx = mm => Math.min(120, mm * 1.5);
      sample.style.textAlign = v.align;
      sample.style.marginLeft = `${mmToPx(v.leftMm)}px`;
      sample.style.marginRight = `${mmToPx(v.rightMm)}px`;
      sample.style.textIndent = `${mmToPx(v.firstLineMm)}px`;
      sample.style.marginTop = `${Math.min(14, v.beforePt / 2)}px`;
      sample.style.marginBottom = `${Math.min(14, v.afterPt / 2)}px`;
      sample.style.lineHeight = v.lineMode === "exact" ? `${Math.min(30, v.lineValue)}px` : String(v.lineMode === "multiple" ? v.lineValue : (LINE_MODES.find(item => item.id === v.lineMode)?.value || 1));
    };

    overlay.addEventListener("input", () => { syncEnabled(); updatePreview(); });
    overlay.addEventListener("change", () => { syncEnabled(); updatePreview(); });
    syncEnabled();
    updatePreview();
    el("#vno-para-align").focus?.();

    const onKeyDown = event => {
      if (event.key === "Escape") { event.preventDefault(); cleanup(null); }
      else if (event.key === "Enter" && event.target?.tagName === "INPUT") { event.preventDefault(); apply(); }
      else if (event.key === "Tab") trapFocus(dialogBox, event);
    };
    function cleanup(result) {
      document.removeEventListener("keydown", onKeyDown);
      overlay.parentNode?.removeChild(overlay);
      previousFocused?.focus?.();
      resolve(result);
    }
    function apply(openTabs = false) {
      const result = normalizeParagraphDialogValues(read(), Number(cur.contentWidthMm) || 160);
      if (result.error) { errorBox.textContent = result.error; return; }
      cleanup(openTabs === true ? { ...result.values, openTabs: true } : result.values);
    }
    el(".vno-dialog-ok-btn").addEventListener("click", () => apply());
    el("#vno-para-tabs-btn").addEventListener("click", () => apply(true));
    el(".vno-dialog-cancel-btn").addEventListener("click", () => cleanup(null));
    el(".vno-dialog-close-btn").addEventListener("click", () => cleanup(null));
    overlay.addEventListener("click", event => { if (event.target === overlay) cleanup(null); });
    document.addEventListener("keydown", onKeyDown);
  });
}
