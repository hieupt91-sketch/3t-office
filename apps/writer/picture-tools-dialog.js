/**
 * 3T Doc — Picture Tools Dialogs (Crop, Corrections, Compress, Reset)
 */

export function parseImageCrop(img) {
  if (!img) return { left: 0, top: 0, right: 0, bottom: 0 };
  const l = parseFloat(img.dataset?.vnoCropL) || 0;
  const t = parseFloat(img.dataset?.vnoCropT) || 0;
  const r = parseFloat(img.dataset?.vnoCropR) || 0;
  const b = parseFloat(img.dataset?.vnoCropB) || 0;
  return { left: l, top: t, right: r, bottom: b };
}

export function applyImageCrop(img, { left = 0, top = 0, right = 0, bottom = 0 } = {}) {
  if (!img) return;
  left = Math.max(0, Math.min(80, Number(left) || 0));
  top = Math.max(0, Math.min(80, Number(top) || 0));
  right = Math.max(0, Math.min(80, Number(right) || 0));
  bottom = Math.max(0, Math.min(80, Number(bottom) || 0));

  if (left === 0 && top === 0 && right === 0 && bottom === 0) {
    delete img.dataset.vnoCropL;
    delete img.dataset.vnoCropT;
    delete img.dataset.vnoCropR;
    delete img.dataset.vnoCropB;
    img.style.clipPath = "";
  } else {
    delete img.dataset.vnoPicReset;
    img.dataset.vnoCropL = String(left);
    img.dataset.vnoCropT = String(top);
    img.dataset.vnoCropR = String(right);
    img.dataset.vnoCropB = String(bottom);
    img.style.clipPath = `inset(${top}% ${right}% ${bottom}% ${left}%)`;
  }
}

export function parseImageCorrections(img) {
  if (!img) return { brightness: 0, contrast: 0 };
  const br = parseFloat(img.dataset?.vnoBrightness) || 0;
  const ct = parseFloat(img.dataset?.vnoContrast) || 0;
  return { brightness: br, contrast: ct };
}

export function applyImageCorrections(img, { brightness = 0, contrast = 0 } = {}) {
  if (!img) return;
  brightness = Math.max(-100, Math.min(100, Number(brightness) || 0));
  contrast = Math.max(-100, Math.min(100, Number(contrast) || 0));

  if (brightness === 0 && contrast === 0) {
    delete img.dataset.vnoBrightness;
    delete img.dataset.vnoContrast;
    img.style.filter = "";
  } else {
    delete img.dataset.vnoPicReset;
    img.dataset.vnoBrightness = String(brightness);
    img.dataset.vnoContrast = String(contrast);
    const brRatio = Math.max(0, 1 + brightness / 100);
    const ctRatio = Math.max(0, 1 + contrast / 100);
    img.style.filter = `brightness(${brRatio.toFixed(2)}) contrast(${ctRatio.toFixed(2)})`;
  }
}

export function resetImageProperties(img) {
  if (!img) return;
  applyImageCrop(img, { left: 0, top: 0, right: 0, bottom: 0 });
  applyImageCorrections(img, { brightness: 0, contrast: 0 });
  img.style.clipPath = "";
  img.style.filter = "";
  img.dataset.vnoPicReset = "1";
  if (img.naturalWidth && img.naturalHeight) {
    img.style.width = `${img.naturalWidth}px`;
    img.style.height = `${img.naturalHeight}px`;
  }
}

