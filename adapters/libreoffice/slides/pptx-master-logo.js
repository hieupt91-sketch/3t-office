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
 * Browser-safe: no Node APIs. SlidesAdapter may import this file.
 */

export const MASTER_LOGO_SHAPE_NAME = "VNOfficeMasterLogo";
export const SLIDE_MASTER_ENTRY_RE = /^ppt\/slideMasters\/slideMaster\d+\.xml$/i;
export const PPTX_PRESENTATION_ENTRY = "ppt/presentation.xml";

const CM_EMU = 360000;
const DEFAULT_SLIDE_CX = 28 * CM_EMU; // FODP PM1 page-width
const DEFAULT_SLIDE_CY = Math.round(15.75 * CM_EMU);
const LOGO_NAME_ATTR = `name="${MASTER_LOGO_SHAPE_NAME}"`;

const MASTER_PAGE_OPEN_RE = /<style:master-page\b([^>]*)>/i;
const THEME_ATTR_RE = /\bvno:master-theme\s*=\s*["']([^"']*)["']/i;
const LOGO_FRAME_RE = /<draw:frame\b[^>]*grMasterLogo[\s\S]*?<text:p\b[^>]*>([\s\S]*?)<\/text:p>/i;
const SLD_SZ_RE = /<(?:[\w]+:)?sldSz\b([^>]*)\/?\s*>/i;
const CNVPR_ID_RE = /<(?:[\w]+:)?cNvPr\b[^>]*\bid=["'](\d+)["']/gi;
const SP_TREE_CLOSE_RE = /<\/(?:[\w]+:)?spTree\s*>/i;
const SP_BLOCK_RE = /<(?:[\w]+:)?sp\b[\s\S]*?<\/(?:[\w]+:)?sp>/gi;

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
  const rawTheme = unescapeXml(attrs.match(THEME_ATTR_RE)?.[1] || "");
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

function findNamedShape(masterXml) {
  const xml = String(masterXml || "");
  const blocks = xml.match(SP_BLOCK_RE) || [];
  for (const sp of blocks) {
    if (sp.includes(LOGO_NAME_ATTR) || sp.includes(`name='${MASTER_LOGO_SHAPE_NAME}'`)) return sp;
  }
  return "";
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
