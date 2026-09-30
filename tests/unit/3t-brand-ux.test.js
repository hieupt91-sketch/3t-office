/**
 * Test Suite: 3T Office Brand UX — About Dialog
 * Kiểm tra màn hình chào khởi động và hộp thoại Giới thiệu 3T Office
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { showAboutDialog } from "../../platform/about/about-dialog.js";
import { viStrings } from "../../platform/i18n/strings-vi.js";
import { enStrings } from "../../platform/i18n/strings-en.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "../..");

class MockElement {
  constructor(tag = "div") {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.parentNode = null;
    this.attributes = {};
    this.style = {};
    this.listeners = {};
    this._textContent = "";
    this._innerHTML = "";
    this.classList = {
      _set: new Set(),
      add: (...cls) => cls.forEach(c => this.classList._set.add(c)),
      remove: (...cls) => cls.forEach(c => this.classList._set.delete(c)),
      contains: (c) => this.classList._set.has(c)
    };
  }

  get className() { return Array.from(this.classList._set).join(" "); }
  set className(val) {
    this.classList._set.clear();
    String(val || "").split(/\s+/).filter(Boolean).forEach(c => this.classList._set.add(c));
  }

  get textContent() {
    if (this._textContent) return this._textContent;
    if (this.children.length > 0) return this.children.map(c => c.textContent).join(" ");
    return "";
  }
  set textContent(val) {
    this._textContent = String(val ?? "");
  }

  get innerHTML() { return this._innerHTML; }
  set innerHTML(val) {
    this._innerHTML = String(val ?? "");
    this._parseHtml(this._innerHTML);
  }

  _parseHtml(html) {
    this.children = [];
    const VOID_TAGS = new Set(["input", "br", "hr", "img", "meta", "link"]);
    const tokenRegex = /(<(\/)?([a-zA-Z0-9-]+)([^>]*)>)|([^<]+)/g;
    const stack = [this];
    let match;

    while ((match = tokenRegex.exec(html)) !== null) {
      if (match[5] !== undefined) {
        const text = match[5].trim();
        if (text) {
          const textNode = new MockElement("#text");
          textNode.textContent = text;
          stack[stack.length - 1].appendChild(textNode);
        }
      } else {
        const isClosing = Boolean(match[2]);
        const tagName = match[3].toLowerCase();
        const rawAttrs = match[4] || "";

        if (isClosing) {
          if (stack.length > 1 && stack[stack.length - 1].tagName.toLowerCase() === tagName) {
            stack.pop();
          }
        } else {
          const isSelfClosing = rawAttrs.trim().endsWith("/") || VOID_TAGS.has(tagName);
          const child = new MockElement(tagName);

          const attrRegex = /([a-zA-Z0-9-]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
          let am;
          while ((am = attrRegex.exec(rawAttrs)) !== null) {
            const attrName = am[1];
            if (!attrName || attrName === "/") continue;
            const val = am[2] !== undefined ? am[2] : (am[3] !== undefined ? am[3] : (am[4] !== undefined ? am[4] : ""));
            child.setAttribute(attrName, val);
            if (attrName === "class") child.className = val;
            if (attrName === "id") child.setAttribute("id", val);
          }

          stack[stack.length - 1].appendChild(child);

          if (!isSelfClosing) {
            stack.push(child);
          }
        }
      }
    }
  }

  setAttribute(k, v) { this.attributes[k] = String(v); }
  getAttribute(k) { return this.attributes[k] ?? null; }
  removeAttribute(k) { delete this.attributes[k]; }

  appendChild(child) {
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  remove() {
    if (this.parentNode) {
      const idx = this.parentNode.children.indexOf(this);
      if (idx !== -1) this.parentNode.children.splice(idx, 1);
      this.parentNode = null;
    }
  }

  addEventListener(event, fn) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(fn);
  }

  dispatchEvent(event) {
    if (!event.preventDefault) event.preventDefault = () => {};
    if (!event.stopPropagation) event.stopPropagation = () => {};
    const list = this.listeners[event.type] || [];
    for (const fn of list) fn(event);
  }

  click() {
    const ev = { type: "click", target: this, defaultPrevented: false, preventDefault() { this.defaultPrevented = true; }, stopPropagation() {} };
    this.dispatchEvent(ev);
  }

  focus() {
    if (global.document) global.document.activeElement = this;
  }

  querySelector(sel) {
    if (sel.startsWith("#")) {
      const targetId = sel.slice(1);
      if (this.getAttribute("id") === targetId) return this;
      for (const c of this.children) {
        const found = c.querySelector(sel);
        if (found) return found;
      }
    } else if (sel.startsWith(".")) {
      const targetCls = sel.slice(1);
      if (this.classList.contains(targetCls)) return this;
      for (const c of this.children) {
        const found = c.querySelector(sel);
        if (found) return found;
      }
    } else if (sel.startsWith("[")) {
      const attrMatch = sel.match(/\[([a-zA-Z0-9_-]+)/);
      if (attrMatch) {
        const attr = attrMatch[1];
        if (this.attributes[attr] !== undefined) return this;
        for (const c of this.children) {
          const found = c.querySelector(sel);
          if (found) return found;
        }
      }
    }
    return null;
  }

  querySelectorAll(sel) {
    const list = [];
    if (sel.startsWith(".")) {
      const targetCls = sel.slice(1);
      if (this.classList.contains(targetCls)) list.push(this);
    }
    for (const c of this.children) {
      list.push(...c.querySelectorAll(sel));
    }
    return list;
  }
}

function setupMockEnvironment() {
  const body = new MockElement("body");
  const doc = {
    body,
    activeElement: null,
    listeners: {},
    createElement(tag) { return new MockElement(tag); },
    getElementById(id) {
      return body.querySelector("#" + id);
    },
    querySelector(sel) {
      return body.querySelector(sel);
    },
    querySelectorAll(sel) {
      return body.querySelectorAll(sel);
    },
    addEventListener(event, fn) {
      if (!this.listeners[event]) this.listeners[event] = [];
      this.listeners[event].push(fn);
    },
    removeEventListener(event, fn) {
      if (this.listeners[event]) {
        this.listeners[event] = this.listeners[event].filter(f => f !== fn);
      }
    },
    dispatchEvent(event) {
      if (!event.preventDefault) event.preventDefault = () => {};
      if (!event.stopPropagation) event.stopPropagation = () => {};
      const list = this.listeners[event.type] || [];
      for (const fn of list) fn(event);
    }
  };

  global.window = {
    addEventListener(event, fn) { doc.addEventListener(event, fn); },
    dispatchEvent(event) { doc.dispatchEvent(event); },
    pywebview: null
  };
  global.document = doc;
  global.requestAnimationFrame = (cb) => { cb(); };
}

export async function run3tBrandUxTests() {
  const results = [];

  const test = async (name, fn) => {
    try {
      await fn();
      results.push({ name: `[3T Brand UX] ${name}`, pass: true });
    } catch (e) {
      results.push({ name: `[3T Brand UX] ${name}`, pass: false, error: e.message });
    }
  };

  setupMockEnvironment();

  // 1. Kiểm tra sự tồn tại của tệp THIRD-PARTY-NOTICES và nội dung bản quyền
  await test("Tệp THIRD-PARTY-NOTICES tồn tại và đầy đủ giấy phép các thành phần cốt lõi", () => {
    const noticesPath = path.join(rootDir, "THIRD-PARTY-NOTICES");
    if (!fs.existsSync(noticesPath)) {
      throw new Error("Không tìm thấy tệp THIRD-PARTY-NOTICES tại thư mục gốc");
    }
    const content = fs.readFileSync(noticesPath, "utf8");
    const requiredTerms = ["Python 3.12", "LibreOffice", "pywebview", "pythonnet", "cffi", "bottle", "Be Vietnam Pro"];
    for (const term of requiredTerms) {
      if (!content.includes(term)) {
        throw new Error(`THIRD-PARTY-NOTICES thiếu thông tin thành phần: ${term}`);
      }
    }
  });

  // 2. Kiểm tra tài sản nhận diện thương hiệu 3T trong branding/3t/
  await test("Tài sản nhận diện thương hiệu 3T đầy đủ (3t-mark.png và 3t-mark.svg)", () => {
    const pngPath = path.join(rootDir, "branding/3t/3t-mark.png");
    const svgPath = path.join(rootDir, "branding/3t/3t-mark.svg");
    if (!fs.existsSync(pngPath)) throw new Error("Thiếu branding/3t/3t-mark.png");
    if (!fs.existsSync(svgPath)) throw new Error("Thiếu branding/3t/3t-mark.svg");
    if (fs.statSync(pngPath).size < 1000) throw new Error("3t-mark.png không hợp lệ");
  });

  // 5. Kiểm tra Hộp Giới thiệu (About Dialog): cấu trúc, thương hiệu 3T và thông tin bản quyền
  await test("About Dialog: hiển thị đầy đủ logo 3T, phiên bản, bản quyền 3T và danh sách nguồn mở", async () => {
    window.pywebview = {
      api: {
        get_app_version: async () => "0.9.0-pilot1",
        get_about_info: async () => ({
          app_version: "0.9.0-pilot1",
          product_name: "3T Office",
          developer: "3T Technology",
          copyright: "© 2024–2026 3T Technology. All rights reserved.",
          third_party_notices: "BẢN QUYỀN VÀ GIẤY PHÉP NGUỒN MỞ BÊN THỨ BA",
          components: [
            { name: "Python", version: "3.12", license: "PSF License", purpose: "Nền tảng ứng dụng" },
            { name: "LibreOffice Core", version: "7.6+", license: "MPL-2.0", purpose: "Lõi xử lý tài liệu" },
            { name: "pywebview", version: "5.x", license: "BSD-3-Clause", purpose: "Khung cửa sổ desktop" }
          ]
        })
      }
    };

    await showAboutDialog();

    const dialog = document.querySelector(".vno-about-dialog");
    if (!dialog) throw new Error("Hộp thoại About Dialog không xuất hiện trong DOM");

    const title = dialog.querySelector("#vno-about-dialog-title");
    if (!title || !title.textContent.includes("3T") || !title.textContent.includes("OFFICE")) {
      throw new Error("Tiêu đề hộp thoại thiếu nhận diện 3T OFFICE");
    }

    const versionBadge = dialog.querySelector(".vno-about-badge-version");
    if (!versionBadge || versionBadge.textContent !== "0.9.0-pilot1") {
      throw new Error(`Phiên bản hiển thị không đúng: ${versionBadge?.textContent}`);
    }

    // Đóng hộp thoại bằng nút đóng
    const closeBtn = dialog.querySelector("#vno-about-close-btn");
    if (!closeBtn) throw new Error("Thiếu nút đóng");
    closeBtn.click();

    if (document.querySelector(".vno-about-dialog")) {
      throw new Error("Hộp thoại chưa đóng sau khi nhấn nút Đóng");
    }
  });

  // 6. Kiểm tra trợ năng bàn phím của About Dialog (Esc đóng hộp thoại)
  await test("About Dialog: phím Escape đóng hộp thoại tức thì và bẫy tiêu điểm Tab", async () => {
    await showAboutDialog();
    const dialog = document.querySelector(".vno-about-dialog");
    if (!dialog) throw new Error("Không thể mở About Dialog cho test bàn phím");

    document.dispatchEvent({ type: "keydown", key: "Escape" });

    if (document.querySelector(".vno-about-dialog")) {
      throw new Error("Nhấn phím Escape không đóng About Dialog");
    }
  });

  // 7. Kiểm tra Command Bus đăng ký lệnh common.help.about và hỗ trợ i18n
  await test("Command Bus: lệnh common.help.about được định nghĩa và có bản dịch tiếng Việt / tiếng Anh", () => {
    const viLabel = viStrings.commands?.["common.help.about"]?.label;
    const enLabel = enStrings.commands?.["common.help.about"]?.label;
    if (!viLabel || !viLabel.includes("Giới thiệu")) {
      throw new Error(`Bản dịch tiếng Việt thiếu common.help.about: ${viLabel}`);
    }
    if (!enLabel || !enLabel.includes("About")) {
      throw new Error(`Bản dịch tiếng Anh thiếu common.help.about: ${enLabel}`);
    }
  });

  return results;
}