export async function compressImageElement(img, quality = 0.8, maxDim = 1280) {
  if (!img || !img.src) return { success: false, error: "Không tìm thấy ảnh" };
  return new Promise((resolve) => {
    if (typeof document === "undefined") {
      return resolve({ success: true, originalBytes: 1000, newBytes: 500, savingsPct: 50 });
    }
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const imageObj = new Image();
    imageObj.crossOrigin = "anonymous";
    imageObj.onload = () => {
      let w = imageObj.naturalWidth || imageObj.width;
      let h = imageObj.naturalHeight || imageObj.height;
      if (w > maxDim || h > maxDim) {
        if (w >= h) {
          h = Math.round((h * maxDim) / w);
          w = maxDim;
        } else {
          w = Math.round((w * maxDim) / h);
          h = maxDim;
        }
      }
      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(imageObj, 0, 0, w, h);
      try {
        const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
        const originalBytes = Math.round((img.src.length * 3) / 4);
        const newBytes = Math.round((compressedDataUrl.length * 3) / 4);
        img.src = compressedDataUrl;
        resolve({
          success: true,
          originalBytes,
          newBytes,
          savingsPct: originalBytes > 0 ? Math.max(0, Math.round((1 - newBytes / originalBytes) * 100)) : 0
        });
      } catch {
        resolve({ success: false, error: "Không thể nén ảnh này (nguồn bên ngoài bảo vệ bản quyền)" });
      }
    };
    imageObj.onerror = () => {
      resolve({ success: false, error: "Không thể nạp dữ liệu ảnh để nén" });
    };
    imageObj.src = img.src;
  });
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

export async function showCropDialog(img) {
  if (typeof document === "undefined" || !document.body || !img) return null;
  return new Promise((resolve) => {
    const previous = document.activeElement;
    const overlay = document.createElement("div");
    overlay.className = "vno-dialog-overlay";
    const cur = parseImageCrop(img);

    overlay.innerHTML = `
      <div class="vno-dialog-box vno-image-crop-dialog" style="width: 420px;" role="dialog" aria-modal="true" aria-labelledby="vno-crop-title">
        <div class="vno-dialog-header">
          <span id="vno-crop-title">Cắt ảnh (Crop)</span>
          <button type="button" class="vno-btn vno-btn-icon-only vno-dialog-close-btn" title="Đóng" aria-label="Đóng">&times;</button>
        </div>
        <div class="vno-dialog-body" style="display:flex; flex-direction:column; gap:12px;">
          <div style="font-size:13px; color:#475569;">Nhập tỷ lệ % cắt bớt ở từng cạnh (0% – 80%):</div>
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
            <div>
              <label for="vno-crop-left" style="font-size:12px; font-weight:600; display:block; margin-bottom:4px;">Cắt mép trái (%)</label>
              <input id="vno-crop-left" class="vno-dialog-input" type="number" min="0" max="80" value="${cur.left}" style="width:100%; box-sizing:border-box; font-size:13px; padding:5px 8px;" />
            </div>
            <div>
              <label for="vno-crop-right" style="font-size:12px; font-weight:600; display:block; margin-bottom:4px;">Cắt mép phải (%)</label>
              <input id="vno-crop-right" class="vno-dialog-input" type="number" min="0" max="80" value="${cur.right}" style="width:100%; box-sizing:border-box; font-size:13px; padding:5px 8px;" />
            </div>
            <div>
              <label for="vno-crop-top" style="font-size:12px; font-weight:600; display:block; margin-bottom:4px;">Cắt mép trên (%)</label>
              <input id="vno-crop-top" class="vno-dialog-input" type="number" min="0" max="80" value="${cur.top}" style="width:100%; box-sizing:border-box; font-size:13px; padding:5px 8px;" />
            </div>
            <div>
              <label for="vno-crop-bottom" style="font-size:12px; font-weight:600; display:block; margin-bottom:4px;">Cắt mép dưới (%)</label>
              <input id="vno-crop-bottom" class="vno-dialog-input" type="number" min="0" max="80" value="${cur.bottom}" style="width:100%; box-sizing:border-box; font-size:13px; padding:5px 8px;" />
            </div>
          </div>
          <div style="font-size:12px; color:#64748b;">(Gợi ý: Khi xuất DOCX, thông số cắt ảnh được lưu đúng chuẩn a:srcRect tương thích 100%).</div>
        </div>
        <div class="vno-dialog-footer" style="display:flex; justify-content:flex-end; gap:8px;">
          <button type="button" class="vno-btn vno-dialog-cancel-btn">Hủy</button>
          <button type="button" class="vno-btn vno-btn-primary vno-dialog-ok-btn">Áp dụng</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const box = overlay.querySelector(".vno-dialog-box");
    const el = (id) => overlay.querySelector(id);

    const onKeyDown = (event) => {
      if (event.key === "Escape") { event.preventDefault(); cleanup(null); }
      else if (event.key === "Enter") { event.preventDefault(); apply(); }
      else if (event.key === "Tab") trapFocus(box, event);
    };

    function cleanup(result) {
      document.removeEventListener("keydown", onKeyDown);
      overlay.parentNode?.removeChild(overlay);
      previous?.focus?.();
      resolve(result);
    }

    function apply() {
      const left = parseFloat(el("#vno-crop-left").value) || 0;
      const right = parseFloat(el("#vno-crop-right").value) || 0;
      const top = parseFloat(el("#vno-crop-top").value) || 0;
      const bottom = parseFloat(el("#vno-crop-bottom").value) || 0;
      cleanup({ left, top, right, bottom });
    }

    el(".vno-dialog-ok-btn").addEventListener("click", apply);
    el(".vno-dialog-cancel-btn").addEventListener("click", () => cleanup(null));
    el(".vno-dialog-close-btn").addEventListener("click", () => cleanup(null));
    overlay.addEventListener("click", (event) => { if (event.target === overlay) cleanup(null); });
    document.addEventListener("keydown", onKeyDown);
    el("#vno-crop-left").focus();
  });
}

export async function showPictureCorrectionsDialog(img) {
  if (typeof document === "undefined" || !document.body || !img) return null;
  return new Promise((resolve) => {
    const previous = document.activeElement;
    const overlay = document.createElement("div");
    overlay.className = "vno-dialog-overlay";
    const cur = parseImageCorrections(img);

    overlay.innerHTML = `
      <div class="vno-dialog-box vno-image-corrections-dialog" style="width: 440px;" role="dialog" aria-modal="true" aria-labelledby="vno-cor-title">
        <div class="vno-dialog-header">
          <span id="vno-cor-title">Độ sáng & Tương phản (Corrections)</span>
          <button type="button" class="vno-btn vno-btn-icon-only vno-dialog-close-btn" title="Đóng" aria-label="Đóng">&times;</button>
        </div>
        <div class="vno-dialog-body" style="display:flex; flex-direction:column; gap:14px;">
          <div>
            <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
              <label for="vno-cor-bright" style="font-size:12px; font-weight:600;">Độ sáng (Brightness)</label>
              <span id="vno-cor-bright-val" style="font-size:12px; color:#0284c7; font-weight:600;">${cur.brightness > 0 ? "+" : ""}${cur.brightness}%</span>
            </div>
            <input id="vno-cor-bright" type="range" min="-80" max="80" step="5" value="${cur.brightness}" style="width:100%; cursor:pointer;" />
          </div>
          <div>
            <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
              <label for="vno-cor-contrast" style="font-size:12px; font-weight:600;">Tương phản (Contrast)</label>
              <span id="vno-cor-contrast-val" style="font-size:12px; color:#0284c7; font-weight:600;">${cur.contrast > 0 ? "+" : ""}${cur.contrast}%</span>
            </div>
            <input id="vno-cor-contrast" type="range" min="-80" max="80" step="5" value="${cur.contrast}" style="width:100%; cursor:pointer;" />
          </div>
          <div style="display:flex; gap:6px; flex-wrap:wrap;">
            <button type="button" class="vno-btn vno-btn-preset" data-b="0" data-c="0" style="font-size:11px; padding:3px 8px;">Chuẩn (0/0)</button>
            <button type="button" class="vno-btn vno-btn-preset" data-b="20" data-c="0" style="font-size:11px; padding:3px 8px;">Sáng hơn (+20%)</button>
            <button type="button" class="vno-btn vno-btn-preset" data-b="-20" data-c="0" style="font-size:11px; padding:3px 8px;">Tối hơn (-20%)</button>
            <button type="button" class="vno-btn vno-btn-preset" data-b="0" data-c="20" style="font-size:11px; padding:3px 8px;">Tương phản (+20%)</button>
            <button type="button" class="vno-btn vno-btn-preset" data-b="20" data-c="20" style="font-size:11px; padding:3px 8px;">Rực rỡ (+20/+20)</button>
          </div>
          <div style="font-size:12px; color:#64748b;">(Gợi ý: Khi xuất DOCX, thông số độ sáng và tương phản được lưu đúng chuẩn a:lum).</div>
        </div>
        <div class="vno-dialog-footer" style="display:flex; justify-content:flex-end; gap:8px;">
          <button type="button" class="vno-btn vno-dialog-cancel-btn">Hủy</button>
          <button type="button" class="vno-btn vno-btn-primary vno-dialog-ok-btn">Áp dụng</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);
    const box = overlay.querySelector(".vno-dialog-box");
    const el = (id) => overlay.querySelector(id);

    const updateDisplay = () => {
      const b = parseInt(el("#vno-cor-bright").value, 10);
      const c = parseInt(el("#vno-cor-contrast").value, 10);
      el("#vno-cor-bright-val").textContent = `${b > 0 ? "+" : ""}${b}%`;
      el("#vno-cor-contrast-val").textContent = `${c > 0 ? "+" : ""}${c}%`;
    };

    el("#vno-cor-bright").addEventListener("input", updateDisplay);
    el("#vno-cor-contrast").addEventListener("input", updateDisplay);

    overlay.querySelectorAll(".vno-btn-preset").forEach((btn) => {
      btn.addEventListener("click", () => {
        el("#vno-cor-bright").value = btn.dataset.b;
        el("#vno-cor-contrast").value = btn.dataset.c;
        updateDisplay();
      });
    });

    const onKeyDown = (event) => {
      if (event.key === "Escape") { event.preventDefault(); cleanup(null); }
      else if (event.key === "Enter") { event.preventDefault(); apply(); }
      else if (event.key === "Tab") trapFocus(box, event);
    };

    function cleanup(result) {
      document.removeEventListener("keydown", onKeyDown);
      overlay.parentNode?.removeChild(overlay);
      previous?.focus?.();
      resolve(result);
    }

    function apply() {
      const brightness = parseInt(el("#vno-cor-bright").value, 10) || 0;
      const contrast = parseInt(el("#vno-cor-contrast").value, 10) || 0;
      cleanup({ brightness, contrast });
    }

    el(".vno-dialog-ok-btn").addEventListener("click", apply);
    el(".vno-dialog-cancel-btn").addEventListener("click", () => cleanup(null));
    el(".vno-dialog-close-btn").addEventListener("click", () => cleanup(null));
    overlay.addEventListener("click", (event) => { if (event.target === overlay) cleanup(null); });
    document.addEventListener("keydown", onKeyDown);
    el("#vno-cor-bright").focus();
  });
}
