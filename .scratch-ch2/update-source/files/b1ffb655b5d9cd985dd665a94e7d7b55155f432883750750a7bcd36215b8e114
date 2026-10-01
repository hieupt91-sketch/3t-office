/**
 * Node-only: patch a real PPTX (ZIP) after soffice FODP→PPTX convert.
 *
 * Do not import from SlidesAdapter (browser / pywebview). Tests call this
 * after `convertWithSoffice`. Production File → Lưu uses the Python twin
 * hooked in main.py (`ooxml_zip_patch.py`).
 *
 * ZIP read/write goes through adapters/libreoffice/common/ooxml-zip-patch.js
 * — do not reimplement the package format here.
 *
 * Patches (independent, same ZIP rewrite):
 *   1. Slide Master logo p:sp (Phase 2b)
 *   2. p14:sectionLst from vno:section-* (Phase 3a / p14)
 *   3. p:showPr on ppt/presProps.xml (Phase 3b Set Up Show)
 */
import fs from "node:fs";
import { listZipEntries, patchOoxmlZip, readZipEntry } from "../common/ooxml-zip-patch.js";
import {
  PPTX_PRESENTATION_ENTRY,
  SLIDE_MASTER_ENTRY_RE,
  applyIntendedSlideSize,
  applyMasterLogoShape,
  fodpHasMasterLogo,
  overlayFodpMasterLogo,
  parseIntendedSlideSizeFromFodp,
  parseMasterLogoFromFodp,
  parseSlideSize,
  parseSlideSizeType
} from "./pptx-master-logo.js";
import {
  applySectionList,
  applySectionListFromFodp,
  fodpHasSections,
  overlayFodpSections
} from "./pptx-section-list.js";
import {
  PPTX_PRESPROPS_ENTRY,
  applyShowProperties,
  applyShowPropertiesFromFodp,
  fodpHasShowSetupPatch,
  overlayFodpShowProperties
} from "./pptx-show-properties.js";

function asBuffer(zipPathOrBuffer) {
  return Buffer.isBuffer(zipPathOrBuffer) ? zipPathOrBuffer : fs.readFileSync(zipPathOrBuffer);
}

function resolveLogoOptions(options = {}) {
  if (options.logoText != null && String(options.logoText).trim()) {
    return {
      logoText: String(options.logoText),
      accentColor: options.accentColor || "",
      fontFamily: options.fontFamily || ""
    };
  }
  if (options.sourceFodp) return parseMasterLogoFromFodp(options.sourceFodp);
  if (typeof options.enabled === "boolean" && !options.enabled) {
    return { logoText: "", accentColor: "", fontFamily: "" };
  }
  return parseMasterLogoFromFodp(options.sourceFodp);
}

function wantsLogo(logo, options = {}) {
  if (!logo.logoText) return false;
  if (options.sourceFodp && !fodpHasMasterLogo(options.sourceFodp) && options.logoText == null) {
    return false;
  }
  return true;
}

function wantsSections(options = {}) {
  if (Array.isArray(options.sections)) return options.sections.length > 0;
  return fodpHasSections(options.sourceFodp);
}

function wantsShowSetup(options = {}) {
  if (options.showWithoutNarration || options.pointerColor) return true;
  return fodpHasShowSetupPatch(options.sourceFodp);
}

/**
 * @param {string|Buffer} pptxPathOrBuffer
 * @param {{
 *   sourceFodp?: string,
 *   logoText?: string,
 *   accentColor?: string,
 *   fontFamily?: string,
 *   enabled?: boolean,
 *   sections?: { name: string, sourceId?: string, slideIds: string[] }[],
 *   showWithoutNarration?: boolean,
 *   pointerColor?: string
 * }} [options]
 * @returns {Buffer} original bytes when no patch is needed
 */
