/** Real LibreOffice probe for VN Slides chart FODP/PPTX fidelity. */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { SlidesAdapter } from "../../adapters/libreoffice/slides/slides-adapter.js";
import { convertWithSoffice, findSoffice } from "../helpers/soffice-convert.mjs";
import { listZipEntries, readZipEntry } from "../helpers/zip-package.mjs";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "vno-slides-chart-probe-"));
const canvas = { slides: [{ id: 1, title: "Chart probe", body: "", layoutType: "blank", notes: "", shapes: [{ id: "chart-probe", type: "chart", chartType: "bar", title: "Doanh thu 2026", labels: ["Tháng 1", "Tháng 2", "Tháng 3"], data: [120, 185, 143], x: 120, y: 80, w: 680, h: 360, color: "transparent" }] }] };
const adapter = new SlidesAdapter(canvas);
const source = path.join(tmp, "slides-chart.fodp");
fs.writeFileSync(source, adapter.serializeToFodp(), "utf8");

console.log("soffice:", findSoffice());
console.log("temp:", tmp);
console.log("source chart:", /<chart:chart\b/.test(fs.readFileSync(source, "utf8")));

const pptx = convertWithSoffice(source, "pptx", path.join(tmp, "pptx"), { profileDir: path.join(tmp, "profile-1") });
const entries = listZipEntries(pptx);
const chartEntries = entries.filter(entry => /^ppt\/charts\//i.test(entry.name));
const chartXml = chartEntries.map(entry => readZipEntry(pptx, entry.name)?.toString("utf8") || "").join("\n");
console.log("pptx:", pptx, fs.statSync(pptx).size, "bytes");
console.log("ppt chart entries:", chartEntries.map(entry => entry.name).join(", ") || "(none)");
console.log("ppt chart type/data/title:", { bar: /<c:barChart\b/.test(chartXml), values: /120/.test(chartXml) && /185/.test(chartXml), title: /Doanh thu 2026/.test(chartXml) });

const round = convertWithSoffice(pptx, "fodp", path.join(tmp, "round"), { profileDir: path.join(tmp, "profile-2") });
const roundXml = fs.readFileSync(round, "utf8");
const parsed = new SlidesAdapter(null).parseFodp(roundXml);
const chart = parsed[0]?.shapes?.find(shape => shape.type === "chart");
console.log("round FODP:", round, roundXml.length, "chars");
console.log("round markup:", { chart: /<chart:chart\b/.test(roundXml), vnoMetadata: /vno:chart=/.test(roundXml) });
console.log("parsed chart:", JSON.stringify(chart || null));
if (!process.env.VNO_KEEP_FIXTURE_TMP) fs.rmSync(tmp, { recursive: true, force: true });
