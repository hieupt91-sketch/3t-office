/**
 * Probe: does a hand-written ODF DataPilot survive soffice FODS→XLSX→FODS,
 * and does current parseFods() recognize it? Independent of VN serializers.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { convertWithSoffice } from "../helpers/soffice-convert.mjs";
import { readZipEntry } from "../helpers/zip-package.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const fodsPath = path.join(root, "tests", "fixtures", "real-office-samples", "src", "sample-sheet-pivot.fods");
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "vno-probe-pivot-"));

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

function snippet(xml, pattern, chars = 400) {
  const match = xml.match(pattern);
  if (!match) return "(no match)";
  const start = Math.max(0, match.index - 40);
  return xml.slice(start, start + chars).replace(/\s+/g, " ");
}

try {
  const sourceFods = fs.readFileSync(fodsPath, "utf8");
  console.log("=== 1. Hand-written FODS ===");
  console.log("data-pilot-tables:", /<table:data-pilot-tables/i.test(sourceFods));
  console.log("database-range:", /<table:database-range/i.test(sourceFods));
  console.log("source-cell-range:", /<table:source-cell-range/i.test(sourceFods));
  console.log("field Khu vực row:", /table:source-field-name="Khu vực"[^>]*table:orientation="row"/i.test(sourceFods)
    || /table:orientation="row"[^>]*table:source-field-name="Khu vực"/i.test(sourceFods));
  console.log("Nguồn T1 Bắc 120:", sourceFods.includes("DoanhThuNguon") && sourceFods.includes(">120<"));

  const xlsx = convertWithSoffice(fodsPath, "xlsx", path.join(tmp, "xlsx"), {
    profileDir: path.join(tmp, "profile-xlsx"),
    timeoutMs: 30000
  });
  console.log("\n=== 2. soffice FODS → XLSX ===");
  console.log("xlsx:", xlsx, fs.statSync(xlsx).size, "bytes");
  const names = listZipNames(xlsx);
  const pivotish = names.filter(n => /pivot|cache/i.test(n));
  console.log("zip entries:", names.length);
  console.log("pivot/cache entries:\n ", pivotish.length ? pivotish.join("\n  ") : "(none)");
  for (const entry of [
    "xl/workbook.xml",
    "xl/pivotCache/pivotCacheDefinition1.xml",
    "xl/pivotTables/pivotTable1.xml",
    "xl/worksheets/sheet1.xml",
    "xl/worksheets/sheet2.xml"
  ]) {
    const data = readZipEntry(xlsx, entry);
    if (!data) {
      console.log(`MISSING ${entry}`);
      continue;
    }
    const text = data.toString("utf8");
    console.log(`\n--- ${entry} (${text.length} chars) ---`);
    if (/pivot/i.test(text) || /cache/i.test(text)) {
      console.log("contains pivot/cache markup");
      console.log(snippet(text, /pivot|cacheSource|pivotCache/i, 500));
    } else {
      console.log("no pivot/cache markup");
      if (entry.includes("sheet")) {
        console.log("sample cells:", snippet(text, /<c /i, 300));
      }
    }
  }

  const roundFods = convertWithSoffice(xlsx, "fods", path.join(tmp, "fods"), {
    profileDir: path.join(tmp, "profile-fods"),
    timeoutMs: 30000
  });
  const imported = fs.readFileSync(roundFods, "utf8");
  console.log("\n=== 3. soffice XLSX → FODS (đúng đường import VN Sheet) ===");
  console.log("fods:", roundFods, imported.length, "chars");
  console.log("data-pilot-tables:", /<table:data-pilot-tables/i.test(imported));
  console.log("data-pilot-table:", /<table:data-pilot-table/i.test(imported));
  console.log("source-cell-range:", /<table:source-cell-range/i.test(imported));
  console.log("database-range:", /<table:database-range/i.test(imported));
  console.log("DoanhThuNguon:", imported.includes("DoanhThuNguon"));
  console.log("BangTongHop:", imported.includes("BangTongHop"));
  console.log("Khu vực:", imported.includes("Khu vực"));
  console.log("Doanh thu:", imported.includes("Doanh thu"));
  const dp = imported.match(/<table:data-pilot-table[\s\S]{0,2500}/i);
  if (dp) console.log("\nDataPilot snippet:\n", dp[0].slice(0, 1800));
  else console.log("\nNO DataPilot in round-trip FODS");

  const { SheetAdapter } = await import("../../adapters/libreoffice/sheet/sheet-adapter.js");
  const workbook = new SheetAdapter(null).parseFods(imported);
  console.log("\n=== 4. Current parseFods() on import FODS ===");
  console.log("sheets:", workbook.sheets);
  const source = workbook.sheetsData["DoanhThuNguon"] || workbook.sheetsData[workbook.sheets[0]];
  const result = workbook.sheetsData["BangTongHop"] || workbook.sheetsData[workbook.sheets[1]];
  console.log("source A1/C2:", source?.get("A1")?.val, source?.get("C2")?.val);
  console.log("result A1/B2/E5:", result?.get("A1")?.val, result?.get("B2")?.val, result?.get("E5")?.val);
  console.log("pivotTablesBySheet:", JSON.stringify(workbook.pivotTablesBySheet || null));
} finally {
  console.log("\nKept probe files at", tmp);
}
