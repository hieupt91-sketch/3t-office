/**
 * 3T Doc — Dừng tab (Tab stops): vị trí tab tùy chỉnh cho đoạn văn (căn trái/giữa/phải, ký tự dẫn chấm/gạch ngang/gạch dưới).
 * Lưu trong đoạn văn ở thuộc tính data-vno-tabs="vị trí cm:căn:ký tự dẫn;..." (ví dụ "8:l:n;15.5:r:d"); căn l|c|r, ký tự dẫn n|d|h|u.
 * Màn hình: _layoutTabStopsIn() đặt bề rộng từng ký tự Tab; DOCX: w:tabs (ooxml_zip_patch._writer_tabs_xml).
 */

export const TAB_ALIGNMENTS = [
  { id: "l", label: "Trái" },
  { id: "c", label: "Giữa" },
  { id: "r", label: "Phải" },
  { id: "dec", label: "Thập phân" },
  { id: "bar", label: "Thanh" }
];

export const TAB_LEADERS = [
  { id: "n", label: "1 Không có" },
  { id: "d", label: "2 Dấu chấm ……" },
  { id: "h", label: "3 Gạch ngang ----" },
  { id: "u", label: "4 Gạch dưới ____" }
];

const MAX_STOPS = 32;
const MAX_CM = 100;

/** "8:l:n;15.5:r:d" -> [{ cm, align, leader }] đã sắp tăng dần, bỏ mục sai và trùng vị trí. */
export function parseTabStops(value) {
  const stops = [];
  for (const part of String(value || "").split(";")) {
    const [position, align = "l", leader = "n"] = part.split(":");
    const cm = Number(String(position).replace(",", "."));
    if (!Number.isFinite(cm) || cm <= 0 || cm > MAX_CM) continue;
    stops.push({
      cm: Math.round(cm * 100) / 100,
      align: TAB_ALIGNMENTS.some(item => item.id === align) ? align : "l",
      leader: TAB_LEADERS.some(item => item.id === leader) ? leader : "n"
    });
  }
  stops.sort((a, b) => a.cm - b.cm);
  return stops.filter((stop, index) => index === 0 || stop.cm !== stops[index - 1].cm).slice(0, MAX_STOPS);
}

export function serializeTabStops(stops) {
  return (Array.isArray(stops) ? stops : []).map(stop => `${stop.cm}:${stop.align || "l"}:${stop.leader || "n"}`).join(";");
}

/** Thêm/thay một dừng tab (cùng vị trí thì thay). Trả về { stops } hoặc { error } tiếng Việt. */
export function setTabStop(stops, { cm, align = "l", leader = "n" }) {
  const position = Number(String(cm).replace(",", "."));
  if (!Number.isFinite(position) || position <= 0) return { error: "Hãy nhập vị trí dừng tab là một số lớn hơn 0 (đơn vị cm)." };
  if (position > MAX_CM) return { error: `Vị trí dừng tab tối đa ${MAX_CM} cm.` };
  const next = (stops || []).filter(stop => Math.abs(stop.cm - position) > 0.004);
  if (next.length >= MAX_STOPS) return { error: `Tối đa ${MAX_STOPS} dừng tab cho một đoạn.` };
  next.push({ cm: Math.round(position * 100) / 100, align, leader });
  return { stops: parseTabStops(serializeTabStops(next)) };
}

/**
 * Bề rộng (px) và ký tự dẫn của ký tự Tab bắt đầu tại x (px, tính từ lề chữ), theo các dừng tab (px). Quy ước như Word:
 * dừng tab TRÁI: chữ sau Tab bắt đầu tại dừng; GIỮA: chữ sau Tab (đến Tab/hết dòng kế) căn giữa quanh dừng; PHẢI: chữ kết thúc tại dừng.
 * nextWidth = bề rộng (px) của đoạn chữ ngay sau Tab. Không còn dừng nào phía sau x thì dùng bước mặc định.
 */
export function resolveTab(x, nextWidth, stops, defaultStepPx) {
  const stop = stops.find(item => item.px > x + 0.5);
  if (!stop) {
    const step = defaultStepPx > 0 ? defaultStepPx : 48;
    return { width: (Math.floor(x / step) + 1) * step - x, leader: "n", align: "l" };
  }
  const full = stop.px - x;
  let width = Math.max(0, full);
  if (stop.align === "c") {
    width = Math.max(0, full - nextWidth / 2);
  } else if (stop.align === "r" || stop.align === "dec") {
    width = Math.max(0, full - nextWidth);
  } else if (stop.align === "bar") {
    width = Math.max(0, full);
  }
  return { width, leader: stop.leader, align: stop.align };
}

