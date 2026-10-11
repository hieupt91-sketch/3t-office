// G8 VN Slides audit helpers — injected into the real app window by _slides_basic_ops.py.
// Every step goes through the same entry points a user hits: keyboard events on the focused
// element (global ShortcutManager), ribbon commands on the command bus, dialog buttons,
// thumbnail drag & drop events and pointer drags on shapes/handles.
window.__t = (() => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const app = () => window.__vnoAppInstance;
  const c = () => app().canvasController;
  const a = () => app().adapter;
  let busMod = null;
  const bus = async () => (busMod ||= await import("/platform/commands/command-bus.js")).globalCommandBus;
  const exec = async (id, args) => (await bus()).execute(id, args);

  const key = (key, opts = {}, target = null) => {
    const el = target || document.activeElement || document.body;
    const ev = new KeyboardEvent("keydown", { key, code: opts.code || "", ctrlKey: !!opts.ctrl, shiftKey: !!opts.shift, altKey: !!opts.alt, bubbles: true, cancelable: true });
    el.dispatchEvent(ev);
    el.dispatchEvent(new KeyboardEvent("keyup", { key, code: opts.code || "", ctrlKey: !!opts.ctrl, shiftKey: !!opts.shift, altKey: !!opts.alt, bubbles: true, cancelable: true }));
    return ev.defaultPrevented;
  };

  const typeInto = (el, text) => {
    el.focus();
    const sel = window.getSelection();
    const r = document.createRange();
    r.selectNodeContents(el);
    sel.removeAllRanges();
    sel.addRange(r);
    const lines = String(text).split("\n");
    lines.forEach((line, i) => {
      if (i > 0) document.execCommand("insertParagraph");
      if (line) document.execCommand("insertText", false, line);
    });
  };

  const selectAllIn = (el) => {
    el.focus();
    const sel = window.getSelection();
    const r = document.createRange();
    r.selectNodeContents(el);
    sel.removeAllRanges();
    sel.addRange(r);
  };

  const thumbs = () => [...document.querySelectorAll(".vno-slide-thumb-item")];
  const clickThumb = async (i) => { thumbs()[i].click(); thumbs()[i]?.focus(); await sleep(100); };

  const dragThumb = async (from, to) => {
    const dt = new DataTransfer();
    const src = thumbs()[from];
    src.dispatchEvent(new DragEvent("dragstart", { bubbles: true, cancelable: true, dataTransfer: dt }));
    const dst = thumbs()[to];
    dst.dispatchEvent(new DragEvent("dragenter", { bubbles: true, cancelable: true, dataTransfer: dt }));
    dst.dispatchEvent(new DragEvent("dragover", { bubbles: true, cancelable: true, dataTransfer: dt }));
    dst.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer: dt }));
    src.dispatchEvent(new DragEvent("dragend", { bubbles: true, cancelable: true, dataTransfer: dt }));
    await sleep(150);
  };

  const shapeEl = (id) => c().shapesLayer?.querySelector(`[data-shape-id="${id}"]`);
  const center = (el) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };
  const pointerDrag = async (el, dx, dy, opts = {}) => {
    const p = opts.from || center(el);
    const base = { bubbles: true, cancelable: true, pointerId: 1, isPrimary: true, pointerType: "mouse", button: 0, buttons: 1 };
    el.dispatchEvent(new PointerEvent("pointerdown", { ...base, clientX: p.x, clientY: p.y }));
    const steps = 6;
    for (let s = 1; s <= steps; s++) {
      document.dispatchEvent(new PointerEvent("pointermove", { ...base, clientX: p.x + dx * s / steps, clientY: p.y + dy * s / steps, shiftKey: !!opts.shift }));
      el.dispatchEvent(new PointerEvent("pointermove", { ...base, clientX: p.x + dx * s / steps, clientY: p.y + dy * s / steps, shiftKey: !!opts.shift }));
      await sleep(16);
    }
    document.dispatchEvent(new PointerEvent("pointerup", { ...base, buttons: 0, clientX: p.x + dx, clientY: p.y + dy }));
    el.dispatchEvent(new PointerEvent("pointerup", { ...base, buttons: 0, clientX: p.x + dx, clientY: p.y + dy }));
    await sleep(120);
  };

  const dismissDialogs = () => {
    document.querySelectorAll(".vno-dialog-overlay button").forEach((b) => { if (/^(Đồng ý|OK|Đóng)$/i.test(b.textContent.trim())) b.click(); });
  };

  const fresh = async () => {
    dismissDialogs();
    a().newDocument();
    await sleep(300);
    c().setZoom?.(1);
    // Start every scenario from ONE empty Title+Content slide regardless of the start-state work (G7).
    const s = c().slides[0];
    s.title = ""; s.titleHtml = undefined; s.body = ""; s.bodyHtml = undefined; s.notes = "";
    s.layoutType = "title-content"; s.shapes = [];
    // Blank presentation master = no logo / footer text (G7 clean start state).
    Object.assign(c().masterTheme, { logoText: "", footerText: "", showLogo: false, showFooter: false });
    c().selectSlide(0);
    await sleep(100);
  };

  const modelSummary = () => {
    const cc = c();
    return { count: cc.slides.length, titles: cc.slides.map((s) => String(s.title || "")), current: cc.currentSlideIndex };
  };

  // 1x1 red PNG scaled by the canvas insert (the image content itself is irrelevant to the checks).
  const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==";

  const scenarios = {
    async d1_deck() {
      await fresh();
      const cc = c();
      const o = {};
      // Slide 1 = Title Slide layout through the Layout dialog (Trang đầu > Bố cục).
      exec("slides.layout.apply");
      await sleep(250);
      document.querySelector('.vno-layout-card[data-layout-id="title-only"]')?.click();
      document.querySelector("#vno-layout-apply-current")?.click();
      await sleep(150);
      typeInto(cc.titleEl, "Báo cáo quý 3");
      // Ctrl+M while typing in the title (PowerPoint: New Slide).
      key("m", { ctrl: true, code: "KeyM" });
      await sleep(200);
      o.afterCtrlM = cc.slides.length;
      o.newSlideText = `'${cc.slides[cc.currentSlideIndex]?.title || ""}'/'${cc.slides[cc.currentSlideIndex]?.body || ""}'`;
      typeInto(cc.titleEl, "Doanh thu");
      typeInto(cc.bodyEl, "Dòng 1\nDòng 2");
      // Family actually rendered = first CSS family whose glyph widths differ from the generic fallbacks.
      const rendered = (list) => {
        const ctx = document.createElement("canvas").getContext("2d");
        const probe = "mmmmmmmmmmlliWQ";
        const w = (f) => { ctx.font = `72px ${f}`; return ctx.measureText(probe).width; };
        for (const raw of String(list).split(",")) {
          const name = raw.trim().replace(/['"]/g, "");
          if (!name || /^(serif|sans-serif|monospace|system-ui)$/i.test(name)) continue;
          if (w(`"${name}", monospace`) !== w("monospace") || w(`"${name}", serif`) !== w("serif")) return name;
        }
        return "Arial";
      };
      const css = (el) => { const st = getComputedStyle(el); return { family: rendered(st.fontFamily), sizePx: parseFloat(st.fontSize), weight: st.fontWeight, color: st.color, align: st.textAlign }; };
      o.titleCss = css(cc.titleEl);
      o.ptPerPx = Number(cc.ptPerPx) > 0 ? Number(cc.ptPerPx) : 0.75;
      o.bodyCss = css(cc.bodyEl);
      cc.notesTextarea.focus();
      cc.notesTextarea.value = "Ghi chú dòng 1\nGhi chú dòng 2";
      cc.notesTextarea.dispatchEvent(new Event("input", { bubbles: true }));
      await sleep(100);
      key("m", { ctrl: true, code: "KeyM" }, cc.titleEl);
      await sleep(200);
      typeInto(cc.titleEl, "Hai cột");
      exec("slides.layout.apply");
      await sleep(250);
      document.querySelector('.vno-layout-card[data-layout-id="two-content"]')?.click();
      document.querySelector("#vno-layout-apply-current")?.click();
      await sleep(150);
      o.layoutTwo = cc.slides[cc.currentSlideIndex].layoutType;
      o.body2AfterLayout = cc.slides[cc.currentSlideIndex].body2 || "";
      typeInto(cc.bodyEl, "Cột trái");
      typeInto(cc.body2El, "Cột phải");
      key("m", { ctrl: true, code: "KeyM" }, cc.titleEl);
      await sleep(200);
      exec("slides.layout.apply");
      await sleep(250);
      document.querySelector('.vno-layout-card[data-layout-id="blank"]')?.click();
      document.querySelector("#vno-layout-apply-current")?.click();
      await sleep(150);
      await exec("slides.shape.insert");
      await sleep(100);
      await exec("slides.text.insert");
      await sleep(150);
      const slide4 = cc.slides[cc.currentSlideIndex];
      const tb = (slide4.shapes || []).find((s) => s.type === "textbox");
      if (tb) {
        const el = shapeEl(tb.id);
        el.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
        await sleep(100);
        const t = el.querySelector("[contenteditable='true']") || el.querySelector(".vno-shape-textbox-text");
        if (t) { typeInto(t, "Hộp chữ"); t.blur(); }
      } else {
        o.textboxMissing = true;
      }
      o.slide4Title = slide4.title || "";
      // Ctrl+M from slide 1 of 4 -> PowerPoint inserts right after slide 1.
      await clickThumb(0);
      key("m", { ctrl: true, code: "KeyM" }, thumbs()[0]);
      await sleep(200);
      o.insertIndexFromFirst = cc.currentSlideIndex;
      o.countAfterInsert = cc.slides.length;
      // Delete the slide just added with the Delete key in the thumbnail pane.
      const thumb = thumbs()[cc.currentSlideIndex];
      thumb.focus();
      key("Delete", { code: "Delete" }, thumb);
      await sleep(200);
      o.afterDelete = cc.slides.length;
      // Duplicate slide 2 (Doanh thu) with Ctrl+D in the thumbnail pane.
      const di = cc.slides.findIndex((s) => s.title === "Doanh thu");
      await clickThumb(di);
      key("d", { ctrl: true, code: "KeyD" }, thumbs()[di]);
      await sleep(200);
      o.dupTitle = cc.slides[cc.currentSlideIndex]?.title;
      o.dupNotes = cc.slides[cc.currentSlideIndex]?.notes;
      // Drag the blank slide (last) to position 2.
      await dragThumb(cc.slides.length - 1, 1);
      o.orderAfterDrag = cc.slides.map((s) => s.title || (s.layoutType === "blank" ? "Trống" : "")).join("|");
      o.count = cc.slides.length;
      return o;
    },

    async d3_text() {
      await fresh();
      const cc = c();
      const o = {};
      typeInto(cc.titleEl, "Tiêu đề định dạng");
      selectAllIn(cc.titleEl);
      await exec("slides.font.family", "Arial");
      selectAllIn(cc.titleEl);
      await exec("slides.font.size", "6");
      selectAllIn(cc.titleEl);
      await exec("slides.color.text", "#ff0000");
      selectAllIn(cc.titleEl);
      await exec("slides.para.alignCenter");
      typeInto(cc.bodyEl, "Mục một\nMục hai");
      selectAllIn(cc.bodyEl);
      await exec("slides.list.bullet");
      selectAllIn(cc.bodyEl);
      await exec("slides.text.bold");
      selectAllIn(cc.bodyEl);
      o.bodyBoldState = document.queryCommandState("bold");
      o.bodyHtml = cc.slides[0].bodyHtml || "";
      // A second text box with a numbered list -> use a Text Box object.
      const before = (cc.slides[0].shapes || []).length;
      await exec("slides.text.insert");
      await sleep(150);
      const after = cc.slides[0].shapes || [];
      o.textboxInserted = after.length === before + 1 && after[after.length - 1]?.type === "textbox";
      o.bodyAfterTextBox = cc.slides[0].body;
      const tb = after[after.length - 1];
      if (tb && tb.type === "textbox") {
        const el = shapeEl(tb.id);
        el.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
        await sleep(100);
        const t = el.querySelector(".vno-shape-textbox-text") || el.querySelector("[contenteditable]");
        typeInto(t, "Hộp văn bản mới");
        selectAllIn(t);
        await exec("slides.para.alignRight");
        t.blur();
        await sleep(100);
      }
      // Numbered list in a second textbox.
      await exec("slides.text.insert");
      await sleep(150);
      const tb2 = (cc.slides[0].shapes || []).slice(-1)[0];
      if (tb2 && tb2.type === "textbox") {
        const el = shapeEl(tb2.id);
        el.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
        await sleep(100);
        const t = el.querySelector(".vno-shape-textbox-text") || el.querySelector("[contenteditable]");
        typeInto(t, "Bước một\nBước hai");
        selectAllIn(t);
        await exec("slides.list.numbered");
        t.blur();
        await sleep(100);
      }
      o.shapes = (cc.slides[0].shapes || []).map((s) => ({ type: s.type, text: s.text, html: s.textHtml }));
      o.titleHtml = cc.slides[0].titleHtml || "";
      return o;
    },

    async d4_objects() {
      await fresh();
      const cc = c();
      const o = {};
      exec("slides.layout.apply");
      await sleep(250);
      document.querySelector('.vno-layout-card[data-layout-id="blank"]')?.click();
      document.querySelector("#vno-layout-apply-current")?.click();
      await sleep(150);
      // Image (the file picker is replaced by the same canvas insert the picker feeds).
      cc.insertImage(PNG);
      await sleep(100);
      await exec("slides.shape.insert");
      await sleep(100);
      await exec("slides.insert.table", { rows: 2, cols: 3 });
      await sleep(150);
      const shapes = cc.slides[0].shapes;
      const img = shapes.find((s) => s.type === "image");
      const rect = shapes.find((s) => s.type === "rect");
      const table = shapes.find((s) => s.type === "table");
      o.tableHeader = table ? JSON.stringify(table.cells?.[0]) : null;
      // Type A1 into the first table cell.
      const cell = shapeEl(table.id)?.querySelector("td, th");
      if (cell) {
        cell.dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
        await sleep(50);
        if (cell.contentEditable !== "true") cell.contentEditable = "true";
        typeInto(cell, "A1");
        cell.dispatchEvent(new Event("input", { bubbles: true }));
        cell.blur();
        await sleep(50);
      }
      o.tableCells = JSON.stringify(table.cells);
      // Move / resize / rotate the rectangle with the mouse at 80% zoom.
      cc.setZoom(0.8);
      await sleep(150);
      const scale = shapeEl(rect.id).getBoundingClientRect().width / rect.w;
      o.scale = Math.round(scale * 1000) / 1000;
      o.ptPerPx = Number(cc.ptPerPx) > 0 ? Number(cc.ptPerPx) : 0.75;
      // Target: x=200px (150pt), y=160px (120pt), w=320px (240pt), h=120px (90pt), 30 deg.
      const startX = rect.x, startY = rect.y;
      await pointerDrag(shapeEl(rect.id), (200 - startX) * scale, (160 - startY) * scale);
      o.afterMove = { x: rect.x, y: rect.y };
      cc.setSelectedTarget(rect.id);
      cc._renderShapesLayer();
      await sleep(80);
      const se = shapeEl(rect.id).querySelector('.vno-shape-resize-handle[data-handle-dir="se"]');
      if (se) await pointerDrag(se, (320 - rect.w) * scale, (120 - rect.h) * scale, { from: center(se) });
      o.afterResize = { w: rect.w, h: rect.h };
      cc.setSelectedTarget(rect.id);
      cc._renderShapesLayer();
      await sleep(80);
      const rot = shapeEl(rect.id).querySelector(".vno-shape-rotate-handle");
      if (rot) {
        const ctr = center(shapeEl(rect.id));
        const rp = center(rot);
        // Aim the handle at 30 degrees clockwise from "up" around the shape center.
        const radius = Math.hypot(rp.x - ctr.x, rp.y - ctr.y);
        const ang = (30 - 90) * Math.PI / 180;
        const tx = ctr.x + radius * Math.cos(ang), ty = ctr.y + radius * Math.sin(ang);
        await pointerDrag(rot, tx - rp.x, ty - rp.y, { from: rp });
      }
      o.afterRotate = rect.rotation;
      cc.setZoom(1);
      await sleep(100);
      // Align: select image + rect (Ctrl+click) and Align Left (selection mode).
      cc.setSelectedShapes?.([String(img.id), String(rect.id)]);
      if (!cc.setSelectedShapes) { cc.selectedShapeIds = new Set([String(img.id), String(rect.id)]); }
      const rectXBefore = rect.x;
      await exec("slides.arrange.alignLeft");
      o.alignedLeft = Math.abs(img.x - Math.min(rectXBefore, img.x)) < 0.01 && Math.abs(rect.x - img.x) < 0.01;
      // Restore the rect position so the saved geometry check stays meaningful.
      const moveBack = rectXBefore - rect.x;
      rect.x += moveBack;
      img.x = img.x; // image stays aligned at the old min x
      cc._renderShapesLayer();
      // Z-order: send the rectangle to the back.
      cc.setSelectedTarget(rect.id);
      const reg = (await bus()).getCommandState ? null : null;
      const ids = ["slides.arrange.bringForward", "slides.arrange.sendBackward", "slides.arrange.bringToFront", "slides.arrange.sendToBack"];
      const b = await bus();
      o.zOrderCommands = ids.every((id) => !!document.querySelector(`[data-command-id="${id}"]`) || (b.getDefinition?.(id)) || (b.commands?.has?.(id)) || (b._definitions?.has?.(id)));
      const res = await exec("slides.arrange.sendToBack");
      o.sendToBackResult = res;
      o.orderAfter = cc.slides[0].shapes.map((s) => s.type).join(",");
      return o;
    },

    async d5_design() {
      await fresh();
      const cc = c();
      const o = {};
      typeInto(cc.titleEl, "Thiết kế 4:3");
      exec("slides.design.slideSize");
      await sleep(250);
      document.querySelector('.vno-slide-size-dialog [data-slide-size="standard"]')?.click();
      await sleep(150);
      o.size = JSON.stringify(cc.slideSize);
      exec("slides.design.formatBackground");
      await sleep(250);
      const dlg = document.querySelector(".vno-format-background-dialog");
      const solid = dlg?.querySelector("#vno-bg-solid");
      if (solid) { solid.value = "#fff2cc"; solid.dispatchEvent(new Event("input", { bubbles: true })); }
      dlg?.querySelector("#vno-bg-apply")?.click();
      await sleep(150);
      o.bg = JSON.stringify(cc.slides[0].background || null);
      // A new slide the user leaves empty must stay an empty placeholder in the file.
      key("m", { ctrl: true, code: "KeyM" }, cc.titleEl);
      await sleep(200);
      o.count = cc.slides.length;
      return o;
    },

    async d6_show() {
      await fresh();
      const cc = c();
      const o = {};
      typeInto(cc.titleEl, "Chiếu 1");
      for (const t of ["Chiếu 2", "Chiếu 3"]) {
        key("m", { ctrl: true, code: "KeyM" }, cc.titleEl);
        await sleep(150);
        typeInto(cc.titleEl, t);
      }
      // Transition: Chuyển tiếp > Mờ dần, Áp dụng cho tất cả.
      exec("slides.transition.apply");
      await sleep(250);
      const sel = document.querySelector("#vno-trans-type-select");
      if (sel) { sel.value = "fade"; sel.dispatchEvent(new Event("change", { bubbles: true })); }
      document.querySelector("#vno-trans-apply-all")?.click();
      await sleep(150);
      await clickThumb(2);
      document.body.focus();
      const showOpen = () => !!document.querySelector(".vno-slideshow-overlay");
      const showIdx = () => {
        const txt = document.querySelector(".vno-slideshow-overlay h1")?.textContent || "";
        return ["Chiếu 1", "Chiếu 2", "Chiếu 3"].indexOf(txt.trim());
      };
      key("F5", { code: "F5" }, document.body);
      await sleep(250);
      o.f5Open = showOpen();
      o.f5Index = showIdx();
      const ov = () => document.querySelector(".vno-slideshow-overlay");
      const brand = [...(ov()?.querySelectorAll(".vno-slide-master-logo, .vno-slide-master-footer span:first-child") || [])].map((e) => e.textContent.trim()).filter(Boolean).join(" / ");
      o.brandingText = brand;
      key("ArrowRight", { code: "ArrowRight" }, ov() || document.body); await sleep(120); o.afterRight = showIdx();
      key("ArrowDown", { code: "ArrowDown" }, ov() || document.body); await sleep(120); o.afterDown = showIdx();
      key("ArrowLeft", { code: "ArrowLeft" }, ov() || document.body); await sleep(120); o.afterLeft = showIdx();
      key("ArrowUp", { code: "ArrowUp" }, ov() || document.body); await sleep(120); o.afterUp = showIdx();
      const editorBefore = cc.currentSlideIndex;
      key("PageDown", { code: "PageDown" }, ov() || document.body); await sleep(120);
      o.afterPageDown = `${showIdx()}/${cc.currentSlideIndex === editorBefore ? editorBefore : "moved:" + cc.currentSlideIndex}`;
      key("Escape", { code: "Escape" }, ov() || document.body); await sleep(150);
      o.openAfterEsc = showOpen();
      await clickThumb(2);
      document.body.focus();
      key("F5", { shift: true, code: "F5" }, document.body);
      await sleep(250);
      o.shiftF5Index = showIdx();
      key("Escape", { code: "Escape" }, ov() || document.body); await sleep(150);
      o.transitions = cc.slides.map((s) => s.transition?.type || "").join(",");
      return o;
    }
  };

  return {
    sleep, key, typeInto, thumbs, dragThumb, modelSummary,
    async scenario(name) { return await scenarios[name](); },
    async post(name) { dismissDialogs(); return modelSummary(); }
  };
})();
