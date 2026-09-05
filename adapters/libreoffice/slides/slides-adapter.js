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
    </style:style>
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

  _serializeSlideShapes(shapes) {
    if (!Array.isArray(shapes) || shapes.length === 0) return "";
    const used = new Set();
    const idMap = new Map();
    for (const shape of shapes) {
      idMap.set(String(shape.id), this._sanitizeDrawId(shape.id, used));
    }
    return shapes.map((shape) => this._serializeShape(shape, idMap.get(String(shape.id)), idMap)).join("");
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
      animation: { type: "none", duration: 500, delay: 0 }
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
      animation: { type: "none", duration: 500, delay: 0 }
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
    const rowRegex = /<table:table-row\b[^>]*>([\s\S]*?)<\/table:table-row>/gi;
    let rowMatch;
    while ((rowMatch = rowRegex.exec(inner)) !== null) {
      const cells = [];
      const cellRegex = /<table:table-cell\b[^>]*>([\s\S]*?)<\/table:table-cell>/gi;
      let cellMatch;
      while ((cellMatch = cellRegex.exec(rowMatch[1])) !== null) {
        cells.push(this._paragraphsFromXml(cellMatch[1]).join("\n"));
      }
      rows.push(cells);
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
      animation: { type: "none", duration: 500, delay: 0 }
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

      let framesXml = "";
      if (layoutType === "blank") {
        framesXml = "";
      } else if (layoutType === "title-only") {
        framesXml = `
        <draw:frame presentation:style-name="prTitle" presentation:class="title" svg:x="2cm" svg:y="6cm" svg:width="24cm" svg:height="6cm">
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
        <draw:frame presentation:style-name="prTitle" presentation:class="title" svg:x="2cm" svg:y="2cm" svg:width="24cm" svg:height="3cm">
          <draw:text-box>
            <text:p>${titleEscaped}</text:p>
          </draw:text-box>
        </draw:frame>
        <draw:frame presentation:style-name="prBody" presentation:class="outline" svg:x="2cm" svg:y="5.5cm" svg:width="11.5cm" svg:height="11cm">
          <draw:text-box>
            ${bodyParasXml}
          </draw:text-box>
        </draw:frame>
        <draw:frame presentation:style-name="prBody" presentation:class="outline" svg:x="14.5cm" svg:y="5.5cm" svg:width="11.5cm" svg:height="11cm">
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
        <draw:frame presentation:style-name="prTitle" presentation:class="title" svg:x="2cm" svg:y="2cm" svg:width="24cm" svg:height="3cm">
          <draw:text-box>
            <text:p>${titleEscaped}</text:p>
          </draw:text-box>
        </draw:frame>
        <draw:frame presentation:style-name="prBody" presentation:class="outline" svg:x="2cm" svg:y="5.5cm" svg:width="24cm" svg:height="11cm">
          <draw:text-box>
            ${bodyParasXml}
          </draw:text-box>
        </draw:frame>`;
      }

      const shapesXml = this._serializeSlideShapes(slide.shapes || []);

      pagesXml += `
      <draw:page draw:name="${pageName}" draw:style-name="dp1" draw:master-page-name="Standard" presentation:layout="${layoutType}">
        ${framesXml}${shapesXml}${notesXml}
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

    // Negative lookahead: do not match draw:page-thumbnail / page-number placeholders.
    const pageRegex = /<draw:page(?![-a-zA-Z])([^>]*)>([\s\S]*?)<\/draw:page>/gi;
    let pageMatch;
    let idx = 0;
    while ((pageMatch = pageRegex.exec(xmlText)) !== null) {
      idx++;
      const fullPageTag = pageMatch[1] || "";
      const layoutMatch = fullPageTag.match(/presentation:layout=["']([^"']+)["']/i);
      const pageLayout = layoutMatch ? layoutMatch[1] : "title-content";
      let pageContent = pageMatch[2];

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

      const titleParas = this._frameParagraphsByClass(pageContent, "title");
      const subtitleParas = this._frameParagraphsByClass(pageContent, "subtitle");
      const outlineParas = this._frameParagraphsByClass(pageContent, "outline");
      const outlineBlocks = this._frameBlocksByClass(pageContent, "outline");
      const hasPlaceholderClasses = titleParas.length > 0 || subtitleParas.length > 0 || outlineParas.length > 0;

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

      parsedSlides.push({
        id: Date.now() + idx,
        title,
        body,
        body2,
        layoutType: pageLayout,
        shapes,
        notes: notesText
      });
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

      case "slides.notes.toggle":
        return this.canvas.toggleNotes ? this.canvas.toggleNotes() : false;

      case "slides.view.slideSorter":
        return this.canvas.openSlideSorter ? this.canvas.openSlideSorter() : false;

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
