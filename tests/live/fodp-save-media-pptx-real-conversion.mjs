/**
 * Real LibreOffice round-trip for Slides video/audio save:
 *   in-memory video+audio data URLs → serializeToFodp() → soffice FODP→PPTX
 *   → unzip PPTX (ppt/media vs slide rels) → soffice PPTX→FODP → parseFodp()
 *
 * Not part of node tests/run-tests.js (must stay <60s, no soffice).
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { SlidesAdapter } from "../../adapters/libreoffice/slides/slides-adapter.js";
import { convertWithSoffice } from "../helpers/soffice-convert.mjs";
import { listZipEntries, readZipEntry } from "../helpers/zip-package.mjs";
import { createTinyMp3, createTinyMp4, toDataUrl, bytesFromDataUrl } from "../helpers/tiny-media.mjs";

const mp4 = createTinyMp4();
const mp3 = createTinyMp3();
const VIDEO_URL = toDataUrl("video/mp4", mp4);
const AUDIO_URL = toDataUrl("audio/mpeg", mp3);
const VIDEO_B64 = mp4.toString("base64");
const AUDIO_B64 = mp3.toString("base64");

const canvas = {
  slides: [{
    id: 1,
    title: "Slide media PPTX",
    body: "",
    layoutType: "blank",
    notes: "",
    shapes: [
      { id: "vid1", type: "video", x: 40, y: 40, w: 320, h: 180, src: VIDEO_URL },
      { id: "aud1", type: "audio", x: 40, y: 240, w: 260, h: 40, src: AUDIO_URL }
    ]
  }]
};

const adapter = new SlidesAdapter(canvas);
const fodp = adapter.serializeToFodp();
assert.match(fodp, /<draw:plugin\b/, "serializer must emit draw:plugin before soffice");
assert.match(fodp, /xlink:href="data:video\/mp4;base64,/, "video must be in xlink:href as data URL");
assert.match(fodp, /xlink:href="data:audio\/mpeg;base64,/, "audio must be in xlink:href as data URL");
assert.ok(fodp.includes(VIDEO_B64), "FODP must contain original mp4 base64");
assert.ok(fodp.includes(AUDIO_B64), "FODP must contain original mp3 base64");

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vno-fodp-save-media-pptx-"));
const profileDir = path.join(tempRoot, "profile");
const pptxDir = path.join(tempRoot, "pptx");
const fodpDir = path.join(tempRoot, "fodp");
const sourceFodp = path.join(tempRoot, "draft.fodp");
fs.writeFileSync(sourceFodp, fodp, "utf8");

function approx(actual, expected, tol = 8) {
  return Math.abs(Number(actual) - Number(expected)) <= tol;
}

try {
  const pptxPath = convertWithSoffice(sourceFodp, "pptx", pptxDir, { profileDir });
  assert.ok(fs.existsSync(pptxPath) && fs.statSync(pptxPath).size > 1000, "FODP → PPTX did not create a real deck");

  const zipEntries = listZipEntries(pptxPath);
  const mediaParts = zipEntries.filter((entry) => /^ppt\/media\//i.test(entry.name));
  const relsXml = readZipEntry(pptxPath, "ppt/slides/_rels/slide1.xml.rels")?.toString("utf8") || "";
  const slideXml = readZipEntry(pptxPath, "ppt/slides/slide1.xml")?.toString("utf8") || "";
  const typesXml = readZipEntry(pptxPath, "[Content_Types].xml")?.toString("utf8") || "";

  const mediaBytesMatch = mediaParts.some((entry) => {
    const data = readZipEntry(pptxPath, entry.name);
    return data && (data.equals(mp4) || data.equals(mp3));
  });
  const relsKeepVideo = relsXml.includes(VIDEO_B64);
  const relsKeepAudio = relsXml.includes(AUDIO_B64);
  const pptxKeepsBytes = mediaBytesMatch || (relsKeepVideo && relsKeepAudio);

  assert.match(slideXml, /ppaction:\/\/media|a:videoFile|a:audioFile|p14:media/i, "PPTX slide must still mark a media object");
  assert.ok(
    pptxKeepsBytes,
    `PPTX lost media bytes. ppt/media=${mediaParts.map((e) => `${e.name}:${e.uncompressedSize}`).join(",") || "(none)"} rels data-url video=${relsKeepVideo} audio=${relsKeepAudio}`
  );

  const roundTripPath = convertWithSoffice(pptxPath, "fodp", fodpDir, { profileDir });
  const roundTripXml = fs.readFileSync(roundTripPath, "utf8");
  fs.writeFileSync(path.join(tempRoot, "roundtrip.fodp"), roundTripXml, "utf8");

  assert.match(roundTripXml, /<draw:plugin\b/i, "round-trip FODP lost draw:plugin");

  const parsed = new SlidesAdapter(null).parseFodp(roundTripXml);
  assert.equal(parsed.length, 1, `expected 1 slide, got ${parsed.length}`);
  const shapes = parsed[0].shapes || [];
  const video = shapes.find((shape) => shape.type === "video");
  const audio = shapes.find((shape) => shape.type === "audio");
  assert.ok(video, `video shape missing after hop: ${shapes.map((s) => s.type).join(",")}`);
  assert.ok(audio, `audio shape missing after hop: ${shapes.map((s) => s.type).join(",")}`);

  const videoBytes = bytesFromDataUrl(video.src);
  const audioBytes = bytesFromDataUrl(audio.src);
  assert.ok(videoBytes && videoBytes.equals(mp4), `video bytes mismatch: got ${videoBytes?.length || 0} expected ${mp4.length} src=${String(video.src).slice(0, 48)}`);
  assert.ok(audioBytes && audioBytes.equals(mp3), `audio bytes mismatch: got ${audioBytes?.length || 0} expected ${mp3.length} src=${String(audio.src).slice(0, 48)}`);
  assert.ok(approx(video.x, 40) && approx(video.y, 40) && approx(video.w, 320), `video geom ${JSON.stringify({ x: video.x, y: video.y, w: video.w, h: video.h })}`);
  assert.ok(approx(audio.x, 40) && approx(audio.y, 240), `audio geom ${JSON.stringify({ x: audio.x, y: audio.y, w: audio.w, h: audio.h })}`);

  const embedNote = mediaParts.length
    ? `ppt/media=${mediaParts.map((e) => e.name).join(",")}`
    : "no ppt/media (LibreOffice linked data: URLs in slide rels — FODP has no package stream)";

  console.log("PASS  serializeToFodp → soffice pptx → fodp → parseFodp kept video/audio bytes");
  console.log(`      mp4=${mp4.length}b mp3=${mp3.length}b pptx=${fs.statSync(pptxPath).size}b ${embedNote}`);
  console.log(`      rels data-url video=${relsKeepVideo} audio=${relsKeepAudio} content-types media=${/mp4|mpeg|mp3/i.test(typesXml)}`);
  console.log(`      shapes=${shapes.map((s) => `${s.type}:${s.id}`).join(" | ")}`);
} finally {
  if (!process.env.VNO_KEEP_FIXTURE_TMP) {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  } else {
    console.log(`Kept temp at ${tempRoot}`);
  }
}
