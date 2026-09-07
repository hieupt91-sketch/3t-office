/**
 * Live soffice: FODP (khổ trang chiếu tùy chỉnh 4:3, 720x540px) → PPTX qua
 * soffice thật. Xác nhận lỗi thật: soffice --convert-to pptx bỏ qua
 * style:page-layout-properties, luôn ghi <p:sldSz> mặc định 28cm x 15.75cm
 * (16:9) bất kể khổ trang FODP khai báo là gì. Sau đó VN post-process phải
 * tự sửa lại đúng khổ 4:3 người dùng đã chọn, và PPTX vá xong phải mở lại
 * được qua soffice (FODP + PDF) không hỏng file.
 * Xem docs/HANDOFF-SLIDES-SLIDESIZE-EXPORT-FIX.md.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { SlidesAdapter } from "../../adapters/libreoffice/slides/slides-adapter.js";
import { postProcessSlidesPptx } from "../../adapters/libreoffice/slides/pptx-native-postprocess.js";
import { parseSlideSize } from "../../adapters/libreoffice/slides/pptx-master-logo.js";
import { convertWithSoffice, findSoffice } from "../helpers/soffice-convert.mjs";
import { readZipEntry } from "../helpers/zip-package.mjs";

assert.ok(findSoffice(), "LibreOffice soffice.exe not found");

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const pythonPatcher = path.join(rootDir, "adapters", "libreoffice", "common", "ooxml_zip_patch.py");

// Khổ 4:3 tùy chỉnh, KHÁC hẳn mặc định 16:9 mà soffice luôn tự ghi (28cm x 15.75cm),
// để phát hiện chắc chắn nếu soffice âm thầm bỏ qua khổ trang người dùng chọn.
const CUSTOM_WIDTH_PX = 720;
const CUSTOM_HEIGHT_PX = 540;
const EXPECTED_CX = Math.round((CUSTOM_WIDTH_PX / 37.795275591) * 1000) / 1000; // cm
const EXPECTED_CY = Math.round((CUSTOM_HEIGHT_PX / 37.795275591) * 1000) / 1000; // cm
const EXPECTED_CX_EMU = Math.round(EXPECTED_CX * 360000);
const EXPECTED_CY_EMU = Math.round(EXPECTED_CY * 360000);

const canvas = {
  slideSize: { width: CUSTOM_WIDTH_PX, height: CUSTOM_HEIGHT_PX },
  slides: [
    {
      id: 1,
      title: "Khổ 4:3",
      body: "Slide dung khổ tùy chỉnh",
      layoutType: "title-content",
      notes: "",
      shapes: [
        { id: "s1", type: "rect", x: CUSTOM_WIDTH_PX - 60, y: CUSTOM_HEIGHT_PX - 60, w: 50, h: 50, color: "#3b82f6", text: "" }
      ]
    }
  ]
};

const adapter = new SlidesAdapter(canvas);
const sourceXml = adapter.serializeToFodp();
assert.match(sourceXml, /fo:page-width="[\d.]+cm"/, "FODP phải khai báo fo:page-width thật");

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vno-pptx-slide-size-"));
const profileDir = path.join(tempRoot, "profile");
const source = path.join(tempRoot, "deck.fodp");
fs.writeFileSync(source, sourceXml, "utf8");

try {
  const pptxPath = convertWithSoffice(source, "pptx", path.join(tempRoot, "pptx"), { profileDir, appKind: "slides" });
  const loPresentation = readZipEntry(pptxPath, "ppt/presentation.xml").toString("utf8");
  const loSize = parseSlideSize(loPresentation);
  assert.ok(loSize, "soffice phải ghi ra p:sldSz nào đó (dù sai)");

  const loMatchesIntended = Math.abs(loSize.cx - EXPECTED_CX_EMU) < 500 && Math.abs(loSize.cy - EXPECTED_CY_EMU) < 500;
  assert.equal(
    loMatchesIntended,
    false,
    `probe: soffice bất ngờ ghi đúng khổ trang rồi (cx=${loSize.cx} cy=${loSize.cy}) — giới hạn có thể đã được LibreOffice sửa, cần cập nhật lại test này`
  );

  const jsPatchedBytes = postProcessSlidesPptx(pptxPath, { sourceFodp: sourceXml });
  const jsPatchedPath = path.join(tempRoot, "js-patched.pptx");
  fs.writeFileSync(jsPatchedPath, jsPatchedBytes);

  const jsPresentation = readZipEntry(jsPatchedPath, "ppt/presentation.xml").toString("utf8");
  const jsSize = parseSlideSize(jsPresentation);
  assert.ok(Math.abs(jsSize.cx - EXPECTED_CX_EMU) < 500, `JS patch cx sai: ${jsSize.cx} != ${EXPECTED_CX_EMU}`);
  assert.ok(Math.abs(jsSize.cy - EXPECTED_CY_EMU) < 500, `JS patch cy sai: ${jsSize.cy} != ${EXPECTED_CY_EMU}`);

  const roundFodp = convertWithSoffice(jsPatchedPath, "fodp", path.join(tempRoot, "fodp"), { profileDir, appKind: "slides" });
  const roundXml = fs.readFileSync(roundFodp, "utf8");
  // FODP thật từ soffice có nhiều <style:page-layout> (vd. PM0 = A4 mặc định
  // không dùng tới); khổ trang chiếu thật là layout mà style:master-page
  // đang tham chiếu qua style:page-layout-name, không phải khối đầu tiên.
  const masterLayoutName = roundXml.match(/<style:master-page\b[^>]*style:page-layout-name="([^"]+)"/)?.[1];
  assert.ok(masterLayoutName, "round-trip FODP phải có style:master-page tham chiếu page-layout-name");
  const layoutBlockRe = new RegExp(`<style:page-layout\\s+style:name="${masterLayoutName}">([\\s\\S]*?)<\\/style:page-layout>`);
  const layoutBlock = roundXml.match(layoutBlockRe)?.[1] || "";
  const roundPageWidth = Number(layoutBlock.match(/fo:page-width="([\d.]+)cm"/)?.[1] || 0);
  const roundPageHeight = Number(layoutBlock.match(/fo:page-height="([\d.]+)cm"/)?.[1] || 0);
  assert.ok(Math.abs(roundPageWidth - EXPECTED_CX) < 0.05, `round-trip page-width sai: ${roundPageWidth} != ${EXPECTED_CX}`);
  assert.ok(Math.abs(roundPageHeight - EXPECTED_CY) < 0.05, `round-trip page-height sai: ${roundPageHeight} != ${EXPECTED_CY}`);

  const pdfPath = convertWithSoffice(jsPatchedPath, "pdf", path.join(tempRoot, "pdf"), { profileDir, appKind: "slides" });
  assert.ok(fs.existsSync(pdfPath) && fs.statSync(pdfPath).size > 100, "patched PPTX → PDF thất bại (file hỏng)");

  const pyOut = path.join(tempRoot, "py-patched.pptx");
  const py = spawnSync(process.env.PYTHON || "python", [
    pythonPatcher,
    "--pptx", pptxPath,
    "--fodp", source,
    "--out", pyOut
  ], { encoding: "utf8" });
  assert.equal(py.status, 0, `Python patcher failed: ${(py.stderr || py.stdout || "").trim()}`);
  const pyPresentation = readZipEntry(pyOut, "ppt/presentation.xml").toString("utf8");
  const pySize = parseSlideSize(pyPresentation);
  assert.ok(Math.abs(pySize.cx - EXPECTED_CX_EMU) < 500, `Python twin cx sai: ${pySize.cx} != ${EXPECTED_CX_EMU}`);
  assert.ok(Math.abs(pySize.cy - EXPECTED_CY_EMU) < 500, `Python twin cy sai: ${pySize.cy} != ${EXPECTED_CY_EMU}`);

  console.log(JSON.stringify({
    loSize,
    loMatchesIntended,
    expectedCxEmu: EXPECTED_CX_EMU,
    expectedCyEmu: EXPECTED_CY_EMU,
    jsSize,
    pySize,
    roundPageWidth,
    roundPageHeight,
    pptxBytes: fs.statSync(jsPatchedPath).size
  }));
  console.log(
    `PASS: soffice thật bỏ qua khổ trang FODP (lo cx=${loSize.cx} cy=${loSize.cy}); ` +
    `VN post-process (JS + Python) đã tự sửa đúng khổ 4:3 tùy chỉnh (cx=${jsSize.cx} cy=${jsSize.cy}); ` +
    `mở lại qua soffice (FODP+PDF) không hỏng file.`
  );
} finally {
  if (process.env.VNO_KEEP_FIXTURE_TMP) console.log(`Kept ${tempRoot}`);
  else fs.rmSync(tempRoot, { recursive: true, force: true });
}