export function postProcessSlidesPptx(pptxPathOrBuffer, options = {}) {
  const source = asBuffer(pptxPathOrBuffer);
  if (options.enabled === false) return source;
  const logo = resolveLogoOptions(options);
  const applyLogo = wantsLogo(logo, options);
  const applySections = wantsSections(options);
  const applyShow = wantsShowSetup(options);

  const presentation = readZipEntry(source, PPTX_PRESENTATION_ENTRY);
  const originalPresentationXml = presentation ? presentation.toString("utf8") : "";
  let presentationXml = originalPresentationXml;
  const replacements = {};

  // soffice --convert-to pptx BỎ QUA style:page-layout-properties của FODP khi
  // xuất PPTX, luôn tự ghi <p:sldSz> mặc định 28cm x 15.75cm bất kể canvas.slideSize
  // thật của người dùng - đo thực tế bằng vòng chuyển đổi thật, xác nhận đây là
  // giới hạn của bản thân soffice, không phải lỗi FODP do 3T Office ghi ra. Khôi
  // phục lại khổ trang THẬT ở đây, độc lập với logo/sections/show (luôn áp dụng
  // nếu phát hiện khác biệt thật, không chỉ khi các tính năng khác cũng cần sửa).
  const intendedSize = options.sourceFodp ? parseIntendedSlideSizeFromFodp(options.sourceFodp) : null;
  const realSize = parseSlideSize(presentationXml);
  // Khổ ghi bằng pt (có "type") phải khớp TỪNG EMU và đúng type như PowerPoint (G8 D5).
  const exact = Boolean(intendedSize && Object.prototype.hasOwnProperty.call(intendedSize, "type"));
  const tolerance = exact ? 0 : 500;
  const applySlideSize = Boolean(
    intendedSize && (
      Math.abs(intendedSize.cx - realSize.cx) > tolerance
      || Math.abs(intendedSize.cy - realSize.cy) > tolerance
      || (exact && intendedSize.type !== parseSlideSizeType(presentationXml))
    )
  );
  const effectiveSize = applySlideSize ? intendedSize : realSize;

  if (!applyLogo && !applySections && !applyShow && !applySlideSize) return source;

  if (applySlideSize && presentationXml) {
    presentationXml = applyIntendedSlideSize(presentationXml, intendedSize);
  }

  if (applyLogo) {
    for (const listed of listZipEntries(source)) {
      if (!SLIDE_MASTER_ENTRY_RE.test(listed.name)) continue;
      const current = readZipEntry(source, listed.name);
      if (!current) {
        throw new Error(`PPTX thiếu ${listed.name} — không thể bổ sung logo Slide Master`);
      }
      const xml = current.toString("utf8");
      const next = applyMasterLogoShape(xml, {
        logoText: logo.logoText,
        accentColor: logo.accentColor,
        fontFamily: logo.fontFamily,
        slideCx: effectiveSize.cx,
        slideCy: effectiveSize.cy
      });
      if (next !== xml) replacements[listed.name] = next;
    }
  }

  if (applySections) {
    if (!presentationXml) {
      throw new Error("PPTX thiếu ppt/presentation.xml — không thể bổ sung p14:sectionLst");
    }
    presentationXml = Array.isArray(options.sections)
      ? applySectionList(presentationXml, options.sections)
      : applySectionListFromFodp(presentationXml, options.sourceFodp);
  }

  if (presentationXml !== originalPresentationXml) replacements[PPTX_PRESENTATION_ENTRY] = presentationXml;

  if (applyShow) {
    const current = readZipEntry(source, PPTX_PRESPROPS_ENTRY);
    if (!current) {
      throw new Error("PPTX thiếu ppt/presProps.xml — không thể bổ sung p:showPr");
    }
    const propsXml = current.toString("utf8");
    const next = (options.showWithoutNarration || options.pointerColor)
      ? applyShowProperties(propsXml, {
        showWithoutNarration: !!options.showWithoutNarration,
        pointerColor: options.pointerColor || "",
        loopUntilEsc: !!options.loopUntilEsc
      })
      : applyShowPropertiesFromFodp(propsXml, options.sourceFodp);
    if (next !== propsXml) replacements[PPTX_PRESPROPS_ENTRY] = next;
  }

  if (!Object.keys(replacements).length) return source;
  return patchOoxmlZip(source, replacements);
}

/**
 * File → Mở: read OOXML from the original PPTX ZIP (via ooxml-zip-patch.js,
 * not a rewritten ZIP reader) and overlay FODP before SlidesAdapter.parseFodp().
 *
 * 1. p14:sectionLst → vno:section-* (Phase 3a-open)
 * 2. p:sp name="VNOfficeMasterLogo" → vno:master-theme (Phase 2b-open)
 * 3. p:showPr showNarration=0 / p:penClr → vno:* (Phase 3b-open; not @loop)
 *
 * @param {string|Buffer} pptxPathOrBuffer original PPTX
 * @param {string} fodpXml soffice PPTX→FODP output
 * @returns {string} FODP with native flags restored from the original ZIP
 */
