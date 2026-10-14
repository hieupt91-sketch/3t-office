/**
 * 3T Doc — Text Effects (Outline, Shadow, Glow) Dialog & Format Utilities
 */

export const OUTLINE_WIDTHS = [
  { id: "0.25", label: "1/4 pt", emu: 3175, px: 0.33 },
  { id: "0.5", label: "1/2 pt", emu: 6350, px: 0.67 },
  { id: "0.75", label: "3/4 pt", emu: 9525, px: 1 },
  { id: "1", label: "1 pt", emu: 12700, px: 1.33 },
  { id: "1.5", label: "1.5 pt", emu: 19050, px: 2 },
  { id: "2", label: "2 pt", emu: 25400, px: 2.67 },
  { id: "3", label: "3 pt", emu: 38100, px: 4 },
  { id: "4.5", label: "4.5 pt", emu: 57150, px: 6 },
  { id: "6", label: "6 pt", emu: 76200, px: 8 }
];

export const SHADOW_PRESETS = [
  { id: "off", label: "Không có bóng", dir: 0, dist: 0, blur: 0, css: "" },
  { id: "bottom-right", label: "Dưới - Phải (Mặc định)", dir: 2700000, dist: 38100, blur: 50800, css: "2px 2px 3px rgba(0,0,0,0.5)" },
  { id: "bottom", label: "Dưới", dir: 5400000, dist: 38100, blur: 50800, css: "0px 3px 3px rgba(0,0,0,0.5)" },
  { id: "bottom-left", label: "Dưới - Trái", dir: 8100000, dist: 38100, blur: 50800, css: "-2px 2px 3px rgba(0,0,0,0.5)" },
  { id: "top-right", label: "Trên - Phải", dir: 18900000, dist: 38100, blur: 50800, css: "2px -2px 3px rgba(0,0,0,0.5)" },
  { id: "top", label: "Trên", dir: 16200000, dist: 38100, blur: 50800, css: "0px -3px 3px rgba(0,0,0,0.5)" },
  { id: "top-left", label: "Trên - Trái", dir: 13500000, dist: 38100, blur: 50800, css: "-2px -2px 3px rgba(0,0,0,0.5)" }
];

export const GLOW_PRESETS = [
  { id: "off", label: "Không phát sáng", rad: 0, cssPx: 0 },
  { id: "5pt", label: "5 pt", rad: 63500, cssPx: 5 },
  { id: "8pt", label: "8 pt (Chuẩn)", rad: 101600, cssPx: 8 },
  { id: "11pt", label: "11 pt", rad: 139700, cssPx: 11 },
  { id: "18pt", label: "18 pt", rad: 228600, cssPx: 18 }
];

