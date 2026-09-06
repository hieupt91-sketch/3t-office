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
 */
import fs from "node:fs";
import { listZipEntries, patchOoxmlZip, readZipEntry } from "../common/ooxml-zip-patch.js";
import {
  PPTX_PRESENTATION_ENTRY,
  SLIDE_MASTER_ENTRY_RE,
  applyMasterLogoShape,
  fodpHasMasterLogo,
  parseMasterLogoFromFodp,
  parseSlideSize
} from "./pptx-master-logo.js";
import {
  applySectionList,
  applySectionListFromFodp,
  fodpHasSections
} from "./pptx-section-list.js";

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

/**
 * @param {string|Buffer} pptxPathOrBuffer
 * @param {{
 *   sourceFodp?: string,
 *   logoText?: string,
 *   accentColor?: string,
 *   fontFamily?: string,
 *   enabled?: boolean,
 *   sections?: { name: string, sourceId?: string, slideIds: string[] }[]
 * }} [options]
 * @returns {Buffer} original bytes when no patch is needed
 */
export function postProcessSlidesPptx(pptxPathOrBuffer, options = {}) {
  const source = asBuffer(pptxPathOrBuffer);
  if (options.enabled === false) return source;
  const logo = resolveLogoOptions(options);
  const applyLogo = wantsLogo(logo, options);
  const applySections = wantsSections(options);
  if (!applyLogo && !applySections) return source;

  const presentation = readZipEntry(source, PPTX_PRESENTATION_ENTRY);
  const presentationXml = presentation ? presentation.toString("utf8") : "";
  const replacements = {};

  if (applyLogo) {
    const size = parseSlideSize(presentationXml);
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
        slideCx: size.cx,
        slideCy: size.cy
      });
      if (next !== xml) replacements[listed.name] = next;
    }
  }

  if (applySections) {
    if (!presentationXml) {
      throw new Error("PPTX thiếu ppt/presentation.xml — không thể bổ sung p14:sectionLst");
    }
    const next = Array.isArray(options.sections)
      ? applySectionList(presentationXml, options.sections)
      : applySectionListFromFodp(presentationXml, options.sourceFodp);
    if (next !== presentationXml) replacements[PPTX_PRESENTATION_ENTRY] = next;
  }

  if (!Object.keys(replacements).length) return source;
  return patchOoxmlZip(source, replacements);
}
