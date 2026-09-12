/**
 * Pure XML helpers for native PPTX Slide Master logo (DrawingML p:sp, no p:ph).
 *
 * ECMA-376 / ISO 29500-1:
 *   CT_Shape = nvSpPr, spPr, style?, txBody?
 *   CT_ShapeNonVisual = cNvPr, cNvSpPr, nvPr
 *   A decorative master shape is a p:sp whose nvPr has NO p:ph
 *   (placeholders inherit onto layouts/slides; this shape is painted on every
 *   slide that does not hide master graphics).
 *
 * LibreOffice FODP→PPTX keeps the five placeholders (title|body|dt|ftr|sldNum)
 * and drops the master-page logo text plus vno:master-theme. Phase 2b inserts
 * one standard shape after soffice convert. No custom namespace.
 *
 * File → Mở overlay (this module): LibreOffice PPTX→FODP keeps the lettering
 * as draw:custom-shape name="VNOfficeMasterLogo" but drops vno:master-theme
 * and grMasterLogo, so parseFodp() returns masterTheme=null. Overlay reads
 * the named p:sp from the original PPTX ZIP and stamps vno:master-theme
 * before parseFodp. Identify ONLY by name="VNOfficeMasterLogo" — never guess
 * among other p:sp. Browser-safe: no Node APIs. SlidesAdapter may import.
 */

import { ensureVnoXmlns } from "./pptx-section-list.js";

export const MASTER_LOGO_SHAPE_NAME = "VNOfficeMasterLogo";
export const SLIDE_MASTER_ENTRY_RE = /^ppt\/slideMasters\/slideMaster\d+\.xml$/i;
export const PPTX_PRESENTATION_ENTRY = "ppt/presentation.xml";

const CM_EMU = 360000;
const DEFAULT_SLIDE_CX = 28 * CM_EMU; // FODP PM1 page-width
const DEFAULT_SLIDE_CY = Math.round(15.75 * CM_EMU);
const LOGO_NAME_ATTR = `name="${MASTER_LOGO_SHAPE_NAME}"`;

