/**
 * VN Office — Unit Tests for Backstage Print Thumbnail & Live Preview
 * Tuân thủ chuẩn 06-testing/TESTING-STANDARD.md & AGENTS.md
 */

import { AppShell } from "../../platform/shell/app-shell.js";
import { SheetGridController } from "../../apps/sheet/sheet-grid.js";
import { SheetAdapter } from "../../adapters/libreoffice/sheet/sheet-adapter.js";
import { SlidesCanvasController } from "../../apps/slides/slides-canvas.js";
import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";
import { globalCommandBus } from "../../platform/commands/command-bus.js";

const assert = (value, message) => { if (!value) throw new Error(message); };

class FakeClassList {
  constructor(owner) { this.owner = owner; }
  _items() { return new Set((this.owner.className || "").split(/\s+/).filter(Boolean)); }
  add(name) { const items = this._items(); items.add(name); this.owner.className = [...items].join(" "); }
  remove(name) { const items = this._items(); items.delete(name); this.owner.className = [...items].join(" "); }
  toggle(name, force) {
    const items = this._items();
    const has = items.has(name);
    const shouldHave = force === undefined ? !has : force;
    if (shouldHave) items.add(name); else items.delete(name);
    this.owner.className = [...items].join(" ");
  }
  contains(name) { return this._items().has(name); }
}