export function tabWidthPx(x, nextWidth, stops, defaultStepPx) {
  return resolveTab(x, nextWidth, stops, defaultStepPx).width;
}
const LEADER_BACKGROUND = {
  d: "radial-gradient(circle at 50% 78%, currentColor 0.9px, transparent 1.3px)",
  h: "linear-gradient(currentColor, currentColor)",
  u: "linear-gradient(currentColor, currentColor)"
};
const LEADER_SIZE = { d: "5px 100%", h: "7px 1px", u: "100% 1px" };

/** Đặt kiểu hiển thị cho một ký tự Tab: bề rộng và ký tự dẫn. */
export function styleTabElement(tab, widthPx, leader, align = "l") {
  tab.style.display = "inline-block";
  tab.style.width = `${Math.max(0, Math.round(widthPx * 100) / 100)}px`;
  tab.style.whiteSpace = "pre";
  tab.style.overflow = "hidden";
  tab.style.verticalAlign = "baseline";
  tab.style.textAlign = "left";
  tab.style.height = "1em";
  tab.style.color = "inherit";
  if (align === "bar") {
    tab.style.borderRight = "1px solid currentColor";
  } else {
    tab.style.borderRight = "";
  }
  if (leader && leader !== "n") {
    tab.style.backgroundImage = LEADER_BACKGROUND[leader];
    tab.style.backgroundSize = LEADER_SIZE[leader];
    tab.style.backgroundRepeat = leader === "u" ? "no-repeat" : "repeat-x";
    tab.style.backgroundPosition = leader === "h" ? "0 72%" : leader === "u" ? "0 90%" : "0 0";
  } else {
    tab.style.backgroundImage = "";
    tab.style.backgroundSize = "";
    tab.style.backgroundRepeat = "";
    tab.style.backgroundPosition = "";
  }
}

