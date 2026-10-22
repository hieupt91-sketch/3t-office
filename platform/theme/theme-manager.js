/**
 * 3T Office Platform — Theme Manager
 */

import { headerTheme } from "./header-theme.js";

export class ThemeManager {
  constructor() {
    this._currentTheme = "light";
    this._currentFontSize = "normal"; // normal | large | xlarge
    this._currentApp = "writer"; // writer | sheet | slides
    this._personalTheme = null;
    this._savedPersonalTheme = null;
    this._listeners = new Set();
  }

  init() {
    let savedTheme = "light";
    let savedFontSize = "normal";
    let savedPersonalTheme = null;
    try {
      savedTheme = localStorage.getItem("vno-theme") || "light";
      savedFontSize = localStorage.getItem("vno-ui-font-size") || "normal";
      savedPersonalTheme = normalizePersonalTheme(JSON.parse(localStorage.getItem(PERSONAL_THEME_STORAGE_KEY) || "null"));
    } catch (e) {}
    this._personalTheme = savedPersonalTheme;
    this._savedPersonalTheme = savedPersonalTheme ? { ...savedPersonalTheme } : null;
    this.setTheme(savedTheme);
    this.setFontSize(savedFontSize);
    this._applyPersonalTheme(this._personalTheme);
    // Màu/hình ảnh khu vực tiêu đề do người dùng chọn (nếu có)
    headerTheme.init();
  }

  setTheme(themeName) {
    this._currentTheme = themeName === "dark" ? "dark" : "light";
    if (typeof document !== "undefined" && document.documentElement) {
      document.documentElement.setAttribute("data-theme", this._currentTheme);
    }
    try {
      localStorage.setItem("vno-theme", this._currentTheme);
    } catch (e) {}

    for (const listener of this._listeners) {
      try {
        listener(this._currentTheme, this._currentFontSize);
      } catch (err) {
        console.error("[ThemeManager] Listener error:", err);
      }
    }

    if (typeof window !== "undefined" && window.dispatchEvent) {
      try {
        window.dispatchEvent(new CustomEvent("vno:theme-changed", { detail: { theme: this._currentTheme } }));
      } catch (e) {}
    }
  }

  /** Áp dụng bộ màu cá nhân; dữ liệu chỉ nằm trong localStorage của máy. */
  setPersonalTheme(theme) {
    this._personalTheme = normalizePersonalTheme(theme);
    this._applyPersonalTheme(this._personalTheme);
    try {
      if (this._personalTheme) localStorage.setItem(PERSONAL_THEME_STORAGE_KEY, JSON.stringify(this._personalTheme));
      else localStorage.removeItem(PERSONAL_THEME_STORAGE_KEY);
    } catch (e) {}
    this._emitThemeChanged();
    return this.getPersonalTheme();
  }

  previewPersonalTheme(theme) {
    this._applyPersonalTheme(normalizePersonalTheme(theme));
  }

  restorePersonalTheme() {
    this._applyPersonalTheme(this._personalTheme);
  }

  resetPersonalTheme() {
    return this.setPersonalTheme(null);
  }

  getPersonalTheme() {
    return this._personalTheme ? { ...this._personalTheme } : null;
  }

  setFontSize(sizeName) {
    const validSizes = ["normal", "large", "xlarge"];
    this._currentFontSize = validSizes.includes(sizeName) ? sizeName : "normal";
    if (typeof document !== "undefined" && document.documentElement) {
      document.documentElement.setAttribute("data-ui-font-size", this._currentFontSize);
    }
    try {
      localStorage.setItem("vno-ui-font-size", this._currentFontSize);
    } catch (e) {}

    for (const listener of this._listeners) {
      try {
        listener(this._currentTheme, this._currentFontSize);
      } catch (err) {
        console.error("[ThemeManager] Listener error:", err);
      }
    }

    if (typeof window !== "undefined" && window.dispatchEvent) {
      try {
        window.dispatchEvent(new CustomEvent("vno:font-size-changed", { detail: { fontSize: this._currentFontSize } }));
      } catch (e) {}
    }
  }

  getFontSize() {
    return this._currentFontSize;
  }

  toggleTheme() {
    const next = this._currentTheme === "dark" ? "light" : "dark";
    this.setTheme(next);
    return next;
  }

