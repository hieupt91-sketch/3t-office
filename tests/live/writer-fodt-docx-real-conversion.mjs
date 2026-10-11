/**
 * Hai lỗi thật: (1) _fodtParsePageLayouts() dùng \b sau "page-layout", bị JS coi
 * dấu "-" là ranh giới từ nên khớp nhầm <style:page-layout-properties> đứng lẻ
 * (LibreOffice thật hay ghi trước block page-layout thật khi convert DOCX),
 * nuốt mất block layout thật phía sau khiến master-page báo "không biết" dù
 * file hợp lệ. (2) parseFodt() báo lỗi "chưa hỗ trợ" với text:sequence-decls,
 * phần tử khai báo chú thích chuẩn mà LibreOffice LUÔN ghi ra khi convert DOCX
 * dù tài liệu không dùng chú thích nào. Test này đi hết vòng thật: FODT (VN
 * Office ghi) -> DOCX (LibreOffice thật convert) -> FODT (LibreOffice thật
 * convert ngược) -> parseFodt() của chính VN Office.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";

const soffice = process.env.VNOFFICE_SOFFICE_PATH || path.join(os.homedir(), "tools", "libreoffice", "program", "soffice.exe");
assert.ok(fs.existsSync(soffice), `Không tìm thấy LibreOffice tại ${soffice}`);

const root = fs.mkdtempSync(path.join(os.tmpdir(), "vno-writer-pagesetup-docx-"));
const profile = path.join(root, "profile");
fs.mkdirSync(profile, { recursive: true });

const convert = (input, target, filter, outdir) => {
  fs.mkdirSync(outdir, { recursive: true });
  const result = spawnSync(soffice, ["--headless", "--invisible", "--nologo", "--nolockcheck", "--norestore", `-env:UserInstallation=${pathToFileURL(profile).href}`, "--convert-to", `${target}:${filter}`, "--outdir", outdir, input], { encoding: "utf8", timeout: 120000 });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const outPath = path.join(outdir, `${path.parse(input).name}.${target}`);
  assert.ok(fs.existsSync(outPath), `Expected ${outPath} not created`);
  return outPath;
};

try {
  const bodyEl = { innerHTML: "<p>Noi dung kiem tra Page Setup that qua vong DOCX</p>" };
  const adapter = new WriterAdapter({
    innerHTML: bodyEl.innerHTML,
    querySelector(sel) { return sel === ".vno-writer-body" ? bodyEl : null; }
  });
  adapter.pageSetup = { size: "letter", orientation: "landscape", margins: { top: 25, bottom: 25, left: 32, right: 18 } };
  adapter.sectionPageSetups[adapter.activeSectionId] = JSON.parse(JSON.stringify(adapter.pageSetup));

  const fodtPath = path.join(root, "writer-pagesetup.fodt");
  fs.writeFileSync(fodtPath, adapter.serializeToFodt(), "utf8");
  const docxPath = convert(fodtPath, "docx", "MS Word 2007 XML", path.join(root, "docx-out"));
  const fodtBackPath = convert(docxPath, "fodt", "OpenDocument Text Flat XML", path.join(root, "fodt-back"));
  const fodtBackXml = fs.readFileSync(fodtBackPath, "utf8");

  const bodyEl2 = { innerHTML: "" };
  const adapter2 = new WriterAdapter({
    innerHTML: "",
    querySelector(sel) { return sel === ".vno-writer-body" ? bodyEl2 : null; }
  });
  adapter2.parseFodt(fodtBackXml);

  assert.equal(adapter2.pageSetup.orientation, "landscape", `orientation sai: ${adapter2.pageSetup.orientation}`);
  assert.equal(adapter2.pageSetup.size, "letter", `size sai: ${adapter2.pageSetup.size}`);
  assert.ok(Math.abs(adapter2.pageSetup.margins.left - 32) < 2, `margin left sai: ${adapter2.pageSetup.margins.left}`);
  assert.ok(adapter2.bodyDom.innerHTML.includes("Noi dung kiem tra Page Setup that qua vong DOCX"), "Nội dung văn bản thật phải còn nguyên");

  console.log(`PASS: Writer parseFodt() đọc đúng Page Setup và nội dung sau vòng chuyển đổi DOCX thật (${fs.statSync(docxPath).size} bytes), không còn báo lỗi 'master-page không biết' hay 'text:sequence-decls chưa hỗ trợ'.`);
} finally {
  if (process.env.VNO_KEEP_FODS_TEST_OUTPUT) console.log(`Kept test files at ${root}`);
  else fs.rmSync(root, { recursive: true, force: true });
}
