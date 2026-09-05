/**
 * Shared OOXML ZIP patcher (no third-party library).
 *
 * Contract: take real Office package bytes (XLSX/PPTX/DOCX = ZIP of XML)
 * plus a map of entry-name → new XML/bytes, return new package bytes.
 *
 * Node-only (zlib / fs). Do not import this module from browser UI adapters.
 * SheetAdapter runs in pywebview and must not pull `node:fs`.
 *
 * Python twin: adapters/libreoffice/common/ooxml_zip_patch.py
 * (production File → Lưu goes through main.py after soffice convert).
 */
import fs from "node:fs";
import zlib from "node:zlib";

function crc32(buffer) {
  let crc = ~0;
  for (let index = 0; index < buffer.length; index++) {
    crc ^= buffer[index];
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (~crc) >>> 0;
}

function u16(value) {
  const buffer = Buffer.alloc(2);
  buffer.writeUInt16LE(value);
  return buffer;
}

function u32(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32LE(value);
  return buffer;
}

/**
 * @param {{ name: string, data: Buffer|string, store?: boolean }[]} entries
 * @returns {Buffer}
 */
export function createZip(entries) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const entry of entries) {
    const name = Buffer.from(entry.name, "utf8");
    const uncompressed = Buffer.isBuffer(entry.data) ? entry.data : Buffer.from(entry.data, "utf8");
    const store = entry.store === true;
    const compressed = store ? uncompressed : zlib.deflateRawSync(uncompressed);
    const method = store ? 0 : 8;
    const crc = crc32(uncompressed);
    const local = Buffer.concat([
      Buffer.from([0x50, 0x4b, 0x03, 0x04]),
      u16(20),
      u16(0),
      u16(method),
      u16(0),
      u16(0),
      u32(crc),
      u32(compressed.length),
      u32(uncompressed.length),
      u16(name.length),
      u16(0),
      name,
      compressed
    ]);
    const central = Buffer.concat([
      Buffer.from([0x50, 0x4b, 0x01, 0x02]),
      u16(20),
      u16(20),
      u16(0),
      u16(method),
      u16(0),
      u16(0),
      u32(crc),
      u32(compressed.length),
      u32(uncompressed.length),
      u16(name.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(offset),
      name
    ]);
    locals.push(local);
    centrals.push(central);
    offset += local.length;
  }
  const centralDir = Buffer.concat(centrals);
  const eocd = Buffer.concat([
    Buffer.from([0x50, 0x4b, 0x05, 0x06]),
    u16(0),
    u16(0),
    u16(entries.length),
    u16(entries.length),
    u32(centralDir.length),
    u32(offset),
    u16(0)
  ]);
  return Buffer.concat([...locals, centralDir, eocd]);
}

/**
 * @param {string|Buffer} zipPathOrBuffer
 * @returns {{ name: string, compressedSize: number, uncompressedSize: number }[]}
 */
export function listZipEntries(zipPathOrBuffer) {
  const buffer = Buffer.isBuffer(zipPathOrBuffer) ? zipPathOrBuffer : fs.readFileSync(zipPathOrBuffer);
  let eocd = -1;
  const searchFrom = Math.max(0, buffer.length - 22 - 65535);
  for (let index = buffer.length - 22; index >= searchFrom; index--) {
    if (buffer.readUInt32LE(index) === 0x06054b50) {
      eocd = index;
      break;
    }
  }
  if (eocd < 0) throw new Error("ZIP end of central directory not found");
  const cdOffset = buffer.readUInt32LE(eocd + 16);
  const cdEntries = buffer.readUInt16LE(eocd + 10);
  const entries = [];
  let offset = cdOffset;
  for (let index = 0; index < cdEntries; index++) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) throw new Error("Invalid ZIP central directory");
    const compSize = buffer.readUInt32LE(offset + 20);
    const uncompSize = buffer.readUInt32LE(offset + 24);
    const nameLen = buffer.readUInt16LE(offset + 28);
    const extraLen = buffer.readUInt16LE(offset + 30);
    const commentLen = buffer.readUInt16LE(offset + 32);
    const name = buffer.slice(offset + 46, offset + 46 + nameLen).toString("utf8");
    entries.push({ name, compressedSize: compSize, uncompressedSize: uncompSize });
    offset += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

/**
 * @param {string|Buffer} zipPathOrBuffer
 * @param {string} entryName
 * @returns {Buffer|null}
 */
export function readZipEntry(zipPathOrBuffer, entryName) {
  const buffer = Buffer.isBuffer(zipPathOrBuffer) ? zipPathOrBuffer : fs.readFileSync(zipPathOrBuffer);
  let eocd = -1;
  const searchFrom = Math.max(0, buffer.length - 22 - 65535);
  for (let index = buffer.length - 22; index >= searchFrom; index--) {
    if (buffer.readUInt32LE(index) === 0x06054b50) {
      eocd = index;
      break;
    }
  }
  if (eocd < 0) throw new Error("ZIP end of central directory not found");
  const cdOffset = buffer.readUInt32LE(eocd + 16);
  const cdEntries = buffer.readUInt16LE(eocd + 10);
  let offset = cdOffset;
  for (let index = 0; index < cdEntries; index++) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) throw new Error("Invalid ZIP central directory");
    const method = buffer.readUInt16LE(offset + 10);
    const compSize = buffer.readUInt32LE(offset + 20);
    const nameLen = buffer.readUInt16LE(offset + 28);
    const extraLen = buffer.readUInt16LE(offset + 30);
    const commentLen = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.slice(offset + 46, offset + 46 + nameLen).toString("utf8");
    if (name === entryName) {
      const nameLenLocal = buffer.readUInt16LE(localOffset + 26);
      const extraLenLocal = buffer.readUInt16LE(localOffset + 28);
      const dataStart = localOffset + 30 + nameLenLocal + extraLenLocal;
      const compressed = buffer.slice(dataStart, dataStart + compSize);
      if (method === 0) return compressed;
      if (method === 8) return zlib.inflateRawSync(compressed);
      throw new Error(`Unsupported ZIP compression method ${method} for ${entryName}`);
    }
    offset += 46 + nameLen + extraLen + commentLen;
  }
  return null;
}

/**
 * Replace named ZIP entries and rebuild the package. Unmentioned entries are
 * copied unchanged (decompressed then recompressed). Directory entries skipped.
 *
 * @param {string|Buffer} zipPathOrBuffer
 * @param {Record<string, Buffer|string>} replacements
 * @returns {Buffer}
 */
export function replaceZipEntries(zipPathOrBuffer, replacements = {}) {
  const entries = [];
  for (const listed of listZipEntries(zipPathOrBuffer)) {
    if (!listed.name || listed.name.endsWith("/")) continue;
    const next = replacements[listed.name];
    let data;
    if (next !== undefined) {
      data = Buffer.isBuffer(next) ? next : Buffer.from(String(next), "utf8");
    } else {
      data = readZipEntry(zipPathOrBuffer, listed.name);
      if (!data) continue;
    }
    entries.push({ name: listed.name, data });
  }
  return createZip(entries);
}

/** Alias used by Sheet/Slides native-export post-process. */
export function patchOoxmlZip(zipPathOrBuffer, replacements) {
  return replaceZipEntries(zipPathOrBuffer, replacements);
}
