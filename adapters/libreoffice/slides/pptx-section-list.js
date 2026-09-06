/**
 * Pure XML helpers for native PPTX Slide Sections (p14:sectionLst).
 *
 * PowerPoint 2010+ stores named slide groups as a Microsoft extension
 * (not ISO-strict OOXML) in ppt/presentation.xml:
 *
 *   p:extLst / p:ext uri="{521415D9-36F7-43E2-AB2F-B90AF26B5E84}"
 *     / p14:sectionLst / p14:section / p14:sldIdLst / p14:sldId
 *
 * Namespace: http://schemas.microsoft.com/office/powerpoint/2010/main
 * p14:sldId/@id is the REAL p:sldIdLst/p:sldId/@id (256, 257, …), never guessed.
 *
 * LibreOffice FODP→PPTX keeps vno:section-* off the ZIP (probe: no p:extLst
 * at all) even though it already declares xmlns:p14 on <p:presentation>.
 * This module inserts the standard extension after soffice convert.
 * No custom namespace in the PPTX.
 *
 * Browser-safe: no Node APIs. SlidesAdapter may import this file.
 */

export const PPTX_PRESENTATION_ENTRY = "ppt/presentation.xml";
export const P14_NS = "http://schemas.microsoft.com/office/powerpoint/2010/main";
export const PRESENTATION_NS = "http://schemas.openxmlformats.org/presentationml/2006/main";
export const SECTION_LIST_URI = "{521415D9-36F7-43E2-AB2F-B90AF26B5E84}";
export const DEFAULT_SECTION_NAME = "Default Section";
export const SECTION_GUID_NAME_PREFIX = "urn:vn-office:slides:section:";