export function overlaySlidesPptxFodp(pptxPathOrBuffer, fodpXml) {
  const source = asBuffer(pptxPathOrBuffer);
  let current;
  let listed;
  try {
    listed = listZipEntries(source);
    current = readZipEntry(source, PPTX_PRESENTATION_ENTRY);
  } catch (error) {
    throw new Error(
      `PPTX ZIP hỏng — không thể khôi phục thuộc tính native: ${error.message || error}`
    );
  }
  if (!current) {
    throw new Error("PPTX thiếu ppt/presentation.xml — không thể khôi phục Phần (Sections)");
  }
  let xml = overlayFodpSections(fodpXml, current.toString("utf8"));
  const masters = [];
  for (const item of listed) {
    if (!SLIDE_MASTER_ENTRY_RE.test(item.name)) continue;
    const entry = readZipEntry(source, item.name);
    if (!entry) {
      throw new Error(`PPTX thiếu ${item.name} — không đoán logo master`);
    }
    masters.push(entry.toString("utf8"));
  }
  xml = overlayFodpMasterLogo(xml, masters);
  let props;
  try {
    props = readZipEntry(source, PPTX_PRESPROPS_ENTRY);
  } catch (error) {
    throw new Error(
      `PPTX ZIP hỏng — không thể khôi phục thuộc tính native: ${error.message || error}`
    );
  }
  if (props) {
    xml = overlayFodpShowProperties(xml, props.toString("utf8"));
  }
  xml = overlayFodpImageCrops(xml, source);
  return xml;
}

export function parseSlideImageCrops(slideXml) {
  if (!slideXml) return {};
  const crops = {};
  const fmt = (v) => {
    const s = (v / 1000).toFixed(5).replace(/\.?0+$/, "");
    return s || "0";
  };
  const picRegex = /<p:pic\b[\s\S]*?<\/p:pic>/gi;
  let match;
  while ((match = picRegex.exec(slideXml)) !== null) {
    const pic = match[0];
    const nameMatch = pic.match(/<p:cNvPr\b[^>]*\bname=(?:"([^"]*)"|'([^']*)')/i);
    const srcRectMatch = pic.match(/<a:srcRect\b([^>]*)\/?>/i);
    if (nameMatch && srcRectMatch) {
      const name = nameMatch[1] !== undefined ? nameMatch[1] : (nameMatch[2] || "");
      const attrs = srcRectMatch[1] || "";
      const lMatch = attrs.match(/\bl=(?:"(-?\d+)"|'(-?\d+)')/i);
      const tMatch = attrs.match(/\bt=(?:"(-?\d+)"|'(-?\d+)')/i);
      const rMatch = attrs.match(/\br=(?:"(-?\d+)"|'(-?\d+)')/i);
      const bMatch = attrs.match(/\bb=(?:"(-?\d+)"|'(-?\d+)')/i);
      const l = lMatch ? parseInt(lMatch[1] || lMatch[2], 10) : 0;
      const t = tMatch ? parseInt(tMatch[1] || tMatch[2], 10) : 0;
      const r = rMatch ? parseInt(rMatch[1] || rMatch[2], 10) : 0;
      const b = bMatch ? parseInt(bMatch[1] || bMatch[2], 10) : 0;
      crops[name] = `${fmt(l)},${fmt(t)},${fmt(r)},${fmt(b)}`;
    }
  }
  return crops;
}

