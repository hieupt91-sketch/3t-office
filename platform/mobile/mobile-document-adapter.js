/**
 * Mobile document adapter.
 *
 * The desktop UI talks to LibreOffice through UnoBridge. iOS/iPadOS must use
 * the in-process OOXMLBridge exposed by VNOfficeMobile instead. This adapter
 * keeps the mobile contract small: bytes enter through Files, the document
 * stays native behind a handle, and only requested data comes back to JS.
 */
export class MobileDocumentAdapter {
  constructor(runtime = globalThis.window?.vnoMobileRuntime) {
    this.runtime = runtime;
    this.handles = new Map();
  }

  get available() {
    return Boolean(this.runtime?.offline && this.runtime?.ooxml);
  }

  async openFromFiles() {
    if (!this.available || typeof this.runtime.document?.open !== "function") {
      throw new Error("Mobile OOXML runtime chưa sẵn sàng.");
    }
    const opened = await this.runtime.document.open();
    if (!opened?.ok || !opened.document?.handle) {
      if (opened?.cancelled) return { cancelled: true };
      throw new Error(opened?.error || "Không thể mở tài liệu trên thiết bị.");
    }
    this.handles.set(opened.document.handle, opened.filename || "TaiLieu");
    return opened;
  }

  async info(handle) {
    return this.runtime.ooxml.call({ op: "info", args: { handle } });
  }

  async exportBytes(handle) {
    const result = await this.runtime.ooxml.exportBytes(handle);
    if (!result?.base64) throw new Error(result?.error || "Không thể xuất tài liệu.");
    return result.base64;
  }

  async saveAs(handle, filename) {
    if (typeof this.runtime.document?.save !== "function") {
      throw new Error("Mobile Files save chưa sẵn sàng.");
    }
    const result = await this.runtime.document.save(handle, filename || this.handles.get(handle) || "TaiLieu.docx");
    if (!result?.ok) {
      if (result?.cancelled) return result;
      throw new Error(result?.error || "Không thể lưu tài liệu trên thiết bị.");
    }
    return result;
  }

  async close(handle) {
    if (!handle) return { ok: true };
    const result = await this.runtime.ooxml.call({ op: "close", args: { handle } });
    this.handles.delete(handle);
    return result;
  }
}

export function getMobileDocumentAdapter() {
  return new MobileDocumentAdapter(globalThis.window?.vnoMobileRuntime);
}
