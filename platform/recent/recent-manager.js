/**
 * VN Office Platform — Recent Files Manager
 * Quản lý danh sách tài liệu vừa mở thật, tuân thủ 01-architecture/ARCHITECTURE.md
 */

const STORAGE_KEY = "vno_recent_documents";

export class RecentFilesManager {
  /**
   * Lấy danh sách tài liệu gần đây
   * @returns {Array<{id: string, name: string, app: "writer"|"sheet"|"slides", lastModified: number, format: string}>}
   */
  static getRecentFiles() {
    try {
      if (typeof window === "undefined" || !window.localStorage) return [];
      const data = localStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  /**
   * Thêm hoặc cập nhật tài liệu vào danh sách gần đây
   */
  static recordFile({ name, app, format }) {
    try {
      if (typeof window === "undefined" || !window.localStorage) return;
      const list = this.getRecentFiles();
      const existingIdx = list.findIndex(item => item.name === name && item.app === app);
      
      const entry = {
        id: `${app}_${name}`,
        name,
        app,
        format: format || (app === "writer" ? "DOCX Document" : app === "sheet" ? "XLSX Spreadsheet" : "PPTX Presentation"),
        lastModified: Date.now()
      };

      if (existingIdx !== -1) {
        list.splice(existingIdx, 1);
      }
      list.unshift(entry);

      // Giới hạn tối đa 10 tài liệu gần đây nhất
      const trimmed = list.slice(0, 10);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch (e) {
      console.warn("[RecentFilesManager] Không thể lưu tài liệu gần đây:", e);
    }
  }

  /**
   * Xóa toàn bộ lịch sử tài liệu gần đây
   */
  static clearAll() {
    try {
      if (typeof window !== "undefined" && window.localStorage) {
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch {}
  }
}