export function parseTextEffects(element) {
  if (!element) return { outline: null, shadow: null, glow: null };
  const ds = element.dataset || {};

  let outline = null;
  if (ds.vnoOutlineColor || ds.vnoOutlineWidth) {
    outline = {
      color: ds.vnoOutlineColor || "#000000",
      widthEmu: parseInt(ds.vnoOutlineWidth, 10) || 12700
    };
  } else if (element.style && (element.style.webkitTextStroke || element.style.textStroke)) {
    const stroke = element.style.webkitTextStroke || element.style.textStroke;
    const m = stroke.match(/([\d.]+)px\s+(#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|[a-zA-Z]+)/);
    if (m) {
      outline = { color: m[2], widthEmu: Math.round(parseFloat(m[1]) * 9525) };
    }
  }

  let shadow = null;
  if (ds.vnoShadow === "1" || ds.vnoShadowPreset) {
    shadow = {
      preset: ds.vnoShadowPreset || "bottom-right",
      color: ds.vnoShadowColor || "#000000",
      blurEmu: parseInt(ds.vnoShadowBlur, 10) || 50800,
      distEmu: parseInt(ds.vnoShadowDist, 10) || 38100,
      dir: parseInt(ds.vnoShadowDir, 10) || 5400000,
      alpha: parseInt(ds.vnoShadowAlpha, 10) || 50000
    };
  }

  let glow = null;
  if (ds.vnoGlowColor || ds.vnoGlowRad) {
    glow = {
      color: ds.vnoGlowColor || "#2563EB",
      radEmu: parseInt(ds.vnoGlowRad, 10) || 101600,
      alpha: parseInt(ds.vnoGlowAlpha, 10) || 60000
    };
  }

  return { outline, shadow, glow };
}

export function buildTextEffectsCss({ outline = null, shadow = null, glow = null } = {}) {
  const styles = {};
  if (outline && outline.enabled !== false) {
    const widthEntry = OUTLINE_WIDTHS.find(w => w.emu === outline.widthEmu) || OUTLINE_WIDTHS[3];
    const px = widthEntry ? widthEntry.px : 1;
    styles["-webkit-text-stroke"] = `${px}px ${outline.color || "#000000"}`;
  } else {
    styles["-webkit-text-stroke"] = "";
  }

  const shadows = [];
  if (shadow && shadow.enabled !== false && shadow.preset !== "off") {
    const sp = SHADOW_PRESETS.find(p => p.id === (shadow.preset || "bottom-right")) || SHADOW_PRESETS[1];
    if (sp.css) {
      shadows.push(sp.css);
    }
  }

  if (glow && glow.enabled !== false && glow.radEmu > 0) {
    const gp = GLOW_PRESETS.find(p => p.rad === glow.radEmu) || GLOW_PRESETS[2];
    const px = gp ? gp.cssPx : 8;
    const color = glow.color || "#2563EB";
    shadows.push(`0 0 ${px}px ${color}`);
  }

  styles["text-shadow"] = shadows.join(", ");
  return styles;
}

export function applyTextEffectsToSpan(span, { outline = null, shadow = null, glow = null } = {}) {
  if (!span) return;

  // Outline
  if (outline && outline.enabled !== false) {
    span.dataset.vnoOutlineColor = outline.color || "#000000";
    span.dataset.vnoOutlineWidth = String(outline.widthEmu || 12700);
    const widthEntry = OUTLINE_WIDTHS.find(w => w.emu === (outline.widthEmu || 12700)) || OUTLINE_WIDTHS[3];
    span.style.webkitTextStroke = `${widthEntry.px}px ${outline.color || "#000000"}`;
  } else {
    delete span.dataset.vnoOutlineColor;
    delete span.dataset.vnoOutlineWidth;
    span.style.webkitTextStroke = "";
  }

  // Shadow
  if (shadow && shadow.enabled !== false && shadow.preset !== "off") {
    const sp = SHADOW_PRESETS.find(p => p.id === (shadow.preset || "bottom-right")) || SHADOW_PRESETS[1];
    span.dataset.vnoShadow = "1";
    span.dataset.vnoShadowPreset = sp.id;
    span.dataset.vnoShadowBlur = String(sp.blur);
    span.dataset.vnoShadowDist = String(sp.dist);
    span.dataset.vnoShadowDir = String(sp.dir);
    span.dataset.vnoShadowColor = shadow.color || "#000000";
    span.dataset.vnoShadowAlpha = String(shadow.alpha || 50000);
  } else {
    delete span.dataset.vnoShadow;
    delete span.dataset.vnoShadowPreset;
    delete span.dataset.vnoShadowBlur;
    delete span.dataset.vnoShadowDist;
    delete span.dataset.vnoShadowDir;
    delete span.dataset.vnoShadowColor;
    delete span.dataset.vnoShadowAlpha;
  }

  // Glow
  if (glow && glow.enabled !== false && glow.radEmu > 0) {
    span.dataset.vnoGlowColor = glow.color || "#2563EB";
    span.dataset.vnoGlowRad = String(glow.radEmu || 101600);
    span.dataset.vnoGlowAlpha = String(glow.alpha || 60000);
  } else {
    delete span.dataset.vnoGlowColor;
    delete span.dataset.vnoGlowRad;
    delete span.dataset.vnoGlowAlpha;
  }

  // Update text-shadow css
  const shadows = [];
  if (shadow && shadow.enabled !== false && shadow.preset !== "off") {
    const sp = SHADOW_PRESETS.find(p => p.id === (shadow.preset || "bottom-right")) || SHADOW_PRESETS[1];
    if (sp.css) shadows.push(sp.css);
  }
  if (glow && glow.enabled !== false && glow.radEmu > 0) {
    const gp = GLOW_PRESETS.find(p => p.rad === glow.radEmu) || GLOW_PRESETS[2];
    const px = gp ? gp.cssPx : 8;
    shadows.push(`0 0 ${px}px ${glow.color || "#2563EB"}`);
  }
  span.style.textShadow = shadows.join(", ");

  const hasAny = Boolean(
    span.dataset.vnoOutlineColor ||
    span.dataset.vnoShadow === "1" ||
    span.dataset.vnoGlowColor
  );
  if (hasAny) {
    span.classList.add("vno-text-effect");
  } else {
    span.classList.remove("vno-text-effect");
  }
}

export function showTextEffectsDialog({
  initialOutline = null,
  initialShadow = null,
  initialGlow = null,
  onApply = () => {}
} = {}) {
  if (typeof document === "undefined" || !document.body) return false;
  document.getElementById("vno-text-effects-overlay")?.remove();

  const state = {
    outline: {
      enabled: Boolean(initialOutline),
      color: initialOutline?.color || "#2563EB",
      widthEmu: initialOutline?.widthEmu || 12700
    },
    shadow: {
      enabled: Boolean(initialShadow),
      preset: initialShadow?.preset || "bottom-right",
      color: initialShadow?.color || "#000000",
      blurEmu: initialShadow?.blurEmu || 50800,
      distEmu: initialShadow?.distEmu || 38100,
      dir: initialShadow?.dir || 5400000,
      alpha: initialShadow?.alpha || 50000
    },
    glow: {
      enabled: Boolean(initialGlow),
      radEmu: initialGlow?.radEmu || 101600,
      color: initialGlow?.color || "#2563EB",
      alpha: initialGlow?.alpha || 60000
    }
  };

  const overlay = document.createElement("div");
  overlay.className = "vno-dialog-overlay";
  overlay.id = "vno-text-effects-overlay";
  overlay.innerHTML = `
    <section class="vno-dialog-box" role="dialog" aria-modal="true" aria-labelledby="vno-txfx-title" style="width:min(520px, calc(100vw - 32px))">
      <header class="vno-dialog-header">
        <strong id="vno-txfx-title">Hiệu ứng chữ (Text Effects)</strong>
        <button type="button" class="vno-btn vno-btn-icon-only" data-close aria-label="Đóng">×</button>
      </header>
      <div class="vno-dialog-body" style="display:flex;flex-direction:column;gap:14px">
        <!-- Preview Box -->
        <div style="background:var(--vno-bg-surface-secondary, #F8FAFC);border:1px solid var(--vno-border-default, #CBD5E1);border-radius:6px;padding:16px;text-align:center">
          <div style="font-size:12px;color:var(--vno-text-secondary, #64748B);margin-bottom:6px">Xem trước</div>
          <div id="vno-txfx-preview" style="font-size:26px;font-weight:bold;color:#1E293B;transition:all 0.15s ease">
            VN Office — Văn bản mẫu
          </div>
        </div>

        <!-- Tabs Navigation -->
        <div style="display:flex;gap:6px;border-bottom:1px solid var(--vno-border-default, #CBD5E1);padding-bottom:6px">
          <button type="button" class="vno-btn vno-btn-sm" data-tab="outline" style="font-weight:600">Viền chữ (Outline)</button>
          <button type="button" class="vno-btn vno-btn-sm" data-tab="shadow">Bóng đổ (Shadow)</button>
          <button type="button" class="vno-btn vno-btn-sm" data-tab="glow">Phát sáng (Glow)</button>
        </div>

        <!-- Tab 1: Outline -->
        <div id="vno-tab-outline" style="display:flex;flex-direction:column;gap:10px">
          <label style="display:flex;align-items:center;gap:8px">
            <input type="checkbox" id="vno-txfx-outline-enable"${state.outline.enabled ? " checked" : ""}>
            <span>Bật viền chữ</span>
          </label>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            <label>
              <span>Màu viền</span>
              <input type="color" id="vno-txfx-outline-color" value="${state.outline.color}" style="display:block;width:100%;height:34px;margin-top:4px">
            </label>
            <label>
              <span>Độ dày viền</span>
              <select id="vno-txfx-outline-width" class="vno-dialog-input" style="display:block;width:100%;margin-top:4px">
                ${OUTLINE_WIDTHS.map(w => `<option value="${w.emu}"${w.emu === state.outline.widthEmu ? " selected" : ""}>${w.label}</option>`).join("")}
              </select>
            </label>
          </div>
        </div>

        <!-- Tab 2: Shadow -->
        <div id="vno-tab-shadow" style="display:none;flex-direction:column;gap:10px">
          <label style="display:flex;align-items:center;gap:8px">
            <input type="checkbox" id="vno-txfx-shadow-enable"${state.shadow.enabled ? " checked" : ""}>
            <span>Bật bóng đổ</span>
          </label>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            <label>
              <span>Kiểu bóng (Presets)</span>
              <select id="vno-txfx-shadow-preset" class="vno-dialog-input" style="display:block;width:100%;margin-top:4px">
                ${SHADOW_PRESETS.map(p => `<option value="${p.id}"${p.id === state.shadow.preset ? " selected" : ""}>${p.label}</option>`).join("")}
              </select>
            </label>
            <label>
              <span>Màu bóng</span>
              <input type="color" id="vno-txfx-shadow-color" value="${state.shadow.color}" style="display:block;width:100%;height:34px;margin-top:4px">
            </label>
          </div>
        </div>

        <!-- Tab 3: Glow -->
        <div id="vno-tab-glow" style="display:none;flex-direction:column;gap:10px">
          <label style="display:flex;align-items:center;gap:8px">
            <input type="checkbox" id="vno-txfx-glow-enable"${state.glow.enabled ? " checked" : ""}>
            <span>Bật hiệu ứng phát sáng</span>
          </label>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
            <label>
              <span>Bán kính phát sáng</span>
              <select id="vno-txfx-glow-rad" class="vno-dialog-input" style="display:block;width:100%;margin-top:4px">
                ${GLOW_PRESETS.filter(g => g.rad > 0).map(g => `<option value="${g.rad}"${g.rad === state.glow.radEmu ? " selected" : ""}>${g.label}</option>`).join("")}
              </select>
            </label>
            <label>
              <span>Màu phát sáng</span>
              <input type="color" id="vno-txfx-glow-color" value="${state.glow.color}" style="display:block;width:100%;height:34px;margin-top:4px">
            </label>
          </div>
        </div>
      </div>
      <footer class="vno-dialog-footer" style="display:flex;justify-content:space-between">
        <button type="button" class="vno-btn" data-clear style="color:#EF4444">Xóa hiệu ứng</button>
        <div style="display:flex;gap:8px">
          <button type="button" class="vno-btn" data-close>Hủy</button>
          <button type="button" class="vno-btn vno-btn-primary" data-apply>Áp dụng</button>
        </div>
      </footer>
    </section>
  `;

  document.body.appendChild(overlay);

  const previewEl = overlay.querySelector("#vno-txfx-preview");
  const updatePreview = () => {
    if (!previewEl) return;
    const css = buildTextEffectsCss({
      outline: state.outline.enabled ? state.outline : null,
      shadow: state.shadow.enabled ? state.shadow : null,
      glow: state.glow.enabled ? state.glow : null
    });
    previewEl.style.webkitTextStroke = css["-webkit-text-stroke"] || "";
    previewEl.style.textShadow = css["text-shadow"] || "";
  };

  // Tab switching
  const tabBtns = overlay.querySelectorAll("[data-tab]");
  const tabPanels = {
    outline: overlay.querySelector("#vno-tab-outline"),
    shadow: overlay.querySelector("#vno-tab-shadow"),
    glow: overlay.querySelector("#vno-tab-glow")
  };
  tabBtns.forEach(btn => {
    btn.addEventListener("click", () => {
      const tab = btn.dataset.tab;
      tabBtns.forEach(b => {
        b.style.fontWeight = b.dataset.tab === tab ? "600" : "normal";
        b.classList.toggle("vno-btn-primary", b.dataset.tab === tab);
      });
      Object.keys(tabPanels).forEach(k => {
        if (tabPanels[k]) tabPanels[k].style.display = k === tab ? "flex" : "none";
      });
    });
  });

  // Bind outline controls
  const outlineEnable = overlay.querySelector("#vno-txfx-outline-enable");
  const outlineColor = overlay.querySelector("#vno-txfx-outline-color");
  const outlineWidth = overlay.querySelector("#vno-txfx-outline-width");
  outlineEnable.addEventListener("change", () => {
    state.outline.enabled = outlineEnable.checked;
    updatePreview();
  });
  outlineColor.addEventListener("input", () => {
    state.outline.color = outlineColor.value;
    updatePreview();
  });
  outlineWidth.addEventListener("change", () => {
    state.outline.widthEmu = parseInt(outlineWidth.value, 10);
    updatePreview();
  });

  // Bind shadow controls
  const shadowEnable = overlay.querySelector("#vno-txfx-shadow-enable");
  const shadowPreset = overlay.querySelector("#vno-txfx-shadow-preset");
  const shadowColor = overlay.querySelector("#vno-txfx-shadow-color");
  shadowEnable.addEventListener("change", () => {
    state.shadow.enabled = shadowEnable.checked;
    updatePreview();
  });
  shadowPreset.addEventListener("change", () => {
    state.shadow.preset = shadowPreset.value;
    updatePreview();
  });
  shadowColor.addEventListener("input", () => {
    state.shadow.color = shadowColor.value;
    updatePreview();
  });

  // Bind glow controls
  const glowEnable = overlay.querySelector("#vno-txfx-glow-enable");
  const glowRad = overlay.querySelector("#vno-txfx-glow-rad");
  const glowColor = overlay.querySelector("#vno-txfx-glow-color");
  glowEnable.addEventListener("change", () => {
    state.glow.enabled = glowEnable.checked;
    updatePreview();
  });
  glowRad.addEventListener("change", () => {
    state.glow.radEmu = parseInt(glowRad.value, 10);
    updatePreview();
  });
  glowColor.addEventListener("input", () => {
    state.glow.color = glowColor.value;
    updatePreview();
  });

  updatePreview();

  const close = () => overlay.remove();
  overlay.querySelectorAll("[data-close]").forEach(btn => btn.addEventListener("click", close));
  overlay.addEventListener("click", ev => { if (ev.target === overlay) close(); });
  overlay.addEventListener("keydown", ev => { if (ev.key === "Escape") { ev.preventDefault(); close(); } });

  // Clear button
  overlay.querySelector("[data-clear]").addEventListener("click", () => {
    onApply({ outline: null, shadow: null, glow: null });
    close();
  });

  // Apply button
  overlay.querySelector("[data-apply]").addEventListener("click", () => {
    onApply({
      outline: state.outline.enabled ? state.outline : null,
      shadow: state.shadow.enabled ? state.shadow : null,
      glow: state.glow.enabled ? state.glow : null
    });
    close();
  });

  return true;
}