class FakeElement {
  constructor(tagName = "div") {
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.parentNode = null;
    this.dataset = {};
    this.className = "";
    this.classList = new FakeClassList(this);
    this.attributes = {};
    this.listeners = {};
    this.hidden = false;
    this._textContent = "";
    this._innerHTML = "";
    this.style = {};
    this.disabled = false;
    this.value = "";
  }
  get id() { return this.attributes.id || ""; }
  set id(val) { this.setAttribute("id", val); }
  get textContent() {
    if (this._textContent) return this._textContent;
    if (this.children.length > 0) return this.children.map(c => c.textContent).join(" ");
    return this._innerHTML.replace(/<[^>]+>/g, "").trim();
  }
  set textContent(val) { this._textContent = String(val); this._innerHTML = String(val); this.children = []; }
  get innerHTML() { return this.children.length > 0 ? this.children.map(c => c.outerHTML || "").join("\n") : this._innerHTML; }
  set innerHTML(val) { this._innerHTML = String(val); this._parseChildHtml(this._innerHTML); }
  _parseChildHtml(html) {
    this.children = [];
    if (!html || typeof html !== "string") return;
    let i = 0;
    while (i < html.length) {
      const openIndex = html.indexOf("<", i);
      if (openIndex === -1) break;
      if (html.slice(openIndex, openIndex + 4) === "<!--") {
        const commentEnd = html.indexOf("-->", openIndex);
        i = commentEnd === -1 ? html.length : commentEnd + 3;
        continue;
      }
      if (html[openIndex + 1] === "/") {
        const closeTagEnd = html.indexOf(">", openIndex);
        i = closeTagEnd === -1 ? html.length : closeTagEnd + 1;
        continue;
      }
      const tagEnd = html.indexOf(">", openIndex);
      if (tagEnd === -1) break;
      const tagHeader = html.slice(openIndex + 1, tagEnd);
      const isSelfClosing = tagHeader.endsWith("/") || /^(meta|img|br|hr|input|link|rect|circle|line|path)$/i.test(tagHeader.trim().split(/\s+/)[0]);
      const spaceIdx = tagHeader.search(/\s|\//);
      const tagName = (spaceIdx === -1 ? tagHeader : tagHeader.slice(0, spaceIdx)).trim();
      const rawAttrs = spaceIdx === -1 ? "" : tagHeader.slice(spaceIdx);

      const child = new FakeElement(tagName);
      const classMatch = rawAttrs.match(/class=["']([^"']+)["']/i);
      if (classMatch) child.className = classMatch[1];
      const idMatch = rawAttrs.match(/\bid=["']([^"']+)["']/i);
      if (idMatch) child.setAttribute("id", idMatch[1]);
      const dataTabMatch = rawAttrs.match(/\bdata-backstage-tab=["']([^"']+)["']/i);
      if (dataTabMatch) child.setAttribute("data-backstage-tab", dataTabMatch[1]);
      const dataCmdMatch = rawAttrs.match(/\bdata-backstage-cmd=["']([^"']+)["']/i);
      if (dataCmdMatch) child.setAttribute("data-backstage-cmd", dataCmdMatch[1]);
      if (/disabled\b/i.test(rawAttrs)) child.disabled = true;
      const styleMatch = rawAttrs.match(/style=["']([^"']+)["']/i);
      if (styleMatch) {
        const parts = styleMatch[1].split(";");
        for (const part of parts) {
          const [prop, val] = part.split(":");
          if (prop && val) {
            const camel = prop.trim().replace(/-([a-z])/g, (_, g) => g.toUpperCase());
            child.style[camel] = val.trim();
          }
        }
      }

      child.parentNode = this;
      this.children.push(child);

      if (isSelfClosing) {
        i = tagEnd + 1;
      } else {
        let depth = 1;
        let searchIndex = tagEnd + 1;
        let innerEnd = -1;
        const openToken = `<${tagName}`;
        const closeToken = `</${tagName}>`;
        while (depth > 0 && searchIndex < html.length) {
          const nextOpen = html.toLowerCase().indexOf(openToken.toLowerCase(), searchIndex);
          const nextClose = html.toLowerCase().indexOf(closeToken.toLowerCase(), searchIndex);
          if (nextClose === -1) break;
          if (nextOpen !== -1 && nextOpen < nextClose) {
            const charAfter = html[nextOpen + openToken.length];
            if (charAfter === " " || charAfter === ">" || charAfter === "/" || charAfter === "\n" || charAfter === "\t") {
              depth++;
            }
            searchIndex = nextOpen + openToken.length;
          } else {
            depth--;
            if (depth === 0) {
              innerEnd = nextClose;
            }
            searchIndex = nextClose + closeToken.length;
          }
        }
        if (innerEnd !== -1) {
          child.innerHTML = html.slice(tagEnd + 1, innerEnd);
          i = searchIndex;
        } else {
          i = tagEnd + 1;
        }
      }
    }
  }
  get outerHTML() {
    const tag = this.tagName.toLowerCase();
    const classStr = this.className ? ` class="${this.className}"` : "";
    return `<${tag}${classStr}>${this.innerHTML}</${tag}>`;
  }
  appendChild(child) {
    if (child.parentNode) child.parentNode.removeChild(child);
    child.parentNode = this;
    this.children.push(child);
    return child;
  }
  removeChild(child) {
    const index = this.children.indexOf(child);
    if (index >= 0) this.children.splice(index, 1);
    child.parentNode = null;
  }
  remove() { if (this.parentNode) this.parentNode.removeChild(this); }
  setAttribute(name, value) {
    this.attributes[name] = String(value);
    if (name === "class") this.className = String(value);
    if (name === "id") this.attributes.id = String(value);
  }
  getAttribute(name) { return this.attributes[name] ?? null; }
  addEventListener(type, handler) { (this.listeners[type] ||= []).push(handler); }
  removeEventListener(type, handler) { if (this.listeners[type]) this.listeners[type] = this.listeners[type].filter(h => h !== handler); }
  dispatchEvent(event) { (this.listeners[event.type] || []).forEach(h => h(event)); }
  click() { this.dispatchEvent({ type: "click", target: this, stopPropagation() {}, preventDefault() {} }); }
  contains(node) { return node === this || this.children.some(child => child.contains?.(node)); }
  _matches(selector) {
    if (!selector) return false;
    if (selector.startsWith(".")) return this.classList.contains(selector.slice(1));
    if (selector.startsWith("#")) return (this.attributes.id || "") === selector.slice(1);
    const attrMatch = selector.match(/^\[([a-zA-Z0-9\-_]+)(?:=["']?([^"']*)["']?)?\]$/);
    if (attrMatch) {
      const attrName = attrMatch[1];
      const attrVal = attrMatch[2];
      if (attrVal === undefined) return this.attributes[attrName] !== undefined;
      return this.attributes[attrName] === attrVal;
    }
    return this.tagName.toLowerCase() === selector.toLowerCase();
  }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  querySelectorAll(selector) {
    const found = [];
    for (const child of this.children) {
      if (child._matches(selector)) found.push(child);
      found.push(...child.querySelectorAll(selector));
    }
    return found;
  }
  focus() {}
}

class FakeDocument {
  constructor() { this.body = new FakeElement("body"); this.listeners = {}; }
  createElement(tag) { return new FakeElement(tag); }
  addEventListener(type, handler) { (this.listeners[type] ||= []).push(handler); }
  removeEventListener(type, handler) { if (this.listeners[type]) this.listeners[type] = this.listeners[type].filter(h => h !== handler); }
  querySelector(selector) { return selector === "body" ? this.body : this.body.querySelector(selector); }
  querySelectorAll(selector) { return this.body.querySelectorAll(selector); }
  get activeElement() { return this.body; }
}

const fakeContainer = () => new FakeElement("div");
const putCell = (grid, coord, val) => grid.cellsData.set(coord, { val, formula: "", style: {} });

export async function runBackstagePrintThumbnailTests() {
  const results = [];
  const test = async (name, fn) => {
    try {
      fakeDoc.body.children = [];
      await fn();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.message });
    }
  };

  const originalDoc = globalThis.document;
  const originalWin = globalThis.window;
  const fakeDoc = new FakeDocument();
  globalThis.document = fakeDoc;

  try {
    await test("AppShell Backstage có mục In ấn dạng tab con (data-backstage-tab=print), không còn thoát ra ngoài", () => {
      const shell = new AppShell({ appName: "sheet", appTitle: "VN Sheet" });
      shell.showBackstageMenu();
      const modal = fakeDoc.body.querySelector(".vno-backstage-overlay");
      assert(modal, "Backstage modal phải được mount vào body");
      const printBtn = modal.querySelector("#vno-backstage-nav-print");
      assert(printBtn, "Phải có nút điều hướng In ấn #vno-backstage-nav-print");
      assert(printBtn.getAttribute("data-backstage-tab") === "print", "Nút In phải có data-backstage-tab=print");
      modal.remove();
    });

    await test("Sheet Backstage In: bấm In hiển thị panel xem trước THẬT với bảng dữ liệu thật của Sheet", () => {
      const grid = new SheetGridController(fakeContainer());
      putCell(grid, "A1", "Dự toán chi phí 2026");
      putCell(grid, "B1", 5000000);
      grid.printAreaBySheet[grid.activeSheet] = "A1:B1";

      const shell = new AppShell({ appName: "sheet", appTitle: "VN Sheet", grid });
      shell.showBackstageMenu();
      const modal = fakeDoc.body.querySelector(".vno-backstage-overlay");
      const printBtn = modal.querySelector("#vno-backstage-nav-print");

      // Bấm vào mục In
      printBtn.click();

      assert(printBtn.classList.contains("is-active"), "Nút In phải có class is-active khi được chọn");
      const printView = modal.querySelector("#vno-backstage-print-view");
      assert(printView && printView.style.display !== "none", "Panel in ấn phải hiển thị");

      // Kiểm tra bảng dữ liệu thật
      const table = printView.querySelector(".vno-sheet-print-table");
      assert(table, "Panel xem trước phải render đúng .vno-sheet-print-table thật từ grid._renderPrintPageTable()");
      assert(table.textContent.includes("Dự toán chi phí 2026"), "Nội dung bảng in phải chứa dữ liệu thật của ô A1");
      assert(table.textContent.includes("5000000"), "Nội dung bảng in phải chứa dữ liệu thật của ô B1");

      modal.remove();
    });

    await test("Sheet Backstage In: tài liệu 1 trang ẩn nút điều hướng Trang trước/sau", () => {
      const grid = new SheetGridController(fakeContainer());
      putCell(grid, "A1", "Báo cáo ngắn");
      grid.printAreaBySheet[grid.activeSheet] = "A1:A1";

      const shell = new AppShell({ appName: "sheet", appTitle: "VN Sheet", grid });
      shell.showBackstageMenu();
      const modal = fakeDoc.body.querySelector(".vno-backstage-overlay");
      modal.querySelector("#vno-backstage-nav-print").click();

      const navControls = modal.querySelector("#vno-backstage-print-nav-controls");
      assert(navControls && navControls.style.display === "none", "Tài liệu 1 trang phải ẩn cụm điều hướng trang (display: none)");

      modal.remove();
    });

    await test("Sheet Backstage In: tài liệu nhiều trang hiện điều hướng và bấm Trang sau đổi đúng trang", () => {
      const grid = new SheetGridController(fakeContainer());
      for (let r = 1; r <= 80; r++) putCell(grid, `A${r}`, `Dòng dữ liệu số ${r}`);
      grid.printAreaBySheet[grid.activeSheet] = "A1:A80";

      const shell = new AppShell({ appName: "sheet", appTitle: "VN Sheet", grid });
      shell.showBackstageMenu();
      const modal = fakeDoc.body.querySelector(".vno-backstage-overlay");
      modal.querySelector("#vno-backstage-nav-print").click();

      const navControls = modal.querySelector("#vno-backstage-print-nav-controls");
      const prevBtn = modal.querySelector("#vno-backstage-print-prev");
      const nextBtn = modal.querySelector("#vno-backstage-print-next");
      const curPage = modal.querySelector("#vno-backstage-print-current-page");

      assert(navControls && navControls.style.display !== "none", "Tài liệu nhiều trang phải hiển thị cụm điều hướng trang");

      assert(curPage && curPage.textContent === "1", "Ban đầu phải ở trang 1");
      assert(prevBtn.disabled === true, "Ở trang đầu thì nút Trang trước phải bị disabled");
      assert(nextBtn.disabled === false, "Ở trang đầu thì nút Trang sau phải enabled");

      // Kiểm tra dữ liệu trang 1 có chứa Dòng dữ liệu số 1
      const stage = modal.querySelector("#vno-backstage-print-stage");
      assert(stage.textContent.includes("Dòng dữ liệu số 1"), "Trang 1 phải có dữ liệu dòng 1");

      // Bấm Trang sau sang trang 2
      nextBtn.click();
      assert(curPage.textContent === "2", "Sau khi bấm Trang sau thì số trang hiển thị phải là 2");
      assert(prevBtn.disabled === false, "Nút Trang trước phải được kích hoạt sau khi sang trang 2");
      assert(stage.textContent.includes("Dòng dữ liệu số 40"), "Trang 2 phải chứa dữ liệu dòng 40");

      // Bấm Trang sau tiếp sang trang 3
      nextBtn.click();
      assert(curPage.textContent === "3", "Sau khi bấm Trang sau tiếp thì số trang hiển thị phải là 3");
      assert(nextBtn.disabled === true, "Ở trang cuối cùng thì nút Trang sau phải bị disabled");
      assert(stage.textContent.includes("Dòng dữ liệu số 80"), "Trang 3 phải chứa dữ liệu dòng 80");

      // Bấm Trang trước về trang 2
      prevBtn.click();
      assert(curPage.textContent === "2", "Sau khi bấm Trang trước thì quay lại trang 2");
      assert(nextBtn.disabled === false, "Nút Trang sau lại được bật khi không còn ở trang cuối");

      // Bấm Trang trước về trang 1
      prevBtn.click();
      assert(curPage.textContent === "1", "Sau khi bấm Trang trước thì số trang quay lại là 1");
      assert(prevBtn.disabled === true, "Nút Trang trước lại bị disabled ở trang 1");

      modal.remove();
    });

    await test("Sheet Backstage In: nút In ngay đóng modal và kích hoạt lệnh common.file.print thật", () => {
      const grid = new SheetGridController(fakeContainer());
      putCell(grid, "A1", "Thử nghiệm lệnh in");
      grid.printAreaBySheet[grid.activeSheet] = "A1:A1";

      let printExecuted = false;
      const unbind = globalCommandBus.bindHandler("common.file.print", () => {
        printExecuted = true;
        return true;
      });

      const shell = new AppShell({ appName: "sheet", appTitle: "VN Sheet", grid });
      shell.showBackstageMenu();
      const modal = fakeDoc.body.querySelector(".vno-backstage-overlay");
      modal.querySelector("#vno-backstage-nav-print").click();

      const printNowBtn = modal.querySelector("#vno-backstage-btn-print-now");
      assert(printNowBtn, "Phải có nút In ngay lớn trong panel");
      printNowBtn.click();

      assert(printExecuted === true, "Nút In ngay phải thực thi globalCommandBus.execute('common.file.print')");
      assert(fakeDoc.body.querySelector(".vno-backstage-overlay") === null, "Modal Backstage phải được đóng sau khi bấm In ngay");
    });

    await test("Backstage In: chuyển tab Trang chủ rồi quay lại In dọn dẹp sạch sẽ không lỗi DOM", () => {
      const grid = new SheetGridController(fakeContainer());
      putCell(grid, "A1", "Test clean");
      grid.printAreaBySheet[grid.activeSheet] = "A1:A1";

      const shell = new AppShell({ appName: "sheet", appTitle: "VN Sheet", grid });
      shell.showBackstageMenu();
      const modal = fakeDoc.body.querySelector(".vno-backstage-overlay");

      const printNav = modal.querySelector("#vno-backstage-nav-print");
      const homeNav = modal.querySelector("#vno-backstage-nav-home");

      printNav.click();
      const stage1 = modal.querySelector("#vno-backstage-print-stage");
      assert(stage1 && stage1.querySelector(".vno-sheet-print-table"), "Đã render table khi chọn In");

      homeNav.click();
      assert(modal.querySelector("#vno-backstage-print-view").style.display === "none", "Print view ẩn khi về Home");
      assert(modal.querySelector("#vno-backstage-home-view").style.display !== "none", "Home view hiện khi về Home");

      printNav.click();
      const stage2 = modal.querySelector("#vno-backstage-print-stage");
      assert(stage2 && stage2.querySelector(".vno-sheet-print-table"), "Render lại bình thường khi quay lại In");

      modal.remove();
    });

    await test("Slides Backstage In: hiển thị panel xem trước THẬT với layout slide và loại bỏ slide ẩn", () => {
      const canvas = new SlidesCanvasController(fakeContainer());
      canvas.slides = [
        { id: 1, title: "Giới thiệu VN Office", body: "Giải pháp văn phòng Việt", layoutType: "title-content", shapes: [] },
        { id: 2, title: "Slide nháp bí mật", body: "Không in trang này", layoutType: "title-content", shapes: [], hidden: true },
        { id: 3, title: "Lộ trình triển khai", body: "Quý 3/2026", layoutType: "title-content", shapes: [] }
      ];

      const shell = new AppShell({ appName: "slides", appTitle: "VN Slides", canvas });
      shell.showBackstageMenu();
      const modal = fakeDoc.body.querySelector(".vno-backstage-overlay");
      modal.querySelector("#vno-backstage-nav-print").click();

      const printView = modal.querySelector("#vno-backstage-print-view");
      assert(printView && printView.style.display !== "none", "Panel In phải hiển thị");

      // Khung xem trước slide thật
      const surface = printView.querySelector(".vno-slides-print-surface");
      assert(surface, "Panel xem trước phải render đúng .vno-slides-print-surface thật");
      assert(surface.textContent.includes("Giới thiệu VN Office"), "Thumbnail phải hiển thị tiêu đề slide 1");

      // Tổng số trang in phải là 2 (đã bỏ qua slide 2 bị ẩn)
      const totalPagesEl = modal.querySelector("#vno-backstage-print-total-pages");
      assert(totalPagesEl && totalPagesEl.textContent === "2", "Tổng số trang in phải là 2 vì slide 2 bị ẩn");

      // Bấm Trang sau phải chuyển sang slide 3 (bỏ qua slide 2)
      const nextBtn = modal.querySelector("#vno-backstage-print-next");
      nextBtn.click();
      const stage = modal.querySelector("#vno-backstage-print-stage");
      assert(stage.textContent.includes("Lộ trình triển khai"), "Trang 2 phải hiển thị slide 3 thật");
      assert(!stage.textContent.includes("Slide nháp bí mật"), "Không được xuất hiện nội dung của slide ẩn");

      modal.remove();
    });

    await test("Slides Backstage In: 1 slide ẩn thanh điều hướng, nút In ngay thực thi lệnh in và đóng modal", () => {
      const canvas = new SlidesCanvasController(fakeContainer());
      canvas.slides = [
        { id: 1, title: "Slide đơn", body: "Chỉ có 1 trang", layoutType: "title-content", shapes: [] }
      ];

      let printTriggered = false;
      const unbind = globalCommandBus.bindHandler("common.file.print", () => {
        printTriggered = true;
        return true;
      });

      const shell = new AppShell({ appName: "slides", appTitle: "VN Slides", canvas });
      shell.showBackstageMenu();
      const modal = fakeDoc.body.querySelector(".vno-backstage-overlay");
      modal.querySelector("#vno-backstage-nav-print").click();

      const navControls = modal.querySelector("#vno-backstage-print-nav-controls");
      assert(navControls && navControls.style.display === "none", "Deck 1 slide phải ẩn thanh điều hướng trang");

      const printNowBtn = modal.querySelector("#vno-backstage-btn-print-now");
      assert(printNowBtn, "Phải có nút In ngay");
      printNowBtn.click();

      assert(printTriggered === true, "Bấm In ngay phải kích hoạt lệnh common.file.print");
      assert(fakeDoc.body.querySelector(".vno-backstage-overlay") === null, "Modal phải đóng sau khi bấm In ngay");
    });

    await test("Writer Backstage In: hiển thị panel xem trước THẬT với trang văn bản Writer chuẩn", () => {
      const pageEl = fakeDoc.createElement("div");
      pageEl.className = "vno-writer-page";
      const bodyEl = fakeDoc.createElement("div");
      bodyEl.className = "vno-writer-body";
      bodyEl.innerHTML = "<p>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p><p>Độc lập - Tự do - Hạnh phúc</p>";
      pageEl.appendChild(bodyEl);

      const adapter = new WriterAdapter(pageEl);
      const shell = new AppShell({ appName: "writer", appTitle: "VN Writer", adapter });
      adapter.setShell(shell);

      shell.showBackstageMenu();
      const modal = fakeDoc.body.querySelector(".vno-backstage-overlay");
      modal.querySelector("#vno-backstage-nav-print").click();

      const printView = modal.querySelector("#vno-backstage-print-view");
      assert(printView && printView.style.display !== "none", "Panel In phải hiển thị");

      const sheet = printView.querySelector(".vno-print-preview-sheet");
      assert(sheet, "Phải render trang in .vno-print-preview-sheet");
      assert(sheet.textContent.includes("CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM"), "Thumbnail phải chứa nội dung văn bản thật của Writer");

      modal.remove();
    });

    await test("Writer Backstage In: nút In ngay đóng modal và kích hoạt lệnh common.file.print thật", () => {
      const pageEl = fakeDoc.createElement("div");
      pageEl.className = "vno-writer-page";
      const bodyEl = fakeDoc.createElement("div");
      bodyEl.className = "vno-writer-body";
      bodyEl.innerHTML = "<p>Nội dung in Writer</p>";
      pageEl.appendChild(bodyEl);

      const adapter = new WriterAdapter(pageEl);
      const shell = new AppShell({ appName: "writer", appTitle: "VN Writer", adapter });
      adapter.setShell(shell);

      let printTriggered = false;
      const unbind = globalCommandBus.bindHandler("common.file.print", () => {
        printTriggered = true;
        return true;
      });

      shell.showBackstageMenu();
      const modal = fakeDoc.body.querySelector(".vno-backstage-overlay");
      modal.querySelector("#vno-backstage-nav-print").click();

      const printNowBtn = modal.querySelector("#vno-backstage-btn-print-now");
      assert(printNowBtn, "Phải có nút In ngay");
      printNowBtn.click();

      assert(printTriggered === true, "Bấm In ngay phải kích hoạt common.file.print");
      assert(fakeDoc.body.querySelector(".vno-backstage-overlay") === null, "Modal phải đóng sau khi bấm In ngay");
    });

  } finally {
    globalThis.document = originalDoc;
    globalThis.window = originalWin;
  }

  return results;
}
