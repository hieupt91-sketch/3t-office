/**
 * 3T Office Platform — Theme Manager
 */

import { headerTheme } from "./header-theme.js";
import { relativeLuminance, readableForeground } from "./header-theme.js";

const THEME_STORAGE_KEY = "vno-theme";
const ACCENT_STORAGE_KEY = "vno-accent-color";
const DEFAULT_ACCENT = "#2563eb";
const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export class ThemeManager {
  constructor() {
    this._currentTheme = "light";
    this._themePreference = "light";
    this._systemDark = false;
    this._systemMedia = null;
    this._accentColor = DEFAULT_ACCENT;
    this._currentFontSize = "normal"; // normal | large | xlarge
    this._currentApp = "writer"; // writer | sheet | slides
    this._listeners = new Set();
  }

  init() {
    let savedTheme = "light";
    let savedFontSize = "normal";
    let savedAccent = DEFAULT_ACCENT;
    try {
      savedTheme = localStorage.getItem(THEME_STORAGE_KEY) || "light";
      savedFontSize = localStorage.getItem("vno-ui-font-size") || "normal";
      savedAccent = localStorage.getItem(ACCENT_STORAGE_KEY) || DEFAULT_ACCENT;
    } catch (e) {}
    this._systemMedia = typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia("(prefers-color-scheme: dark)") : null;
    this._systemDark = Boolean(this._systemMedia?.matches);
    this._themePreference = ["light", "dark", "system"].includes(savedTheme) ? savedTheme : "light";
    if (this._systemMedia?.addEventListener) this._systemMedia.addEventListener("change", (event) => {
      this._systemDark = Boolean(event.matches);
      if (this._themePreference === "system") this._applyTheme(this._systemDark ? "dark" : "light");
    });
    this.setTheme(savedTheme);
    this.setFontSize(savedFontSize);
    this.setAccentColor(savedAccent);
    // Màu/hình ảnh khu vực tiêu đề do người dùng chọn (nếu có)
    headerTheme.init();
  }

  setTheme(themeName) {
    this._themePreference = ["light", "dark", "system"].includes(themeName) ? themeName : "light";
    this._applyTheme(this._themePreference === "system" ? (this._systemDark ? "dark" : "light") : this._themePreference);
    try { localStorage.setItem(THEME_STORAGE_KEY, this._themePreference); } catch (e) {}
    return this._currentTheme;
  }

  _applyTheme(effectiveTheme) {
    this._currentTheme = effectiveTheme === "dark" ? "dark" : "light";
    if (typeof document !== "undefined" && document.documentElement) {
      document.documentElement.setAttribute("data-theme", this._currentTheme);
    }

    for (const listener of this._listeners) {
      try {
        listener(this._currentTheme, this._currentFontSize);
      } catch (err) {
        console.error("[ThemeManager] Listener error:", err);
      }
    }

    if (typeof window !== "undefined" && window.dispatchEvent) {
      try {
        window.dispatchEvent(new CustomEvent("vno:theme-changed", { detail: { theme: this._currentTheme, preference: this._themePreference } }));
      } catch (e) {}
    }
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

  getThemePreference() { return this._themePreference; }

  getAccentColor() { return this._accentColor; }

  setAccentColor(color) {
    this._accentColor = typeof color === "string" && HEX_COLOR.test(color) ? color.toLowerCase() : DEFAULT_ACCENT;
    const foreground = readableForeground(relativeLuminance(this._accentColor));
    if (typeof document !== "undefined" && document.documentElement) {
      document.documentElement.style.setProperty("--vno-accent", this._accentColor);
      document.documentElement.style.setProperty("--vno-accent-fg", foreground);
      document.documentElement.style.setProperty("--vno-primary", this._accentColor);
      document.documentElement.style.setProperty("--vno-color-accent", this._accentColor);
      document.documentElement.style.setProperty("--vno-color-accent-hover", this._accentColor);
    }
    try { localStorage.setItem(ACCENT_STORAGE_KEY, this._accentColor); } catch (e) {}
    return { color: this._accentColor, foreground };
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
}

export const themeManager = new ThemeManager();


