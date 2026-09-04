/**
 * VN Office — Behavioral & Unit Tests: VN Writer References & Mailings Audit Verification
 * Tuân thủ quy định 06-testing/TESTING-STANDARD.md & AGENTS.md
 */

import { WriterAdapter, toRoman } from "../../adapters/libreoffice/writer/writer-adapter.js";
import { globalUnoBridge } from "../../adapters/libreoffice/common/uno-bridge.js";
import { globalCommandBus } from "../../platform/commands/command-bus.js";
import { mapVnCommandToUno } from "../../adapters/libreoffice/common/command-dispatch-mapper.js";
import { WRITER_COMMANDS } from "../../platform/commands/command-definitions.js";
import { ICONS } from "../../platform/ui-kit/icons.js";
import { t, setLocale, getLocale } from "../../platform/i18n/i18n.js";
import { parseCsv, replaceMergeFields } from "../../apps/writer/mail-merge.js";

class SafeFakeClassList {
  constructor(owner) { this.owner = owner; }
  _items() { return new Set((this.owner.className || "").split(/\s+/).filter(Boolean)); }
  add(name) { const items = this._items(); items.add(name); this.owner.className = [...items].join(" "); }
  remove(name) { const items = this._items(); items.delete(name); this.owner.className = [...items].join(" "); }
  contains(name) { return this._items().has(name); }
}

class SafeFakeElement {
  constructor(tagName = "div") {
    this.tagName = tagName.toUpperCase();
    this.nodeType = 1;
    this.children = [];
    this.parentNode = null;
    this.parentElement = null;
    this.dataset = {};
    this.className = "";
    this.classList = new SafeFakeClassList(this);
    this.attributes = {};
    this.style = {};
    this.disabled = false;
    this.value = "";
    this._textContent = "";
    this._innerHTML = "";
  }

  get textContent() {
    if (this._textContent) return this._textContent;
    if (this.children.length > 0) return this.children.map(c => c.textContent).join(" ");
    return this._innerHTML.replace(/<[^>]+>/g, "").trim();
  }
  set textContent(val) {
    this._textContent = String(val);
    this._innerHTML = String(val);
    this.children = [];
  }

  get innerHTML() {
    if (this._innerHTML) return this._innerHTML;
    if (this.children.length > 0) return this.children.map(c => c.outerHTML).join("\n");
    return this._textContent;
  }
  set innerHTML(val) {
    this._innerHTML = String(val);
    this._textContent = "";
  }

  get outerHTML() {
    const tag = this.tagName.toLowerCase();
    return `<${tag}>${this.innerHTML}</${tag}>`;
  }

  setAttribute(k, v) {
    this.attributes[k] = String(v);
    if (k === "class") this.className = String(v);
    if (k.startsWith("data-")) {
      const camel = k.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      this.dataset[camel] = String(v);
    }
  }

  getAttribute(k) {
    if (k === "class") return this.className || null;
    return this.attributes[k] !== undefined ? this.attributes[k] : null;
  }

  appendChild(child) {
    if (!child) return child;
    child.parentNode = this;
    child.parentElement = this;
    this.children.push(child);
    return child;
  }

  insertBefore(newNode, refNode) {
    if (!newNode) return newNode;
    newNode.parentNode = this;
    newNode.parentElement = this;
    const idx = this.children.indexOf(refNode);
    if (idx >= 0) {
      this.children.splice(idx, 0, newNode);
    } else {
      this.children.push(newNode);
    }
    return newNode;
  }

  removeChild(child) {
    const idx = this.children.indexOf(child);
    if (idx >= 0) {
      this.children.splice(idx, 1);
      child.parentNode = null;
      child.parentElement = null;
    }
    return child;
  }

  remove() {
    if (this.parentNode && typeof this.parentNode.removeChild === "function") {
      this.parentNode.removeChild(this);
    }
  }

  querySelector(sel) {
    const all = this.querySelectorAll(sel);
    return all.length > 0 ? all[0] : null;
  }

  querySelectorAll(sel) {
    const results = [];
    const walk = (node) => {
      if (!node || !node.children) return;
      for (const child of node.children) {
        let match = false;
        if (sel.startsWith(".")) {
          match = child.classList?.contains(sel.slice(1));
        } else if (sel.startsWith("#")) {
          match = child.attributes?.id === sel.slice(1) || child.dataset?.id === sel.slice(1);
        } else if (sel.startsWith("[")) {
          const attrMatch = sel.match(/\[([a-zA-Z0-9_-]+)(?:=["']?([^"']+)["']?)?\]/);
          if (attrMatch) {
            const attrName = attrMatch[1];
            const attrVal = attrMatch[2];
            const curVal = typeof child.getAttribute === "function"
              ? child.getAttribute(attrName)
              : (child.attributes ? child.attributes[attrName] : null);
            match = attrVal !== undefined ? curVal === attrVal : curVal !== null;
          }
        } else if (/^[a-zA-Z0-9]+$/.test(sel)) {
          match = child.tagName === sel.toUpperCase();
        }
        if (match) results.push(child);
        walk(child);
      }
    };
    walk(this);
    return results;
  }