function trapFocus(box, event) {
  if (event.key !== "Tab") return;
  const items = Array.from(box.querySelectorAll("button:not([disabled]), input:not([disabled]), select:not([disabled])"));
  if (!items.length) return;
  const first = items[0];
  const last = items[items.length - 1];
  if (event.shiftKey && (document.activeElement === first || !box.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && (document.activeElement === last || !box.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
}

/** @returns {Promise<Array|null>} danh sách dừng tab mới, hoặc null nếu hủy */
export async function showTabStopsDialog(current = [], { contentWidthCm = 16, defaultStepCm = 1.27 } = {}) {
  if (typeof document === "undefined" || !document.body) return null;
  return new Promise(resolve => {
    const previous = document.activeElement;
    let stops = parseTabStops(serializeTabStops(current));
    let defaultStep = defaultStepCm;
    const overlay = document.createElement("div");
    overlay.className = "vno-dialog-overlay";
    const options = list => list.map(item => `<option value="${item.id}">${item.label}</option>`).join("");
    const field = "font-size:12px; font-weight:600; display:block; margin-bottom:4px;";
    const input = "width:100%; box-sizing:border-box; font-size:13px; padding:5px 8px;";
    overlay.innerHTML = `
      <div class="vno-dialog-box vno-tab-stops-dialog" style="width: 500px;" role="dialog" aria-modal="true" aria-labelledby="vno-tabs-title">
        <div class="vno-dialog-header">
          <span id="vno-tabs-title">Điểm dừng Tab</span>
          <button type="button" class="vno-btn vno-btn-icon-only vno-dialog-close-btn" title="Đóng" aria-label="Đóng">&times;</button>
        </div>
        <div class="vno-dialog-body" style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
          <div>
            <label for="vno-tabs-pos" style="${field}">Vị trí dừng tab (cm)</label>
            <input id="vno-tabs-pos" class="vno-dialog-input" type="number" min="0.1" max="${MAX_CM}" step="0.1" style="${input}" />
            <div style="font-size:12px; color:#64748b; margin-top:4px;">Vùng chữ rộng ${String(Math.round(contentWidthCm * 10) / 10).replace(".", ",")} cm.</div>
          </div>
          <div>
            <label for="vno-tabs-default" style="${field}">Điểm dừng mặc định (cm)</label>
            <input id="vno-tabs-default" class="vno-dialog-input" type="text" value="${String(defaultStepCm).replace(".", ",")} cm" style="${input}" />
          </div>
          <div style="grid-column: 1 / -1;">
            <label for="vno-tabs-list" style="${field}">Các dừng tab hiện có</label>
            <select id="vno-tabs-list" class="vno-dialog-input" size="5" style="${input}; min-height:90px;" aria-label="Các dừng tab hiện có"></select>
          </div>
          <div>
            <label for="vno-tabs-align" style="${field}">Căn chữ tại dừng tab</label>
            <select id="vno-tabs-align" class="vno-dialog-input" style="${input}">${options(TAB_ALIGNMENTS)}</select>
          </div>
          <div>
            <label for="vno-tabs-leader" style="${field}">Ký tự dẫn</label>
            <select id="vno-tabs-leader" class="vno-dialog-input" style="${input}">${options(TAB_LEADERS)}</select>
          </div>
          <div style="grid-column: 1 / -1; display:flex; gap:8px;">
            <button type="button" class="vno-btn" id="vno-tabs-set">Đặt</button>
            <button type="button" class="vno-btn" id="vno-tabs-clear">Xóa</button>
            <button type="button" class="vno-btn" id="vno-tabs-clear-all">Xóa tất cả</button>
          </div>
          <div id="vno-tabs-error" role="alert" style="grid-column: 1 / -1; color:#b91c1c; font-size:12px; min-height:16px;"></div>
        </div>
        <div class="vno-dialog-footer" style="display:flex; justify-content:flex-end; gap:8px;">
          <button type="button" class="vno-btn vno-dialog-cancel-btn">Hủy</button>
          <button type="button" class="vno-btn vno-btn-primary vno-dialog-ok-btn">Đồng ý</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const box = overlay.querySelector(".vno-dialog-box");
    const el = id => overlay.querySelector(id);
    const errorBox = el("#vno-tabs-error");
    const list = el("#vno-tabs-list");
    const describe = stop => {
      const alignItem = TAB_ALIGNMENTS.find(i => i.id === stop.align);
      const alignLabel = alignItem ? alignItem.label : "Trái";
      const leaderItem = TAB_LEADERS.find(i => i.id === stop.leader);
      const leaderLabel = leaderItem && stop.leader !== "n" ? ` — dẫn ${leaderItem.label.replace(/^\d+\s*/, "").split(" ")[0].toLowerCase()}` : "";
      return `${String(stop.cm).replace(".", ",")} cm — ${alignLabel}${leaderLabel}`;
    };
    const refresh = () => {
      list.innerHTML = stops.map((stop, index) => `<option value="${index}">${describe(stop)}</option>`).join("");
    };
    list.addEventListener("change", () => {
      const stop = stops[Number(list.value)];
      if (!stop) return;
      el("#vno-tabs-pos").value = stop.cm;
      el("#vno-tabs-align").value = stop.align;
      el("#vno-tabs-leader").value = stop.leader;
    });
    const setStop = () => {
      const result = setTabStop(stops, { cm: el("#vno-tabs-pos").value, align: el("#vno-tabs-align").value, leader: el("#vno-tabs-leader").value });
      errorBox.textContent = result.error || "";
      if (result.stops) { stops = result.stops; refresh(); el("#vno-tabs-pos").value = ""; el("#vno-tabs-pos").focus(); }
    };
    el("#vno-tabs-set").addEventListener("click", setStop);
    el("#vno-tabs-clear").addEventListener("click", () => {
      const index = Number(list.value);
      if (Number.isInteger(index) && stops[index]) { stops.splice(index, 1); refresh(); errorBox.textContent = ""; }
      else errorBox.textContent = "Hãy chọn một dừng tab trong danh sách để xóa.";
    });
    el("#vno-tabs-clear-all").addEventListener("click", () => { stops = []; refresh(); errorBox.textContent = ""; });
    refresh();
    el("#vno-tabs-pos").focus();
    const onKeyDown = event => {
      if (event.key === "Escape") { event.preventDefault(); cleanup(null); }
      else if (event.key === "Enter" && event.target?.id === "vno-tabs-pos") { event.preventDefault(); setStop(); }
      else if (event.key === "Tab") trapFocus(box, event);
    };
    function cleanup(result) {
      document.removeEventListener("keydown", onKeyDown);
      overlay.parentNode?.removeChild(overlay);
      previous?.focus?.();
      resolve(result);
    }
    el(".vno-dialog-ok-btn").addEventListener("click", () => {
      // Một số trong ô vị trí chưa bấm Đặt thì tự đặt luôn, như Word.
      if (String(el("#vno-tabs-pos").value).trim()) { setStop(); if (errorBox.textContent) return; }
      cleanup(stops);
    });
    el(".vno-dialog-cancel-btn").addEventListener("click", () => cleanup(null));
    el(".vno-dialog-close-btn").addEventListener("click", () => cleanup(null));
    overlay.addEventListener("click", event => { if (event.target === overlay) cleanup(null); });
    document.addEventListener("keydown", onKeyDown);
  });
}