const PAGE_OPEN_RE = /<draw:page(?![-a-zA-Z])([^>]*)>/gi;
const SECTION_ID_ATTR_RE = /\bvno:section-id\s*=\s*["']([^"']*)["']/i;
const SECTION_NAME_ATTR_RE = /\bvno:section-name\s*=\s*["']([^"']*)["']/i;
const PRESENTATION_CLOSE_RE = /<\/(?:[\w]+:)?presentation\s*>/i;
const EXTLST_RE = /<(?:[\w]+:)?extLst\b([^>]*)(?:\/>|>([\s\S]*?)<\/(?:[\w]+:)?extLst\s*>)/i;
const SECTION_EXT_RE = /<(?:[\w]+:)?ext\b[^>]*\buri\s*=\s*["']\{?521415D9-36F7-43E2-AB2F-B90AF26B5E84\}?["'][^>]*>[\s\S]*?<\/(?:[\w]+:)?ext\s*>/i;
const SLD_SZ_OR_LATER_RE = /<(?:[\w]+:)?(?:sldSz|notesSz|embeddedFontLst|custShowLst|defaultTextStyle|extLst)\b/i;
const SLD_ID_LST_RE = /<(?:[\w]+:)?sldIdLst\b[^>]*>([\s\S]*?)<\/(?:[\w]+:)?sldIdLst>/i;
const SLD_ID_RE = /<(?:[\w]+:)?sldId\b([^>]*)\/?\s*>/gi;
const SECTION_BLOCK_RE = /<(?:[\w]+:)?section\b([^>]*)>([\s\S]*?)<\/(?:[\w]+:)?section\s*>/gi;
const P14_SLD_ID_RE = /<(?:[\w]+:)?sldId\b([^>]*)\/?\s*>/gi;

const UUID_URL_NAMESPACE = Uint8Array.from([
  0x6b, 0xa7, 0xb8, 0x11, 0x9d, 0xad, 0x11, 0xd1, 0x80, 0xb4, 0x00, 0xc0, 0x4f, 0xd4, 0x30, 0xc8
]);

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

function utf8Bytes(text) {
  const input = String(text || "");
  const out = [];
  for (let index = 0; index < input.length; index++) {
    let code = input.charCodeAt(index);
    if (code >= 0xd800 && code <= 0xdbff && index + 1 < input.length) {
      const next = input.charCodeAt(index + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        code = 0x10000 + ((code & 0x3ff) << 10) + (next & 0x3ff);
        index++;
      }
    }
    if (code < 0x80) out.push(code);
    else if (code < 0x800) out.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
    else if (code < 0x10000) {
      out.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
    } else {
      out.push(
        0xf0 | (code >> 18),
        0x80 | ((code >> 12) & 0x3f),
        0x80 | ((code >> 6) & 0x3f),
        0x80 | (code & 0x3f)
      );
    }
  }
  return Uint8Array.from(out);
}

function sha1(messageBytes) {
  const bytes = messageBytes instanceof Uint8Array ? messageBytes : Uint8Array.from(messageBytes);
  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;
  let h4 = 0xc3d2e1f0;
  const ml = bytes.length;
  const paddedLen = ((ml + 1 + 8 + 63) & ~63);
  const padded = new Uint8Array(paddedLen);
  padded.set(bytes);
  padded[ml] = 0x80;
  const view = new DataView(padded.buffer);
  const bitHi = Math.floor(ml / 0x20000000);
  const bitLo = (ml * 8) >>> 0;
  view.setUint32(paddedLen - 8, bitHi);
  view.setUint32(paddedLen - 4, bitLo);
  const words = new Uint32Array(80);
  for (let offset = 0; offset < paddedLen; offset += 64) {
    for (let i = 0; i < 16; i++) words[i] = view.getUint32(offset + i * 4);
    for (let i = 16; i < 80; i++) {
      const x = words[i - 3] ^ words[i - 8] ^ words[i - 14] ^ words[i - 16];
      words[i] = ((x << 1) | (x >>> 31)) >>> 0;
    }
    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    for (let i = 0; i < 80; i++) {
      let f;
      let k;
      if (i < 20) {
        f = (b & c) | (~b & d);
        k = 0x5a827999;
      } else if (i < 40) {
        f = b ^ c ^ d;
        k = 0x6ed9eba1;
      } else if (i < 60) {
        f = (b & c) | (b & d) | (c & d);
        k = 0x8f1bbcdc;
      } else {
        f = b ^ c ^ d;
        k = 0xca62c1d6;
      }
      const temp = (((a << 5) | (a >>> 27)) + f + e + k + words[i]) >>> 0;
      e = d;
      d = c;
      c = ((b << 30) | (b >>> 2)) >>> 0;
      b = a;
      a = temp;
    }
    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
  }
  const out = new Uint8Array(20);
  const outView = new DataView(out.buffer);
  outView.setUint32(0, h0);
  outView.setUint32(4, h1);
  outView.setUint32(8, h2);
  outView.setUint32(12, h3);
  outView.setUint32(16, h4);
  return out;
}

function toHex(bytes, start, end) {
  let hex = "";
  for (let i = start; i < end; i++) hex += bytes[i].toString(16).padStart(2, "0");
  return hex;
}

/**
 * UUID v5 (RFC 4122) matching Python uuid.uuid5(uuid.NAMESPACE_URL, name).
 * PowerPoint section @id is a braced GUID.
 */
export function sectionGuidFromId(sectionId) {
  const name = `${SECTION_GUID_NAME_PREFIX}${String(sectionId || "")}`;
  const nameBytes = utf8Bytes(name);
  const joined = new Uint8Array(UUID_URL_NAMESPACE.length + nameBytes.length);
  joined.set(UUID_URL_NAMESPACE);
  joined.set(nameBytes, UUID_URL_NAMESPACE.length);
  const hash = sha1(joined);
  hash[6] = (hash[6] & 0x0f) | 0x50;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const hex = toHex(hash, 0, 16).toUpperCase();
  return `{${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}}`;
}

export function parseFodpPages(fodpXml) {
  const pages = [];
  const xml = String(fodpXml || "");
  PAGE_OPEN_RE.lastIndex = 0;
  let match;
  while ((match = PAGE_OPEN_RE.exec(xml))) {
    const attrs = match[1] || "";
    pages.push({
      sectionId: unescapeXml(attrs.match(SECTION_ID_ATTR_RE)?.[1] || "").trim(),
      sectionName: unescapeXml(attrs.match(SECTION_NAME_ATTR_RE)?.[1] || "").trim()
    });
  }
  return pages;
}

export function fodpHasSections(fodpXml) {
  return parseFodpPages(fodpXml).some((page) => page.sectionId);
}

/**
 * Consecutive draw:page groups. Unsectioned gaps become Default Section only
 * when the deck has at least one named vno:section-id (PowerPoint requires
 * every slide to belong to a section once sectionLst exists).
 * @returns {{ id: string, name: string, pageIndexes: number[] }[]}
 */
export function parseSectionsFromFodp(fodpXml) {
  const pages = parseFodpPages(fodpXml);
  if (!pages.some((page) => page.sectionId)) return [];
  const groups = [];
  const usedIds = new Set();
  for (let index = 0; index < pages.length; index++) {
    const page = pages[index];
    const key = page.sectionId || "";
    const last = groups[groups.length - 1];
    if (last && last._key === key) {
      last.pageIndexes.push(index);
      continue;
    }
    let id = key || `__default__:${groups.length}`;
    if (usedIds.has(id)) {
      let n = 2;
      while (usedIds.has(`${key}#${n}`)) n++;
      id = `${key}#${n}`;
    }
    usedIds.add(id);
    groups.push({
      id,
      _key: key,
      name: key ? page.sectionName || "Phần không tên" : DEFAULT_SECTION_NAME,
      pageIndexes: [index]
    });
  }
  return groups.map(({ id, name, pageIndexes }) => ({ id, name, pageIndexes }));
}

/**
 * Slide ids from p:sldIdLst only (cut before sldSz / extLst so p14:sldIdLst
 * added by a previous patch is never read as the presentation order).
 */
export function parsePresentationSlideIds(presentationXml) {
  const xml = String(presentationXml || "");
  const cut = xml.search(SLD_SZ_OR_LATER_RE);
  const head = cut >= 0 ? xml.slice(0, cut) : xml;
  const lst = head.match(SLD_ID_LST_RE);
  if (!lst) return [];
  const ids = [];
  SLD_ID_RE.lastIndex = 0;
  let match;
  while ((match = SLD_ID_RE.exec(lst[1]))) {
    const id = (match[1] || "").match(/\bid\s*=\s*["']([^"']+)["']/i)?.[1];
    if (id) ids.push(id);
  }
  return ids;
}

export function presentationHasSectionList(presentationXml) {
  const xml = String(presentationXml || "");
  return /<(?:[\w]+:)?sectionLst\b/i.test(xml) && /521415D9-36F7-43E2-AB2F-B90AF26B5E84/i.test(xml);
}

export function parseSectionList(presentationXml) {
  const xml = String(presentationXml || "");
  const sections = [];
  SECTION_BLOCK_RE.lastIndex = 0;
  let match;
  while ((match = SECTION_BLOCK_RE.exec(xml))) {
    const attrs = match[1] || "";
    const body = match[2] || "";
    const name = unescapeXml(attrs.match(/\bname\s*=\s*["']([^"']*)["']/i)?.[1] || "");
    const id = unescapeXml(attrs.match(/\bid\s*=\s*["']([^"']*)["']/i)?.[1] || "");
    const slideIds = [];
    P14_SLD_ID_RE.lastIndex = 0;
    let sld;
    while ((sld = P14_SLD_ID_RE.exec(body))) {
      const slideId = (sld[1] || "").match(/\bid\s*=\s*["']([^"']+)["']/i)?.[1];
      if (slideId) slideIds.push(slideId);
    }
    if (name || slideIds.length) sections.push({ name, id, slideIds });
  }
  return sections;
}

function qualify(prefix, local) {
  return prefix ? `${prefix}:${local}` : local;
}

function buildSectionExtXml(presentationXml, sections) {
  const p = nsPrefix(presentationXml, PRESENTATION_NS, "p");
  const p14 = nsPrefix(presentationXml, P14_NS, "p14");
  const sectionXml = sections
    .map((section) => {
      const name = escapeXml(section.name || "");
      const guid = section.guid || sectionGuidFromId(section.sourceId || section.name || "");
      const ids = (section.slideIds || [])
        .map((id) => `<${qualify(p14, "sldId")} id="${escapeXml(String(id))}"/>`)
        .join("");
      return (
        `<${qualify(p14, "section")} name="${name}" id="${guid}">` +
        `<${qualify(p14, "sldIdLst")}>${ids}</${qualify(p14, "sldIdLst")}>` +
        `</${qualify(p14, "section")}>`
      );
    })
    .join("");
  return (
    `<${qualify(p, "ext")} uri="${SECTION_LIST_URI}">` +
    `<${qualify(p14, "sectionLst")} xmlns:${p14}="${P14_NS}">${sectionXml}</${qualify(p14, "sectionLst")}>` +
    `</${qualify(p, "ext")}>`
  );
}

function wrapExtLst(presentationXml, extXml) {
  const p = nsPrefix(presentationXml, PRESENTATION_NS, "p");
  return `<${qualify(p, "extLst")}>${extXml}</${qualify(p, "extLst")}>`;
}

/**
 * Insert or replace p:extLst/p14:sectionLst. `sections` is
 * [{ name, sourceId, slideIds: string[], guid? }].
 */
export function applySectionList(presentationXml, sections) {
  const xml = String(presentationXml || "");
  const list = (Array.isArray(sections) ? sections : []).filter(
    (section) => section && Array.isArray(section.slideIds) && section.slideIds.length
  );
  if (!xml || !list.length) return xml;
  const extXml = buildSectionExtXml(xml, list);
  if (SECTION_EXT_RE.test(xml)) {
    return xml.replace(SECTION_EXT_RE, extXml);
  }
  const extLst = xml.match(EXTLST_RE);
  if (extLst) {
    const inner = extLst[2] || "";
    const nextInner = `${inner}${extXml}`;
    const replacement = wrapExtLst(xml, nextInner);
    return xml.replace(EXTLST_RE, replacement);
  }
  if (!PRESENTATION_CLOSE_RE.test(xml)) return xml;
  return xml.replace(PRESENTATION_CLOSE_RE, (close) => `${wrapExtLst(xml, extXml)}${close}`);
}

export function applySectionListFromFodp(presentationXml, fodpXml) {
  const groups = parseSectionsFromFodp(fodpXml);
  if (!groups.length) return presentationXml;
  const slideIds = parsePresentationSlideIds(presentationXml);
  const pageCount = parseFodpPages(fodpXml).length;
  if (slideIds.length !== pageCount) {
    throw new Error(
      `PPTX sldIdLst (${slideIds.length}) không khớp số draw:page FODP (${pageCount}) — không đoán id`
    );
  }
  const sections = groups.map((group) => ({
    name: group.name,
    sourceId: group.id,
    slideIds: group.pageIndexes.map((index) => slideIds[index])
  }));
  return applySectionList(presentationXml, sections);
}
