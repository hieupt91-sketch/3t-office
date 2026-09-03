/**
 * VN Office Platform — Theme Manager
 */

export class ThemeManager {
  constructor() {
    this._currentTheme = "light";
    this._currentApp = "writer"; // writer | sheet | slides
  }

  init() {
    const savedTheme = localStorage.getItem("vno-theme") || "light";
    this.setTheme(savedTheme);
  }

  setTheme(themeName) {
    this._currentTheme = themeName;
    document.documentElement.setAttribute("data-theme", themeName);
    try {
      localStorage.setItem("vno-theme", themeName);
    } catch (e) {}
  }

  getTheme() {
    return this._currentTheme;
  }

  setApp(appName) {
    this._currentApp = appName;
    document.documentElement.setAttribute("data-app", appName);
  }

  getApp() {
    return this._currentApp;
  }
}

export const themeManager = new ThemeManager();
