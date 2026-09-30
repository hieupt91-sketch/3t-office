/**
 * VN Slides Font + Paragraph — commands, ribbon, execCommand, FODP rich text.
 */
import { SlidesCanvasController } from "../../apps/slides/slides-canvas.js";
import { SlidesAdapter } from "../../adapters/libreoffice/slides/slides-adapter.js";
import { SLIDES_COMMANDS } from "../../platform/commands/command-definitions.js";
import { mapVnCommandToUno } from "../../adapters/libreoffice/common/command-dispatch-mapper.js";
import { SLIDES_RIBBON_TABS } from "../../apps/slides/slides-ribbon.js";
import { tCommand, setLocale } from "../../platform/i18n/i18n.js";
import { globalCommandBus } from "../../platform/commands/command-bus.js";

const FONT_IDS = [
  "slides.text.bold", "slides.text.italic", "slides.text.underline", "slides.text.strike",
  "slides.text.clearFormat", "slides.font.family", "slides.font.size", "slides.font.grow",
  "slides.font.shrink", "slides.color.text", "slides.color.highlight"
];
const PARA_IDS = [
  "slides.list.bullet", "slides.list.numbered",
  "slides.para.alignLeft", "slides.para.alignCenter", "slides.para.alignRight", "slides.para.justify",
  "slides.para.indentInc", "slides.para.indentDec", "slides.para.lineSpacing"
];

function flatten(items) {
  return (items || []).flatMap((item) => item.items ? flatten(item.items) : [item]);
}

class FakeClassList {
  constructor(owner) { this.owner = owner; }
  add(name) { if (!this.contains(name)) this.owner.className = `${this.owner.className} ${name}`.trim(); }
  remove(name) { this.owner.className = this.owner.className.split(/\s+/).filter((v) => v && v !== name).join(" "); }
  contains(name) { return this.owner.className.split(/\s+/).includes(name); }
}

class FakeElement {
  constructor(tag = "div") {
    this.tagName = tag.toUpperCase();
    this.children = [];
    this.parentNode = null;
    this.className = "";
    this.classList = new FakeClassList(this);
    this.dataset = {};
    this.style = {};
    this.attributes = {};
    this.contentEditable = "false";
    this.innerText = "";
    this._innerHTML = "";
  }
  set innerHTML(value) { this._innerHTML = String(value); }
  get innerHTML() { return this._innerHTML || ""; }
  focus() { this.focused = true; }
}