  onThemeChange(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  getTheme() {
    return this._currentTheme;
  }

  setApp(appName) {
    this._currentApp = appName;
    if (typeof document !== "undefined" && document.documentElement) {
      document.documentElement.setAttribute("data-app", appName);
    }
  }

  getApp() {
    return this._currentApp;
  }

  _emitThemeChanged() {
    for (const listener of this._listeners) {
      try { listener(this._currentTheme, this._currentFontSize); } catch (err) { console.error("[ThemeManager] Listener error:", err); }
    }
    if (typeof window !== "undefined" && window.dispatchEvent) {
      try { window.dispatchEvent(new CustomEvent("vno:theme-changed", { detail: { theme: this._currentTheme, personalTheme: this.getPersonalTheme() } })); } catch (e) {}
    }
  }

  _applyPersonalTheme(theme) {
    if (typeof document === "undefined" || !document.documentElement) return;
    const root = document.documentElement;
    const keys = Object.keys(PERSONAL_CSS_VARS);
    keys.forEach((key) => root.style.removeProperty(key));
    if (!theme) { root.removeAttribute("data-theme-profile"); return; }
    root.setAttribute("data-theme-profile", "personal");
    const vars = buildPersonalCssVars(theme);
    for (const [key, value] of Object.entries(vars)) root.style.setProperty(key, value);
  }
}

export const PERSONAL_THEME_STORAGE_KEY = "vno-personal-theme";
export const PERSONAL_THEME_PRESETS = Object.freeze([
  { id: "ocean", label: "Đại dương", accent: "#2563eb", surface: "#eff6ff" },
  { id: "forest", label: "Rừng xanh", accent: "#15803d", surface: "#f0fdf4" },
  { id: "sunset", label: "Hoàng hôn", accent: "#c2410c", surface: "#fff7ed" },
  { id: "plum", label: "Tím mận", accent: "#7c3aed", surface: "#faf5ff" },
  { id: "rose", label: "Hồng phấn", accent: "#be123c", surface: "#fff1f2" }
]);

const PERSONAL_CSS_VARS = Object.freeze({
  "--vno-app-current": true, "--vno-app-current-hover": true, "--vno-app-current-light": true, "--vno-app-current-fg": true,
  "--vno-bg-app": true, "--vno-bg-window": true, "--vno-bg-surface": true, "--vno-bg-subtle": true, "--vno-bg-muted": true,
  "--vno-bg-hover": true, "--vno-bg-active": true, "--vno-bg-selected": true, "--vno-text-primary": true,
  "--vno-text-secondary": true, "--vno-text-muted": true, "--vno-text-subtle": true, "--vno-border-default": true,
  "--vno-border-strong": true, "--vno-border-focus": true
});

const HEX = /^#([0-9a-f]{6})$/i;
function normalizePersonalTheme(raw) {
  if (!raw || typeof raw !== "object") return null;
  const preset = PERSONAL_THEME_PRESETS.some((item) => item.id === raw.preset) ? raw.preset : "custom";
  const accent = HEX.test(String(raw.accent || "")) ? String(raw.accent).toLowerCase() : (PERSONAL_THEME_PRESETS.find((item) => item.id === preset)?.accent || "#2563eb");
  const base = raw.base === "dark" ? "dark" : "light";
  return { preset, accent, base };
}

function shift(hex, amount) {
  const match = HEX.exec(hex); if (!match) return hex;
  const values = [0, 2, 4].map((i) => parseInt(match[1].slice(i, i + 2), 16));
  return "#" + values.map((v) => Math.round(v + (amount >= 0 ? (255 - v) * amount : v * amount)).toString(16).padStart(2, "0")).join("");
}

function buildPersonalCssVars(theme) {
  const dark = theme.base === "dark";
  const accent = theme.accent;
  return {
    "--vno-app-current": accent, "--vno-app-current-hover": shift(accent, dark ? 0.18 : -0.18),
    "--vno-app-current-light": dark ? shift(accent, -0.72) : shift(accent, 0.86),
    "--vno-app-current-fg": dark ? shift(accent, 0.38) : accent,
    "--vno-bg-app": dark ? "#171923" : "#e9eef7", "--vno-bg-window": dark ? "#202331" : "#ffffff",
    "--vno-bg-surface": dark ? "#282c3b" : "#ffffff", "--vno-bg-subtle": dark ? "#232735" : "#f8fafc",
    "--vno-bg-muted": dark ? "#303546" : "#f1f5f9", "--vno-bg-hover": dark ? "#3a4053" : "#e2e8f0",
    "--vno-bg-active": dark ? "#4a5269" : "#cbd5e1", "--vno-bg-selected": dark ? shift(accent, -0.5) : shift(accent, 0.86),
    "--vno-text-primary": dark ? "#f8fafc" : "#172033", "--vno-text-secondary": dark ? "#d2d8e6" : "#334155",
    "--vno-text-muted": dark ? "#aab4c8" : "#475569", "--vno-text-subtle": dark ? "#91a0ba" : "#64748b",
    "--vno-border-default": dark ? "#41485d" : "#d5deeb", "--vno-border-strong": dark ? "#59647d" : "#b7c5d9",
    "--vno-border-focus": accent
  };
}

export const themeManager = new ThemeManager();


