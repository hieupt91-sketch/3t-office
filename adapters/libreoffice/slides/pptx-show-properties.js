/**
 * Pure XML helpers for native PPTX Set Up Slide Show (p:showPr).
 *
 * ECMA-376 CT_ShowProperties lives on p:presentationPr in
 * ppt/presProps.xml — NOT ppt/presentation.xml (probe Phase 3b).
 *
 * LibreOffice FODP→PPTX already writes:
 *   <p:showPr loop="1" showNarration="1"></p:showPr>
 * when FODP has presentation:endless, and always showNarration="1".
 * It never maps vno:without-narration → showNarration="0"
 * and never emits p:penClr from vno:pointer-color.
 *
 * This module patches those two standard slots after soffice convert.
 * It does not invent kiosk/present/browse or sldRg (VN UI does not store them).
 * It does not put a custom namespace in the PPTX.
 *
 * File → Mở overlay (this module): LibreOffice PPTX→FODP keeps
 * presentation:endless (loop) but drops vno:without-narration /
 * vno:pointer-color, so parseFodp() returns the dialog defaults.
 * Overlay reads p:showPr from the original PPTX ZIP and stamps the two
 * vno:* flags before parseFodp. It does NOT overlay @loop.
 *
 * Browser-safe: no Node APIs. SlidesAdapter may import this file.
 */

import { ensureVnoXmlns } from "./pptx-section-list.js";

export const PPTX_PRESPROPS_ENTRY = "ppt/presProps.xml";
export const PRESENTATION_NS = "http://schemas.openxmlformats.org/presentationml/2006/main";
export const DRAWINGML_NS = "http://schemas.openxmlformats.org/drawingml/2006/main";
export const DEFAULT_POINTER_COLOR = "#DC2626";

const SETTINGS_OPEN_RE = /<presentation:settings\b([^>]*)\/?>/i;
const SETTINGS_TAG_RE = /<presentation:settings\b([^>]*?)(\/?)\s*>/i;
const WITHOUT_ATTR_RE = /\bvno:without-narration\s*=\s*["'][^"']*["']/i;
const OFFICE_PRESENTATION_CLOSE_RE = /<\/office:presentation\s*>/i;
const PRESPROPS_CLOSE_RE = /<\/(?:[\w]+:)?presentationPr\s*>/i;
const PRESPROPS_OPEN_RE = /<((?:[\w]+:)?presentationPr)\b([^>]*)>/i;
const SHOW_PR_RE = /<(?:[\w]+:)?showPr\b([^>]*?)(\/>|>([\s\S]*?)<\/(?:[\w]+:)?showPr\s*>)/i;
const PEN_CLR_RE = /<(?:[\w]+:)?penClr\b[\s\S]*?<\/(?:[\w]+:)?penClr\s*>/i;
const EXTLST_INNER_RE = /<(?:[\w]+:)?extLst\b/i;
const SLD_RG_RE = /<(?:[\w]+:)?sldRg\b([^>]*)\/?\s*>/i;
const SRGB_RE = /<(?:[\w]+:)?srgbClr\b[^>]*\bval\s*=\s*["']([^"']+)["']/i;
const POINTER_ATTR_RE = /\bvno:pointer-color\s*=\s*["']([^"']*)["']/i;
const HEX6_RE = /^[0-9A-Fa-f]{6}$/;

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

function nsPrefix(xml, uri, fallback) {
  const escaped = uri.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = String(xml || "").match(new RegExp(`xmlns:([\\w]+)=["']${escaped}["']`));
  return match ? match[1] : fallback;
}

function qualify(prefix, local) {
  return prefix ? `${prefix}:${local}` : local;
}

function setAttr(attrs, name, value) {
  const raw = String(attrs || "");
  const re = new RegExp(`\\b${name}\\s*=\\s*(['"])[^'"]*\\1`, "i");
  if (re.test(raw)) return raw.replace(re, `${name}="${value}"`);
  const trimmed = raw.trimEnd();
  return trimmed ? `${trimmed} ${name}="${value}"` : ` ${name}="${value}"`;
}

function getAttr(attrs, name) {
  const match = String(attrs || "").match(new RegExp(`\\b${name}\\s*=\\s*(['"])([^'"]*)\\1`, "i"));
  return match ? match[2] : "";
}

function attrTrue(value) {
  const v = String(value || "").trim().toLowerCase();
  return v === "1" || v === "true";
}

/**
 * @param {string} color
 * @returns {string} RRGGBB uppercase, no hash
 */