export function applyFodpImageCrops(fodpXml, cropsBySlide) {
  let xml = fodpXml || "";
  if (!cropsBySlide || !cropsBySlide.some((c) => c && Object.keys(c).length > 0)) {
    return xml;
  }
  let pageIdx = 0;
  xml = xml.replace(/<draw:page\b[\s\S]*?<\/draw:page>/gi, (pageXml) => {
    const crops = cropsBySlide[pageIdx];
    pageIdx++;
    if (!crops || Object.keys(crops).length === 0) return pageXml;
    return pageXml.replace(/<draw:frame\b([^>]*)>/gi, (fm, rawAttrs) => {
      const nameMatch = rawAttrs.match(/\bdraw:name=(?:"([^"]*)"|'([^']*)')/i);
      if (!nameMatch) return fm;
      const name = nameMatch[1] !== undefined ? nameMatch[1] : (nameMatch[2] || "");
      if (!crops[name]) return fm;
      const rect = crops[name];
      const selfClose = /\/\s*$/.test(rawAttrs);
      let cleanAttrs = selfClose ? rawAttrs.replace(/\/\s*$/, "") : rawAttrs;
      if (/\bvno:src-rect\s*=/i.test(cleanAttrs)) {
        cleanAttrs = cleanAttrs.replace(/\bvno:src-rect=(?:"[^"]*"|'[^']*')/i, `vno:src-rect="${rect}"`);
      } else {
        cleanAttrs = `${cleanAttrs.trimEnd()} vno:src-rect="${rect}"`;
      }
      if (cleanAttrs && !cleanAttrs.startsWith(" ")) cleanAttrs = " " + cleanAttrs;
      return selfClose ? `<draw:frame${cleanAttrs}/>` : `<draw:frame${cleanAttrs}>`;
    });
  });
  if (!/xmlns:vno\s*=/i.test(xml)) {
    xml = xml.replace(/<office:document\b([^>]*)>/i, `<office:document$1 xmlns:vno="urn:oasis:names:tc:opendocument:xmlns:vno:1.0">`);
  }
  return xml;
}

export function overlayFodpImageCrops(fodpXml, pptxSource) {
  const source = asBuffer(pptxSource);
  let presEntry;
  let relsEntry;
  try {
    presEntry = readZipEntry(source, PPTX_PRESENTATION_ENTRY);
    relsEntry = readZipEntry(source, "ppt/_rels/presentation.xml.rels");
  } catch (_) {
    return fodpXml || "";
  }
  if (!presEntry) return fodpXml || "";
  const presXml = presEntry.toString("utf8");
  const rels = {};
  if (relsEntry) {
    const relsXml = relsEntry.toString("utf8");
    const relRegex = /<Relationship\b([^>]*)\/?>/gi;
    let rm;
    while ((rm = relRegex.exec(relsXml)) !== null) {
      const attrs = rm[1];
      const idMatch = attrs.match(/\bId=(?:"([^"]*)"|'([^']*)')/i);
      const targetMatch = attrs.match(/\bTarget=(?:"([^"]*)"|'([^']*)')/i);
      if (idMatch && targetMatch) {
        rels[idMatch[1] || idMatch[2]] = targetMatch[1] || targetMatch[2];
      }
    }
  }
  const slidePaths = [];
  const sldLstMatch = presXml.match(/<(?:[\w]+:)?sldIdLst\b[^>]*>([\s\S]*?)<\/(?:[\w]+:)?sldIdLst>/i);
  if (sldLstMatch) {
    const sldIdRegex = /<(?:[\w]+:)?sldId\b([^>]*)\/?>/gi;
    let sm;
    while ((sm = sldIdRegex.exec(sldLstMatch[1])) !== null) {
      const ridMatch = sm[1].match(/\br:id=(?:"([^"]*)"|'([^']*)')/i);
      if (ridMatch) {
        const rid = ridMatch[1] || ridMatch[2];
        let target = rels[rid] || "";
        if (target) {
          if (!target.startsWith("ppt/")) target = "ppt/" + target.replace(/^\/+/, "");
          slidePaths.push(target);
        }
      }
    }
  }
  if (!slidePaths.length) {
    try {
      const listed = listZipEntries(source);
      const slideNames = listed
        .map((item) => item.name)
        .filter((name) => /^ppt\/slides\/slide\d+\.xml$/i.test(name))
        .sort((a, b) => {
          const numA = parseInt(a.match(/\d+/)?.[0] || "0", 10);
          const numB = parseInt(b.match(/\d+/)?.[0] || "0", 10);
          return numA - numB;
        });
      slidePaths.push(...slideNames);
    } catch (_) {}
  }
  const cropsBySlide = [];
  for (const path of slidePaths) {
    let slideEntry;
    try {
      slideEntry = readZipEntry(source, path);
    } catch (_) {}
    cropsBySlide.push(parseSlideImageCrops(slideEntry ? slideEntry.toString("utf8") : ""));
  }
  return applyFodpImageCrops(fodpXml, cropsBySlide);
}
