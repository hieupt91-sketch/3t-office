/**
 * Probe: does a hand-written ODF chart survive soffice FODS→XLSX→FODS,
 * and does current parseFods() recognize it? Independent of VN serializers.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { convertWithSoffice } from "../helpers/soffice-convert.mjs";
import { readZipEntry } from "../helpers/zip-package.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const fodsPath = path.join(root, "tests", "fixtures", "real-office-samples", "src", "sample-sheet-charts.fods");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "vno-probe-charts-"));

function listZipNames(zipPath) {
  const buffer = fs.readFileSync(zipPath);
  let eocd = -1;
  const searchFrom = Math.max(0, buffer.length - 22 - 65535);
  for (let index = buffer.length - 22; index >= searchFrom; index--) {
    if (buffer.readUInt32LE(index) === 0x06054b50) { eocd = index; break; }
  }
  if (eocd < 0) throw new Error("ZIP EOCD not found");
  const cdOffset = buffer.readUInt32LE(eocd + 16);
  const cdEntries = buffer.readUInt16LE(eocd + 10);
  const names = [];
  let offset = cdOffset;
  for (let i = 0; i < cdEntries; i++) {
    const nameLen = buffer.readUInt16LE(offset + 28);
    const extraLen = buffer.readUInt16LE(offset + 30);
    const commentLen = buffer.readUInt16LE(offset + 32);
    names.push(buffer.slice(offset + 46, offset + 46 + nameLen).toString("utf8"));
    offset += 46 + nameLen + extraLen + commentLen;
  }
  return names;
}

function snippet(xml, pattern, chars = 500) {
  const match = xml.match(pattern);
  if (!match) return "(no match)";
  const start = Math.max(0, match.index - 40);
  return xml.slice(start, start + chars).replace(/\s+/g, " ");
}

function count(xml, pattern) {
  return (String(xml || "").match(pattern) || []).length;
}

try {
  const sourceFods = fs.readFileSync(fodsPath, "utf8");
  console.log("=== 1. Hand-written FODS ===");
  console.log("chart:chart:", /<chart:chart\b/i.test(sourceFods));
  console.log("chart:class bar:", /chart:class="chart:bar"/i.test(sourceFods));
  console.log("draw:object:", /<draw:object\b/i.test(sourceFods));
  console.log("draw:frame:", /<draw:frame\b/i.test(sourceFods));
  console.log("draw:image:", /<draw:image\b/i.test(sourceFods));
  console.log("plot-area range:", snippet(sourceFods, /table:cell-range-address="DoanhThu\.A1:DoanhThu\.B5"/i, 120));
  console.log("series values:", snippet(sourceFods, /chart:values-cell-range-address="DoanhThu\.B2:DoanhThu\.B5"/i, 160));
  console.log("title:", /Doanh thu theo tháng/.test(sourceFods));
  console.log("source T1 120 / T4 200:", sourceFods.includes(">120<") && sourceFods.includes(">200<"));

  const xlsx = convertWithSoffice(fodsPath, "xlsx", path.join(tmp, "xlsx"), {
    profileDir: path.join(tmp, "profile-xlsx"),
    timeoutMs: 45000
  });
  console.log("\n=== 2. soffice FODS → XLSX ===");
  console.log("xlsx:", xlsx, fs.statSync(xlsx).size, "bytes");
  const names = listZipNames(xlsx);
  const chartish = names.filter(n => /chart|drawing|chartsheet/i.test(n));
  console.log("zip entries:", names.length);
  console.log("chart/drawing entries:\n ", chartish.length ? chartish.join("\n  ") : "(none)");
  for (const entry of [
    "xl/workbook.xml",
    "xl/worksheets/sheet1.xml",
    "xl/worksheets/_rels/sheet1.xml.rels",
    "xl/drawings/drawing1.xml",
    "xl/charts/chart1.xml",
    "xl/charts/_rels/chart1.xml.rels"
  ]) {
    const data = readZipEntry(xlsx, entry);
    if (!data) {
      console.log(`MISSING ${entry}`);
      continue;
    }
    const text = data.toString("utf8");
    console.log(`\n--- ${entry} (${text.length} chars) ---`);
    if (/chart|drawing|c:barChart|c:lineChart|c:ser|xdr:from/i.test(text)) {
      console.log("contains chart/drawing markup");
      console.log(snippet(text, /c:barChart|c:lineChart|c:pieChart|c:areaChart|c:chart |<xdr:from|charts\/chart/i, 700));
    } else {
      console.log("no chart/drawing markup");
      if (entry.includes("sheet")) console.log("sample cells:", snippet(text, /<c /i, 280));
    }
  }

  const roundFods = convertWithSoffice(xlsx, "fods", path.join(tmp, "fods"), {
    profileDir: path.join(tmp, "profile-fods"),
    timeoutMs: 45000
  });
  const imported = fs.readFileSync(roundFods, "utf8");
  const capturedPath = path.join(tmp, "imported.fods");
  fs.writeFileSync(capturedPath, imported);
  console.log("\n=== 3. soffice XLSX → FODS (đúng đường import VN Sheet) ===");
  console.log("fods:", roundFods, imported.length, "chars");
  console.log("chart:chart:", /<chart:chart\b/i.test(imported), "count=", count(imported, /<chart:chart\b/gi));
  console.log("chart:class:", snippet(imported, /chart:class="[^"]+"/i, 80));
  console.log("draw:object:", /<draw:object\b/i.test(imported), "count=", count(imported, /<draw:object\b/gi));
  console.log("draw:frame:", /<draw:frame\b/i.test(imported), "count=", count(imported, /<draw:frame\b/gi));
  console.log("draw:image:", /<draw:image\b/i.test(imported), "count=", count(imported, /<draw:image\b/gi));
  console.log("office:binary-data:", /<office:binary-data/i.test(imported));
  console.log("xlink:href ObjectReplacements:", /ObjectReplacements/i.test(imported));
  console.log("plot-area:", /<chart:plot-area\b/i.test(imported));
  console.log("cell-range-address:", snippet(imported, /table:cell-range-address="[^"]+"/i, 160));
  console.log("values-cell-range-address:", snippet(imported, /chart:values-cell-range-address="[^"]+"/i, 180));
  console.log("label-cell-address:", snippet(imported, /chart:label-cell-address="[^"]+"/i, 160));
  console.log("categories:", snippet(imported, /<chart:categories\b[^>]*>/i, 180));
  console.log("title text:", snippet(imported, /Doanh thu theo tháng|chart:title/i, 160));
  console.log("DoanhThu sheet:", imported.includes('table:name="DoanhThu"') || imported.includes("DoanhThu"));
  console.log("source T1/120/T4/200:", imported.includes("T1") && imported.includes(">120<") && imported.includes("T4") && /200/.test(imported));
  const chartBlock = imported.match(/<chart:chart\b[\s\S]{0,2500}/i);
  if (chartBlock) console.log("\nchart:chart snippet:\n", chartBlock[0].slice(0, 1800));
  else console.log("\nNO chart:chart in round-trip FODS");
  const frameBlock = imported.match(/<draw:frame\b[\s\S]{0,800}/i);
  if (frameBlock) console.log("\ndraw:frame snippet:\n", frameBlock[0].slice(0, 700));

  const { SheetAdapter } = await import("../../adapters/libreoffice/sheet/sheet-adapter.js");
  const workbook = new SheetAdapter(null).parseFods(imported);
  console.log("\n=== 4. Current parseFods() on import FODS ===");
  console.log("sheets:", workbook.sheets);
  const sheetName = workbook.sheets.find(name => /doanh/i.test(name)) || workbook.sheets[0];
  const data = workbook.sheetsData[sheetName];
  console.log("active sheet data name:", sheetName);
  console.log("A1/B1/A2/B2/B5:", data?.get("A1")?.val, data?.get("B1")?.val, data?.get("A2")?.val, data?.get("B2")?.val, data?.get("B5")?.val);
  console.log("chartsBySheet:", JSON.stringify(workbook.chartsBySheet || null, null, 2));
  const extraSheets = workbook.sheets.filter(name => name !== "DoanhThu" && name !== sheetName);
  console.log("extra sheets (possible local-table leak):", extraSheets);
} finally {
  console.log("\nKept probe files at", tmp);
}
