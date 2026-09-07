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
  parseSlideSize
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
  // giới hạn của bản thân soffice, không phải lỗi FODP do VN Office ghi ra. Khôi
  // phục lại khổ trang THẬT ở đây, độc lập với logo/sections/show (luôn áp dụng
  // nếu phát hiện khác biệt thật, không chỉ khi các tính năng khác cũng cần sửa).
  const intendedSize = options.sourceFodp ? parseIntendedSlideSizeFromFodp(options.sourceFodp) : null;
  const realSize = parseSlideSize(presentationXml);
  const applySlideSize = Boolean(
    intendedSize && (Math.abs(intendedSize.cx - realSize.cx) > 500 || Math.abs(intendedSize.cy - realSize.cy) > 500)
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
  if (!props) return xml;
  return overlayFodpShowProperties(xml, props.toString("utf8"));
}
