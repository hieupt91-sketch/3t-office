/**
 * Probe (not a suite test): current VN serializer vs real LibreOffice
 * Impress page-level <office:annotation> on <draw:page>.
 *
 * 1. serializeToFodp() with slide.comments[] — does it emit annotation XML?
 * 2. Hand-written FODP (NOT VN serializer) with office:annotation on draw:page
 *    → soffice FODP→FODP (canonical rewrite)
 *    → soffice FODP→PPTX (unzip ppt/comments)
 *    → soffice PPTX→FODP (what adapter.open() receives)
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { SlidesAdapter } from "../../adapters/libreoffice/slides/slides-adapter.js";
import { convertWithSoffice } from "../helpers/soffice-convert.mjs";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "vno-slides-comments-probe-"));
const profileDir = path.join(tmp, "profile");

function dump(label, text, max = 8000) {
  console.log(`\n===== ${label} =====`);
  console.log(text.length > max ? `${text.slice(0, max)}\n… [${text.length} chars]` : text);
}

function extractZip(zipPath, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const result = spawnSync("tar", ["-xf", zipPath, "-C", dest], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`tar -xf failed: ${result.stderr || result.stdout || ""}`);
}

function reportTokens(label, text, tokens) {
  console.log(`\n--- ${label} ---`);
  for (const token of tokens) {
    const source = text.toLowerCase();
    const needle = token.toLowerCase();
    const count = source.split(needle).length - 1;
    console.log(`  ${token}: ${count > 0 ? "YES" : "NO"}  count=${count}`);
  }
}

function annotationSnippets(xml) {
  return [...xml.matchAll(/<office:annotation\b[\s\S]*?<\/office:annotation>/gi)].map((m) => m[0]);
}

const canvas = {
  slides: [{
    id: 1,
    title: "Slide nhan xet",
    body: "Noi dung slide",
    layoutType: "title-content",
    notes: "",
    shapes: [],
    comments: [{
      id: "comment-probe-1",
      text: "Can doi chieu so lieu quy II.",
      author: "Tran Thi Hoa",
      timestamp: "2026-09-05T09:10:00.000Z"
    }]
  }]
};

const vnFodp = new SlidesAdapter(canvas).serializeToFodp();
console.log("===== CURRENT serializeToFodp() =====");
reportTokens("VN serialize", vnFodp, [
  "office:annotation",
  "dc:creator",
  "Tran Thi Hoa",
  "Can doi chieu so lieu quy II",
  "comments"
]);
const parsedNow = new SlidesAdapter(null).parseFodp(vnFodp);
console.log("parse of VN serialize comments=", JSON.stringify(parsedNow[0]?.comments));
console.log("parse of VN serialize body=", JSON.stringify(parsedNow[0]?.body));

const handwritten = `<?xml version="1.0" encoding="UTF-8"?>
<office:document
  xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"
  xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
  xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0"
  xmlns:presentation="urn:oasis:names:tc:opendocument:xmlns:presentation:1.0"
  xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
  xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  office:version="1.3"
  office:mimetype="application/vnd.oasis.opendocument.presentation">
  <office:automatic-styles>
    <style:page-layout style:name="PM1">
      <style:page-layout-properties fo:page-width="28cm" fo:page-height="15.75cm" style:print-orientation="landscape"/>
    </style:page-layout>
    <style:style style:name="dp1" style:family="drawing-page">
      <style:drawing-page-properties presentation:background-visible="true" presentation:background-objects-visible="true"/>
    </style:style>
  </office:automatic-styles>
  <office:master-styles>
    <style:master-page style:name="Standard" style:page-layout-name="PM1" draw:style-name="dp1"/>
  </office:master-styles>
  <office:body>
    <office:presentation>
      <draw:page draw:name="page1" draw:style-name="dp1" draw:master-page-name="Standard">
        <draw:frame presentation:class="title" svg:x="2cm" svg:y="2cm" svg:width="24cm" svg:height="3cm">
          <draw:text-box><text:p>Slide nhan xet</text:p></draw:text-box>
        </draw:frame>
        <draw:frame presentation:class="outline" svg:x="2cm" svg:y="5.5cm" svg:width="24cm" svg:height="11cm">
          <draw:text-box><text:p>Noi dung slide</text:p></draw:text-box>
        </draw:frame>
        <office:annotation svg:x="22cm" svg:y="0.4cm" svg:width="5cm" svg:height="3cm">
          <dc:creator>Tran Thi Hoa</dc:creator>
          <dc:date>2026-09-05T09:10:00</dc:date>
          <text:p>Can doi chieu so lieu quy II.</text:p>
        </office:annotation>
        <office:annotation svg:x="22cm" svg:y="3.6cm" svg:width="5cm" svg:height="3cm">
          <dc:creator>Pham Minh Duc</dc:creator>
          <dc:date>2026-09-05T09:25:00</dc:date>
          <text:p>Xac nhan chu ky nguoi soan.</text:p>
        </office:annotation>
      </draw:page>
      <draw:page draw:name="page2" draw:style-name="dp1" draw:master-page-name="Standard">
        <draw:frame presentation:class="title" svg:x="2cm" svg:y="2cm" svg:width="24cm" svg:height="3cm">
          <draw:text-box><text:p>Slide khong comment</text:p></draw:text-box>
        </draw:frame>
      </draw:page>
    </office:presentation>
  </office:body>
</office:document>`;

const sourceFodp = path.join(tmp, "handwritten-comments.fodp");
fs.writeFileSync(sourceFodp, handwritten, "utf8");

const parsedHand = new SlidesAdapter(null).parseFodp(handwritten);
console.log("\n===== CURRENT parseFodp(handwritten) BEFORE FIX =====");
console.log("slide0 comments=", JSON.stringify(parsedHand[0]?.comments));
console.log("slide0 title=", JSON.stringify(parsedHand[0]?.title));
console.log("slide0 body=", JSON.stringify(parsedHand[0]?.body));
console.log("slide1 comments=", JSON.stringify(parsedHand[1]?.comments));
console.log("slide1 title=", JSON.stringify(parsedHand[1]?.title));

try {
  const fodpRewriteDir = path.join(tmp, "fodp-rewrite");
  const rewrittenPath = convertWithSoffice(sourceFodp, "fodp", fodpRewriteDir, { profileDir });
  const rewritten = fs.readFileSync(rewrittenPath, "utf8");
  dump("SOFFICE FODP→FODP rewrite (canonical)", rewritten, 12000);
  reportTokens("FODP rewrite", rewritten, [
    "office:annotation",
    "dc:creator",
    "dc:date",
    "Tran Thi Hoa",
    "Pham Minh Duc",
    "Can doi chieu so lieu quy II",
    "Xac nhan chu ky nguoi soan",
    "draw:caption-point",
    "office:name"
  ]);
  console.log("\nREWRITE annotation blocks:");
  for (const block of annotationSnippets(rewritten)) {
    console.log("---");
    console.log(block);
  }

  const pptxPath = convertWithSoffice(sourceFodp, "pptx", path.join(tmp, "pptx"), { profileDir });
  console.log("\nPPTX", pptxPath, fs.statSync(pptxPath).size, "bytes");
  const unzipDir = path.join(tmp, "pptx-unzip");
  extractZip(pptxPath, unzipDir);
  function walk(dir, acc = []) {
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      if (fs.statSync(full).isDirectory()) walk(full, acc);
      else acc.push(path.relative(unzipDir, full).replace(/\\/g, "/"));
    }
    return acc;
  }
  const members = walk(unzipDir);
  console.log("PPTX members with comment:", members.filter((m) => /comment/i.test(m)).join("\n") || "(none)");
  console.log("PPTX all members:", members.join("\n"));

  const commentFiles = members.filter((m) => /comment/i.test(m) || /ppt\/slides\/slide/i.test(m));
  for (const rel of commentFiles) {
    const xml = fs.readFileSync(path.join(unzipDir, rel), "utf8");
    dump(rel, xml, 4000);
    reportTokens(rel, xml, [
      "p:cm",
      "p:text",
      "comment",
      "Tran Thi Hoa",
      "Pham Minh Duc",
      "Can doi chieu",
      "Xac nhan chu ky",
      "authorId"
    ]);
  }

  const backFodp = convertWithSoffice(pptxPath, "fodp", path.join(tmp, "fodp-from-pptx"), { profileDir });
  const backXml = fs.readFileSync(backFodp, "utf8");
  dump("SOFFICE PPTX→FODP", backXml, 12000);
  reportTokens("PPTX→FODP", backXml, [
    "office:annotation",
    "dc:creator",
    "dc:date",
    "Tran Thi Hoa",
    "Pham Minh Duc",
    "Can doi chieu so lieu quy II",
    "Xac nhan chu ky nguoi soan"
  ]);
  console.log("\nPPTX→FODP annotation blocks:");
  for (const block of annotationSnippets(backXml)) {
    console.log("---");
    console.log(block);
  }

  const parsedBack = new SlidesAdapter(null).parseFodp(backXml);
  console.log("\nCURRENT parse after PPTX hop:");
  for (const [i, slide] of parsedBack.entries()) {
    console.log(`  slide${i} title=${JSON.stringify(slide.title)} body=${JSON.stringify(slide.body)} comments=${JSON.stringify(slide.comments)}`);
  }
} finally {
  console.log(`\nTEMP ${tmp}`);
  if (!process.env.VNO_KEEP_FIXTURE_TMP) {
    // keep for this probe so we can inspect if needed; user can delete
  }
}
