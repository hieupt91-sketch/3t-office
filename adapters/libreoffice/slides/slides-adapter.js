/**
 * VN Office LibreOffice Adapter — VN Slides Adapter
 * Quản lý tương tác với StarImpress (sd) Document Model & Phím tắt Microsoft/LibreOffice
 */

import { globalUnoBridge } from "../common/uno-bridge.js";
import { showAlertDialog } from "../../../platform/ui-kit/dialogs.js";
import { globalCommandBus } from "../../../platform/commands/command-bus.js";

export class SlidesAdapter {
  constructor(canvasController) {
    this.canvas = canvasController;
    this.isDirty = false;
    this.sourceFileName = "TrinhChieu";
    this.shell = null;
  }

  /** Gắn tham chiếu AppShell — xem chú thích trong WriterAdapter.setShell(). */
  setShell(shell) {
    this.shell = shell;
  }

  newDocument() {
    this.sourceFileName = "TrinhChieu";
    this.isDirty = false;
    if (this.canvas?.resetToBlank) {
      this.canvas.resetToBlank("BẢN TRÌNH CHIẾU MỚI");
    }
    this.shell?.resetDocumentChrome?.("Bản trình chiếu 1.pptx");
    return true;
  }

  closeDocument() {
    return this.newDocument();
  }

  attach() {
    globalUnoBridge.attachDocument(this);
    // common.edit.undo/redo dùng chung 1 handler toàn Suite qua Command Bus — mỗi app
    // (Writer/Sheet/Slides) PHẢI tự bindHandler() lại khi active, nếu không app kích hoạt
    // trước (mặc định Writer) sẽ chiếm vĩnh viễn phím Ctrl+Z/Ctrl+Y cho mọi app khác.
    // (Lỗi thật đã xảy ra: Ctrl+Z trong Slides gọi nhầm WriterAdapter.undo().)
    globalCommandBus.bindHandler("common.file.new", () => this.newDocument());
    globalCommandBus.bindHandler("common.file.close", () => this.closeDocument());
    globalCommandBus.bindHandler("common.edit.undo", () => this.canvas.undo ? this.canvas.undo() : false);
    globalCommandBus.bindHandler("common.edit.redo", () => this.canvas.redo ? this.canvas.redo() : false);
    globalCommandBus.bindHandler("common.edit.selectAll", () => {
      if (typeof document !== "undefined") {
        document.execCommand("selectAll", false, null);
        return true;
      }
      return false;
    });
    globalCommandBus.bindHandler("common.edit.pastePlain", () => {
      if (typeof document !== "undefined") {
        document.execCommand("paste", false, null);
        return true;
      }
      return false;
    });
    globalCommandBus.bindHandler("slides.review.commentInsert", (options) => {
      options = options || {};
      return this.canvas.openCommentsPanel ? this.canvas.openCommentsPanel(true) : false;
    });
    globalCommandBus.bindHandler("slides.view.normal", () => this.canvas.setNormalView ? this.canvas.setNormalView() : false);
    globalCommandBus.bindHandler("slides.view.slideSorter", () => this.canvas.openSlideSorter ? this.canvas.openSlideSorter() : false);
    globalCommandBus.bindHandler("slides.notes.toggle", () => this.canvas.toggleNotes ? this.canvas.toggleNotes() : false);
    globalCommandBus.bindHandler("slides.view.reading", () => this.canvas.toggleReadingView ? this.canvas.toggleReadingView() : false);
    globalCommandBus.bindHandler("slides.view.ruler", () => this.canvas.toggleRuler ? this.canvas.toggleRuler() : false);
    globalCommandBus.bindHandler("slides.view.gridlines", () => this.canvas.toggleGridlines ? this.canvas.toggleGridlines() : false);
    globalCommandBus.bindHandler("slides.view.guides", () => this.canvas.toggleGuides ? this.canvas.toggleGuides() : false);
    globalCommandBus.bindHandler("slides.view.zoomIn", () => this.canvas.zoomIn ? this.canvas.zoomIn() : false);
    globalCommandBus.bindHandler("slides.view.zoomOut", () => this.canvas.zoomOut ? this.canvas.zoomOut() : false);
    globalCommandBus.bindHandler("slides.view.zoomReset", () => this.canvas.zoomReset ? this.canvas.zoomReset() : false);
    globalCommandBus.bindHandler("slides.view.fitToWindow", () => this.canvas.fitToWindow ? this.canvas.fitToWindow() : false);
    globalCommandBus.bindHandler("slides.view.newWindow", () => this.canvas.newWindow ? this.canvas.newWindow() : false);
  }

