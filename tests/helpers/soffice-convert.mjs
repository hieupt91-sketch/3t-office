/**
 * LibreOffice headless convert helper — mirrors main.py `_run_soffice_convert`
 * filters exactly. Used by fixture generation and live import-fidelity tests.
 * Does NOT call any VN Office serializer.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

export const FORMAT_FILTERS = {
  docx: "MS Word 2007 XML",
  odt: "writer8",
  html: "HTML (StarWriter)",
  fodt: "OpenDocument Text Flat XML",
  xlsx: "Calc MS Excel 2007 XML",
  ods: "calc8",
  csv: "Text - txt - csv (StarCalc)",
  fods: "OpenDocument Spreadsheet Flat XML",
  pptx: "Impress MS PowerPoint 2007 XML",
  odp: "impress8"
  // fodp: no explicit filter — LibreOffice auto-detects by extension.
};

export function findSoffice() {
  const candidates = [
    process.env.VNOFFICE_SOFFICE_PATH,
    path.join(os.homedir(), "tools", "libreoffice", "program", "soffice.exe"),
    "C:\\Program Files\\LibreOffice\\program\\soffice.exe",
    "C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe",
    "soffice"
  ].filter(Boolean);
  return candidates.find((candidate) => candidate === "soffice" || fs.existsSync(candidate)) || null;
}

export function convertWithSoffice(sourcePath, targetExt, outDir, { profileDir, appKind, timeoutMs = 120000 } = {}) {
  const soffice = findSoffice();
  if (!soffice) {
    throw new Error("LibreOffice soffice.exe not found. Set VNOFFICE_SOFFICE_PATH.");
  }
  fs.mkdirSync(outDir, { recursive: true });
  let filterName = FORMAT_FILTERS[targetExt];
  if (targetExt === "pdf" && appKind) {
    filterName = appKind === "sheet" ? "calc_pdf_Export" : appKind === "slides" ? "impress_pdf_Export" : "writer_pdf_Export";
  }
  const convertTo = filterName ? `${targetExt}:${filterName}` : targetExt;
  const profile = profileDir || path.join(outDir, "lo-profile");
  fs.mkdirSync(profile, { recursive: true });
  const result = spawnSync(soffice, [
    "--headless",
    "--invisible",
    "--nocrashreport",
    "--nodefault",
    "--nolockcheck",
    "--nologo",
    "--norestore",
    `-env:UserInstallation=${pathToFileURL(profile).href}`,
    "--convert-to",
    convertTo,
    "--outdir",
    outDir,
    sourcePath
  ], { encoding: "utf8", timeout: timeoutMs });
  if (result.status !== 0) {
    throw new Error(`soffice --convert-to ${convertTo} failed: ${(result.stderr || result.stdout || "").trim()}`);
  }
  const outPath = path.join(outDir, `${path.parse(sourcePath).name}.${targetExt}`);
  if (!fs.existsSync(outPath)) {
    throw new Error(`soffice did not create ${outPath}. stdout=${(result.stdout || "").trim()}`);
  }
  return outPath;
}

/**
 * LibreOffice HTML (StarWriter) writes images as sidecar files next to the
 * .html. main.py currently returns only the HTML string and then deletes the
 * temp directory, so production File→Mở loses those bytes. Live tests inline
 * the sidecar (or a file:// path) as a data URI so the adapter/UI is checked
 * against the image that soffice actually exported.
 */
export function inlineHtmlImages(html, htmlPath) {
  const dir = path.dirname(htmlPath);
  return String(html || "").replace(/<img\b([^>]*?)(\s*\/?)>/gi, (all, attrs) => {
    const srcMatch = attrs.match(/\bsrc=["']([^"']+)["']/i);
    if (!srcMatch) return all;
    const src = srcMatch[1];
    if (/^data:/i.test(src)) return `<img${attrs}>`;
    const decoded = src.replace(/&amp;/g, "&");
    const candidates = [
      path.join(dir, decoded),
      decoded.replace(/^\/([A-Za-z]:)/, "$1"),
      decoded.replace(/^file:\/\/\//i, "")
    ];
    const filePath = candidates.find(candidate => candidate && fs.existsSync(candidate) && fs.statSync(candidate).isFile());
    if (!filePath) return `<img${attrs}>`;
    const ext = path.extname(filePath).toLowerCase();
    const mime = ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : ext === ".gif" ? "image/gif" : "image/png";
    const dataUri = `data:${mime};base64,${fs.readFileSync(filePath).toString("base64")}`;
    const nextAttrs = attrs.replace(/\bsrc=["'][^"']*["']/i, `src="${dataUri}"`);
    return `<img${nextAttrs}>`;
  });
}