export async function runSlidesFontParagraphTests() {
  const results = [];
  const test = async (name, fn) => {
    try { await fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };

  await test("Font/Paragraph: đủ command slides.* với isToggle cho B/I/U và căn lề", () => {
    for (const id of [...FONT_IDS, ...PARA_IDS]) {
      const command = SLIDES_COMMANDS.find((item) => item.id === id);
      if (!command) throw new Error(`Thiếu command ${id}`);
    }
    for (const id of ["slides.text.bold", "slides.text.italic", "slides.text.underline", "slides.para.alignLeft"]) {
      if (!SLIDES_COMMANDS.find((item) => item.id === id)?.isToggle) throw new Error(`${id} phải isToggle`);
    }
    const bold = SLIDES_COMMANDS.find((item) => item.id === "slides.text.bold");
    if (bold.shortcut !== "Ctrl+B") throw new Error("Bold phải Ctrl+B (scope slides)");
    if (SLIDES_COMMANDS.some((item) => item.id.startsWith("writer.") || item.id.startsWith("sheet."))) {
      throw new Error("SLIDES_COMMANDS không được chứa writer/sheet");
    }
  });

  await test("Font/Paragraph: UNO mapping Bold/Italic/Underline/FontName/Bullet", () => {
    const expected = {
      "slides.text.bold": ".uno:Bold",
      "slides.text.italic": ".uno:Italic",
      "slides.text.underline": ".uno:Underline",
      "slides.font.family": ".uno:FontName",
      "slides.font.size": ".uno:FontHeight",
      "slides.list.bullet": ".uno:DefaultBullet",
      "slides.list.numbered": ".uno:DefaultNumbering",
      "slides.para.alignCenter": ".uno:CenterPara"
    };
    for (const [id, uno] of Object.entries(expected)) {
      if (mapVnCommandToUno(id) !== uno) throw new Error(`${id} map sai: ${mapVnCommandToUno(id)}`);
    }
  });

  await test("Font/Paragraph: tab Trang đầu có nhóm Phông chữ và Đoạn văn giữa Clipboard và Drawing", () => {
    const home = SLIDES_RIBBON_TABS.find((tab) => tab.id === "home");
    if (!home) throw new Error("Thiếu tab home");
    const labels = home.groups.map((group) => group.label);
    const keys = home.groups.map((group) => group.labelKey);
    const fontAt = keys.indexOf("slidesRibbon.group.font");
    const paraAt = keys.indexOf("slidesRibbon.group.paragraph");
    const clipAt = keys.indexOf("slidesRibbon.group.clipboard");
    const drawAt = keys.indexOf("slidesRibbon.group.drawing");
    if (fontAt < 0 || paraAt < 0) throw new Error(`Thiếu nhóm Font/Paragraph: ${labels.join(" | ")}`);
    if (!(clipAt < fontAt && fontAt < paraAt && paraAt < drawAt)) {
      throw new Error(`Thứ tự Home sai: ${labels.join(" → ")}`);
    }
    const fontIds = flatten(home.groups[fontAt].items).map((item) => item.commandId);
    const paraIds = flatten(home.groups[paraAt].items).map((item) => item.commandId);
    for (const id of ["slides.text.bold", "slides.text.italic", "slides.text.underline", "slides.font.family", "slides.font.size", "slides.color.text"]) {
      if (!fontIds.includes(id)) throw new Error(`Nhóm Phông chữ thiếu ${id}`);
    }
    for (const id of ["slides.list.bullet", "slides.list.numbered", "slides.para.alignLeft", "slides.para.alignCenter", "slides.para.lineSpacing"]) {
      if (!paraIds.includes(id)) throw new Error(`Nhóm Đoạn văn thiếu ${id}`);
    }
  });

  await test("Font/Paragraph: i18n VI/EN cho command mới", () => {
    try {
      setLocale("vi");
      if (tCommand("slides.text.bold", "label") !== "Đậm") throw new Error("VI bold sai");
      if (tCommand("slides.para.lineSpacing", "label") !== "Giãn dòng") throw new Error("VI lineSpacing sai");
      setLocale("en");
      if (tCommand("slides.text.bold", "label") !== "Bold") throw new Error("EN bold sai");
      if (tCommand("slides.list.bullet", "label") !== "Bullets") throw new Error("EN bullet sai");
      for (const locale of ["vi", "en"]) {
        setLocale(locale);
        for (const id of [...FONT_IDS, ...PARA_IDS]) {
          if (!tCommand(id, "label") || !tCommand(id, "tooltip")) throw new Error(`${locale} thiếu ${id}`);
        }
      }
    } finally {
      setLocale("vi");
    }
  });

  const originalDocument = globalThis.document;
  const originalWindow = globalThis.window;
  const originalUpdate = globalCommandBus.updateState;
  const execCalls = [];
  const commandState = { bold: false, italic: false, underline: false, strikeThrough: false, insertUnorderedList: false, justifyCenter: false };
  globalThis.document = {
    execCommand: (cmd, _show, val) => {
      execCalls.push({ cmd, val });
      if (cmd === "bold") commandState.bold = !commandState.bold;
      if (cmd === "italic") commandState.italic = !commandState.italic;
      if (cmd === "underline") commandState.underline = !commandState.underline;
      if (cmd === "insertUnorderedList") commandState.insertUnorderedList = !commandState.insertUnorderedList;
      if (cmd === "justifyCenter") commandState.justifyCenter = true;
      return true;
    },
    queryCommandState: (cmd) => !!commandState[cmd],
    queryCommandValue: () => "",
    addEventListener: () => {},
    querySelectorAll: () => [],
    activeElement: null
  };
  globalThis.window = { getSelection: () => ({ rangeCount: 0, anchorNode: null }) };
  const stateChanges = new Map();
  globalCommandBus.updateState = (id, state) => {
    stateChanges.set(id, { ...(stateChanges.get(id) || {}), ...state });
  };

  const titleEl = new FakeElement("div");
  titleEl.classList.add("vno-slide-title");
  titleEl.contentEditable = "true";
  titleEl.innerText = "Tieu de dam";
  titleEl.innerHTML = "Tieu de dam";
  const bodyEl = new FakeElement("div");
  bodyEl.classList.add("vno-slide-body");
  bodyEl.contentEditable = "true";
  bodyEl.innerText = "Noi dung";
  const canvas = {
    titleEl,
    bodyEl,
    body2El: new FakeElement("div"),
    canvasEl: { contains: () => true },
    slides: [{ id: 1, title: "Tieu de dam", body: "Noi dung", layoutType: "title-content", shapes: [] }],
    currentSlideIndex: 0,
    _syncEditableFieldsFromDom() {
      this.slides[0].title = this.titleEl.innerText;
      this.slides[0].titleHtml = this.titleEl.innerHTML;
      this.slides[0].body = this.bodyEl.innerText;
      this.slides[0].bodyHtml = this.bodyEl.innerHTML;
    }
  };
  const adapter = new SlidesAdapter(canvas);

  await test("Font/Paragraph: handleDispatch slides.text.bold gọi execCommand('bold') và trả queryCommandState", async () => {
    execCalls.length = 0;
    commandState.bold = false;
    const result = await adapter.handleDispatch(".uno:Bold", null, "slides.text.bold");
    if (!execCalls.some((item) => item.cmd === "bold")) throw new Error(`Không gọi execCommand bold: ${JSON.stringify(execCalls)}`);
    if (result !== true) throw new Error(`bold phải trả state true, nhận ${result}`);
    if (!stateChanges.get("slides.text.bold")?.checked) throw new Error("updateState bold checked=true");
  });

  await test("Font/Paragraph: italic/underline/bullet/align/fontName/fontSize/foreColor đi đúng execCommand", async () => {
    execCalls.length = 0;
    await adapter.handleDispatch(".uno:Italic", null, "slides.text.italic");
    await adapter.handleDispatch(".uno:Underline", null, "slides.text.underline");
    await adapter.handleDispatch(".uno:DefaultBullet", null, "slides.list.bullet");
    await adapter.handleDispatch(".uno:CenterPara", null, "slides.para.alignCenter");
    await adapter.handleDispatch(".uno:FontName", "Arial", "slides.font.family");
    await adapter.handleDispatch(".uno:FontHeight", "6", "slides.font.size");
    await adapter.handleDispatch(".uno:Color", "#2563eb", "slides.color.text");
    await adapter.handleDispatch(".uno:CharBackground", "#ffcd00", "slides.color.highlight");
    const cmds = execCalls.map((item) => item.cmd);
    for (const expected of ["italic", "underline", "insertUnorderedList", "justifyCenter", "fontName", "fontSize", "foreColor", "hiliteColor"]) {
      if (!cmds.includes(expected)) throw new Error(`Thiếu execCommand ${expected}: ${cmds.join(",")}`);
    }
    if (!execCalls.some((item) => item.cmd === "fontName" && item.val === "Arial")) throw new Error("fontName không nhận Arial");
    // Cỡ chữ: execCommand chỉ đánh dấu vùng chọn bằng bậc 7 rồi thay bằng cỡ pt thật
    // (ô «32» trên ribbon = giá trị "6" → 32pt), xem slides-basics-g8.test.js.
    if (!execCalls.some((item) => item.cmd === "fontSize" && item.val === "7")) throw new Error("fontSize không đánh dấu vùng chọn để đặt cỡ pt");
  });

  await test("Font/Paragraph: HTML <b>/<i>/<u> serialize FODP thành fo:font-weight/style và underline", () => {
    canvas.slides = [{
      id: 1,
      title: "Dam nghieng",
      titleHtml: "<b>Dam</b> <i>nghieng</i> <u>gach</u>",
      body: "Muc",
      bodyHtml: "<ul><li>Muc mot</li><li>Muc hai</li></ul>",
      layoutType: "title-content",
      shapes: [{ id: 9, type: "textbox", x: 10, y: 10, w: 120, h: 40, text: "Hop", textHtml: '<span style="color:#dc2626">Hop</span>' }]
    }];
    const fodp = adapter.serializeToFodp();
    if (!fodp.includes('fo:font-weight="bold"')) throw new Error("FODP thiếu fo:font-weight=bold");
    if (!fodp.includes('fo:font-style="italic"')) throw new Error("FODP thiếu fo:font-style=italic");
    if (!fodp.includes('style:text-underline-style="solid"')) throw new Error("FODP thiếu underline");
    if (!/<text:list\b/.test(fodp)) throw new Error("FODP thiếu text:list cho bullet");
    if (!fodp.includes('fo:color="#dc2626"') && !fodp.includes("fo:color=\"#dc2626\"")) {
      throw new Error("FODP thiếu màu chữ textbox");
    }
    const parsed = adapter.parseFodp(fodp);
    if (!parsed[0]?.titleHtml || !/<b>/i.test(parsed[0].titleHtml)) {
      throw new Error(`parseFodp phải khôi phục titleHtml có <b>, nhận: ${parsed[0]?.titleHtml}`);
    }
    if (!parsed[0]?.bodyHtml || !/<ul|<li/i.test(parsed[0].bodyHtml)) {
      throw new Error(`parseFodp phải khôi phục bodyHtml list, nhận: ${parsed[0]?.bodyHtml}`);
    }
    const box = parsed[0].shapes?.find((shape) => shape.type === "textbox");
    if (!box?.textHtml || !/color:#dc2626/i.test(box.textHtml)) {
      throw new Error(`textbox textHtml mất màu: ${box?.textHtml}`);
    }
  });

  await test("Font/Paragraph: căn giữa serialize fo:text-align=center", () => {
    canvas.slides = [{
      id: 2,
      title: "Giua",
      titleHtml: '<div style="text-align:center">Giua</div>',
      body: "A",
      layoutType: "title-content",
      shapes: []
    }];
    const fodp = adapter.serializeToFodp();
    if (!fodp.includes('fo:text-align="center"')) throw new Error("FODP thiếu fo:text-align=center");
    const parsed = adapter.parseFodp(fodp);
    if (!/text-align:\s*center/i.test(parsed[0]?.titleHtml || "")) {
      throw new Error(`parse mất căn giữa: ${parsed[0]?.titleHtml}`);
    }
  });

  await test("Font/Paragraph: canvas giữ titleHtml khi sync DOM, restore khi selectSlide", () => {
    const host = new FakeElement("div");
    host.appendChild = () => {};
    const real = new SlidesCanvasController(host);
    real.titleEl = new FakeElement("div");
    real.titleEl.contentEditable = "true";
    real.titleEl.innerText = "Hello";
    real.titleEl.innerHTML = "<b>Hello</b>";
    real.bodyEl = new FakeElement("div");
    real.bodyEl.innerText = "Body";
    real.bodyEl.innerHTML = "Body";
    real.body2El = new FakeElement("div");
    real.slides = [{ id: 1, title: "Hello", body: "Body", layoutType: "title-content", shapes: [] }];
    real.currentSlideIndex = 0;
    real._renderThumbnails = () => {};
    real._applyLayoutToDom = () => {};
    real._renderHeaderFooter = () => {};
    real._renderShapesLayer = () => {};
    real._refreshSpellcheckRoots = () => {};
    real._renderCommentsUi = () => {};
    real._syncEditableFieldsFromDom();
    if (real.slides[0].title !== "Hello") throw new Error("title plain phải giữ innerText");
    if (real.slides[0].titleHtml !== "<b>Hello</b>") throw new Error(`titleHtml sai: ${real.slides[0].titleHtml}`);
    real.slides.push({ id: 2, title: "Hai", body: "B", layoutType: "title-content", shapes: [] });
    real.selectSlide(1);
    real.selectSlide(0);
    if (real.titleEl.innerHTML !== "<b>Hello</b>") throw new Error(`selectSlide phải restore HTML, nhận ${real.titleEl.innerHTML}`);
  });

  globalThis.document = originalDocument;
  globalThis.window = originalWindow;
  globalCommandBus.updateState = originalUpdate;
  setLocale("vi");
  return results;
}
