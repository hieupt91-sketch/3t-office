/**
 * Node-only: patch a real PPTX (ZIP) after soffice FODP→PPTX convert.
 *
 * Do not import from SlidesAdapter (browser / pywebview). Tests call this
 * after `convertWithSoffice`. Production File → Lưu uses the Python twin
 * hooked in main.py (`ooxml_zip_patch.py`).
 *
 * ZIP read/write goes through adapters/libreoffice/common/ooxml-zip-patch.js
 * — do not reimplement the package format here.
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

/**
 * @param {string|Buffer} pptxPathOrBuffer
 * @param {{
 *   sourceFodp?: string,
 *   logoText?: string,
 *   accentColor?: string,
 *   fontFamily?: string,
 *   enabled?: boolean
 * }} [options]
 * @returns {Buffer} original bytes when no patch is needed
 */
export function postProcessSlidesPptx(pptxPathOrBuffer, options = {}) {
  const source = asBuffer(pptxPathOrBuffer);
  if (options.enabled === false) return source;
  const logo = resolveLogoOptions(options);
  if (!logo.logoText) return source;
  if (options.sourceFodp && !fodpHasMasterLogo(options.sourceFodp) && options.logoText == null) {
    return source;
  }
  const presentation = readZipEntry(source, PPTX_PRESENTATION_ENTRY);
  const size = parseSlideSize(presentation ? presentation.toString("utf8") : "");
  const replacements = {};
  let changed = false;
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
    if (next !== xml) {
      replacements[listed.name] = next;
      changed = true;
    }
  }
  if (!changed) return source;
  return patchOoxmlZip(source, replacements);
}
