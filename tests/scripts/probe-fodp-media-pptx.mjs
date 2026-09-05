/**
 * Probe: does video/audio survive a real soffice FODP→PPTX→FODP hop?
 * Independent measurement of several encodings — does not claim a fix.
 *
 * Keep temp: set VNO_KEEP_FIXTURE_TMP=1
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { SlidesAdapter } from "../../adapters/libreoffice/slides/slides-adapter.js";
import { convertWithSoffice } from "../helpers/soffice-convert.mjs";
import { createZip, listZipEntries, readZipEntry } from "../helpers/zip-package.mjs";
import { createTinyMp3, createTinyMp4, toDataUrl, bytesFromDataUrl } from "../helpers/tiny-media.mjs";

const mp4 = createTinyMp4();
const mp3 = createTinyMp3();
const VIDEO_URL = toDataUrl("video/mp4", mp4);
const AUDIO_URL = toDataUrl("audio/mpeg", mp3);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "vno-probe-media-pptx-"));
const profileDir = path.join(tmp, "lo-profile");
console.log("temp:", tmp);
console.log("tiny mp4 bytes:", mp4.length, "mp3 bytes:", mp3.length);
console.log("mp4 magic:", mp4.slice(4, 8).toString("ascii"), "mp3 header:", mp3.slice(0, 4).toString("hex"));

function snippet(xml, pattern, chars = 500) {
  const match = String(xml || "").match(pattern);
  if (!match) return "(no match)";
  const start = Math.max(0, match.index - 80);
  return xml.slice(start, start + chars).replace(/\s+/g, " ");
}

function inspectPptx(label, pptxPath) {
  const entries = listZipEntries(pptxPath);
  const media = entries.filter((entry) => /^ppt\/media\//i.test(entry.name) || /\.(mp4|mp3|wav|avi|m4a|bin)$/i.test(entry.name));
  const slideXml = readZipEntry(pptxPath, "ppt/slides/slide1.xml");
  const typesXml = readZipEntry(pptxPath, "[Content_Types].xml");
  const relsXml = readZipEntry(pptxPath, "ppt/slides/_rels/slide1.xml.rels");
  console.log(`\n=== ${label}: PPTX ${path.basename(pptxPath)} ${fs.statSync(pptxPath).size} bytes ===`);
  console.log("zip entries:", entries.length);
  console.log("media-like entries:", media.length ? media.map((e) => `${e.name} (${e.uncompressedSize}b)`).join(", ") : "(none)");
  const slideText = slideXml ? slideXml.toString("utf8") : "";
  const typesText = typesXml ? typesXml.toString("utf8") : "";
  const relsText = relsXml ? relsXml.toString("utf8") : "";
  console.log("slide1 video/audio tags:", {
    pVideo: /<p:video\b/i.test(slideText),
    pAudio: /<a:audioFile\b|<p:audio\b/i.test(slideText),
    videoFile: /<a:videoFile\b/i.test(slideText),
    mediaNs: /p14:media|p15:sldMkLst|relationship.*media/i.test(slideText + relsText)
  });
  console.log("slide1 snippet plugin/video:", snippet(slideText, /video|audio|media|oleObj|plugin/i, 420));
  console.log("Content_Types media overrides:", (typesText.match(/Override[^>]+(mp4|mp3|wav|audio|video)[^>]*/gi) || []).join(" | ") || "(none)");
  console.log("slide1.rels media:", (relsText.match(/Target="[^"]+"/g) || []).join(" | ") || "(none)");
  const mediaBytes = {};
  for (const entry of media) {
    const data = readZipEntry(pptxPath, entry.name);
    mediaBytes[entry.name] = data;
    if (data) {
      const eqMp4 = data.equals(mp4);
      const eqMp3 = data.equals(mp3);
      console.log(`  ${entry.name}: ${data.length}b magic=${data.slice(0, 8).toString("ascii") || data.slice(0, 4).toString("hex")} eqMp4=${eqMp4} eqMp3=${eqMp3}`);
    }
  }
  return { entries, media, slideText, typesText, relsText, mediaBytes };
}

function inspectFodp(label, xml) {
  console.log(`\n=== ${label}: FODP ${xml.length} chars ===`);
  console.log("has draw:plugin:", /<draw:plugin\b/i.test(xml));
  console.log("has office:binary-data:", /<office:binary-data\b/i.test(xml));
  console.log("plugin count:", (xml.match(/<draw:plugin\b/gi) || []).length);
  console.log("mime types:", [...xml.matchAll(/draw:mime-type="([^"]+)"/gi)].map((m) => m[1]).join(", ") || "(none)");
  console.log("plugin hrefs:", [...xml.matchAll(/<draw:plugin\b[^>]*xlink:href="([^"]*)"/gi)].map((m) => m[1].slice(0, 80)).join(" | ") || "(none)");
  console.log("plugin snippet:", snippet(xml, /<draw:plugin\b/i, 520));
}

function parseMediaShapes(xml) {
  const parsed = new SlidesAdapter(null).parseFodp(xml);
  const shapes = parsed[0]?.shapes || [];
  const video = shapes.find((s) => s.type === "video" || s.id === "vid1");
  const audio = shapes.find((s) => s.type === "audio" || s.id === "aud1");
  return { parsed, shapes, video, audio };
}

function makeCanvas() {
  return {
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
}

function convertSafe(src, ext, dir, label) {
  try {
    const out = convertWithSoffice(src, ext, dir, { profileDir, timeoutMs: 120000 });
    console.log(`${label}: OK ${out} (${fs.statSync(out).size} bytes)`);
    return { ok: true, path: out };
  } catch (error) {
    console.log(`${label}: FAIL ${error.message}`);
    return { ok: false, error: error.message };
  }
}

function writeOdp(destPath) {
  const contentXml = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
 xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"
 xmlns:presentation="urn:oasis:names:tc:opendocument:xmlns:presentation:1.0"
 xmlns:svg="urn:oasis:names:tc:opendocument:xmlns:svg-compatible:1.0"
 xmlns:xlink="http://www.w3.org/1999/xlink"
 xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
 office:version="1.2">
  <office:body>
    <office:presentation>
      <draw:page draw:name="page1" draw:master-page-name="Standard">
        <draw:frame draw:name="vid1" svg:x="1cm" svg:y="1cm" svg:width="8.466cm" svg:height="4.763cm">
          <draw:plugin xlink:href="Media/sample.mp4" xlink:type="simple" xlink:show="embed" draw:mime-type="video/mp4">
            <draw:param draw:name="Loop" draw:value="false"/>
            <draw:param draw:name="Mute" draw:value="false"/>
          </draw:plugin>
        </draw:frame>
        <draw:frame draw:name="aud1" svg:x="1cm" svg:y="7cm" svg:width="6.879cm" svg:height="1.058cm">
          <draw:plugin xlink:href="Media/sample.mp3" xlink:type="simple" xlink:show="embed" draw:mime-type="audio/mpeg">
            <draw:param draw:name="Loop" draw:value="false"/>
          </draw:plugin>
        </draw:frame>
      </draw:page>
    </office:presentation>
  </office:body>
</office:document-content>`;
  const stylesXml = `<?xml version="1.0" encoding="UTF-8"?>
<office:document-styles xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
 xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
 xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0"
 xmlns:presentation="urn:oasis:names:tc:opendocument:xmlns:presentation:1.0"
 xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"
 office:version="1.2">
  <office:automatic-styles>
    <style:page-layout style:name="PM1">
      <style:page-layout-properties fo:page-width="28cm" fo:page-height="15.75cm" style:print-orientation="landscape"/>
    </style:page-layout>
  </office:automatic-styles>
  <office:master-styles>
    <style:master-page style:name="Standard" style:page-layout-name="PM1"/>
  </office:master-styles>
</office:document-styles>`;
  const manifest = `<?xml version="1.0" encoding="UTF-8"?>
<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.2">
  <manifest:file-entry manifest:full-path="/" manifest:version="1.2" manifest:media-type="application/vnd.oasis.opendocument.presentation"/>
  <manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/>
  <manifest:file-entry manifest:full-path="styles.xml" manifest:media-type="text/xml"/>
  <manifest:file-entry manifest:full-path="Media/sample.mp4" manifest:media-type="video/mp4"/>
  <manifest:file-entry manifest:full-path="Media/sample.mp3" manifest:media-type="audio/mpeg"/>
</manifest:manifest>`;
  const zip = createZip([
    { name: "mimetype", data: "application/vnd.oasis.opendocument.presentation", store: true },
    { name: "META-INF/manifest.xml", data: manifest },
    { name: "content.xml", data: contentXml },
    { name: "styles.xml", data: stylesXml },
    { name: "Media/sample.mp4", data: mp4, store: true },
    { name: "Media/sample.mp3", data: mp3, store: true }
  ]);
  fs.writeFileSync(destPath, zip);
}

function patchPluginEncoding(fodp, mode, dir) {
  if (mode === "current") return fodp;
  if (mode === "data-href") {
    return fodp.replace(
      /<draw:plugin xlink:href="" xlink:type="simple" xlink:show="embed" draw:mime-type="([^"]+)">\s*<office:binary-data>([^<]+)<\/office:binary-data>\s*<\/draw:plugin>/g,
      (_, mime, b64) => `<draw:plugin xlink:href="data:${mime};base64,${b64}" xlink:type="simple" xlink:show="embed" draw:mime-type="${mime}"></draw:plugin>`
    );
  }
  if (mode === "sidecar") {
    fs.mkdirSync(path.join(dir, "Media"), { recursive: true });
    fs.writeFileSync(path.join(dir, "Media", "sample.mp4"), mp4);
    fs.writeFileSync(path.join(dir, "Media", "sample.mp3"), mp3);
    let n = 0;
    return fodp.replace(
      /<draw:plugin xlink:href="" xlink:type="simple" xlink:show="embed" draw:mime-type="([^"]+)">\s*<office:binary-data>[^<]+<\/office:binary-data>\s*<\/draw:plugin>/g,
      (_, mime) => {
        const file = /audio/i.test(mime) ? "Media/sample.mp3" : "Media/sample.mp4";
        n += 1;
        return `<draw:plugin xlink:href="${file}" xlink:type="simple" xlink:show="embed" draw:mime-type="${mime}"><draw:param draw:name="Loop" draw:value="false"/></draw:plugin>`;
      }
    );
  }
  throw new Error(`unknown mode ${mode}`);
}

async function runVariant(name, fodpXml, extraSetup) {
  console.log(`\n\n########## VARIANT ${name} ##########`);
  const dir = path.join(tmp, name);
  fs.mkdirSync(dir, { recursive: true });
  const source = path.join(dir, "draft.fodp");
  const xml = extraSetup ? extraSetup(fodpXml, dir) : fodpXml;
  fs.writeFileSync(source, xml, "utf8");
  inspectFodp(`${name} source`, xml);
  const pptx = convertSafe(source, "pptx", path.join(dir, "pptx"), `${name} FODP→PPTX`);
  if (!pptx.ok) return;
  inspectPptx(name, pptx.path);
  const back = convertSafe(pptx.path, "fodp", path.join(dir, "fodp"), `${name} PPTX→FODP`);
  if (!back.ok) return;
  const roundXml = fs.readFileSync(back.path, "utf8");
  inspectFodp(`${name} roundtrip`, roundXml);
  const { shapes, video, audio } = parseMediaShapes(roundXml);
  console.log("parsed shapes:", shapes.map((s) => `${s.type}:${s.id}:src=${String(s.src || "").slice(0, 48)}`).join(" | ") || "(none)");
  const videoBytes = bytesFromDataUrl(video?.src);
  const audioBytes = bytesFromDataUrl(audio?.src);
  console.log("video bytes match:", videoBytes ? videoBytes.equals(mp4) : false, "got", videoBytes?.length ?? 0, "orig", mp4.length);
  console.log("audio bytes match:", audioBytes ? audioBytes.equals(mp3) : false, "got", audioBytes?.length ?? 0, "orig", mp3.length);
}

try {
  const adapter = new SlidesAdapter(makeCanvas());
  const currentFodp = adapter.serializeToFodp();
  fs.writeFileSync(path.join(tmp, "current.fodp"), currentFodp, "utf8");

  await runVariant("A-current-binary-data", currentFodp);
  await runVariant("B-data-url-href", currentFodp, (xml, dir) => patchPluginEncoding(xml, "data-href", dir));
  await runVariant("C-sidecar-href", currentFodp, (xml, dir) => patchPluginEncoding(xml, "sidecar", dir));

  console.log("\n\n########## VARIANT D: native ODP zip with Media/ ##########");
  const odpPath = path.join(tmp, "native.odp");
  writeOdp(odpPath);
  console.log("wrote ODP", odpPath, fs.statSync(odpPath).size, "bytes");
  console.log("ODP entries:", listZipEntries(odpPath).map((e) => `${e.name} (${e.uncompressedSize}b)`).join(", "));
  const odpPptx = convertSafe(odpPath, "pptx", path.join(tmp, "odp-pptx"), "ODP→PPTX");
  if (odpPptx.ok) inspectPptx("D-odp", odpPptx.path);
  const odpFodp = convertSafe(odpPath, "fodp", path.join(tmp, "odp-fodp"), "ODP→FODP");
  if (odpFodp.ok) {
    const xml = fs.readFileSync(odpFodp.path, "utf8");
    inspectFodp("D ODP→FODP", xml);
    fs.writeFileSync(path.join(tmp, "odp-round.fodp"), xml, "utf8");
  }
  if (odpPptx.ok) {
    const back = convertSafe(odpPptx.path, "fodp", path.join(tmp, "odp-pptx-fodp"), "ODP→PPTX→FODP");
    if (back.ok) inspectFodp("D ODP→PPTX→FODP", fs.readFileSync(back.path, "utf8"));
  }

  console.log("\n\n########## VARIANT E: current FODP → ODP (does LO extract binary-data?) ##########");
  const fodpOdp = convertSafe(path.join(tmp, "current.fodp"), "odp", path.join(tmp, "fodp-odp"), "FODP→ODP");
  if (fodpOdp.ok) {
    const entries = listZipEntries(fodpOdp.path);
    console.log("ODP entries:", entries.map((e) => `${e.name} (${e.uncompressedSize}b)`).join(", "));
    const mediaish = entries.filter((e) => /media|pictures|\.mp4|\.mp3/i.test(e.name));
    console.log("media-like:", mediaish.length ? mediaish.map((e) => e.name).join(", ") : "(none)");
    const content = readZipEntry(fodpOdp.path, "content.xml");
    if (content) inspectFodp("E FODP→ODP content.xml", content.toString("utf8"));
  }
} finally {
  if (!process.env.VNO_KEEP_FIXTURE_TMP) {
    console.log("\n(set VNO_KEEP_FIXTURE_TMP=1 to keep)", tmp);
  } else {
    console.log("\nKept temp at", tmp);
  }
}