export function normalizePenRgb(color) {
  const raw = unescapeXml(String(color || "")).trim();
  if (!raw) return "";
  const hex = raw.replace(/^#/, "").toUpperCase();
  if (!HEX6_RE.test(hex)) {
    throw new Error(`Màu bút không phải hex 6 chữ: ${raw}`);
  }
  return hex;
}

export function parseShowSettingsFromFodp(fodpXml) {
  const match = String(fodpXml || "").match(SETTINGS_OPEN_RE);
  if (!match) {
    return { loopUntilEsc: false, showWithoutNarration: false, pointerColor: "" };
  }
  const attrs = match[1] || "";
  const pointerMatch = attrs.match(POINTER_ATTR_RE);
  return {
    loopUntilEsc: /presentation:endless\s*=\s*["']true["']/i.test(attrs),
    showWithoutNarration: /vno:without-narration\s*=\s*["']true["']/i.test(attrs),
    pointerColor: pointerMatch ? unescapeXml(pointerMatch[1]).trim() : ""
  };
}

export function fodpHasShowSetupPatch(fodpXml) {
  const settings = parseShowSettingsFromFodp(fodpXml);
  return !!(settings.showWithoutNarration || settings.pointerColor);
}

export function parseShowProperties(presPropsXml) {
  const xml = String(presPropsXml || "");
  const match = xml.match(SHOW_PR_RE);
  if (!match) {
    return {
      loop: null,
      showNarration: null,
      penRgb: "",
      hasSldRg: false,
      sldRg: null
    };
  }
  const attrs = match[1] || "";
  const inner = match[2] === "/>" ? "" : (match[3] || "");
  const loopRaw = getAttr(attrs, "loop");
  const narrationRaw = getAttr(attrs, "showNarration");
  const sldRg = inner.match(SLD_RG_RE);
  const st = sldRg ? getAttr(sldRg[1] || "", "st") : "";
  const end = sldRg ? getAttr(sldRg[1] || "", "end") : "";
  const pen = inner.match(PEN_CLR_RE)?.[0] || "";
  const rgb = pen.match(SRGB_RE)?.[1] || "";
  return {
    loop: loopRaw === "" ? null : attrTrue(loopRaw),
    showNarration: narrationRaw === "" ? null : attrTrue(narrationRaw),
    penRgb: String(rgb).toUpperCase(),
    hasSldRg: !!sldRg,
    sldRg: sldRg ? { st, end } : null
  };
}

function ensureDrawingMlNs(xml, prefix) {
  const pfx = prefix || "a";
  const decl = new RegExp(`xmlns:${pfx}\\s*=`, "i");
  if (decl.test(xml)) return xml;
  const open = xml.match(PRESPROPS_OPEN_RE);
  if (!open) return xml;
  const name = open[1];
  const attrs = open[2] || "";
  const next = `<${name}${attrs} xmlns:${pfx}="${DRAWINGML_NS}">`;
  return xml.slice(0, open.index) + next + xml.slice(open.index + open[0].length);
}

function buildPenClr(xml, rgb) {
  const p = nsPrefix(xml, PRESENTATION_NS, "p");
  const a = nsPrefix(xml, DRAWINGML_NS, "a");
  return `<${qualify(p, "penClr")}><${qualify(a, "srgbClr")} val="${rgb}"/></${qualify(p, "penClr")}>`;
}

function mergeInner(inner, penXml) {
  let body = String(inner || "");
  if (PEN_CLR_RE.test(body)) {
    return body.replace(PEN_CLR_RE, penXml);
  }
  const ext = body.search(EXTLST_INNER_RE);
  if (ext >= 0) {
    return `${body.slice(0, ext)}${penXml}${body.slice(ext)}`;
  }
  return `${body}${penXml}`;
}

function buildShowPr(xml, attrs, inner) {
  const p = nsPrefix(xml, PRESENTATION_NS, "p");
  const name = qualify(p, "showPr");
  const attrText = attrs && !/^\s/.test(attrs) ? ` ${attrs.trim()}` : attrs;
  if (!inner) return `<${name}${attrText}></${name}>`;
  return `<${name}${attrText}>${inner}</${name}>`;
}

/**
 * Patch p:showPr on ppt/presProps.xml.
 * @param {string} presPropsXml
 * @param {{ showWithoutNarration?: boolean, pointerColor?: string, loopUntilEsc?: boolean }} settings
 */
export function applyShowProperties(presPropsXml, settings = {}) {
  let xml = String(presPropsXml || "");
  if (!xml) return xml;
  const withoutNarration = !!settings.showWithoutNarration;
  const pointerRgb = settings.pointerColor ? normalizePenRgb(settings.pointerColor) : "";
  if (!withoutNarration && !pointerRgb) return xml;

  xml = ensureDrawingMlNs(xml, nsPrefix(xml, DRAWINGML_NS, "a"));
  const match = xml.match(SHOW_PR_RE);
  let attrs = match ? (match[1] || "") : "";
  let inner = match && match[2] !== "/>" ? (match[3] || "") : "";

  if (withoutNarration) {
    attrs = setAttr(attrs, "showNarration", "0");
  }
  if (settings.loopUntilEsc && !getAttr(attrs, "loop")) {
    attrs = setAttr(attrs, "loop", "1");
  }
  if (pointerRgb) {
    inner = mergeInner(inner, buildPenClr(xml, pointerRgb));
  }
  const nextTag = buildShowPr(xml, attrs, inner);
  if (match) {
    return xml.slice(0, match.index) + nextTag + xml.slice(match.index + match[0].length);
  }
  if (!PRESPROPS_CLOSE_RE.test(xml)) return xml;
  return xml.replace(PRESPROPS_CLOSE_RE, (close) => `${nextTag}${close}`);
}

export function applyShowPropertiesFromFodp(presPropsXml, fodpXml) {
  const settings = parseShowSettingsFromFodp(fodpXml);
  if (!fodpHasShowSetupPatch(fodpXml)) return presPropsXml;
  return applyShowProperties(presPropsXml, settings);
}

/**
 * Map original p:showPr → the two vno:* flags File → Mở needs.
 * Invalid / missing values become no-op fields — never invent defaults.
 * Does not read @loop (LibreOffice already maps presentation:endless).
 */
export function overlayShowSettingsFromPresProps(presPropsXml) {
  const xml = String(presPropsXml || "");
  const match = xml.match(SHOW_PR_RE);
  if (!match) return { showWithoutNarration: false, pointerColor: "" };
  const attrs = match[1] || "";
  const inner = match[2] === "/>" ? "" : (match[3] || "");
  const narrationRaw = String(getAttr(attrs, "showNarration") || "").trim();
  const showWithoutNarration = /^(0|false)$/i.test(narrationRaw);
  const pen = inner.match(PEN_CLR_RE)?.[0] || "";
  const rgb = String(pen.match(SRGB_RE)?.[1] || "")
    .trim()
    .replace(/^#/, "");
  const pointerColor = HEX6_RE.test(rgb) ? `#${rgb.toLowerCase()}` : "";
  return { showWithoutNarration, pointerColor };
}

/**
 * Stamp vno:without-narration / vno:pointer-color onto presentation:settings.
 * Keeps presentation:endless / pause / mouse-visible LibreOffice already wrote.
 * Throws if FODP has no office:presentation — never invent a presentation body.
 */
export function applyFodpShowSettingsAttrs(fodpXml, settings = {}) {
  const xml = String(fodpXml || "");
  const without = !!settings.showWithoutNarration;
  const pointer = String(settings.pointerColor || "").trim();
  if (!without && !pointer) return xml;

  const match = xml.match(SETTINGS_TAG_RE);
  if (match) {
    let raw = match[1] || "";
    const selfClose = match[2] === "/" || /\/\s*$/.test(raw);
    if (selfClose) raw = raw.replace(/\/\s*$/, "");
    if (without) {
      if (WITHOUT_ATTR_RE.test(raw)) {
        raw = raw.replace(WITHOUT_ATTR_RE, 'vno:without-narration="true"');
      } else {
        raw = `${raw.trimEnd()} vno:without-narration="true"`;
      }
    }
    if (pointer) {
      const encoded = escapeXml(pointer);
      if (POINTER_ATTR_RE.test(raw)) {
        raw = raw.replace(POINTER_ATTR_RE, `vno:pointer-color="${encoded}"`);
      } else {
        raw = `${raw.trimEnd()} vno:pointer-color="${encoded}"`;
      }
    }
    if (raw.length && !raw.startsWith(" ")) raw = ` ${raw}`;
    const nextTag = selfClose
      ? `<presentation:settings${raw}/>`
      : `<presentation:settings${raw}>`;
    const next = xml.slice(0, match.index) + nextTag + xml.slice(match.index + match[0].length);
    return ensureVnoXmlns(next);
  }

  if (!OFFICE_PRESENTATION_CLOSE_RE.test(xml)) {
    throw new Error("FODP thiếu office:presentation — không gắn Thiết lập trình chiếu");
  }
  const attrs = [];
  if (without) attrs.push('vno:without-narration="true"');
  if (pointer) attrs.push(`vno:pointer-color="${escapeXml(pointer)}"`);
  const tag = `\n      <presentation:settings ${attrs.join(" ")}/>`;
  return ensureVnoXmlns(xml.replace(OFFICE_PRESENTATION_CLOSE_RE, (close) => `${tag}${close}`));
}

/**
 * Phase 3b-open overlay: LibreOffice PPTX→FODP drops vno:without-narration /
 * vno:pointer-color, so stamp them from the original ppt/presProps.xml p:showPr.
 * No p:showPr or invalid values → no-op. Does not overlay @loop.
 *
 * @param {string} fodpXml soffice PPTX→FODP output
 * @param {string} [presPropsXml] ppt/presProps.xml from the original PPTX
 * @returns {string}
 */
export function overlayFodpShowProperties(fodpXml, presPropsXml) {
  const xml = String(fodpXml || "");
  const settings = overlayShowSettingsFromPresProps(presPropsXml);
  if (!settings.showWithoutNarration && !settings.pointerColor) return xml;
  return applyFodpShowSettingsAttrs(xml, settings);
}
