/**
 * Real LibreOffice round-trip for Slides page-level comments:
 *   A) in-memory slide.comments[] → serializeToFodp() → soffice FODP→PPTX → soffice PPTX→FODP → parseFodp()
 *   B) independent handwritten FODP (NOT VN serializer) → soffice PPTX → FODP → parseFodp()
 *      (the path adapter.open() receives after the desktop bridge converts PPTX)
 *
 * Not part of node tests/run-tests.js (must stay <60s, no soffice).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { SlidesAdapter } from "../../adapters/libreoffice/slides/slides-adapter.js";
import { convertWithSoffice } from "../helpers/soffice-convert.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const fixtureFodp = path.join(root, "tests", "fixtures", "real-office-samples", "src", "sample-slides-comments.fodp");

function extractZip(zipPath, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const result = spawnSync("tar", ["-xf", zipPath, "-C", dest], { encoding: "utf8" });
  if (result.status !== 0) throw new Error(`tar -xf failed: ${result.stderr || result.stdout || ""}`);
}

function annotationBlocks(xml) {
  return [...xml.matchAll(/<(?:office:annotation|officeooo:annotation)\b[\s\S]*?<\/(?:office:annotation|officeooo:annotation)>/gi)].map((m) => m[0]);
}

function commentsByAuthor(slide) {
  const map = {};
  for (const comment of slide?.comments || []) {
    map[String(comment.author || "")] = comment;
  }
  return map;
}

function readPptxComments(pptxPath, unzipDir) {
  extractZip(pptxPath, unzipDir);
  const authorsPath = path.join(unzipDir, "ppt", "commentAuthors.xml");
  const commentsDir = path.join(unzipDir, "ppt", "comments");
  const authorsXml = fs.existsSync(authorsPath) ? fs.readFileSync(authorsPath, "utf8") : "";
  const commentFiles = fs.existsSync(commentsDir)
    ? fs.readdirSync(commentsDir).filter((name) => /\.xml$/i.test(name)).sort()
    : [];
  const commentsXml = commentFiles.map((name) => ({
    name,
    xml: fs.readFileSync(path.join(commentsDir, name), "utf8")
  }));
  return { authorsXml, commentsXml };
}

const canvas = {
  slides: [
    {
      id: 1,
      title: "Bao cao de an VN Office 2026",
      body: "Kien truc nen tang LibreOffice",
      layoutType: "title-content",
      notes: "",
      shapes: [],
      comments: [
        {
          id: "comment-hoa-1",
          text: "Can doi chieu so lieu quy II truoc khi trinh.",
          author: "Tran Thi Hoa",
          timestamp: "2026-09-05T09:10:00.000Z"
        },
        {
          id: "comment-duc-2",
          text: "Xac nhan chu ky nguoi soan.",
          author: "Pham Minh Duc",
          timestamp: "2026-09-05T09:25:00.000Z"
        }
      ]
    },
    {
      id: 2,
      title: "Slide khong comment",
      body: "",
      layoutType: "title-only",
      notes: "",
      shapes: [],
      comments: []
    }
  ]
};

const adapter = new SlidesAdapter(canvas);
const fodp = adapter.serializeToFodp();
assert.match(fodp, /<office:annotation\b/, "serializer must emit office:annotation before soffice");
assert.match(fodp, /<dc:creator>Tran Thi Hoa<\/dc:creator>/);
assert.match(fodp, /<dc:creator>Pham Minh Duc<\/dc:creator>/);
assert.doesNotMatch(fodp.match(/<draw:page[^>]*draw:name="page2"[\s\S]*?<\/draw:page>/)?.[0] || "", /<office:annotation\b/);

const inMemory = new SlidesAdapter(null).parseFodp(fodp);
assert.equal(inMemory[0].comments?.length, 2, "in-memory FODP must keep both comments");
assert.equal(inMemory[0].title, "Bao cao de an VN Office 2026");
assert.equal(inMemory[1].comments?.length, 0);

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vno-fodp-save-slides-comments-"));
const profileDir = path.join(tempRoot, "profile");
const sourceFodp = path.join(tempRoot, "draft.fodp");
fs.writeFileSync(sourceFodp, fodp, "utf8");

try {
  const pptxPath = convertWithSoffice(sourceFodp, "pptx", path.join(tempRoot, "pptx"), { profileDir });
  assert.ok(fs.existsSync(pptxPath) && fs.statSync(pptxPath).size > 1000, "FODP → PPTX did not create a real deck");

  const pptxComments = readPptxComments(pptxPath, path.join(tempRoot, "pptx-unzip"));
  console.log("PPTX commentAuthors.xml=", pptxComments.authorsXml);
  for (const file of pptxComments.commentsXml) {
    console.log(`PPTX ${file.name}=`, file.xml);
  }
  assert.match(pptxComments.authorsXml, /Tran Thi Hoa/, "PPTX commentAuthors must keep Tran Thi Hoa");
  assert.match(pptxComments.authorsXml, /Pham Minh Duc/, "PPTX commentAuthors must keep Pham Minh Duc");
  const joinedComments = pptxComments.commentsXml.map((file) => file.xml).join("\n");
  assert.match(joinedComments, /Can doi chieu so lieu quy II truoc khi trinh/);
  assert.match(joinedComments, /Xac nhan chu ky nguoi soan/);

  const roundTripPath = convertWithSoffice(pptxPath, "fodp", path.join(tempRoot, "fodp"), { profileDir });
  const roundTripXml = fs.readFileSync(roundTripPath, "utf8");
  fs.writeFileSync(path.join(tempRoot, "roundtrip.fodp"), roundTripXml, "utf8");

  const blocks = annotationBlocks(roundTripXml);
  console.log("SOFFICE annotation count=", blocks.length);
  for (const block of blocks) console.log("SOFFICE annotation=", block.replace(/\s+/g, " ").trim());

  const parsed = new SlidesAdapter(null).parseFodp(roundTripXml);
  assert.equal(parsed.length, 2, `expected 2 slides, got ${parsed.length}`);
  const byAuthor = commentsByAuthor(parsed[0]);
  console.log("PARSED comments=", JSON.stringify(parsed.map((slide) => slide.comments)));
  console.log("PARSED titles=", JSON.stringify(parsed.map((slide) => slide.title)));

  assert.equal(parsed[0].comments?.length, 2, `slide1 comments=${JSON.stringify(parsed[0].comments)}`);
  assert.equal(byAuthor["Tran Thi Hoa"]?.text, "Can doi chieu so lieu quy II truoc khi trinh.");
  assert.equal(byAuthor["Pham Minh Duc"]?.text, "Xac nhan chu ky nguoi soan.");
  assert.ok(String(byAuthor["Tran Thi Hoa"]?.timestamp || "").startsWith("2026-09-05T09:10:00"), `hoa timestamp=${byAuthor["Tran Thi Hoa"]?.timestamp}`);
  assert.ok(String(byAuthor["Pham Minh Duc"]?.timestamp || "").startsWith("2026-09-05T09:25:00"), `duc timestamp=${byAuthor["Pham Minh Duc"]?.timestamp}`);
  assert.notEqual(parsed[0].title, "Can doi chieu so lieu quy II truoc khi trinh.", "comment text must not replace title after PPTX hop");
  assert.equal((parsed[1].comments || []).length, 0, `slide2 must stay comment-free, got ${JSON.stringify(parsed[1].comments)}`);

  const titleKept = String(parsed[0].title || "").includes("Bao cao de an VN Office 2026")
    || (parsed[0].shapes || []).some((shape) => String(shape.text || "").includes("Bao cao de an VN Office 2026"));
  assert.ok(titleKept, `slide title lost after hop: title=${parsed[0].title} shapes=${JSON.stringify((parsed[0].shapes || []).map((s) => s.text))}`);

  console.log("PASS  A) serializeToFodp → soffice pptx → fodp → parseFodp kept page comments (text/author/time)");

  assert.ok(fs.existsSync(fixtureFodp), `missing independent fixture ${fixtureFodp}`);
  const fixtureXml = fs.readFileSync(fixtureFodp, "utf8");
  assert.match(fixtureXml, /<office:annotation\b/, "fixture must be handwritten office:annotation, not VN-only");
  assert.doesNotMatch(fixtureXml, /draw:name="comment-hoa-1"/, "fixture must not come from VN serializer ids");

  const importPptx = convertWithSoffice(fixtureFodp, "pptx", path.join(tempRoot, "import-pptx"), { profileDir });
  const importPptxComments = readPptxComments(importPptx, path.join(tempRoot, "import-pptx-unzip"));
  console.log("IMPORT PPTX authors=", importPptxComments.authorsXml);
  assert.match(importPptxComments.authorsXml, /Tran Thi Hoa/);
  assert.match(importPptxComments.authorsXml, /Pham Minh Duc/);

  const importFodpPath = convertWithSoffice(importPptx, "fodp", path.join(tempRoot, "import-fodp"), { profileDir });
  const importFodpXml = fs.readFileSync(importFodpPath, "utf8");
  const importBlocks = annotationBlocks(importFodpXml);
  console.log("IMPORT FODP annotation count=", importBlocks.length);
  for (const block of importBlocks) console.log("IMPORT annotation=", block.replace(/\s+/g, " ").trim());

  const canvasImport = { slides: [], selectSlide(idx) { this.selectedIdx = idx; } };
  const openAdapter = new SlidesAdapter(canvasImport);
  openAdapter.loadFromFodp(importFodpXml);
  const imported = canvasImport.slides;
  const importedByAuthor = commentsByAuthor(imported[0]);
  console.log("IMPORT parse comments=", JSON.stringify(imported.map((slide) => slide.comments)));
  console.log("IMPORT titles=", JSON.stringify(imported.map((slide) => slide.title)));

  assert.ok(imported.length >= 2, `import expected >=2 slides, got ${imported.length}`);
  assert.equal(imported[0].comments?.length, 2, `import slide1 comments=${JSON.stringify(imported[0].comments)}`);
  assert.equal(importedByAuthor["Tran Thi Hoa"]?.text, "Can doi chieu so lieu quy II truoc khi trinh.");
  assert.equal(importedByAuthor["Pham Minh Duc"]?.text, "Xac nhan chu ky nguoi soan.");
  assert.ok(String(importedByAuthor["Tran Thi Hoa"]?.timestamp || "").startsWith("2026-09-05T09:10:00"));
  assert.equal((imported[1].comments || []).length, 0);

  console.log("PASS  B) handwritten FODP → soffice pptx → fodp → loadFromFodp (open path) kept comments");
} finally {
  if (!process.env.VNO_KEEP_FIXTURE_TMP) {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  } else {
    console.log(`Kept temp at ${tempRoot}`);
  }
}
