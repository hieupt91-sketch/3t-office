/**
 * 3T Office Platform — Theme Manager
 */

import { headerTheme } from "./header-theme.js";

export class ThemeManager {
  constructor() {
    this._currentTheme = "light";
    this._currentFontSize = "normal"; // normal | large | xlarge
    this._currentApp = "writer"; // writer | sheet | slides
    this._listeners = new Set();
  }

  init() {
    let savedTheme = "light";
    let savedFontSize = "normal";
    try {
      savedTheme = localStorage.getItem("vno-theme") || "light";
      savedFontSize = localStorage.getItem("vno-ui-font-size") || "normal";
    } catch (e) {}
    this.setTheme(savedTheme);
    this.setFontSize(savedFontSize);
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
}

export const themeManager = new ThemeManager();