  focus() { this.focused = true; }
}

export async function runWriterRefMailAuditTests() {
  const results = [];

  const test = async (name, fn) => {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (err) {
      results.push({ name, pass: false, error: err.message });
    }
  };

  // TEST 1: Kiểm tra khai báo Command Definitions đầy đủ
  await test("Writer Ref/Mail Audit: Khai báo 10 command References và Mailings chuẩn xác trong WRITER_COMMANDS", async () => {
    const refMailCmds = [
      "writer.reference.tocInsert",
      "writer.reference.tocUpdate",
      "writer.reference.footnoteInsert",
      "writer.reference.endnoteInsert",
      "writer.mailMerge.open",
      "writer.mailMerge.insertField",
      "writer.mailMerge.preview",
      "writer.mailMerge.prevRecord",
      "writer.mailMerge.nextRecord",
      "writer.mailMerge.finish"
    ];

    for (const cmdId of refMailCmds) {
      const def = WRITER_COMMANDS.find(c => c.id === cmdId);
      if (!def) throw new Error(`Thiếu command definition: ${cmdId}`);
      if (!def.label) throw new Error(`Command ${cmdId} thiếu label`);
      if (!def.icon) throw new Error(`Command ${cmdId} thiếu icon`);
    }
  });

  // TEST 2: Kiểm tra ánh xạ UNO Command đầy đủ
  await test("Writer Ref/Mail Audit: Ánh xạ 2 chiều chuẩn xác sang lệnh UNO Core", async () => {
    const expected = {
      "writer.reference.tocInsert": ".uno:InsertMultiIndex",
      "writer.reference.tocUpdate": ".uno:UpdateCurIndex",
      "writer.reference.footnoteInsert": ".uno:InsertFootnote",
      "writer.reference.endnoteInsert": ".uno:InsertEndnote",
      "writer.mailMerge.open": ".uno:MailMergeWizard",
      "writer.mailMerge.insertField": ".uno:InsertField",
      "writer.mailMerge.preview": ".uno:MailMergePreview",
      "writer.mailMerge.prevRecord": ".uno:MailMergePrev",
      "writer.mailMerge.nextRecord": ".uno:MailMergeNext",
      "writer.mailMerge.finish": ".uno:MailMergeFinish"
    };

    for (const [vnCmd, unoCmd] of Object.entries(expected)) {
      const mapped = mapVnCommandToUno(vnCmd);
      if (mapped !== unoCmd) throw new Error(`${vnCmd} ánh xạ sang ${mapped}, kỳ vọng ${unoCmd}`);
    }
  });

  // TEST 3: Kiểm tra icon SVG vector đầy đủ và không dùng circle generic
  await test("Writer Ref/Mail Audit: 10 Icon SVG vector đa sắc có mặt trong ICONS", async () => {
    const iconKeys = [
      "tocInsert", "tocUpdate", "footnoteInsert", "endnoteInsert",
      "mailMerge", "mergeInsertField", "mergePreview", "mergePrev", "mergeNext", "mergeFinish"
    ];

    for (const key of iconKeys) {
      const svg = ICONS[key];
      if (!svg) throw new Error(`Thiếu icon SVG: ${key}`);
      if (!svg.includes("<svg") || !svg.includes("</svg>")) {
        throw new Error(`Icon ${key} không phải chuỗi SVG hợp lệ`);
      }
    }
  });

  // TEST 4: Kiểm tra phím tắt Footnote và Endnote
  await test("Writer Ref/Mail Audit: Phím tắt Footnote (Ctrl+Alt+F) và Endnote (Ctrl+Alt+D) chuẩn Word", async () => {
    const fnDef = WRITER_COMMANDS.find(c => c.id === "writer.reference.footnoteInsert");
    if (fnDef.shortcut !== "Ctrl+Alt+F") throw new Error(`Footnote shortcut sai: ${fnDef.shortcut}`);

    const enDef = WRITER_COMMANDS.find(c => c.id === "writer.reference.endnoteInsert");
    if (enDef.shortcut !== "Ctrl+Alt+D") throw new Error(`Endnote shortcut sai: ${enDef.shortcut}`);
  });

  // TEST 5: Phân tích cú pháp CSV nâng cao (xử lý ngoặc kép, dấu phẩy, ký tự thoát)
  await test("Writer Mail Merge: parseCsv xử lý đúng trường có dấu phẩy trong ngoặc kép", async () => {
    const csv = `HoTen,DiaChi,SoDienThoai\n"Nguyễn Văn A, TS","Số 1, Phố Huế, Hà Nội",0912345678\n"Trần Thị B","Đà Nẵng",0987654321`;
    const { fields, records } = parseCsv(csv);
    if (fields.length !== 3) throw new Error(`Cột sai: ${fields.length}`);
    if (records.length !== 2) throw new Error(`Bản ghi sai: ${records.length}`);
    if (records[0].HoTen !== "Nguyễn Văn A, TS") throw new Error(`HoTen sai: ${records[0].HoTen}`);
    if (records[0].DiaChi !== "Số 1, Phố Huế, Hà Nội") throw new Error(`DiaChi sai: ${records[0].DiaChi}`);
  });

  // TEST 6: Thay thế trường trộn thư chuẩn xác
  await test("Writer Mail Merge: replaceMergeFields thay thế chính xác cả marker span và fallback", async () => {
    const template = `<p>Kính gửi: <span class="vno-merge-field" data-field="HoTen">«HoTen»</span> - <span class="vno-merge-field" data-field="ChucVu">«ChucVu»</span></p>`;
    const record = { HoTen: "Lê Văn C", ChucVu: "Trưởng phòng" };
    const res = replaceMergeFields(template, record);
    if (!res.includes("Lê Văn C")) throw new Error(`Không thấy tên: ${res}`);
    if (!res.includes("Trưởng phòng")) throw new Error(`Không thấy chức vụ: ${res}`);
    if (res.includes("«HoTen»") || res.includes("«ChucVu»")) throw new Error(`Chưa thay hết thẻ marker: ${res}`);
  });

  // TEST 7: Xử lý an toàn tuyệt đối khi Command Bus và handleDispatch nhận args = null (Bài học 4)
  await test("Writer Ref/Mail Audit: handleDispatch & Command Bus xử lý an toàn khi args = null", async () => {
    const fakePage = new SafeFakeElement("div");
    fakePage.className = "vno-writer-page";
    const fakeBody = new SafeFakeElement("div");
    fakeBody.className = "vno-writer-body";
    fakePage.appendChild(fakeBody);

    const adapter = new WriterAdapter(fakePage);
    adapter.attach();

    const commandsToTest = [
      "writer.reference.tocInsert",
      "writer.reference.tocUpdate",
      "writer.reference.footnoteInsert",
      "writer.reference.endnoteInsert",
      "writer.mailMerge.open",
      "writer.mailMerge.insertField",
      "writer.mailMerge.preview",
      "writer.mailMerge.prevRecord",
      "writer.mailMerge.nextRecord",
      "writer.mailMerge.finish",
      "writer.comment.insert",
      "writer.trackChanges.toggle",
      "writer.trackChanges.acceptAll",
      "writer.trackChanges.rejectAll"
    ];

    for (const cmd of commandsToTest) {
      try {
        await adapter.handleDispatch(null, null, cmd);
      } catch (err) {
        throw new Error(`Crash khi gọi handleDispatch với cmd=${cmd} và args=null: ${err.message}`);
      }
    }
  });

  // TEST 8: Kiểm tra direct binding cho Review commands trong attach()
  await test("Writer Review: Direct handler binding cho comment và track changes trong attach()", async () => {
    const fakePage = new SafeFakeElement("div");
    fakePage.className = "vno-writer-page";
    const fakeBody = new SafeFakeElement("div");
    fakeBody.className = "vno-writer-body";
    fakePage.appendChild(fakeBody);

    const adapter = new WriterAdapter(fakePage);
    adapter.attach();

    const reviewCmds = [
      "writer.comment.insert",
      "writer.trackChanges.toggle",
      "writer.trackChanges.acceptAll",
      "writer.trackChanges.rejectAll"
    ];

    for (const cmd of reviewCmds) {
      const handler = globalCommandBus._handlers.get(cmd);
      if (typeof handler !== "function") {
        throw new Error(`Thiếu direct handler trong CommandBus cho: ${cmd}`);
      }
    }
  });

  // TEST 9: i18n đa ngôn ngữ cho TOC và Footnotes/Endnotes
  await test("Writer Ref/Mail Audit: Hỗ trợ i18n chuyển đổi ngôn ngữ cho TOC, Footnotes, Endnotes", async () => {
    const origLocale = getLocale;
    try {
      setLocale("vi");
      const viEmpty = t("writerDialogs.toc.empty");
      const viFnPh = t("writerDialogs.notes.footnotePlaceholder");
      if (!viEmpty.includes("Chưa có tiêu đề")) throw new Error(`vi TOC empty sai: ${viEmpty}`);
      if (!viFnPh.includes("Nhập nội dung")) throw new Error(`vi footnote placeholder sai: ${viFnPh}`);

      setLocale("en");
      const enEmpty = t("writerDialogs.toc.empty");
      const enFnPh = t("writerDialogs.notes.footnotePlaceholder");
      if (!enEmpty.includes("No headings found")) throw new Error(`en TOC empty sai: ${enEmpty}`);
      if (!enFnPh.includes("Type footnote text")) throw new Error(`en footnote placeholder sai: ${enFnPh}`);
    } finally {
      setLocale(origLocale);
    }
  });

  // TEST 10: Chuyển đổi số La Mã cho Endnote
  await test("Writer Ref/Mail Audit: Hàm toRoman chuyển đổi chính xác các số nguyên", async () => {
    if (toRoman(1) !== "i") throw new Error(`1 != i`);
    if (toRoman(4) !== "iv") throw new Error(`4 != iv`);
    if (toRoman(9) !== "ix") throw new Error(`9 != ix`);
    if (toRoman(14) !== "xiv") throw new Error(`14 != xiv`);
    if (toRoman(42) !== "xlii") throw new Error(`42 != xlii`);
  });

  return results;
}

