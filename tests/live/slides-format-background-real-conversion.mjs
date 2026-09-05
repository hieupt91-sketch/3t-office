import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { SlidesAdapter } from "../../adapters/libreoffice/slides/slides-adapter.js";
import { convertWithSoffice, findSoffice } from "../helpers/soffice-convert.mjs";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "vno-slides-bg-probe-"));

const canvas = {
  slides: [
    { id: 1, title: "Nen mau don", body: "", layoutType: "blank", notes: "", shapes: [], background: { type: "solid", color: "#dc2626" } },
    { id: 2, title: "Nen gradient", body: "", layoutType: "blank", notes: "", shapes: [], background: { type: "gradient", from: "#1e3a8a", to: "#ffffff", angle: 0 } },
    { id: 3, title: "Khong doi nen", body: "", layoutType: "blank", notes: "", shapes: [] }
  ]
};
const adapter = new SlidesAdapter(canvas);
const source = path.join(tmp, "slides-bg.fodp");
fs.writeFileSync(source, adapter.serializeToFodp(), "utf8");

console.log("soffice:", findSoffice());
const xml = fs.readFileSync(source, "utf8");
console.log("source has solid fill:", /draw:fill="solid"\s+draw:fill-color="#dc2626"/i.test(xml));
console.log("source has gradient ref:", /draw:fill="gradient"/i.test(xml));
console.log("source has draw:gradient def:", /<draw:gradient\b[^>]*draw:start-color="#1e3a8a"/i.test(xml));

const pptx = convertWithSoffice(source, "pptx", path.join(tmp, "pptx"), { profileDir: path.join(tmp, "profile-1") });
console.log("pptx:", pptx, fs.statSync(pptx).size, "bytes");

const round = convertWithSoffice(pptx, "fodp", path.join(tmp, "round"), { profileDir: path.join(tmp, "profile-2") });
const roundXml = fs.readFileSync(round, "utf8");
const parsed = new SlidesAdapter(null).parseFodp(roundXml);

console.log("round FODP has solid fill:", /draw:fill="solid"/i.test(roundXml));
console.log("round FODP has gradient def:", /<draw:gradient\b/i.test(roundXml));
console.log("parsed slide1 background:", JSON.stringify(parsed[0]?.background));
console.log("parsed slide2 background:", JSON.stringify(parsed[1]?.background));
console.log("parsed slide3 background (should be none):", JSON.stringify(parsed[2]?.background));

if (!process.env.VNO_KEEP_FIXTURE_TMP) fs.rmSync(tmp, { recursive: true, force: true });
