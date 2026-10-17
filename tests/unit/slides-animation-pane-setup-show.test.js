/**
 * Animation Pane + Set Up Slide Show — model, pane list/reorder/delete,
 * real F5 playback order, loop-until-Esc, FODP settings.
 */
import { SlidesCanvasController } from "../../apps/slides/slides-canvas.js";
import { SlidesAdapter } from "../../adapters/libreoffice/slides/slides-adapter.js";
import { SLIDES_COMMANDS } from "../../platform/commands/command-definitions.js";
import { VN_TO_UNO_MAP } from "../../adapters/libreoffice/common/command-dispatch-mapper.js";
import { SLIDES_RIBBON_TABS } from "../../apps/slides/slides-ribbon.js";
import { ICONS } from "../../platform/ui-kit/icons.js";
import { tCommand, setLocale } from "../../platform/i18n/i18n.js";
import { SLIDES_HELP_ENTRIES } from "../../platform/help/entries-slides.js";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

class FakeClassList {
  constructor(owner) { this.owner = owner; }
  add(name) { if (!this.contains(name)) this.owner.className = `${this.owner.className} ${name}`.trim(); }
  remove(name) { this.owner.className = this.owner.className.split(/\s+/).filter((v) => v && v !== name).join(" "); }
  contains(name) { return this.owner.className.split(/\s+/).includes(name); }
}

