/**
 * 3T Office Platform — Recent Files Manager
 * Quản lý danh sách tài liệu vừa mở thật, tuân thủ 01-architecture/ARCHITECTURE.md
 */

const STORAGE_KEY = "vno_recent_documents";

/**
 * Rút gọn đường dẫn tệp để hiển thị trực quan trên giao diện
 * @param {string} filePath
 * @returns {string}
 */
export function formatShortPath(filePath) {
  if (!filePath || typeof filePath !== "string") return "";
  const normalized = filePath.replace(/\\/g, "/");
  const parts = normalized.split("/").filter(Boolean);
  if (parts.length <= 2) return filePath;
  const isWindowsDrive = /^[a-zA-Z]:/.test(parts[0]);
  const prefix = isWindowsDrive ? `${parts[0]}/` : "/";
  if (parts.length === 3) return `${prefix}.../${parts[2]}`;
  return `${prefix}.../${parts.slice(-2).join("/")}`;
}

export class RecentFilesManager {
  static _getStorage() {
    if (typeof window !== "undefined" && window.localStorage) return window.localStorage;
    if (typeof globalThis !== "undefined" && globalThis.localStorage) return globalThis.localStorage;
    return null;
  }

  /**
   * Lấy danh sách tài liệu gần đây
   * @returns {Array<{id: string, name: string, app: "writer"|"sheet"|"slides", lastModified: number, format: string}>}
   */
  static getRecentFiles() {
    try {
      const storage = this._getStorage();
      if (!storage) return [];
      const data = storage.getItem(STORAGE_KEY);
      const parsed = data ? JSON.parse(data) : [];
      return Array.isArray(parsed) ? parsed.filter(item => typeof item?.path === "string" && item.path.length > 0) : [];
    } catch {
      return [];
    }
  }

  /**
   * Thêm hoặc cập nhật tài liệu vào danh sách gần đây
   */
  static recordFile({ name, app, format, path }) {
    try {
      const storage = this._getStorage();
      if (!storage || typeof path !== "string" || !path.trim()) return false;
      const list = this.getRecentFiles();
      const existingIdx = list.findIndex(item => item.path === path && item.app === app);
      
      const entry = {
        id: `${app}_${name}`,
        name,
        app,
        path,
        format: format || (app === "writer" ? "DOCX Document" : app === "sheet" ? "XLSX Spreadsheet" : "PPTX Presentation"),
        lastModified: Date.now()
      };

      if (existingIdx !== -1) {
        list.splice(existingIdx, 1);
      }
      list.unshift(entry);

      // Giới hạn tối đa 10 tài liệu gần đây nhất
      const trimmed = list.slice(0, 10);
      storage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
      return true;
    } catch (e) {
      console.warn("[RecentFilesManager] Không thể lưu tài liệu gần đây:", e);
      return false;
    }
  }

  /**
   * Xóa một tài liệu cụ thể khỏi danh sách gần đây
   * @param {{ name: string, app?: string }} options
   */
  static removeFile({ name, app }) {
    try {
      const storage = this._getStorage();
      if (!storage) return;
      const list = this.getRecentFiles();
      const filtered = list.filter(item => !(item.name === name && (!app || item.app === app)));
      storage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    } catch (e) {
      console.warn("[RecentFilesManager] Không thể xóa tệp gần đây:", e);
    }
  }

  /**
   * Xóa toàn bộ lịch sử tài liệu gần đây
   */
  static clearAll() {
    try {
      const storage = this._getStorage();
      if (storage) {
        storage.removeItem(STORAGE_KEY);
      }
    } catch {}
  }
}
