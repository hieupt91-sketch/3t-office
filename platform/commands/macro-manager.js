/**
 * 3T Office Platform — Macro Manager (ghi & phát lại thao tác)
 *
 * Macro "cơ bản": ghi lại chuỗi LỆNH (Command Bus) người dùng thực thi khi
 * đang bật ghi, lưu lại có tên, và phát lại (gọi đúng lại từng lệnh theo
 * thứ tự cũ). Đây KHÔNG phải ngôn ngữ script (không có VBA/IDE riêng) —
 * đúng phạm vi "Macro cơ bản" trong docs/FEATURE-PARITY-ROADMAP.md.
 *
 * Giới hạn trung thực đã biết:
 * - CHỈ ghi được thao tác đi qua Command Bus (định dạng, chèn bảng, sort,
 *   đổi Page Setup, style đoạn văn...). KHÔNG ghi được nội dung gõ tự do
 *   (gõ chữ trực tiếp vào vùng soạn thảo không phát lệnh nào cả — đây là
 *   input trình duyệt gốc, không phải Command Bus). Muốn macro "gõ sẵn 1
 *   đoạn văn mẫu" cần chèn qua lệnh có sẵn (ví dụ Mail Merge field) chứ
 *   không gõ tay trong lúc ghi.
 * - Nếu 1 bước trong macro TỰ MỞ HỘP THOẠI cần người dùng nhập liệu (ví dụ
 *   mở Format Cells rồi tự đóng lại), macro sẽ dừng khựng ở đó chờ người
 *   dùng thao tác — không tự động điền hộ nội dung dialog. Macro phù hợp
 *   nhất với các lệnh THI HÀNH TRỰC TIẾP (không cần hộp thoại), giống ví
 *   dụ tô màu/sort/chèn dòng tổng.
 * - Macro lưu theo TỪNG APP riêng (Writer/Sheet/Slides) vì mã lệnh có
 *   namespace riêng theo app — không chạy chéo app.
 */

import { globalCommandBus } from "./command-bus.js";

const STORAGE_KEY = "vno_macros";
const MAX_MACROS_PER_APP = 50;

function readAll() {
  try {
    if (typeof window === "undefined" || !window.localStorage) return [];
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function writeAll(list) {
  try {
    if (typeof window === "undefined" || !window.localStorage) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.warn("[MacroManager] Không thể lưu macro:", e);
  }
}

export class MacroManager {
  /**
   * @param {import('./command-bus.js').CommandBus} commandBus
   */
  constructor(commandBus) {
    this._commandBus = commandBus;
    this._pendingApp = null;
  }

  /** Bắt đầu ghi macro mới cho app hiện tại. */
  startRecording(appKind) {
    if (this._commandBus.isRecordingMacro()) {
      throw new Error("Đang ghi 1 macro khác — dừng ghi trước khi bắt đầu macro mới.");
    }
    this._pendingApp = appKind;
    this._commandBus.startMacroRecording();
  }

  isRecording() {
    return this._commandBus.isRecordingMacro();
  }

  /**
   * Dừng ghi, trả về { app, steps } thô — CHƯA lưu. Nơi gọi tự quyết định
   * hỏi tên rồi gọi saveMacro(), hoặc hủy bỏ nếu người dùng không đặt tên.
   */
  stopRecording() {
    const steps = this._commandBus.stopMacroRecording();
    const appKind = this._pendingApp;
    this._pendingApp = null;
    return { app: appKind, steps };
  }

  /**
   * Lưu 1 macro đã ghi (sau khi đã có tên). Trả về macro vừa lưu, hoặc
   * null nếu không có bước nào (macro rỗng — không lưu macro trống vô
   * nghĩa).
   */
  saveMacro(appKind, name, steps) {
    if (!steps || !steps.length) return null;

    const macro = {
      id: `${appKind}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: String(name || "Macro không tên").trim() || "Macro không tên",
      app: appKind,
      steps,
      createdAt: Date.now()
    };

    const list = readAll();
    list.push(macro);
    // Giới hạn số macro tối đa mỗi app, xóa macro cũ nhất khi vượt quá.
    const sameApp = list.filter(m => m.app === appKind);
    if (sameApp.length > MAX_MACROS_PER_APP) {
      const toRemove = sameApp
        .sort((a, b) => a.createdAt - b.createdAt)
        .slice(0, sameApp.length - MAX_MACROS_PER_APP)
        .map(m => m.id);
      writeAll(list.filter(m => !toRemove.includes(m.id)));
    } else {
      writeAll(list);
    }
    return macro;
  }

  /** Hủy ghi macro đang chạy, không lưu gì cả. */
  cancelRecording() {
    this._commandBus.stopMacroRecording();
    this._pendingApp = null;
  }

  /** Lấy danh sách macro đã lưu của 1 app, mới nhất trước. */
  getMacros(appKind) {
    return readAll()
      .filter(m => m.app === appKind)
      .sort((a, b) => b.createdAt - a.createdAt);
  }

  getMacroById(id) {
    return readAll().find(m => m.id === id) || null;
  }

  renameMacro(id, newName) {
    const list = readAll();
    const macro = list.find(m => m.id === id);
    if (!macro) return false;
    macro.name = String(newName || "").trim() || macro.name;
    writeAll(list);
    return true;
  }

  deleteMacro(id) {
    const list = readAll();
    const next = list.filter(m => m.id !== id);
    if (next.length === list.length) return false;
    writeAll(next);
    return true;
  }

  /**
   * Phát lại 1 macro đã lưu: gọi tuần tự từng lệnh qua Command Bus, ĐÚNG
   * thứ tự đã ghi. Dừng lại và ném lỗi ngay nếu 1 bước bất kỳ thất bại
   * (không âm thầm bỏ qua bước lỗi rồi chạy tiếp — người dùng cần biết
   * macro dừng ở bước nào).
   * @returns {Promise<{executed: number, total: number}>}
   */
  async runMacro(id) {
    const macro = this.getMacroById(id);
    if (!macro) throw new Error(`Không tìm thấy macro: ${id}`);
    let executed = 0;
    for (const step of macro.steps) {
      await this._commandBus.execute(step.commandId, step.args);
      executed++;
    }
    return { executed, total: macro.steps.length };
  }
}

export const globalMacroManager = new MacroManager(globalCommandBus);