class FakeElement {
  constructor(tag = "div") {
    this.tagName = String(tag).toUpperCase();
    this.children = [];
    this.parentNode = null;
    this.className = "";
    this.classList = new FakeClassList(this);
    this.dataset = {};
    this.listeners = {};
    this.style = {};
    this.attributes = {};
    this.hidden = false;
    this._innerHTML = "";
    this.value = "";
    this.checked = false;
    this.disabled = false;
  }
  set innerHTML(value) {
    this._innerHTML = String(value);
    this.children = [];
    if (String(value).includes("vno-anim-pane-list") || String(value).includes("vno-anim-pane-item")) {
      const list = new FakeElement("div");
      list.className = "vno-anim-pane-list";
      this.appendChild(list);
    }
    if (String(value).includes("vno-anim-pane-close") || String(value).includes("vno-setup-show-title")) {
      const close = new FakeElement("button");
      close.className = String(value).includes("vno-setup-show-title") ? "vno-dialog-close-btn" : "vno-anim-pane-close";
      this.appendChild(close);
    }
    ["vno-setup-loop", "vno-setup-narration", "vno-setup-pointer-color", "vno-setup-ok", "vno-setup-cancel", "vno-setup-pointer-hex"].forEach((id) => {
      if (String(value).includes(`id="${id}"`)) {
        const el = new FakeElement(id.includes("color") ? "input" : (id.includes("ok") || id.includes("cancel") ? "button" : "input"));
        el.id = id;
        el.attributes.id = id;
        this.appendChild(el);
      }
    });
  }
  get innerHTML() { return this._innerHTML || ""; }
  appendChild(child) { child.parentNode = this; this.children.push(child); return child; }
  removeChild(child) {
    this.children = this.children.filter((item) => item !== child);
    if (child) child.parentNode = null;
    return child;
  }
  setAttribute(name, value) { this.attributes[name] = String(value); }
  getAttribute(name) { return this.attributes[name]; }
  addEventListener(type, handler) { (this.listeners[type] ||= []).push(handler); }
  querySelector(selector) { return this.querySelectorAll(selector)[0] || null; }
  querySelectorAll(selector) {
    const match = (el) => {
      if (selector.startsWith(".")) return el.classList.contains(selector.slice(1));
      if (selector.startsWith("#")) return el.id === selector.slice(1) || el.attributes.id === selector.slice(1);
      if (selector.startsWith("[")) {
        const body = selector.slice(1, -1);
        const [rawName, rawVal] = body.split("=");
        const name = rawName.replace(/^data-/, "").replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        if (rawVal == null) return el.attributes[rawName] != null || el.dataset?.[name] != null;
        const expected = rawVal.replace(/['"]/g, "");
        return el.attributes[rawName] === expected || el.dataset?.[name] === expected || el.id === expected;
      }
      return false;
    };
    const result = [];
    for (const child of this.children) {
      if (match(child)) result.push(child);
      result.push(...child.querySelectorAll(selector));
    }
    return result;
  }
  closest(selector) {
    let node = this;
    const cls = selector.startsWith(".") ? selector.slice(1) : "";
    while (node) {
      if (cls && node.classList?.contains?.(cls)) return node;
      node = node.parentNode;
    }
    return null;
  }
  focus() {}
}

class FakeDocument {
  constructor() {
    this.body = new FakeElement("body");
    this.listeners = {};
    this.activeElement = null;
  }
  createElement(tag) { return new FakeElement(tag); }
  addEventListener(type, handler) { (this.listeners[type] ||= []).push(handler); }
  removeEventListener(type, handler) { this.listeners[type] = (this.listeners[type] || []).filter((item) => item !== handler); }
}

function container() {
  return { innerHTML: "", className: "", appendChild() {}, querySelector() { return null; }, querySelectorAll() { return []; } };
}

function threeAnimSlide(canvas) {
  canvas.slides = [{
    id: 1,
    title: "Tieu de fade",
    body: "Noi dung fly",
    layoutType: "title-content",
    shapes: [{ id: 77, type: "rect", x: 40, y: 80, w: 120, h: 60, color: "#2563eb", text: "Hop van ban zoom", animation: { type: "zoomIn", duration: 400, delay: 0, order: 2, start: "onClick" } }],
    comments: [],
    hidden: false,
    titleAnimation: { type: "fadeIn", duration: 500, delay: 0, order: 0, start: "onClick" },
    bodyAnimation: { type: "flyIn", duration: 300, delay: 0, order: 1, start: "afterPrevious" }
  }];
  canvas.currentSlideIndex = 0;
  canvas.undoStack = [];
  canvas.redoStack = [];
  return canvas;
}

export async function runSlidesAnimationPaneSetupShowTests() {
  const results = [];
  const test = async (name, fn) => {
    try { await fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };

  await test("Ribbon Hoạt hình có Ngăn hoạt hình cạnh Hiệu ứng đối tượng", () => {
    const tab = SLIDES_RIBBON_TABS.find((item) => item.id === "animations");
    const ids = tab.groups[0].items.map((item) => item.commandId);
    assert(ids.includes("slides.animation.apply"), "Thiếu apply");
    assert(ids.includes("slides.animation.pane"), "Thiếu Animation Pane");
    assert(ids.indexOf("slides.animation.pane") > ids.indexOf("slides.animation.apply"), "Pane phải đứng cạnh/sau apply");
  });

  await test("Ribbon Trình chiếu > Thiết lập có Set Up Slide Show cạnh Ẩn trang chiếu", () => {
    const tab = SLIDES_RIBBON_TABS.find((item) => item.id === "slideshow");
    const setup = tab.groups.find((group) => group.labelKey === "slidesRibbon.group.setup");
    const ids = setup.items.map((item) => item.commandId);
    assert(ids.includes("slides.show.setupShow"), "Thiếu setupShow");
    assert(ids.includes("slides.slide.toggleHidden"), "Vẫn phải có Hide Slide");
  });

  await test("Command, icon, UNO, i18n cho pane và setupShow", () => {
    const pane = SLIDES_COMMANDS.find((item) => item.id === "slides.animation.pane");
    const setup = SLIDES_COMMANDS.find((item) => item.id === "slides.show.setupShow");
    assert(pane?.icon === "animationPane" && pane.isToggle, "pane command");
    assert(setup?.icon === "setupShow", "setup command");
    assert(ICONS.animationPane?.includes("<svg"), "icon pane");
    assert(ICONS.setupShow?.includes("<svg"), "icon setup");
    assert(VN_TO_UNO_MAP["slides.animation.pane"] === ".uno:AnimationPane", "UNO pane");
    assert(VN_TO_UNO_MAP["slides.show.setupShow"] === ".uno:PresentationDialog", "UNO setup");
    assert(VN_TO_UNO_MAP["slides.animation.apply"] === ".uno:CustomAnimation", "Không đụng CustomAnimation của apply");
    try {
      setLocale("vi");
      assert(tCommand("slides.animation.pane", "label") === "Ngăn hoạt hình", "VI pane");
      assert(tCommand("slides.show.setupShow", "label") === "Thiết lập trình chiếu", "VI setup");
      setLocale("en");
      assert(tCommand("slides.animation.pane", "label") === "Animation Pane", "EN pane");
      assert(tCommand("slides.show.setupShow", "label") === "Set Up Slide Show", "EN setup");
    } finally {
      setLocale("vi");
    }
  });

  await test("Help: hai bài Animation Pane và Set Up Slide Show cụ thể, không placeholder", () => {
    const pane = SLIDES_HELP_ENTRIES.find((item) => item.id === "slides.animation.pane");
    const setup = SLIDES_HELP_ENTRIES.find((item) => item.id === "slides.show.setupShow");
    assert(pane && setup, "Thiếu entry help");
    assert(pane.ribbon.tab === "Hoạt hình" && pane.steps.length >= 3, "Help pane");
    assert(setup.ribbon.group === "Thiết lập" && setup.steps.length >= 3, "Help setup");
    const blob = [pane.title, pane.summary, ...pane.steps, setup.title, setup.summary, ...setup.steps].join(" ");
    assert(!/lorem|todo|placeholder|coming soon/i.test(blob), "Help còn nội dung giả");
    assert(/↑|lên|xuống/i.test(blob), "Help pane phải nói nút lên/xuống");
    assert(/Lặp lại liên tục/i.test(blob), "Help setup phải nói loop");
  });

  await test("collectSlideAnimations: 3 hiệu ứng đúng thứ tự title → body → shape", () => {
    const canvas = threeAnimSlide(new SlidesCanvasController(container()));
    const list = canvas.collectSlideAnimations();
    assert(list.length === 3, `length ${list.length}`);
    assert(list[0].target === "title" && list[0].type === "fadeIn", `0 ${JSON.stringify(list[0])}`);
    assert(list[1].target === "body" && list[1].type === "flyIn", `1 ${JSON.stringify(list[1])}`);
    assert(String(list[2].target) === "77" && list[2].type === "zoomIn", `2 ${JSON.stringify(list[2])}`);
    assert(/Hop van ban zoom/i.test(list[2].label), `label shape ${list[2].label}`);
  });

  await test("Thêm hoạt ảnh: hai hiệu ứng trên một đối tượng, slot riêng, xóa/promote/hoàn tác đúng", () => {
    const canvas = threeAnimSlide(new SlidesCanvasController(container()));
    canvas.selectedTarget = 77;
    assert(canvas.addObjectAnimation({ type: "fadeOut" }), "add");
    let list = canvas.collectSlideAnimations();
    assert(list.length === 4, `4 slot, có ${list.length}`);
    const mine = list.filter((item) => String(item.target) === "77");
    assert(mine.length === 2 && mine[0].type === "zoomIn" && mine[1].type === "fadeOut", `slot ${JSON.stringify(mine.map((i) => i.slotId + ":" + i.type))}`);
    assert(mine[0].slotId === "77" && mine[1].slotId === "77#1", "slotId");
    const timeline = canvas._timelineByTarget(canvas.slides[0]);
    const head = timeline.get("77");
    assert(head.extras.length === 1 && head.extras[0].type === "fadeOut", "extras trong timeline");
    const css = canvas._timelineItemStyle(head);
    assert(/animation:[^;]*vnoAnimZoomIn[^;]*,\s*[^;]*vnoAnimFadeOut/.test(css), `CSS gộp: ${css}`);
    // Đổi Bắt đầu của hiệu ứng thêm không đụng hiệu ứng đầu.
    const extraIndex = list.findIndex((item) => item.slotId === "77#1");
    canvas.setSlideAnimationStart(extraIndex, "withPrevious");
    assert(canvas.slides[0].shapes[0].extraAnimations[0].start === "withPrevious", "start extra");
    assert(canvas.slides[0].shapes[0].animation.start !== "withPrevious", "hiệu ứng đầu giữ nguyên cách bắt đầu");
    // Xóa hiệu ứng đầu: hiệu ứng thêm lên làm chính.
    const primaryIndex = list.findIndex((item) => item.slotId === "77");
    canvas.removeSlideAnimation(primaryIndex);
    const shape = canvas.slides[0].shapes[0];
    assert(shape.animation.type === "fadeOut" && !(shape.extraAnimations || []).length, `promote: ${JSON.stringify(shape.animation)}`);
    assert(canvas.collectSlideAnimations().length === 3, "còn 3 slot");
    // Hoàn tác xóa -> trở lại 4 slot.
    assert(canvas.undo(), "undo");
    assert(canvas.collectSlideAnimations().length === 4, "undo trả lại hiệu ứng thêm");
    assert(canvas.slides[0].shapes[0].extraAnimations?.length === 1, "extraAnimations phục hồi");
  });

  await test("Đổi thứ tự lên/xuống đổi timeline chạy thật, không chỉ list pane", () => {
    const canvas = threeAnimSlide(new SlidesCanvasController(container()));
    const before = canvas.getAnimationTimeline();
    assert(before[0].target === "title" && before[1].target === "body", "Thứ tự ban đầu");
    assert(before[1].playDelay >= before[0].playDelay, "afterPrevious phải chạy sau title");
    const moved = canvas.moveSlideAnimation(1, -1);
    assert(moved, "move up body");
    const list = canvas.collectSlideAnimations();
    assert(list[0].target === "body" && list[1].target === "title", `sau swap list ${list.map((i) => i.target)}`);
    const after = canvas.getAnimationTimeline();
    assert(after[0].target === "body" && after[1].target === "title", "timeline phải đổi");
    assert(after[0].playDelay < after[1].playDelay || after[1].start === "withPrevious", "playDelay theo thứ tự mới");
    assert(canvas.slides[0].shapes[0].id === 77, "Không xóa shape khi reorder");
  });

  await test("Xóa hiệu ứng khỏi pane: đối tượng còn, không còn animation khi F5", () => {
    const originalDocument = globalThis.document;
    globalThis.document = new FakeDocument();
    try {
      const canvas = threeAnimSlide(new SlidesCanvasController(container()));
      const removed = canvas.removeSlideAnimation(2);
      assert(removed, "remove shape animation");
      assert(canvas.slides[0].shapes.length === 1, "shape còn");
      assert(canvas.slides[0].shapes[0].animation.type === "none", "animation type none");
      const list = canvas.collectSlideAnimations();
      assert(list.length === 2 && !list.some((item) => String(item.target) === "77"), `còn ${list.map((i) => i.target)}`);
      const show = canvas.startSlideShow(0);
      const html = show.overlay?.children?.[0]?.innerHTML || show.overlay?.innerHTML || "";
      assert(!/data-vno-anim-target="77"/.test(html), `F5 vẫn gắn anim cho shape đã xóa: ${html.slice(0, 240)}`);
      assert(/data-vno-anim-target="title"/.test(html), "Title vẫn còn animation");
      assert(html.includes("Hop van ban zoom") || html.includes("#2563eb"), "Shape vẫn render trên slideshow");
      show.close();
    } finally {
      globalThis.document = originalDocument;
    }
  });

  await test("F5: data-vno-anim-delay đổi thật sau khi đảo thứ tự", () => {
    const originalDocument = globalThis.document;
    globalThis.document = new FakeDocument();
    try {
      const canvas = threeAnimSlide(new SlidesCanvasController(container()));
      const first = canvas.startSlideShow(0);
      const htmlBefore = first.overlay?.children?.[0]?.innerHTML || first.overlay?.innerHTML || "";
      const titleBefore = htmlBefore.match(/data-vno-anim-target="title"[^>]*data-vno-anim-delay="(\d+)"/);
      const bodyBefore = htmlBefore.match(/data-vno-anim-target="body"[^>]*data-vno-anim-delay="(\d+)"/);
      assert(titleBefore && bodyBefore, `thiếu delay attr trước: ${htmlBefore.slice(0, 300)}`);
      first.close();
      canvas.moveSlideAnimation(0, 1);
      const second = canvas.startSlideShow(0);
      const htmlAfter = second.overlay?.children?.[0]?.innerHTML || second.overlay?.innerHTML || "";
      const titleAfter = htmlAfter.match(/data-vno-anim-target="title"[^>]*data-vno-anim-delay="(\d+)"/);
      const bodyAfter = htmlAfter.match(/data-vno-anim-target="body"[^>]*data-vno-anim-delay="(\d+)"/);
      assert(titleAfter && bodyAfter, `thiếu delay attr sau: ${htmlAfter.slice(0, 300)}`);
      const t0 = Number(titleBefore[1]);
      const b0 = Number(bodyBefore[1]);
      const t1 = Number(titleAfter[1]);
      const b1 = Number(bodyAfter[1]);
      assert(t0 <= b0, `ban đầu title delay ${t0} phải ≤ body ${b0}`);
      assert(b1 < t1, `sau đảo body delay ${b1} phải < title ${t1}`);
      const live = second.getTimeline();
      assert(live[0].target === "body" && live[1].target === "title", `getTimeline ${live.map((i) => i.target)}`);
      second.close();
    } finally {
      globalThis.document = originalDocument;
    }
  });

  await test("Undo/Redo đổi thứ tự và xóa hiệu ứng dùng stack animations", () => {
    const canvas = threeAnimSlide(new SlidesCanvasController(container()));
    canvas.moveSlideAnimation(2, -1);
    assert(canvas.collectSlideAnimations()[1].type === "zoomIn", "shape lên vị trí 2");
    canvas.removeSlideAnimation(0);
    assert(canvas.collectSlideAnimations().length === 2, "sau xóa còn 2");
    canvas.undo();
    assert(canvas.collectSlideAnimations().length === 3, "undo xóa");
    canvas.undo();
    const restored = canvas.collectSlideAnimations();
    assert(restored[0].target === "title" && restored[2].type === "zoomIn", `undo reorder ${restored.map((i) => i.type)}`);
    canvas.redo();
    assert(canvas.collectSlideAnimations()[1].type === "zoomIn", "redo reorder");
  });

  await test("withPrevious: playDelay trùng hiệu ứng trước; afterPrevious: cộng duration", () => {
    const canvas = threeAnimSlide(new SlidesCanvasController(container()));
    canvas.setSlideAnimationStart(1, "withPrevious");
    const together = canvas.getAnimationTimeline();
    assert(together[1].playDelay === together[0].playDelay, `withPrevious ${together[0].playDelay}/${together[1].playDelay}`);
    canvas.setSlideAnimationStart(1, "afterPrevious");
    const after = canvas.getAnimationTimeline();
    assert(after[1].playDelay === after[0].playDelay + after[0].duration, `afterPrevious ${after[1].playDelay} != ${after[0].playDelay}+${after[0].duration}`);
  });

  await test("Set Up Slide Show: loop thật — hết slide cuối quay về slide 1, không đóng overlay", () => {
    const originalDocument = globalThis.document;
    globalThis.document = new FakeDocument();
    try {
      const canvas = new SlidesCanvasController(container());
      canvas.slides = [
        { id: 1, title: "Mot", body: "A", layoutType: "title-content", shapes: [], comments: [], hidden: false },
        { id: 2, title: "Hai", body: "B", layoutType: "title-content", shapes: [], comments: [], hidden: false }
      ];
      canvas.currentSlideIndex = 0;
      canvas.applySlideShowSettings({ loopUntilEsc: true, showWithoutNarration: true, pointerColor: "#00FF00" });
      const looped = canvas.startSlideShow(0);
      assert(looped.getIndex() === 0, "bắt đầu slide 1");
      looped.next();
      assert(looped.getIndex() === 1 && looped.getTitle() === "Hai", "next tới slide 2");
      looped.next();
      assert(looped.getIndex() === 0 && looped.getTitle() === "Mot", `loop phải về slide 1, nhận ${looped.getIndex()}/${looped.getTitle()}`);
      assert(globalThis.document.body.children.includes(looped.overlay), "Không được đóng overlay khi loop");
      looped.close();

      canvas.applySlideShowSettings({ loopUntilEsc: false, showWithoutNarration: false, pointerColor: "#DC2626" });
      const once = canvas.startSlideShow(0);
      once.next();
      once.next();
      assert(!globalThis.document.body.children.includes(once.overlay), "Không loop thì hết slide cuối phải đóng");
    } finally {
      globalThis.document = originalDocument;
    }
  });

  await test("FODP: thứ tự animation + presentation:endless và cờ setup", () => {
    const canvas = threeAnimSlide(new SlidesCanvasController(container()));
    canvas.moveSlideAnimation(0, 1);
    canvas.applySlideShowSettings({ loopUntilEsc: true, showWithoutNarration: true, pointerColor: "#112233" });
    const adapter = new SlidesAdapter(canvas);
    const fodp = adapter.serializeToFodp();
    assert(/presentation:endless="true"/.test(fodp), "FODP phải ghi presentation:endless");
    assert(/vno:without-narration="true"/.test(fodp), "FODP cờ không thuyết minh");
    assert(/vno:pointer-color="#112233"/.test(fodp), "FODP màu pointer");
    const seq = fodp.match(/<anim:seq[\s\S]*?<\/anim:seq>/)?.[0] || "";
    const bodyPos = seq.indexOf("ooo-entrance-fly-in");
    const titlePos = seq.indexOf("ooo-entrance-fade-in");
    assert(bodyPos >= 0 && titlePos >= 0 && bodyPos < titlePos, `serialize phải theo thứ tự mới: body trước title, seq=${seq.slice(0, 400)}`);
    const parsed = adapter.parseFodp(fodp);
    assert(parsed.slideShowSettings.loopUntilEsc, "parse endless");
    assert(parsed.slideShowSettings.showWithoutNarration, "parse narration flag");
    assert(parsed.slideShowSettings.pointerColor === "#112233", `pointer ${parsed.slideShowSettings.pointerColor}`);
    assert(parsed[0].bodyAnimation?.order <= parsed[0].titleAnimation?.order, "parse giữ order");
  });

  await test("Adapter dispatch pane và setupShow", async () => {
    let pane = 0;
    let setup = 0;
    const adapter = new SlidesAdapter({
      toggleAnimationPane() { pane += 1; return true; },
      showSetupShowDialog() { setup += 1; return true; }
    });
    await adapter.handleDispatch(".uno:AnimationPane", null, "slides.animation.pane");
    await adapter.handleDispatch(".uno:PresentationDialog", null, "slides.show.setupShow");
    assert(pane === 1 && setup === 1, `dispatch pane=${pane} setup=${setup}`);
  });

  return results;
}