const MASTER_PAGE_OPEN_RE = /<style:master-page\b([^>]*)>/i;
const MASTER_PAGE_OPEN_GI_RE = /<style:master-page\b([^>]*?)(\/?)\s*>/gi;
const THEME_ATTR_RE = /\bvno:master-theme\s*=\s*(?:"([^"]*)"|'([^']*)')/i;
const LOGO_FRAME_RE = /<draw:frame\b[^>]*grMasterLogo[\s\S]*?<text:p\b[^>]*>([\s\S]*?)<\/text:p>/i;
const SLD_SZ_RE = /<(?:[\w]+:)?sldSz\b([^>]*)\/?\s*>/i;
const CNVPR_ID_RE = /<(?:[\w]+:)?cNvPr\b[^>]*\bid=["'](\d+)["']/gi;
const SP_TREE_CLOSE_RE = /<\/(?:[\w]+:)?spTree\s*>/i;
const SP_BLOCK_RE = /<(?:[\w]+:)?sp\b[\s\S]*?<\/(?:[\w]+:)?sp>/gi;
const LOGO_NAME_RE = new RegExp(`\\bname\\s*=\\s*["']${MASTER_LOGO_SHAPE_NAME}["']`);
const SRGB_RE = /<(?:[\w]+:)?srgbClr\b[^>]*\bval=["']([^"']+)["']/i;
const LATIN_RE = /<(?:[\w]+:)?latin\b[^>]*\btypeface=["']([^"']+)["']/i;

function unescapeXml(value) {
  return String(value || "")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function escapeXml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function stripTags(value) {
  return String(value || "").replace(/<[^>]+>/g, "");
}

function normalizeLogoText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function rgbOf(hex) {
  const raw = String(hex || "").trim().replace(/^#/, "");
  if (/^[0-9a-fA-F]{6}$/.test(raw)) return raw.toUpperCase();
  if (/^[0-9a-fA-F]{3}$/.test(raw)) {
    return (raw[0] + raw[0] + raw[1] + raw[1] + raw[2] + raw[2]).toUpperCase();
  }
  return "2563EB";
}

function latinFace(fontFamily) {
  const first = String(fontFamily || "")
    .split(",")[0]
    .trim()
    .replace(/^['"]+|['"]+$/g, "");
  return first || "Arial";
}

function nsPrefix(xml, uri, fallback) {
  const escaped = uri.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = String(xml || "").match(new RegExp(`xmlns:([\\w]+)=["']${escaped}["']`));
  return match ? match[1] : fallback;
}

/**
 * @param {string} fodpXml
 * @returns {{ logoText: string, accentColor: string, fontFamily: string }}
 */
export function parseMasterLogoFromFodp(fodpXml) {
  const xml = String(fodpXml || "");
  const attrs = xml.match(MASTER_PAGE_OPEN_RE)?.[1] || "";
  const rawThemeMatch = attrs.match(THEME_ATTR_RE);
  const rawTheme = unescapeXml((rawThemeMatch ? (rawThemeMatch[1] !== undefined ? rawThemeMatch[1] : rawThemeMatch[2]) : "") || "");
  let logoText = "";
  let accentColor = "";
  let fontFamily = "";
  if (rawTheme) {
    try {
      const parsed = JSON.parse(rawTheme);
      if (parsed && typeof parsed === "object") {
        logoText = normalizeLogoText(parsed.logoText);
        accentColor = String(parsed.accentColor || "");
        fontFamily = String(parsed.fontFamily || "");
      }
    } catch {
      /* malformed vno:master-theme — fall through to the draw:frame */
    }
  }
  if (!logoText) {
    const frame = xml.match(LOGO_FRAME_RE);
    logoText = normalizeLogoText(unescapeXml(stripTags(frame?.[1] || "")));
  }
  return { logoText, accentColor, fontFamily };
}

export function fodpHasMasterLogo(fodpXml) {
  return Boolean(parseMasterLogoFromFodp(fodpXml).logoText);
}

export function parseSlideSize(presentationXml) {
  const attrs = String(presentationXml || "").match(SLD_SZ_RE)?.[1] || "";
  const cx = Number(attrs.match(/\bcx=["'](\d+)["']/i)?.[1] || 0);
  const cy = Number(attrs.match(/\bcy=["'](\d+)["']/i)?.[1] || 0);
  return {
    cx: cx > 0 ? cx : DEFAULT_SLIDE_CX,
    cy: cy > 0 ? cy : DEFAULT_SLIDE_CY
  };
}

/**
 * Đọc khổ trang chiếu THẬT NGƯỜI DÙNG ĐANG DÙNG (canvas.slideSize) từ chính FODP
 * do VN Office ghi ra (style:page-layout-properties fo:page-width/height, cm).
 * Cần thiết vì đã đo thực tế: soffice --convert-to pptx BỎ QUA hoàn toàn giá trị
 * này khi chuyển FODP -> PPTX, luôn tự ý ghi ra đúng DEFAULT_SLIDE_CX/CY
 * (28cm x 15.75cm) bất kể FODP khai báo gì - dùng để PHỤC HỒI đúng <p:sldSz>
 * thật sau khi soffice convert xong, không phải để đọc slide size hiện tại.
 */
export function parseIntendedSlideSizeFromFodp(fodpXml) {
  const attrs = String(fodpXml || "").match(/<style:page-layout-properties\b([^>]*)\/?>/i)?.[1] || "";
  const widthCm = parseFloat(attrs.match(/\bfo:page-width=["']([\d.]+)cm["']/i)?.[1]);
  const heightCm = parseFloat(attrs.match(/\bfo:page-height=["']([\d.]+)cm["']/i)?.[1]);
  if (!Number.isFinite(widthCm) || !Number.isFinite(heightCm) || widthCm <= 0 || heightCm <= 0) return null;
  return {
    cx: Math.round(widthCm * CM_EMU),
    cy: Math.round(heightCm * CM_EMU)
  };
}

/** Ghi đè cx/cy thật trên <p:sldSz> trong ppt/presentation.xml - giữ nguyên mọi thuộc tính khác của thẻ. */
export function applyIntendedSlideSize(presentationXml, size) {
  const xml = String(presentationXml || "");
  const match = xml.match(SLD_SZ_RE);
  if (!match || !size) return xml;
  const tag = match[0];
  const attrs = match[1];
  const nextAttrs = attrs
    .replace(/\bcx=["']\d+["']/i, `cx="${size.cx}"`)
    .replace(/\bcy=["']\d+["']/i, `cy="${size.cy}"`);
  const nextTag = tag.replace(attrs, nextAttrs);
  return xml.slice(0, match.index) + nextTag + xml.slice(match.index + tag.length);
}

function parseBox(tag, axisA, axisB) {
  const a = Number(tag.match(new RegExp(`\\b${axisA}=["'](-?\\d+)["']`, "i"))?.[1]);
  const b = Number(tag.match(new RegExp(`\\b${axisB}=["'](-?\\d+)["']`, "i"))?.[1]);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return [a, b];
}

export function parsePlaceholderBoxes(masterXml) {
  const boxes = [];
  const xml = String(masterXml || "");
  const blocks = xml.match(SP_BLOCK_RE) || [];
  for (const sp of blocks) {
    if (!/<(?:[\w]+:)?ph\b/i.test(sp)) continue;
    const offTag = sp.match(/<(?:[\w]+:)?off\b[^>]*>/i)?.[0] || "";
    const extTag = sp.match(/<(?:[\w]+:)?ext\b[^>]*>/i)?.[0] || "";
    const off = parseBox(offTag, "x", "y");
    const ext = parseBox(extTag, "cx", "cy");
    if (!off || !ext) continue;
    boxes.push({ x: off[0], y: off[1], cx: ext[0], cy: ext[1] });
  }
  return boxes;
}

function overlaps(a, b) {
  return a.x < b.x + b.cx && a.x + a.cx > b.x && a.y < b.y + b.cy && a.y + a.cy > b.y;
}

export function chooseMasterLogoBox(slideSize, placeholders) {
  const slide = {
    cx: slideSize?.cx > 0 ? slideSize.cx : DEFAULT_SLIDE_CX,
    cy: slideSize?.cy > 0 ? slideSize.cy : DEFAULT_SLIDE_CY
  };
  const ph = Array.isArray(placeholders) ? placeholders : [];
  const marginX = Math.round(0.6 * CM_EMU);
  const marginY = Math.round(0.1 * CM_EMU);
  const gap = Math.round(0.05 * CM_EMU);
  const desiredCx = Math.min(16 * CM_EMU, Math.floor(slide.cx * 0.55));
  const desiredCy = Math.round(0.5 * CM_EMU);
  const minPhY = ph.reduce((min, box) => Math.min(min, box.y), slide.cy);
  const topCy = Math.max(Math.round(0.35 * CM_EMU), Math.min(desiredCy, minPhY - marginY - gap));
  const candidates = [];
  if (minPhY > marginY + Math.round(0.32 * CM_EMU)) {
    candidates.push({ x: marginX, y: marginY, cx: desiredCx, cy: topCy });
    const rightCx = Math.min(desiredCx, Math.floor(slide.cx * 0.42));
    candidates.push({
      x: Math.max(marginX, slide.cx - marginX - rightCx),
      y: marginY,
      cx: rightCx,
      cy: topCy
    });
  }
  const footerTop = ph.reduce((max, box) => Math.max(max, box.y), 0);
  const bodyBottom = ph
    .filter((box) => box.y + box.cy < slide.cy * 0.85)
    .reduce((max, box) => Math.max(max, box.y + box.cy), 0);
  if (footerTop > bodyBottom + desiredCy + gap) {
    candidates.push({
      x: marginX,
      y: bodyBottom + gap,
      cx: desiredCx,
      cy: Math.min(desiredCy, footerTop - bodyBottom - gap * 2)
    });
  }
  candidates.push({
    x: marginX,
    y: 0,
    cx: Math.min(desiredCx, slide.cx - marginX * 2),
    cy: Math.min(desiredCy, Math.max(Math.round(0.35 * CM_EMU), minPhY - gap))
  });
  for (const box of candidates) {
    if (box.cx < Math.round(0.8 * CM_EMU) || box.cy < Math.round(0.28 * CM_EMU)) continue;
    if (box.x < 0 || box.y < 0 || box.x + box.cx > slide.cx + 2000 || box.y + box.cy > slide.cy + 2000) {
      continue;
    }
    if (ph.every((item) => !overlaps(box, item))) return box;
  }
  return {
    x: marginX,
    y: 0,
    cx: Math.min(desiredCx, slide.cx - marginX * 2),
    cy: Math.min(desiredCy, Math.max(Math.round(0.32 * CM_EMU), minPhY - gap))
  };
}

export function nextCnvPrId(masterXml) {
  let max = 0;
  const xml = String(masterXml || "");
  CNVPR_ID_RE.lastIndex = 0;
  let match;
  while ((match = CNVPR_ID_RE.exec(xml))) {
    const value = Number(match[1]);
    if (Number.isFinite(value)) max = Math.max(max, value);
  }
  return max + 1;
}

function buildLogoShapeXml(masterXml, { logoText, accentColor, fontFamily, box, shapeId }) {
  const p = nsPrefix(masterXml, "http://schemas.openxmlformats.org/presentationml/2006/main", "p");
  const a = nsPrefix(masterXml, "http://schemas.openxmlformats.org/drawingml/2006/main", "a");
  const color = rgbOf(accentColor);
  const face = escapeXml(latinFace(fontFamily));
  const text = escapeXml(logoText);
  return (
    `<${p}:sp>` +
    `<${p}:nvSpPr>` +
    `<${p}:cNvPr id="${shapeId}" ${LOGO_NAME_ATTR}/>` +
    `<${p}:cNvSpPr><${a}:spLocks noGrp="1"/></${p}:cNvSpPr>` +
    `<${p}:nvPr/>` +
    `</${p}:nvSpPr>` +
    `<${p}:spPr>` +
    `<${a}:xfrm>` +
    `<${a}:off x="${box.x}" y="${box.y}"/>` +
    `<${a}:ext cx="${box.cx}" cy="${box.cy}"/>` +
    `</${a}:xfrm>` +
    `<${a}:prstGeom prst="rect"><${a}:avLst/></${a}:prstGeom>` +
    `<${a}:noFill/>` +
    `<${a}:ln w="0"><${a}:noFill/></${a}:ln>` +
    `</${p}:spPr>` +
    `<${p}:txBody>` +
    `<${a}:bodyPr wrap="square" lIns="0" tIns="0" rIns="0" bIns="0" anchor="t"><${a}:noAutofit/></${a}:bodyPr>` +
    `<${a}:lstStyle/>` +
    `<${a}:p>` +
    `<${a}:pPr algn="l"><${a}:buNone/></${a}:pPr>` +
    `<${a}:r>` +
    `<${a}:rPr lang="vi-VN" sz="1200" b="1">` +
    `<${a}:solidFill><${a}:srgbClr val="${color}"/></${a}:solidFill>` +
    `<${a}:latin typeface="${face}"/>` +
    `</${a}:rPr>` +
    `<${a}:t>${text}</${a}:t>` +
    `</${a}:r>` +
    `</${a}:p>` +
    `</${p}:txBody>` +
    `</${p}:sp>`
  );
}

function collectSpBlocks(masterXml) {
  const xml = String(masterXml || "");
  const blocks = [];
  const re = /<(?:[\w]+:)?sp\b[\s\S]*?<\/(?:[\w]+:)?sp>/gi;
  let match;
  while ((match = re.exec(xml))) blocks.push(match[0]);
  return blocks;
}

export function findNamedLogoShapes(masterXml) {
  return collectSpBlocks(masterXml).filter((sp) => LOGO_NAME_RE.test(sp));
}

function findNamedShape(masterXml) {
  return findNamedLogoShapes(masterXml)[0] || "";
}

/**
 * Read logoText / accentColor / fontFamily from a p:sp that is already known
 * to be named VNOfficeMasterLogo. Throws instead of guessing.
 */
export function parseMasterLogoFromNamedShape(shapeXml) {
  const sp = String(shapeXml || "");
  if (!sp) {
    throw new Error("Shape VNOfficeMasterLogo rỗng — không đoán logo");
  }
  if (/<(?:[\w]+:)?ph\b/i.test(sp)) {
    throw new Error("Shape VNOfficeMasterLogo mang p:ph — không đoán logo");
  }
  const texts = [];
  let match;
  const re = /<(?:[\w]+:)?t\b[^>]*>([\s\S]*?)<\/(?:[\w]+:)?t>/gi;
  while ((match = re.exec(sp))) texts.push(unescapeXml(match[1] || ""));
  const logoText = normalizeLogoText(texts.join(""));
  if (!logoText) {
    throw new Error("Shape VNOfficeMasterLogo thiếu chữ a:t — không đoán logo");
  }
  const rgb = String(sp.match(SRGB_RE)?.[1] || "")
    .trim()
    .replace(/^#/, "");
  const face = unescapeXml(sp.match(LATIN_RE)?.[1] || "");
  return {
    logoText,
    accentColor: /^[0-9a-fA-F]{3,8}$/.test(rgb) ? `#${rgb.toLowerCase()}` : "",
    fontFamily: face
  };
}

/**
 * Parse one slideMaster XML. 0 named shapes → null (no-op). >1 → throw.
 * @returns {{ logoText: string, accentColor: string, fontFamily: string } | null}
 */
export function parseMasterLogoFromSlideMaster(masterXml) {
  const shapes = findNamedLogoShapes(masterXml);
  if (!shapes.length) return null;
  if (shapes.length > 1) {
    throw new Error(
      `PPTX có ${shapes.length} shape tên ${MASTER_LOGO_SHAPE_NAME} trên một slide master — không đoán logo`
    );
  }
  return parseMasterLogoFromNamedShape(shapes[0]);
}

function logosEqual(a, b) {
  return a.logoText === b.logoText && a.accentColor === b.accentColor && a.fontFamily === b.fontFamily;
}

/**
 * Combine named logos from every slideMaster*.xml. Conflicting values throw.
 * @param {string|string[]} masterXml
 * @returns {{ logoText: string, accentColor: string, fontFamily: string } | null}
 */
export function parseMasterLogoFromSlideMasters(masterXml) {
  const list = Array.isArray(masterXml) ? masterXml : masterXml != null && masterXml !== "" ? [masterXml] : [];
  const found = [];
  for (const xml of list) {
    const parsed = parseMasterLogoFromSlideMaster(xml);
    if (parsed) found.push(parsed);
  }
  if (!found.length) return null;
  const first = found[0];
  for (const item of found.slice(1)) {
    if (!logosEqual(item, first)) {
      throw new Error(
        "Hai slide master có VNOfficeMasterLogo khác chữ/màu/font — không đoán logo"
      );
    }
  }
  return first;
}

function mergeMasterThemePayload(existingRaw, logo) {
  let theme = {};
  const raw = String(existingRaw || "").trim();
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") theme = parsed;
    } catch {
      /* malformed vno:master-theme — replace with logo fields */
    }
  }
  theme.logoText = logo.logoText;
  if (logo.accentColor) theme.accentColor = logo.accentColor;
  if (logo.fontFamily) theme.fontFamily = logo.fontFamily;
  return theme;
}

/**
 * Stamp vno:master-theme onto every style:master-page. Throws if FODP has
 * none — never invent a master-page.
 */
export function applyFodpMasterThemeAttrs(fodpXml, logo) {
  const xml = String(fodpXml || "");
  if (!logo || !normalizeLogoText(logo.logoText)) return xml;
  let index = 0;
  const next = xml.replace(MASTER_PAGE_OPEN_GI_RE, (full, attrs, slash) => {
    index += 1;
    let raw = attrs || "";
    const selfClose = slash === "/" || /\/\s*$/.test(raw);
    if (selfClose) raw = raw.replace(/\/\s*$/, "");
    const existingMatch = raw.match(THEME_ATTR_RE);
    const existing = unescapeXml((existingMatch ? (existingMatch[1] !== undefined ? existingMatch[1] : existingMatch[2]) : "") || "");
    const encoded = escapeXml(JSON.stringify(mergeMasterThemePayload(existing, logo)));
    if (THEME_ATTR_RE.test(raw)) {
      raw = raw.replace(THEME_ATTR_RE, `vno:master-theme="${encoded}"`);
    } else {
      raw = `${raw.trimEnd()} vno:master-theme="${encoded}"`;
    }
    if (raw.length && !raw.startsWith(" ")) raw = ` ${raw}`;
    return selfClose ? `<style:master-page${raw}/>` : `<style:master-page${raw}>`;
  });
  if (index === 0) {
    throw new Error("FODP thiếu style:master-page — không gắn logo master");
  }
  return ensureVnoXmlns(next);
}

/**
 * Phase 2b-open overlay: LibreOffice PPTX→FODP drops vno:master-theme, so
 * stamp it from the original slideMaster p:sp named VNOfficeMasterLogo.
 *
 * @param {string} fodpXml soffice PPTX→FODP output
 * @param {string|string[]} [masterXml] ppt/slideMasters/slideMaster*.xml from the original PPTX
 * @returns {string}
 */
export function overlayFodpMasterLogo(fodpXml, masterXml) {
  const xml = String(fodpXml || "");
  const logo = parseMasterLogoFromSlideMasters(masterXml);
  if (!logo) return xml;
  return applyFodpMasterThemeAttrs(xml, logo);
}

/**
 * Insert or replace a non-placeholder p:sp carrying the master logo text.
 * @param {string} masterXml
 * @param {{
 *   logoText?: string,
 *   accentColor?: string,
 *   fontFamily?: string,
 *   slideCx?: number,
 *   slideCy?: number
 * }} [options]
 * @returns {string}
 */
export function applyMasterLogoShape(masterXml, options = {}) {
  const xml = String(masterXml || "");
  const logoText = normalizeLogoText(options.logoText);
  if (!xml || !logoText) return xml;
  const placeholders = parsePlaceholderBoxes(xml);
  const box = chooseMasterLogoBox(
    { cx: options.slideCx, cy: options.slideCy },
    placeholders
  );
  const existing = findNamedShape(xml);
  const shapeId = existing
    ? Number(existing.match(/<(?:[\w]+:)?cNvPr\b[^>]*\bid=["'](\d+)["']/i)?.[1] || 0) || nextCnvPrId(xml)
    : nextCnvPrId(xml);
  const shapeXml = buildLogoShapeXml(xml, {
    logoText,
    accentColor: options.accentColor,
    fontFamily: options.fontFamily,
    box,
    shapeId
  });
  if (existing) {
    return xml.replace(existing, shapeXml);
  }
  if (!SP_TREE_CLOSE_RE.test(xml)) return xml;
  return xml.replace(SP_TREE_CLOSE_RE, (close) => `${shapeXml}${close}`);
}

export function masterHasLogoShape(masterXml, logoText) {
  const xml = String(masterXml || "");
  if (!xml.includes(MASTER_LOGO_SHAPE_NAME) && !xml.includes(LOGO_NAME_ATTR)) {
    if (!logoText) return false;
  }
  const named = findNamedShape(xml);
  if (!named) return false;
  if (/<(?:[\w]+:)?ph\b/i.test(named)) return false;
  if (logoText) {
    return named.includes(escapeXml(normalizeLogoText(logoText))) || named.includes(normalizeLogoText(logoText));
  }
  return true;
}

export function shapeHasPlaceholder(shapeXml) {
  return /<(?:[\w]+:)?ph\b/i.test(String(shapeXml || ""));
}
