/**
 * 3T Office Platform — Theme Manager
 */

export class ThemeManager {
  constructor() {
    this._currentTheme = "light";
    this._currentApp = "writer"; // writer | sheet | slides
    this._listeners = new Set();
  }

  init() {
    let savedTheme = "light";
    try {
      savedTheme = localStorage.getItem("vno-theme") || "light";
    } catch (e) {}
    this.setTheme(savedTheme);
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
        listener(this._currentTheme);
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

