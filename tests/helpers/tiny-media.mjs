/**
 * Tiny but structurally valid media files for soffice round-trip probes.
 * Not intended to be a pretty movie — they have real MP3/MP4/WAV containers
 * so LibreOffice MIME/extension detection and byte-copy export are meaningful.
 */
function u32be(value) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32BE(value >>> 0);
  return buffer;
}

function box(type, payload) {
  const body = Buffer.isBuffer(payload) ? payload : Buffer.concat(payload);
  return Buffer.concat([u32be(8 + body.length), Buffer.from(type, "ascii"), body]);
}

/** MPEG-1 Layer III, 128 kbps, 44100 Hz, stereo, one silent frame (~417 bytes). */
export function createTinyMp3() {
  const frameSize = 417;
  const frame = Buffer.alloc(frameSize, 0);
  frame[0] = 0xff;
  frame[1] = 0xfb;
  frame[2] = 0x90;
  frame[3] = 0x04;
  return frame;
}

/**
 * Minimal ISO-BMFF MP4: ftyp + moov/mvhd + empty trak + mdat.
 * Recognizable as video/mp4 by magic (`ftyp`) and file extension.
 */
export function createTinyMp4() {
  const ftyp = box("ftyp", [
    Buffer.from("isom"),
    u32be(0x200),
    Buffer.from("isom"),
    Buffer.from("iso2"),
    Buffer.from("mp41")
  ]);
  const mvhd = box("mvhd", Buffer.alloc(108));
  const tkhd = box("tkhd", Buffer.alloc(92));
  const mdhd = box("mdhd", Buffer.alloc(32));
  const hdlr = box("hdlr", Buffer.concat([
    Buffer.alloc(8),
    Buffer.from("vide"),
    Buffer.alloc(12),
    Buffer.from("VideoHandler\0")
  ]));
  const minf = box("minf", [box("vmhd", Buffer.alloc(12)), box("dinf", Buffer.alloc(0)), box("stbl", Buffer.alloc(0))]);
  const mdia = box("mdia", [mdhd, hdlr, minf]);
  const trak = box("trak", [tkhd, mdia]);
  const moov = box("moov", [mvhd, trak]);
  const mdat = box("mdat", Buffer.from([0x00, 0x00, 0x00, 0x01, 0x09, 0x10]));
  return Buffer.concat([ftyp, moov, mdat]);
}

/** 16-bit PCM WAV, 8000 Hz mono, 64 silent samples (~172 bytes). */
export function createTinyWav() {
  const sampleRate = 8000;
  const samples = Buffer.alloc(64 * 2);
  const dataSize = samples.length;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);
  samples.copy(buffer, 44);
  return buffer;
}

export function toDataUrl(mime, buffer) {
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

export function bytesFromDataUrl(src) {
  const match = String(src || "").match(/^data:[^;]+;base64,([\s\S]+)$/);
  if (!match) return null;
  return Buffer.from(match[1].replace(/\s+/g, ""), "base64");
}
