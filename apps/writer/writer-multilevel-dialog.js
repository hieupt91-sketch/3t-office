const FORMATS = [
  ["decimal", "1, 2, 3"], ["lowerLetter", "a, b, c"], ["upperLetter", "A, B, C"],
  ["lowerRoman", "i, ii, iii"], ["upperRoman", "I, II, III"], ["bullet", "Dấu đầu dòng"]
];
const DEFAULT_LEVEL = index => ({ format: index === 2 ? "lowerLetter" : "decimal", prefix: index === 0 ? "Điều " : "", suffix: index === 1 ? "" : index === 2 ? ")" : ".", start: 1, numberCm: 0.63 * (index + 1), textCm: 1.27 * (index + 1), suffixType: "tab", includeParents: index === 1 });

export async function showWriterMultilevelDialog(initialLevels = null) {
  if (typeof document === "undefined" || !document.body) return null;
  return new Promise(resolve => {
    const levels = Array.from({ length: 9 }, (_, i) => ({ ...DEFAULT_LEVEL(i), ...(initialLevels?.[i] || {}) }));
    const previous = document.activeElement;
    const overlay = document.createElement("div");
    overlay.className = "vno-dialog-overlay";
    overlay.innerHTML = `<div class="vno-dialog-box" style="width:760px;max-width:94vw" role="dialog" aria-modal="true" aria-labelledby="vno-multilevel-title">
      <div class="vno-dialog-header"><span id="vno-multilevel-title">Định nghĩa danh sách đa cấp mới</span><button type="button" class="vno-btn vno-btn-icon-only vno-dialog-close-btn" aria-label="Đóng">×</button></div>
      <div class="vno-dialog-body" style="display:grid;grid-template-columns:120px 1fr;gap:16px">
        <div role="tablist" aria-label="Cấp danh sách" style="display:flex;flex-direction:column;gap:4px">${levels.map((_, i) => `<button type="button" role="tab" data-level="${i}" aria-selected="${i === 0}" class="vno-btn">Cấp ${i + 1}</button>`).join("")}</div>
        <section style="display:flex;flex-direction:column;gap:12px">
          <label>Kiểu số <select id="vno-ml-format" style="margin-left:8px">${FORMATS.map(([value, label]) => `<option value="${value}">${label}</option>`).join("")}</select></label>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            <label>Văn bản trước số <input id="vno-ml-prefix" type="text" maxlength="40" style="display:block;width:100%"></label>
            <label>Văn bản sau số <input id="vno-ml-suffix" type="text" maxlength="20" style="display:block;width:100%"></label>
            <label>Bắt đầu từ <input id="vno-ml-start" type="number" min="1" max="32767" value="1" style="display:block;width:100%"></label>
            <label>Sau số <select id="vno-ml-suffix-type" style="display:block;width:100%"><option value="tab">Tab</option><option value="space">Dấu cách</option><option value="nothing">Không có</option></select></label>
            <label>Vị trí số (cm) <input id="vno-ml-number-cm" type="number" min="0" max="20" step="0.01" style="display:block;width:100%"></label>
            <label>Vị trí chữ (cm) <input id="vno-ml-text-cm" type="number" min="0" max="20" step="0.01" style="display:block;width:100%"></label>
          </div>
          <label><input id="vno-ml-parents" type="checkbox"> Gồm số của các cấp trước trong nhãn</label>
          <fieldset style="border:1px solid #cbd5e1;border-radius:5px;padding:10px"><legend>Xem trước</legend><div id="vno-ml-preview" aria-live="polite" style="font:14px/1.8 sans-serif"></div></fieldset>
          <div id="vno-ml-error" role="alert" style="min-height:18px;color:#b91c1c"></div>
        </section>
      </div>
      <div class="vno-dialog-footer" style="display:flex;justify-content:flex-end;gap:8px"><button type="button" class="vno-btn vno-dialog-close-footer-btn">Hủy</button><button type="button" id="vno-ml-apply" class="vno-btn vno-btn-primary">Áp dụng</button></div>
    </div>`;
    document.body.appendChild(overlay);
    const el = selector => overlay.querySelector(selector);
    let activeLevel = 0;
    let hasShownLevel = false;
    let done = false;
    const readLevel = () => {
      levels[activeLevel] = {
        format: el("#vno-ml-format").value, prefix: el("#vno-ml-prefix").value, suffix: el("#vno-ml-suffix").value,
        start: Number(el("#vno-ml-start").value), suffixType: el("#vno-ml-suffix-type").value,
        numberCm: Number(el("#vno-ml-number-cm").value), textCm: Number(el("#vno-ml-text-cm").value), includeParents: el("#vno-ml-parents").checked
      };
    };
    const paintPreview = () => {
      readLevel();
      const preview = el("#vno-ml-preview");
      preview.replaceChildren();
      levels.slice(0, 3).forEach((level, i) => {
        const row = document.createElement("div");
        row.style.paddingLeft = `${i * 24}px`;
        const mark = level.format === "bullet" ? "•" : `${level.prefix}${i === 0 ? "1" : level.includeParents ? `${i === 2 ? "1.a" : "1.1"}` : i === 2 ? "a" : "1"}${level.suffix}`;
        row.append(document.createTextNode(`${mark || "•"} `));
        const text = document.createElement("span");
        text.style.color = "#64748b";
        text.textContent = `Nội dung cấp ${i + 1}`;
        row.append(text);
        preview.append(row);
      });
    };
    const showLevel = index => {
      if (hasShownLevel) readLevel();
      activeLevel = index;
      hasShownLevel = true;
      const level = levels[index];
      overlay.querySelectorAll("[data-level]").forEach(tab => tab.setAttribute("aria-selected", String(Number(tab.dataset.level) === index)));
      el("#vno-ml-format").value = level.format; el("#vno-ml-prefix").value = level.prefix; el("#vno-ml-suffix").value = level.suffix;
      el("#vno-ml-start").value = level.start; el("#vno-ml-suffix-type").value = level.suffixType;
      el("#vno-ml-number-cm").value = level.numberCm; el("#vno-ml-text-cm").value = level.textCm; el("#vno-ml-parents").checked = level.includeParents;
      paintPreview();
    };
    const close = value => { if (done) return; done = true; overlay.remove(); previous?.focus?.(); resolve(value); };
    overlay.querySelectorAll("[data-level]").forEach(tab => tab.addEventListener("click", () => showLevel(Number(tab.dataset.level))));
    ["#vno-ml-format", "#vno-ml-prefix", "#vno-ml-suffix", "#vno-ml-start", "#vno-ml-number-cm", "#vno-ml-text-cm", "#vno-ml-parents"].forEach(selector => el(selector).addEventListener("input", paintPreview));
    el("#vno-ml-apply").addEventListener("click", () => {
      readLevel();
      const invalid = levels.findIndex(level => !Number.isInteger(level.start) || level.start < 1 || level.start > 32767 || !Number.isFinite(level.numberCm) || !Number.isFinite(level.textCm) || level.numberCm < 0 || level.textCm < level.numberCm || level.textCm > 20);
      if (invalid >= 0) { el("#vno-ml-error").textContent = `Kiểm tra lại số bắt đầu và vị trí thụt lề ở cấp ${invalid + 1}.`; showLevel(invalid); return; }
      close({ levels });
    });
    overlay.querySelectorAll(".vno-dialog-close-btn,.vno-dialog-close-footer-btn").forEach(button => button.addEventListener("click", () => close(null)));
    overlay.addEventListener("keydown", event => { if (event.key === "Escape") { event.preventDefault(); close(null); } });
    showLevel(0); el("#vno-ml-format").focus();
  });
}