  _escapeXml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  _unescapeXml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&apos;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&gt;/g, ">")
      .replace(/&lt;/g, "<")
      .replace(/&amp;/g, "&");
  }

  _odfLengthToPx(raw) {
    const match = String(raw || "").trim().match(/^(-?[\d.]+)\s*(cm|mm|in|pt|px)?$/i);
    if (!match) return 0;
    const value = Number(match[1]);
    if (!Number.isFinite(value)) return 0;
    const unit = (match[2] || "cm").toLowerCase();
    const pxPerUnit = { cm: 37.795275591, mm: 3.7795275591, in: 96, pt: 96 / 72, px: 1 };
    return Math.round(value * (pxPerUnit[unit] || pxPerUnit.cm));
  }

  _pxToOdf(px) {
    const value = Number(px);
    if (!Number.isFinite(value)) return "0cm";
    return `${Math.round((value / 37.795275591) * 1000) / 1000}cm`;
  }

  _attr(attrs, name) {
    return String(attrs || "").match(new RegExp(`${name}=["']([^"']*)["']`, "i"))?.[1] || "";
  }

  _styleKey(color) {
    return String(color || "3b82f6").replace(/[^A-Za-z0-9]/g, "").toLowerCase() || "3b82f6";
  }

  _isTransparentFill(shape) {
    const type = shape?.type;
    return type === "textbox" || type === "text" || type === "table"
      || !shape?.color || shape.color === "transparent";
  }

  _sanitizeDrawId(raw, used) {
    let id = String(raw ?? "").replace(/[^A-Za-z0-9._-]/g, "-");
    if (!/^[A-Za-z_]/.test(id)) id = `shape-${id}`;
    if (!id || id === "shape-") id = `shape-${used.size + 1}`;
    let unique = id;
    let n = 2;
    while (used.has(unique)) unique = `${id}-${n++}`;
    used.add(unique);
    return unique;
  }

  _restoreShapeId(attrs, fallback) {
    const name = this._attr(attrs, "draw:name");
    const drawId = this._attr(attrs, "draw:id") || this._attr(attrs, "xml:id");
    if (name && !/^PlaceHolder\b/i.test(name)) {
      return /^\d+$/.test(name) ? Number(name) : name;
    }
    if (drawId) {
      const numeric = drawId.match(/^shape-(\d+)$/);
      return numeric ? Number(numeric[1]) : drawId;
    }
    return fallback ?? (Date.now() + Math.floor(Math.random() * 1000));
  }

  _recordShapeId(attrs, shape, idMap) {
    const restored = shape.id;
    const drawId = this._attr(attrs, "draw:id") || this._attr(attrs, "xml:id");
    const name = this._attr(attrs, "draw:name");
    if (drawId) idMap.set(drawId, restored);
    if (name) idMap.set(name, restored);
    if (restored != null) idMap.set(String(restored), restored);
  }

  _mapConnectorRef(raw, idMap) {
    if (!raw) return raw;
    if (idMap.has(raw)) return idMap.get(raw);
    if (idMap.has(String(raw))) return idMap.get(String(raw));
    return raw;
  }

  _textParagraphsXml(text) {
    const lines = String(text ?? "").split("\n");
    if (lines.length === 1 && lines[0] === "") return "<text:p/>";
    return lines.map((line) => `<text:p>${this._escapeXml(line)}</text:p>`).join("");
  }

  _dataUrlParts(src) {
    const match = String(src || "").match(/^data:([^;,]+)?(;base64)?,(.*)$/s);
    if (!match) return null;
    return { mime: match[1] || "application/octet-stream", isBase64: !!match[2], data: match[3] };
  }

  _binaryDataXml(src) {
    const parts = this._dataUrlParts(src);
    if (!parts?.isBase64 || !parts.data) return "";
    return `<office:binary-data>${parts.data.replace(/\s+/g, "")}</office:binary-data>`;
  }

  _shapeStyleName(shape) {
    if (shape.type === "connector") return "grConnector";
    if (shape.type === "image" || shape.type === "video" || shape.type === "audio") return "grImage";
    if (this._isTransparentFill(shape)) return "grNone";
    return `gr${this._styleKey(shape.color)}`;
  }

  _noneAnimation() {
    return { type: "none", duration: 500, delay: 0 };
  }

  _msToSmilDur(ms) {
    const value = Number(ms);
    if (!Number.isFinite(value) || value < 0) return null;
    if (value === 0) return "0s";
    const seconds = Math.round((value / 1000) * 1000) / 1000;
    return `${seconds}s`;
  }

  _parseSmilTimeToMs(raw) {
    if (raw == null || raw === "") return null;
    const value = String(raw).trim();
    if (!value || /^(indefinite|media|next)$/i.test(value)) return null;
    const ms = value.match(/^([\d.]+)\s*ms$/i);
    if (ms) return Math.round(Number(ms[1]));
    const sec = value.match(/^([\d.]+)\s*s$/i);
    if (sec) return Math.round(Number(sec[1]) * 1000);
    const pt = value.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:([\d.]+)S)?$/i);
    if (pt) {
      const hours = Number(pt[1] || 0);
      const minutes = Number(pt[2] || 0);
      const seconds = Number(pt[3] || 0);
      return Math.round((((hours * 60) + minutes) * 60 + seconds) * 1000);
    }
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric < 0) return null;
    return numeric >= 20 ? Math.round(numeric) : Math.round(numeric * 1000);
  }

  _mapVnTransitionToSmil(transition) {
    const type = String(transition?.type || "").toLowerCase();
    if (!type || type === "none") return null;
    const dur = this._msToSmilDur(transition.duration > 0 ? transition.duration : 500) || "0.5s";
    if (type === "fade") return { type: "fade", subtype: "crossfade", dur };
    if (type === "slide") return { type: "pushWipe", subtype: "fromLeft", dur };
    // Direct smil:type="zoom" exports to PPTX as an empty <p:transition> (measured).
    // irisWipe/rectangle maps to a real PPTX transition and returns as smil:type="zoom".
    if (type === "zoom") return { type: "irisWipe", subtype: "rectangle", dur };
    // fadeOverColor is valid ODF; LibreOffice PPTX filter drops it (measured).
    if (type === "flip") return { type: "fadeOverColor", subtype: "crossfade", dur, fadeColor: "#000000" };
    return { type: "fade", subtype: "crossfade", dur };
  }

  _mapSmilTransitionToVn(smilType, smilSubtype) {
    const type = String(smilType || "").toLowerCase();
    const subtype = String(smilSubtype || "").toLowerCase();
    if (!type && !subtype) return null;
    if (type === "fadeovercolor") return "flip";
    if (type === "fade") return "fade";
    if (type === "pushwipe" || type === "barwipe" || type === "slidewipe") return "slide";
    if (type === "zoom" || type === "iriswipe") return "zoom";
    return null;
  }

  _pageDrawingStyleName(slide, idx) {
    return this._mapVnTransitionToSmil(slide?.transition) ? `dp${idx + 2}` : "dp1";
  }

  _mapVnAnimationToPreset(animation) {
    const type = String(animation?.type || "");
    if (!type || type === "none") return null;
    const dur = this._msToSmilDur(animation.duration > 0 ? animation.duration : 500) || "0.5s";
    const delayMs = Number(animation.delay) || 0;
    const begin = delayMs > 0 ? (this._msToSmilDur(delayMs) || "0s") : "0s";
    switch (type) {
      case "fadeIn":
      case "fade":
        return { presetId: "ooo-entrance-fade-in", subType: null, dur, begin, kind: "fade" };
      case "flyIn":
      case "fly":
        return { presetId: "ooo-entrance-fly-in", subType: "from-bottom", dur, begin, kind: "fly" };
      case "zoomIn":
      case "zoom":
        return { presetId: "ooo-entrance-zoom", subType: null, dur, begin, kind: "zoom" };
      case "bounceIn":
      case "bounce":
        return { presetId: "ooo-entrance-bounce", subType: null, dur, begin, kind: "bounce" };
      case "slideLeft":
      case "slide":
        return { presetId: "ooo-entrance-wipe", subType: "from-left", dur, begin, kind: "wipe" };
      default:
        return null;
    }
  }

  _mapPresetToVnAnimation(presetId) {
    const id = String(presetId || "").toLowerCase();
    if (!id) return null;
    if (id.includes("fly-in")) return "flyIn";
    if (id.includes("zoom")) return "zoomIn";
    if (id.includes("bounce")) return "bounceIn";
    if (id.includes("wipe") || id.includes("peek-in")) return "slideLeft";
    if (id.includes("fade-in") || id.endsWith("fade") || id.includes("appear")) return "fadeIn";
    return null;
  }

  _collectShapeIdMap(shapes, used = new Set()) {
    const idMap = new Map();
    for (const shape of shapes || []) {
      idMap.set(String(shape.id), this._sanitizeDrawId(shape.id, used));
    }
    return idMap;
  }

  _allocPlaceholderIds(slide, pageIndex, used) {
    const layout = slide?.layoutType || "title-content";
    const ids = {};
    if (layout === "blank") return ids;
    ids.title = this._sanitizeDrawId(`title-${pageIndex + 1}`, used);
    if (layout !== "title-only") {
      ids.body = this._sanitizeDrawId(`body-${pageIndex + 1}`, used);
      if (layout === "two-content") {
        ids.body2 = this._sanitizeDrawId(`body2-${pageIndex + 1}`, used);
      }
    }
    return ids;
  }

  _placeholderIdAttrs(role, drawId) {
    if (!drawId) return "";
    const id = this._escapeXml(drawId);
    const name = this._escapeXml(role);
    return ` draw:id="${id}" xml:id="${id}" draw:name="${name}"`;
  }

  _placeholderRoleFromName(name) {
    const raw = String(name || "");
    if (/^title(-\d+)?$/i.test(raw)) return "title";
    if (/^body2(-\d+)?$/i.test(raw)) return "body2";
    if (/^body(-\d+)?$/i.test(raw)) return "body";
    return null;
  }

  _serializeEntranceAnimation(animation, drawId) {
    const preset = this._mapVnAnimationToPreset(animation);
    if (!preset || !drawId) return "";
    const target = this._escapeXml(drawId);
    const sub = preset.subType ? ` presentation:preset-sub-type="${this._escapeXml(preset.subType)}"` : "";
    let animates = `
                <anim:set smil:begin="0s" smil:dur="0.001s" smil:fill="hold" smil:targetElement="${target}" smil:attributeName="visibility" smil:to="visible"/>`;
    if (preset.kind === "fly") {
      animates += `
                <anim:animate smil:dur="${preset.dur}" smil:fill="hold" smil:targetElement="${target}" smil:attributeName="x" smil:values="x;x" smil:keyTimes="0;1"/>
                <anim:animate smil:dur="${preset.dur}" smil:fill="hold" smil:targetElement="${target}" smil:attributeName="y" smil:values="height;y" smil:keyTimes="0;1"/>`;
    } else if (preset.kind === "zoom") {
      animates += `
                <anim:animate smil:dur="${preset.dur}" smil:fill="hold" smil:targetElement="${target}" smil:attributeName="width" smil:values="0;width" smil:keyTimes="0;1"/>
                <anim:animate smil:dur="${preset.dur}" smil:fill="hold" smil:targetElement="${target}" smil:attributeName="height" smil:values="0;height" smil:keyTimes="0;1"/>`;
    } else {
      animates += `
                <anim:animate smil:dur="${preset.dur}" smil:fill="hold" smil:targetElement="${target}" smil:attributeName="opacity" smil:from="0" smil:to="1"/>`;
    }
    return `
            <anim:par smil:begin="indefinite">
              <anim:par smil:begin="${preset.begin}" smil:fill="hold" presentation:node-type="on-click" presentation:preset-class="entrance" presentation:preset-id="${this._escapeXml(preset.presetId)}"${sub}>${animates}
              </anim:par>
            </anim:par>`;
  }

  _serializeShapeAnimation(shape, drawId) {
    return this._serializeEntranceAnimation(shape?.animation, drawId);
  }

  _serializePageAnimXml(pageXmlId, slide, idMap, placeholderIds) {
    const smil = this._mapVnTransitionToSmil(slide?.transition);
    const placeholders = placeholderIds || {};
    const shapeIds = idMap || new Map();
    const effectXml = [
      this._serializeEntranceAnimation(slide?.titleAnimation, placeholders.title),
      this._serializeEntranceAnimation(slide?.bodyAnimation, placeholders.body),
      this._serializeEntranceAnimation(slide?.body2Animation, placeholders.body2),
      ...((slide?.shapes || []).map((shape) => this._serializeShapeAnimation(shape, shapeIds.get(String(shape.id)))))
    ].filter(Boolean).join("");
    if (!smil && !effectXml) return "";
    let transXml = "";
    if (smil) {
      const sub = smil.subtype ? ` smil:subtype="${smil.subtype}"` : "";
      const fade = smil.fadeColor ? ` smil:fadeColor="${smil.fadeColor}"` : "";
      transXml = `
          <anim:par smil:begin="${this._escapeXml(pageXmlId)}.begin">
            <anim:transitionFilter smil:dur="${smil.dur}" smil:type="${smil.type}"${sub}${fade}/>
          </anim:par>`;
    }
    const seqXml = effectXml
      ? `
          <anim:seq presentation:node-type="main-sequence">${effectXml}
          </anim:seq>`
      : "";
    return `
        <anim:par presentation:node-type="timing-root">${transXml}${seqXml}
        </anim:par>`;
  }

  _parseDrawingPageStyles(xmlText) {
    const styles = new Map();
    const regex = /<style:style\b([^>]*)>([\s\S]*?)<\/style:style>/gi;
    let match;
    while ((match = regex.exec(xmlText)) !== null) {
      if (!/style:family=["']drawing-page["']/i.test(match[1])) continue;
      const name = match[1].match(/style:name=["']([^"']+)["']/i)?.[1];
      if (!name) continue;
      const smilType = match[2].match(/smil:type=["']([^"']+)["']/i)?.[1] || "";
      const smilSubtype = match[2].match(/smil:subtype=["']([^"']+)["']/i)?.[1] || "";
      const smilDur = match[2].match(/smil:dur=["']([^"']+)["']/i)?.[1] || "";
      styles.set(name, {
        smilType,
        smilSubtype,
        duration: this._parseSmilTimeToMs(smilDur),
        vnType: this._mapSmilTransitionToVn(smilType, smilSubtype)
      });
    }
    return styles;
  }

  _parsePageTransition(pageAttrs, pageContent, drawingPageStyles) {
    const styleName = this._attr(pageAttrs, "draw:style-name");
    const fromStyle = drawingPageStyles.get(styleName) || {};
    const filterMatch = String(pageContent || "").match(/<anim:transitionFilter\b([^>]*?)\/?>/i);
    const filterAttrs = filterMatch ? filterMatch[1] : "";
    const filterType = this._attr(filterAttrs, "smil:type");
    const filterSubtype = this._attr(filterAttrs, "smil:subtype");
    const filterDur = this._attr(filterAttrs, "smil:dur");
    const vnType = this._mapSmilTransitionToVn(
      filterType || fromStyle.smilType,
      filterSubtype || fromStyle.smilSubtype
    );
    if (!vnType) return undefined;
    return {
      type: vnType,
      duration: this._parseSmilTimeToMs(filterDur) || fromStyle.duration || 500
    };
  }

  _parsePageAnimations(pageXml) {
    const byTarget = new Map();
    const regex = /<anim:par\b([^>]*presentation:preset-id=["'][^"']+["'][^>]*)>/gi;
    let match;
    while ((match = regex.exec(pageXml || "")) !== null) {
      const attrs = match[1];
      const vnType = this._mapPresetToVnAnimation(this._attr(attrs, "presentation:preset-id"));
      if (!vnType) continue;
      const afterOpen = pageXml.indexOf(">", match.index);
      const close = afterOpen >= 0 ? pageXml.indexOf("</anim:par>", afterOpen) : -1;
      const chunk = close >= 0
        ? pageXml.slice(match.index, close)
        : pageXml.slice(match.index, match.index + 2500);
      const target = chunk.match(/smil:targetElement=["']([^"']+)["']/i)?.[1];
      if (!target) continue;
      const animateDurs = [...chunk.matchAll(/<anim:animate\b([^>]*?)(?:\/>|>)/gi)]
        .map((item) => this._parseSmilTimeToMs(this._attr(item[1], "smil:dur")))
        .filter((ms) => Number.isFinite(ms) && ms >= 20);
      const duration = animateDurs.length
        ? Math.max(...animateDurs)
        : (this._parseSmilTimeToMs(this._attr(attrs, "smil:dur")) || 500);
      const delay = this._parseSmilTimeToMs(this._attr(attrs, "smil:begin")) || 0;
      byTarget.set(target, { type: vnType, duration, delay });
    }
    return byTarget;
  }

  _applyParsedAnimations(shapes, idMap, animByTarget) {
    if (!animByTarget || animByTarget.size === 0) return;
    for (const [target, animation] of animByTarget) {
      const restored = idMap.has(target) ? idMap.get(target) : target;
      const shape = (shapes || []).find((item) => String(item.id) === String(restored) || String(item.id) === String(target));
      if (shape) shape.animation = { ...animation };
    }
  }

  _collectPlaceholderTargets(pageXml) {
    const map = new Map();
    const regex = /<draw:frame\b([^>]*)>/gi;
    let match;
    let outlineIndex = 0;
    while ((match = regex.exec(pageXml || "")) !== null) {
      const attrs = match[1];
      const cls = this._attr(attrs, "presentation:class");
      if (this._isLayoutPresentationClass(cls) && !/^(title|outline)$/i.test(cls)) continue;
      const name = this._attr(attrs, "draw:name");
      let role = this._placeholderRoleFromName(name);
      if (!role) {
        if (cls === "title") role = "title";
        else if (cls === "outline") role = outlineIndex++ === 0 ? "body" : "body2";
      } else if (cls === "outline") {
        outlineIndex = Math.max(outlineIndex, role === "body2" ? 2 : 1);
      }
      if (!role) continue;
      const drawId = this._attr(attrs, "draw:id");
      const xmlId = this._attr(attrs, "xml:id");
      if (drawId) map.set(drawId, role);
      if (xmlId) map.set(xmlId, role);
      if (name) map.set(name, role);
    }
    return map;
  }

  _applyPlaceholderAnimations(slide, placeholderTargets, animByTarget) {
    if (!slide || !placeholderTargets || !animByTarget || animByTarget.size === 0) return;
    const fields = { title: "titleAnimation", body: "bodyAnimation", body2: "body2Animation" };
    for (const [target, animation] of animByTarget) {
      const role = placeholderTargets.get(target);
      if (!role || !fields[role]) continue;
      slide[fields[role]] = { ...animation };
    }
  }

  _shapeGeomAttrs(shape, drawId) {
    const name = this._escapeXml(String(shape.id ?? drawId));
    const styleName = this._shapeStyleName(shape);
    const fill = this._isTransparentFill(shape) ? "" : ` draw:fill-color="${this._escapeXml(shape.color)}"`;
    return `draw:id="${this._escapeXml(drawId)}" draw:name="${name}" draw:style-name="${styleName}" svg:x="${this._pxToOdf(shape.x)}" svg:y="${this._pxToOdf(shape.y)}" svg:width="${this._pxToOdf(shape.w)}" svg:height="${this._pxToOdf(shape.h)}"${fill}`;
  }

  _serializeGraphicStyles(slides) {
    const fills = new Map();
    let needsConnector = false;
    let needsMedia = false;
    for (const slide of slides) {
      for (const shape of slide.shapes || []) {
        if (shape.type === "connector") {
          needsConnector = true;
          continue;
        }
        if (shape.type === "image" || shape.type === "video" || shape.type === "audio") {
          needsMedia = true;
          continue;
        }
        if (this._isTransparentFill(shape)) {
          fills.set("none", null);
        } else {
          fills.set(this._styleKey(shape.color), shape.color);
        }
      }
    }

    let xml = `
    <style:page-layout style:name="PM1">
      <style:page-layout-properties fo:page-width="28cm" fo:page-height="15.75cm" style:print-orientation="landscape"/>
    </style:page-layout>
    <style:style style:name="dp1" style:family="drawing-page">
      <style:drawing-page-properties presentation:background-visible="true" presentation:background-objects-visible="true"/>
    </style:style>`;

    (slides || []).forEach((slide, idx) => {
      const smil = this._mapVnTransitionToSmil(slide?.transition);
      if (!smil) return;
      const name = this._pageDrawingStyleName(slide, idx);
      const sub = smil.subtype ? ` smil:subtype="${smil.subtype}"` : "";
      const fade = smil.fadeColor ? ` smil:fadeColor="${smil.fadeColor}"` : "";
      const dur = smil.dur ? ` smil:dur="${smil.dur}"` : "";
      xml += `
    <style:style style:name="${name}" style:family="drawing-page">
      <style:drawing-page-properties presentation:background-visible="true" presentation:background-objects-visible="true" smil:type="${smil.type}"${sub}${dur}${fade}/>
    </style:style>`;
    });

    xml += `
    <style:style style:name="prTitle" style:family="presentation">
      <style:graphic-properties draw:stroke="none" draw:fill="none"/>
    </style:style>
    <style:style style:name="prBody" style:family="presentation">
      <style:graphic-properties draw:stroke="none" draw:fill="none"/>
    </style:style>
    <style:style style:name="grNone" style:family="graphic">
      <style:graphic-properties draw:stroke="none" draw:fill="none"/>
    </style:style>`;

    for (const [key, color] of fills) {
      if (key === "none" || !color) continue;
      xml += `
    <style:style style:name="gr${key}" style:family="graphic">
      <style:graphic-properties draw:stroke="none" draw:fill="solid" draw:fill-color="${this._escapeXml(color)}"/>
    </style:style>`;
    }
    if (needsConnector) {
      xml += `
    <style:style style:name="grConnector" style:family="graphic">
      <style:graphic-properties draw:stroke="solid" svg:stroke-color="#475569" svg:stroke-width="0.08cm" draw:fill="none"/>
    </style:style>`;
    }
    if (needsMedia) {
      xml += `
    <style:style style:name="grImage" style:family="graphic">
      <style:graphic-properties draw:stroke="none" draw:fill="none"/>
    </style:style>`;
    }
    return xml;
  }

  _serializeShape(shape, drawId, idMap) {
    const type = shape?.type || "rect";
    const geom = this._shapeGeomAttrs(shape, drawId);
    const textXml = this._textParagraphsXml(shape.text);

    if (type === "connector") {
      const start = this._escapeXml(String(idMap.get(String(shape.sourceId)) || shape.sourceId || ""));
      const end = this._escapeXml(String(idMap.get(String(shape.targetId)) || shape.targetId || ""));
      const x1 = this._pxToOdf(shape.x1 ?? shape.x);
      const y1 = this._pxToOdf(shape.y1 ?? shape.y);
      const x2 = this._pxToOdf(shape.x2 ?? (Number(shape.x) + Number(shape.w) || 0));
      const y2 = this._pxToOdf(shape.y2 ?? (Number(shape.y) + Number(shape.h) || 0));
      const stroke = shape.color && shape.color !== "transparent" ? ` svg:stroke-color="${this._escapeXml(shape.color)}"` : "";
      const marker = shape.arrowEnd ? ' draw:marker-end="arrow"' : "";
      return `
        <draw:connector ${geom} draw:type="line" svg:x1="${x1}" svg:y1="${y1}" svg:x2="${x2}" svg:y2="${y2}" draw:start-shape="${start}" draw:end-shape="${end}"${stroke}${marker}>
          <text:p/>
        </draw:connector>`;
    }

    if (type === "image") {
      const parts = this._dataUrlParts(shape.src);
      const mime = this._escapeXml(parts?.mime || "image/png");
      const href = parts ? "" : this._escapeXml(shape.src || "");
      return `
        <draw:frame ${geom}>
          <draw:image xlink:href="${href}" xlink:type="simple" xlink:show="embed" xlink:actuate="onLoad" draw:mime-type="${mime}">
            ${this._binaryDataXml(shape.src)}
          </draw:image>
        </draw:frame>`;
    }

    if (type === "video" || type === "audio") {
      const parts = this._dataUrlParts(shape.src);
      const mime = this._escapeXml(parts?.mime || (type === "audio" ? "audio/mpeg" : "video/mp4"));
      const href = parts ? "" : this._escapeXml(shape.src || "");
      return `
        <draw:frame ${geom}>
          <draw:plugin xlink:href="${href}" xlink:type="simple" xlink:show="embed" draw:mime-type="${mime}">
            ${this._binaryDataXml(shape.src)}
          </draw:plugin>
        </draw:frame>`;
    }

    if (type === "table") {
      const rows = Array.isArray(shape.cells) ? shape.cells : [];
      const cols = Math.max(1, Number(shape.cols) || rows.reduce((max, row) => Math.max(max, (row || []).length), 1));
      const rowsXml = rows.map((row) => {
        const cells = Array.from({ length: cols }, (_, index) => row?.[index] ?? "");
        const cellsXml = cells.map((cell) => `<table:table-cell office:value-type="string">${this._textParagraphsXml(cell)}</table:table-cell>`).join("");
        return `<table:table-row>${cellsXml}</table:table-row>`;
      }).join("");
      return `
        <draw:frame ${geom}>
          <table:table table:name="${this._escapeXml(String(shape.id ?? drawId))}">
            <table:table-column table:number-columns-repeated="${cols}"/>
            ${rowsXml}
          </table:table>
        </draw:frame>`;
    }

    if (type === "textbox" || type === "text") {
      return `
        <draw:frame ${geom}>
          <draw:text-box>
            ${textXml}
          </draw:text-box>
        </draw:frame>`;
    }

    if (type === "ellipse") {
      return `
        <draw:ellipse ${geom}>
          ${textXml}
        </draw:ellipse>`;
    }

    if (type === "arrow") {
      // LibreOffice PPTX filter maps classic ODF draw:type="arrow" to prst=rect.
      // draw:type="right-arrow" maps to prst=rightArrow and returns as ooxml-rightArrow.
      return `
        <draw:custom-shape ${geom}>
          ${textXml}
          <draw:enhanced-geometry svg:viewBox="0 0 21600 21600" draw:type="right-arrow" draw:enhanced-path="M 0 7640 L 13955 7640 13955 3890 21600 10800 13955 17710 13955 13960 0 13960 Z"/>
        </draw:custom-shape>`;
    }

    return `
        <draw:rect ${geom}>
          ${textXml}
        </draw:rect>`;
  }

  _serializeSlideShapes(shapes, idMap) {
    if (!Array.isArray(shapes) || shapes.length === 0) return "";
    const map = idMap || this._collectShapeIdMap(shapes);
    return shapes.map((shape) => this._serializeShape(shape, map.get(String(shape.id)), map)).join("");
  }

  _parseGraphicFillStyles(xmlText) {
    const styles = new Map();
    const regex = /<style:style\b([^>]*)>([\s\S]*?)<\/style:style>/gi;
    let match;
    while ((match = regex.exec(xmlText)) !== null) {
      if (!/style:family=["']graphic["']/i.test(match[1])) continue;
      const name = match[1].match(/style:name=["']([^"']+)["']/i)?.[1];
      if (!name) continue;
      const fill = match[2].match(/draw:fill-color=["']([^"']+)["']/i)?.[1];
      const fillKind = match[2].match(/draw:fill=["']([^"']+)["']/i)?.[1];
      const stroke = match[2].match(/svg:stroke-color=["']([^"']+)["']/i)?.[1];
      const markerEnd = match[2].match(/draw:marker-end=["']([^"']+)["']/i)?.[1];
      styles.set(name, {
        fill: fillKind === "none" ? "transparent" : (fill || null),
        stroke: stroke || null,
        markerEnd: markerEnd || null
      });
    }
    return styles;
  }

  _paragraphsFromXml(xml) {
    const paragraphs = [];
    const regex = /<text:p\b[^>]*>([\s\S]*?)<\/text:p>/gi;
    let match;
    while ((match = regex.exec(xml)) !== null) {
      const clean = this._unescapeXml(match[1].replace(/<[^>]+>/g, "")).trim();
      if (clean && clean !== "<number>" && !clean.startsWith("<")) paragraphs.push(clean);
    }
    return paragraphs;
  }

  _frameParagraphsByClass(pageXml, className) {
    const frames = [];
    const regex = /<draw:frame\b([^>]*)>([\s\S]*?)<\/draw:frame>/gi;
    let match;
    while ((match = regex.exec(pageXml)) !== null) {
      const cls = match[1].match(/presentation:class=["']([^"']+)["']/i)?.[1];
      if (cls === className) frames.push(this._paragraphsFromXml(match[2]));
    }
    return frames.flat();
  }

  _parseDrawShape(tagName, attrs, inner, graphicStyles) {
    const get = (name) => this._attr(attrs, name);
    const geomType = inner.match(/draw:type=["']([^"']+)["']/i)?.[1] || tagName;
    let type = "rect";
    if (/ellipse|circle/i.test(geomType) || tagName === "ellipse" || tagName === "circle") type = "ellipse";
    else if (/arrow/i.test(geomType)) type = "arrow";
    const styleName = get("draw:style-name");
    const style = graphicStyles.get(styleName) || {};
    const color = get("draw:fill-color") || style.fill || "#3b82f6";
    return {
      id: this._restoreShapeId(attrs),
      type,
      x: this._odfLengthToPx(get("svg:x")),
      y: this._odfLengthToPx(get("svg:y")),
      w: this._odfLengthToPx(get("svg:width")) || 200,
      h: this._odfLengthToPx(get("svg:height")) || 120,
      color,
      text: this._paragraphsFromXml(inner).join("\n"),
      animation: this._noneAnimation()
    };
  }

  _parseConnectorShape(attrs, inner, graphicStyles) {
    const get = (name) => this._attr(attrs, name);
    const style = graphicStyles.get(get("draw:style-name")) || {};
    const x1 = this._odfLengthToPx(get("svg:x1"));
    const y1 = this._odfLengthToPx(get("svg:y1"));
    const x2 = this._odfLengthToPx(get("svg:x2"));
    const y2 = this._odfLengthToPx(get("svg:y2"));
    const x = this._odfLengthToPx(get("svg:x")) || Math.min(x1, x2);
    const y = this._odfLengthToPx(get("svg:y")) || Math.min(y1, y2);
    const w = this._odfLengthToPx(get("svg:width")) || Math.max(1, Math.abs(x2 - x1));
    const h = this._odfLengthToPx(get("svg:height")) || Math.max(1, Math.abs(y2 - y1));
    return {
      id: this._restoreShapeId(attrs),
      type: "connector",
      x, y, w, h, x1, y1, x2, y2,
      color: get("svg:stroke-color") || style.stroke || "#475569",
      arrowEnd: !!(get("draw:marker-end") || style.markerEnd),
      sourceId: get("draw:start-shape") || null,
      targetId: get("draw:end-shape") || null,
      diagramRole: "connector",
      animation: this._noneAnimation()
    };
  }

  _parseEmbeddedSrc(inner, fallbackMime) {
    const mime = inner.match(/draw:mime-type=["']([^"']+)["']/i)?.[1] || fallbackMime;
    const binary = inner.match(/<office:binary-data[^>]*>([\s\S]*?)<\/office:binary-data>/i)?.[1];
    if (binary && binary.replace(/\s+/g, "")) {
      return `data:${mime};base64,${binary.replace(/\s+/g, "")}`;
    }
    const href = inner.match(/xlink:href=["']([^"']*)["']/i)?.[1];
    return href || "";
  }

  _parseTableCells(inner) {
    const rows = [];
    // soffice FODP may compress identical consecutive cells/rows
    // (table:number-columns-repeated / table:number-rows-repeated) and may emit
    // empty cells as self-closing. Count each logical cell, not each XML tag.
    const rowRegex = /<table:table-row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/table:table-row>)/gi;
    let rowMatch;
    while ((rowMatch = rowRegex.exec(inner)) !== null) {
      const rowRepeat = Math.max(1, Number(this._attr(rowMatch[1], "table:number-rows-repeated")) || 1);
      const cells = [];
      const cellRegex = /<(?:table:)?(?:table-cell|covered-table-cell)\b([^>]*?)(?:\/>|>([\s\S]*?)<\/(?:table:)?(?:table-cell|covered-table-cell)>)/gi;
      let cellMatch;
      while ((cellMatch = cellRegex.exec(rowMatch[2] || "")) !== null) {
        const colRepeat = Math.max(1, Number(this._attr(cellMatch[1], "table:number-columns-repeated")) || 1);
        const isCovered = /^<(?:table:)?covered-table-cell\b/i.test(cellMatch[0]);
        const text = isCovered ? "" : this._paragraphsFromXml(cellMatch[2] || "").join("\n");
        const fallback = isCovered
          ? ""
          : this._unescapeXml(this._attr(cellMatch[1], "office:value") || this._attr(cellMatch[1], "office:string-value") || "");
        const cellText = text || fallback;
        for (let index = 0; index < colRepeat; index++) cells.push(cellText);
      }
      for (let index = 0; index < rowRepeat; index++) rows.push(cells.slice());
    }
    return rows;
  }

  _parseFrameShape(attrs, inner, graphicStyles) {
    const get = (name) => this._attr(attrs, name);
    const style = graphicStyles.get(get("draw:style-name")) || {};
    const base = {
      id: this._restoreShapeId(attrs),
      x: this._odfLengthToPx(get("svg:x")),
      y: this._odfLengthToPx(get("svg:y")),
      w: this._odfLengthToPx(get("svg:width")) || 200,
      h: this._odfLengthToPx(get("svg:height")) || 120,
      animation: this._noneAnimation()
    };

    // soffice PPTX hop keeps <table:table> but injects a sibling <draw:image> preview
    // (WMF/bitmap). Table must win or the shape is misread as type "image".
    if (/<table:table\b/i.test(inner)) {
      const cells = this._parseTableCells(inner);
      return {
        ...base,
        type: "table",
        cells,
        rows: cells.length,
        cols: cells.reduce((max, row) => Math.max(max, row.length), 0),
        color: get("draw:fill-color") || style.fill || "transparent",
        text: ""
      };
    }
    if (/<draw:image\b/i.test(inner)) {
      return { ...base, type: "image", src: this._parseEmbeddedSrc(inner, "image/png"), color: "transparent" };
    }
    if (/<draw:plugin\b/i.test(inner)) {
      const mime = inner.match(/draw:mime-type=["']([^"']+)["']/i)?.[1] || "";
      const type = /^audio\//i.test(mime) ? "audio" : "video";
      return { ...base, type, src: this._parseEmbeddedSrc(inner, type === "audio" ? "audio/mpeg" : "video/mp4"), color: "transparent" };
    }

    const hasId = get("draw:id") || get("xml:id") || get("draw:name");
    if (/<draw:text-box\b/i.test(inner) && hasId) {
      return {
        ...base,
        type: "textbox",
        color: get("draw:fill-color") || style.fill || "transparent",
        text: this._paragraphsFromXml(inner).join("\n")
      };
    }
    return null;
  }

  _isLayoutPresentationClass(className) {
    return /^(title|subtitle|outline|notes|header|footer|page-number|date-time|page)$/i.test(className || "");
  }

  _extractTaggedShapes(pageContent, tagNames, handler) {
    const names = tagNames.join("|");
    const regex = new RegExp(`<draw:(${names})\\b([^>]*?)(?:/>|>([\\s\\S]*?)</draw:\\1>)`, "gi");
    const blocks = [];
    let match;
    while ((match = regex.exec(pageContent)) !== null) {
      handler(match[1], match[2] || "", match[3] || "");
      blocks.push(match[0]);
    }
    let next = pageContent;
    for (const block of blocks) next = next.replace(block, "");
    return next;
  }

  _extractShapeFrames(pageContent, shapes, graphicStyles, idMap) {
    const regex = /<draw:frame\b([^>]*)>([\s\S]*?)<\/draw:frame>/gi;
    const blocks = [];
    let match;
    while ((match = regex.exec(pageContent)) !== null) {
      const cls = this._attr(match[1], "presentation:class");
      if (this._isLayoutPresentationClass(cls)) continue;
      const shape = this._parseFrameShape(match[1], match[2], graphicStyles);
      if (!shape) continue;
      this._recordShapeId(match[1], shape, idMap);
      shapes.push(shape);
      blocks.push(match[0]);
    }
    let next = pageContent;
    for (const block of blocks) next = next.replace(block, "");
    return next;
  }

  _frameBlocksByClass(pageXml, className) {
    const frames = [];
    const regex = /<draw:frame\b([^>]*)>([\s\S]*?)<\/draw:frame>/gi;
    let match;
    while ((match = regex.exec(pageXml)) !== null) {
      const cls = match[1].match(/presentation:class=["']([^"']+)["']/i)?.[1];
      if (cls === className) frames.push(this._paragraphsFromXml(match[2]).join("\n"));
    }
    return frames;
  }

  /**
   * Chuyển đổi toàn bộ slide hiện tại thành định dạng OpenDocument Flat XML (FODP).
   * LibreOffice Impress có thể chuyển đổi FODP trực tiếp sang PPTX, ODP hoặc PDF.
   */
  serializeToFodp() {
    const slides = (this.canvas && this.canvas.slides) || [];
    let pagesXml = "";

    slides.forEach((slide, idx) => {
      const pageName = `page${idx + 1}`;
      const titleEscaped = this._escapeXml(slide.title || `Trang chiếu ${idx + 1}`);
      const layoutType = slide.layoutType || "title-content";

      const notesXml = slide.notes ? `
        <presentation:notes>
          <draw:frame presentation:class="notes" svg:x="2cm" svg:y="2cm" svg:width="20cm" svg:height="15cm">
            <draw:text-box>
              ${slide.notes.split("\n").map((line) => `<text:p>${this._escapeXml(line)}</text:p>`).join("")}
            </draw:text-box>
          </draw:frame>
        </presentation:notes>` : "";

      const usedIds = new Set();
      const placeholderIds = this._allocPlaceholderIds(slide, idx, usedIds);
      const idMap = this._collectShapeIdMap(slide.shapes || [], usedIds);
      const titleIds = this._placeholderIdAttrs("title", placeholderIds.title);
      const bodyIds = this._placeholderIdAttrs("body", placeholderIds.body);
      const body2Ids = this._placeholderIdAttrs("body2", placeholderIds.body2);

      let framesXml = "";
      if (layoutType === "blank") {
        framesXml = "";
      } else if (layoutType === "title-only") {
        framesXml = `
        <draw:frame presentation:style-name="prTitle" presentation:class="title"${titleIds} svg:x="2cm" svg:y="6cm" svg:width="24cm" svg:height="6cm">
          <draw:text-box>
            <text:p>${titleEscaped}</text:p>
          </draw:text-box>
        </draw:frame>`;
      } else if (layoutType === "two-content") {
        const bodyLines = (slide.body || "").split("\n");
        const bodyParasXml = bodyLines
          .map((line) => `<text:p>${this._escapeXml(line)}</text:p>`)
          .join("");
        const body2Lines = (slide.body2 || "").split("\n");
        const body2ParasXml = body2Lines
          .map((line) => `<text:p>${this._escapeXml(line)}</text:p>`)
          .join("");

        framesXml = `
        <draw:frame presentation:style-name="prTitle" presentation:class="title"${titleIds} svg:x="2cm" svg:y="2cm" svg:width="24cm" svg:height="3cm">
          <draw:text-box>
            <text:p>${titleEscaped}</text:p>
          </draw:text-box>
        </draw:frame>
        <draw:frame presentation:style-name="prBody" presentation:class="outline"${bodyIds} svg:x="2cm" svg:y="5.5cm" svg:width="11.5cm" svg:height="11cm">
          <draw:text-box>
            ${bodyParasXml}
          </draw:text-box>
        </draw:frame>
        <draw:frame presentation:style-name="prBody" presentation:class="outline"${body2Ids} svg:x="14.5cm" svg:y="5.5cm" svg:width="11.5cm" svg:height="11cm">
          <draw:text-box>
            ${body2ParasXml}
          </draw:text-box>
        </draw:frame>`;
      } else {
        // title-content (default)
        const bodyLines = (slide.body || "").split("\n");
        const bodyParasXml = bodyLines
          .map((line) => `<text:p>${this._escapeXml(line)}</text:p>`)
          .join("");

        framesXml = `
        <draw:frame presentation:style-name="prTitle" presentation:class="title"${titleIds} svg:x="2cm" svg:y="2cm" svg:width="24cm" svg:height="3cm">
          <draw:text-box>
            <text:p>${titleEscaped}</text:p>
          </draw:text-box>
        </draw:frame>
        <draw:frame presentation:style-name="prBody" presentation:class="outline"${bodyIds} svg:x="2cm" svg:y="5.5cm" svg:width="24cm" svg:height="11cm">
          <draw:text-box>
            ${bodyParasXml}
          </draw:text-box>
        </draw:frame>`;
      }

      const shapesXml = this._serializeSlideShapes(slide.shapes || [], idMap);
      const pageXmlId = `idPage${idx + 1}`;
      const pageStyleName = this._pageDrawingStyleName(slide, idx);
      const animXml = this._serializePageAnimXml(pageXmlId, slide, idMap, placeholderIds);

      pagesXml += `
      <draw:page draw:name="${pageName}" draw:style-name="${pageStyleName}" draw:master-page-name="Standard" presentation:layout="${layoutType}" xml:id="${pageXmlId}" draw:id="${pageXmlId}">
        ${framesXml}${shapesXml}${animXml}${notesXml}
      </draw:page>`;
    });

    const automaticStyles = this._serializeGraphicStyles(slides);

    return `<?xml version="1.0" encoding="UTF-8"?>
<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
                 xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"
                 xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
                 xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0"
                 xmlns:presentation="urn:oasis:names:tc:opendocument:xmlns:presentation:1.0"
                 xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
                 xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"
                 xmlns:xlink="http://www.w3.org/1999/xlink"
                 xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0"
                 xmlns:smil="urn:oasis:names:tc:opendocument:xmlns:smil-compatible:1.0"
                 xmlns:anim="urn:oasis:names:tc:opendocument:xmlns:animation:1.0"
                 office:version="1.3" office:mimetype="application/vnd.oasis.opendocument.presentation">
  <office:automatic-styles>${automaticStyles}
  </office:automatic-styles>
  <office:master-styles>
    <style:master-page style:name="Standard" style:page-layout-name="PM1" draw:style-name="dp1"/>
  </office:master-styles>
  <office:body>
    <office:presentation>${pagesXml}
    </office:presentation>
  </office:body>
</office:document>`;
  }

  /**
   * Phân tích nội dung FODP XML thành danh sách slide.
   * Dùng parser chuỗi thống nhất (Node và trình duyệt) vì CSS selector của
   * DOMParser dễ khớp nhầm `draw:page-thumbnail` và placeholder master-page.
   */
  parseFodp(xmlText) {
    if (!xmlText) return [];
    const parsedSlides = [];
    const graphicStyles = this._parseGraphicFillStyles(xmlText);
    const drawingPageStyles = this._parseDrawingPageStyles(xmlText);

    // Negative lookahead: do not match draw:page-thumbnail / page-number placeholders.
    const pageRegex = /<draw:page(?![-a-zA-Z])([^>]*)>([\s\S]*?)<\/draw:page>/gi;
    let pageMatch;
    let idx = 0;
    while ((pageMatch = pageRegex.exec(xmlText)) !== null) {
      idx++;
      const fullPageTag = pageMatch[1] || "";
      const layoutMatch = fullPageTag.match(/presentation:layout=["']([^"']+)["']/i);
      let pageLayout = layoutMatch ? layoutMatch[1] : "";
      const originalPageXml = pageMatch[2];
      const pageTransition = this._parsePageTransition(fullPageTag, originalPageXml, drawingPageStyles);
      const animByTarget = this._parsePageAnimations(originalPageXml);
      let pageContent = originalPageXml;

      let notesText = "";
      const notesRegex = /<presentation:notes[^>]*>([\s\S]*?)<\/presentation:notes>/i;
      const notesMatch = notesRegex.exec(pageContent);
      if (notesMatch) {
        notesText = this._paragraphsFromXml(notesMatch[1]).join("\n");
        pageContent = pageContent.replace(notesRegex, "");
      }

      const shapes = [];
      const idMap = new Map();
      pageContent = this._extractTaggedShapes(pageContent, ["rect", "ellipse", "circle", "custom-shape", "polygon"], (tagName, attrs, inner) => {
        const shape = this._parseDrawShape(tagName, attrs, inner, graphicStyles);
        this._recordShapeId(attrs, shape, idMap);
        shapes.push(shape);
      });
      pageContent = this._extractTaggedShapes(pageContent, ["connector", "line"], (tagName, attrs, inner) => {
        const shape = this._parseConnectorShape(attrs, inner, graphicStyles);
        if (tagName === "line" && !shape.sourceId && !shape.targetId) {
          shape.type = "connector";
        }
        this._recordShapeId(attrs, shape, idMap);
        shapes.push(shape);
      });
      pageContent = this._extractShapeFrames(pageContent, shapes, graphicStyles, idMap);
      for (const shape of shapes) {
        if (shape.type !== "connector") continue;
        shape.sourceId = this._mapConnectorRef(shape.sourceId, idMap);
        shape.targetId = this._mapConnectorRef(shape.targetId, idMap);
      }
      this._applyParsedAnimations(shapes, idMap, animByTarget);

      const titleParas = this._frameParagraphsByClass(pageContent, "title");
      const subtitleParas = this._frameParagraphsByClass(pageContent, "subtitle");
      const outlineParas = this._frameParagraphsByClass(pageContent, "outline");
      const outlineBlocks = this._frameBlocksByClass(pageContent, "outline");
      const hasPlaceholderClasses = titleParas.length > 0 || subtitleParas.length > 0 || outlineParas.length > 0;
      // PPTX hop drops presentation:layout; restore two-content / title-only from remaining placeholders.
      if (pageLayout !== "blank") {
        if (outlineBlocks.length > 1) pageLayout = "two-content";
        else if (!pageLayout && hasPlaceholderClasses && titleParas.length && outlineBlocks.length === 0 && subtitleParas.length === 0) {
          pageLayout = "title-only";
        }
      }
      if (!pageLayout) pageLayout = "title-content";

      let title = `Trang chiếu ${idx}`;
      let body = "";
      let body2 = undefined;

      if (pageLayout === "blank") {
        title = "";
        body = "";
      } else if (hasPlaceholderClasses) {
        title = titleParas.filter(Boolean).join(" ");
        if (pageLayout === "two-content") {
          body = outlineBlocks[0] || "";
          body2 = outlineBlocks.length > 1 ? outlineBlocks.slice(1).join("\n") : undefined;
        } else {
          body = subtitleParas.length ? subtitleParas.join("\n") : outlineParas.join("\n");
        }
      } else if (pageLayout === "two-content") {
        const frameRegex = /<draw:frame[^>]*>([\s\S]*?)<\/draw:frame>/gi;
        const frames = [];
        let fm;
        while ((fm = frameRegex.exec(pageContent)) !== null) {
          const fParas = [];
          const fpRegex = /<text:p[^>]*>([\s\S]*?)<\/text:p>/gi;
          let fpm;
          while ((fpm = fpRegex.exec(fm[1])) !== null) {
            const clean = fpm[1].replace(/<[^>]+>/g, "").trim();
            if (clean && !clean.startsWith("<")) fParas.push(this._unescapeXml(clean));
          }
          frames.push(fParas.join("\n"));
        }
        if (frames.length >= 3) {
          title = frames[0] || `Trang chiếu ${idx}`;
          body = frames[1] || "";
          body2 = frames[2] || "";
        } else {
          const pRegex = /<text:p[^>]*>([\s\S]*?)<\/text:p>/gi;
          const paragraphs = [];
          let pMatch;
          while ((pMatch = pRegex.exec(pageContent)) !== null) {
            const cleanText = pMatch[1].replace(/<[^>]+>/g, "").trim();
            if (cleanText && !cleanText.startsWith("<")) {
              paragraphs.push(this._unescapeXml(cleanText));
            }
          }
          title = paragraphs.length > 0 ? paragraphs[0] : `Trang chiếu ${idx}`;
          body = paragraphs.length > 1 ? paragraphs.slice(1).join("\n") : "";
        }
      } else {
        const pRegex = /<text:p[^>]*>([\s\S]*?)<\/text:p>/gi;
        const paragraphs = [];
        let pMatch;
        while ((pMatch = pRegex.exec(pageContent)) !== null) {
          const cleanText = pMatch[1].replace(/<[^>]+>/g, "").trim();
          if (cleanText && !cleanText.startsWith("<")) {
            paragraphs.push(this._unescapeXml(cleanText));
          }
        }
        title = paragraphs.length > 0 ? paragraphs[0] : `Trang chiếu ${idx}`;
        body = pageLayout === "title-only" ? "" : (paragraphs.length > 1 ? paragraphs.slice(1).join("\n") : "");
      }

      const parsedSlide = {
        id: Date.now() + idx,
        title,
        body,
        body2,
        layoutType: pageLayout,
        shapes,
        notes: notesText,
        ...(pageTransition ? { transition: pageTransition } : {})
      };
      this._applyPlaceholderAnimations(
        parsedSlide,
        this._collectPlaceholderTargets(originalPageXml),
        animByTarget
      );
      parsedSlides.push(parsedSlide);
    }

    return parsedSlides;
  }

  /**
   * Nạp danh sách slide từ nội dung FODP vào Canvas hiện tại.
   */
  loadFromFodp(fodpText) {
    if (!this.canvas) return;
    const newSlides = this.parseFodp(fodpText);
    if (newSlides && newSlides.length > 0) {
      this.canvas.slides = newSlides;
      if (typeof this.canvas.selectSlide === "function") {
        this.canvas.selectSlide(0);
      }
    }
  }

  /**
   * Lưu bản trình chiếu thành tệp PPTX thật trên đĩa (qua LibreOffice headless engine).
   */
  async save() {
    const fodpContent = this.serializeToFodp();
    const result = await globalUnoBridge.saveRealFile("slides", fodpContent, "pptx", this.sourceFileName);
    if (result.status === "ok") {
      this.isDirty = false;
      await showAlertDialog({ title: "Đã lưu", message: result.message, type: "success" });
      return true;
    }
    if (result.status === "cancelled") return false;
    await showAlertDialog({ title: "Không thể lưu", message: result.message, type: "error" });
    return false;
  }

  async saveAs() {
    return await this.save();
  }

  /**
   * Mở một tệp PPTX/ODP thật từ đĩa, nạp các trang chiếu vào Canvas.
   */
  async open() {
    const result = await globalUnoBridge.openRealFile("slides");
    if (result.status === "ok") {
      this.loadFromFodp(result.content);
      this.sourceFileName = (result.fileName || "TrinhChieu").replace(/\.[^/.]+$/, "");
      this.isDirty = false;
      return true;
    }
    if (result.status === "cancelled") return false;
    await showAlertDialog({ title: "Không thể mở tệp", message: result.message, type: "error" });
    return false;
  }

  async exportPdf() {
    const fodpContent = this.serializeToFodp();
    const result = await globalUnoBridge.exportRealPdf("slides", fodpContent, this.sourceFileName);
    if (result.status === "ok") {
      await showAlertDialog({ title: "Đã xuất PDF", message: result.message, type: "success" });
      return true;
    }
    if (result.status === "cancelled") return false;
    await showAlertDialog({ title: "Không thể xuất PDF", message: result.message, type: "error" });
    return false;
  }

  print() {
    if (typeof window !== "undefined" && typeof window.print === "function") {
      window.print();
    }
    return true;
  }

  /**
   * Mở hộp thoại chọn ảnh THẬT của trình duyệt, đọc tệp thật và chèn vào slide hiện tại.
   * Trả về Promise để handleDispatch có thể await đúng kết quả thật (không giả vờ thành công).
   */
  _insertImageDialog() {
    if (typeof document === "undefined") return Promise.resolve(false);
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) {
          resolve(false);
          return;
        }
        const reader = new FileReader();
        reader.onload = (evt) => {
          const ok = this.canvas.insertImage ? this.canvas.insertImage(evt.target.result) : false;
          resolve(ok);
        };
        reader.onerror = () => resolve(false);
        reader.readAsDataURL(file);
      };
      input.oncancel = () => resolve(false);
      input.click();
    });
  }

  /**
   * Mở hộp thoại chọn video/audio THẬT của trình duyệt, đọc tệp thật thành Data URL và chèn
   * vào slide hiện tại. Trả về Promise để handleDispatch await đúng kết quả thật.
   * @param {"video"|"audio"} mediaType
   */
  _insertMediaDialog(mediaType) {
    if (typeof document === "undefined") return Promise.resolve(false);
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = mediaType === "video" ? "video/*" : "audio/*";
      input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) {
          resolve(false);
          return;
        }
        const reader = new FileReader();
        reader.onload = (evt) => {
          const ok = this.canvas.insertMedia ? this.canvas.insertMedia(mediaType, evt.target.result, file.size) : false;
          resolve(ok);
        };
        reader.onerror = () => resolve(false);
        reader.readAsDataURL(file);
      };
      input.oncancel = () => resolve(false);
      input.click();
    });
  }

  async handleDispatch(unoUrl, args, vnCmdId) {
    if (!this.canvas) return false;
    const cmd = vnCmdId || (unoUrl === ".uno:AssignLayout" ? "slides.layout.apply" : vnCmdId);

    switch (cmd) {
      case "slides.slide.new":
        return this.canvas.addNewSlide();

      case "slides.slide.duplicate":
        return this.canvas.duplicateCurrentSlide();

      case "slides.slide.delete":
        return this.canvas.deleteCurrentSlide();

      case "slides.shape.group":
        return this.canvas.groupSelectedShapes ? this.canvas.groupSelectedShapes() : false;

      case "slides.shape.ungroup":
        return this.canvas.ungroupSelectedShapes ? this.canvas.ungroupSelectedShapes() : false;

      case "slides.nav.firstSlide":
        this.canvas.selectSlide(0);
        return true;

      case "slides.nav.lastSlide":
        this.canvas.selectSlide(this.canvas.slides.length - 1);
        return true;

      case "slides.nav.prevSlide":
        this.canvas.selectSlide(this.canvas.currentSlideIndex - 1);
        return true;

      case "slides.nav.nextSlide":
        this.canvas.selectSlide(this.canvas.currentSlideIndex + 1);
        return true;

      case "slides.layout.apply":
      case "slides.layout.select":
        return this.canvas.showLayoutDialog ? this.canvas.showLayoutDialog() : false;

      case "slides.show.startFromBegin":
        return this.canvas.startSlideShow(0);

      case "slides.show.startFromCurrent":
        return this.canvas.startSlideShow();

      case "slides.text.insert":
        if (this.canvas.bodyEl) {
          this.canvas.bodyEl.innerText += "\n• Khung văn bản mới bổ sung";
          const currentSlide = this.canvas.slides?.[this.canvas.currentSlideIndex];
          if (currentSlide) {
            currentSlide.body = this.canvas.bodyEl.innerText;
          }
        }
        this.canvas._renderThumbnails?.();
        return true;

      case "slides.shape.insert":
        return this.canvas.insertShape ? this.canvas.insertShape("rect") : false;

      case "slides.diagram.insert":
        return this.canvas.showDiagramDialog ? this.canvas.showDiagramDialog() : false;

      case "slides.image.insert":
        return await this._insertImageDialog();

      case "slides.master.apply":
        return this.canvas.showSlideMasterDialog ? this.canvas.showSlideMasterDialog() : false;

      case "slides.design.themeGallery":
        return this.canvas.showThemeGalleryDialog ? this.canvas.showThemeGalleryDialog() : false;

      case "slides.design.slideSize":
        return this.canvas.showSlideSizeDialog ? this.canvas.showSlideSizeDialog() : false;

      case "slides.transition.apply":
        return this.canvas.showTransitionDialog ? this.canvas.showTransitionDialog() : false;

      case "slides.animation.apply":
        return this.canvas.showAnimationDialog ? this.canvas.showAnimationDialog() : false;

      case "slides.view.normal":
      case ".uno:NormalMultiPaneGUI":
        return this.canvas.setNormalView ? this.canvas.setNormalView() : false;

      case "slides.notes.toggle":
      case ".uno:NotesMode":
        return this.canvas.toggleNotes ? this.canvas.toggleNotes() : false;

      case "slides.view.slideSorter":
      case ".uno:DiaMode":
        return this.canvas.openSlideSorter ? this.canvas.openSlideSorter() : false;

      case "slides.view.reading":
      case ".uno:SlideShow":
        return this.canvas.toggleReadingView ? this.canvas.toggleReadingView() : false;

      case "slides.view.ruler":
      case ".uno:Ruler":
        return this.canvas.toggleRuler ? this.canvas.toggleRuler() : false;

      case "slides.view.gridlines":
      case ".uno:GridUse":
        return this.canvas.toggleGridlines ? this.canvas.toggleGridlines() : false;

      case "slides.view.guides":
      case ".uno:HelplinesUse":
        return this.canvas.toggleGuides ? this.canvas.toggleGuides() : false;

      case "slides.view.zoomIn":
      case ".uno:ZoomIn":
        return this.canvas.zoomIn ? this.canvas.zoomIn() : false;

      case "slides.view.zoomOut":
      case ".uno:ZoomOut":
        return this.canvas.zoomOut ? this.canvas.zoomOut() : false;

      case "slides.view.zoomReset":
      case ".uno:Zoom100Percent":
        return this.canvas.zoomReset ? this.canvas.zoomReset() : false;

      case "slides.view.fitToWindow":
      case ".uno:ZoomOptimal":
        return this.canvas.fitToWindow ? this.canvas.fitToWindow() : false;

      case "slides.view.newWindow":
      case ".uno:NewWindow":
        return this.canvas.newWindow ? this.canvas.newWindow() : false;

      case "slides.show.presenterMode":
        return this.canvas.startPresenterMode ? this.canvas.startPresenterMode() : false;

      case "slides.show.rehearseTimings":
        return this.canvas.startRehearseTimings ? !!this.canvas.startRehearseTimings() : false;

      case "slides.media.insertVideo":
        return await this._insertMediaDialog("video");

      case "slides.media.insertAudio":
        return await this._insertMediaDialog("audio");

      case "slides.review.commentInsert":
        return this.canvas.openCommentsPanel ? this.canvas.openCommentsPanel(true) : false;

      case "slides.insert.table":
        return this.canvas.insertTable ? await this.canvas.insertTable(args) : false;

      case "slides.insert.headerFooter":
        return this.canvas.openHeaderFooterDialog ? await this.canvas.openHeaderFooterDialog(args) : false;

      case "slides.insert.dateTime":
        return this.canvas.insertDateTime ? await this.canvas.insertDateTime(args) : false;

      case "slides.insert.slideNumber":
        return this.canvas.insertSlideNumber ? this.canvas.insertSlideNumber(args) : false;

      case "slides.insert.symbol":
        return this.canvas.insertSymbol ? await this.canvas.insertSymbol(args) : false;

      case "common.edit.cut":
        if (typeof document !== "undefined") document.execCommand("cut", false, null);
        return true;

      case "common.edit.copy":
        if (typeof document !== "undefined") document.execCommand("copy", false, null);
        return true;

      case "common.edit.paste":
        if (typeof document !== "undefined") document.execCommand("paste", false, null);
        return true;

      case "common.edit.pastePlain":
        if (typeof document !== "undefined") document.execCommand("paste", false, null);
        return true;

      case "common.edit.selectAll":
        if (typeof document !== "undefined") document.execCommand("selectAll", false, null);
        return true;

      case "common.edit.undo":
        return this.canvas.undo ? this.canvas.undo() : false;

      case "common.edit.redo":
        return this.canvas.redo ? this.canvas.redo() : false;

      case "common.file.new":
        return this.newDocument();

      case "common.file.open":
        return await this.open();

      case "common.file.save":
        return await this.save();

      case "common.file.saveAs":
        return await this.saveAs();

      case "common.file.exportPdf":
        return await this.exportPdf();

      case "common.file.print":
        return this.print();

      case "common.file.close":
        return this.closeDocument();

      default:
        return false;
    }
  }
}
