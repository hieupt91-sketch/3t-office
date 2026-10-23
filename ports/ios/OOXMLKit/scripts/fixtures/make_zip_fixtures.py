#!/usr/bin/env python3
"""Sinh fixture ZIP/DEFLATE cho OOXMLZipTests (chỉ dùng thư viện chuẩn Python).

Chạy:  python3 scripts/fixtures/make_zip_fixtures.py Tests/OOXMLTestSupport/Fixtures
Các tệp sinh ra được commit; script giữ lại để tái tạo/tra cứu cách tạo.
Dữ liệu tất định (seed cố định) để chạy lại cho cùng kết quả.
"""
import io, os, random, struct, sys, zipfile, zlib

OUT = sys.argv[1] if len(sys.argv) > 1 else "Tests/OOXMLTestSupport/Fixtures"
ZDIR = os.path.join(OUT, "zip")
DDIR = os.path.join(OUT, "deflate")
os.makedirs(ZDIR, exist_ok=True)
os.makedirs(DDIR, exist_ok=True)
rnd = random.Random(20261023)

XML = ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet>' +
       ''.join(f'<row r="{i}"><c r="A{i}"><v>{i * 3}</v></c><c r="B{i}" t="s"><v>{i % 7}</v></c></row>' for i in range(1, 400)) +
       '</worksheet>').encode()
RANDOM = bytes(rnd.getrandbits(8) for _ in range(40_000))


def fixed_time(zi):
    zi.date_time = (2026, 10, 23, 9, 30, 0)
    return zi


def write_zip(path, files, compression=zipfile.ZIP_DEFLATED, comment=b""):
    with zipfile.ZipFile(path, "w", compression) as zf:
        for name, data in files:
            zi = fixed_time(zipfile.ZipInfo(name))
            zi.compress_type = compression
            zf.writestr(zi, data)
        zf.comment = comment


base_files = [
    ("[Content_Types].xml", b'<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>'),
    ("xl/worksheets/sheet1.xml", XML),
    ("xl/media/random.bin", RANDOM),
    ("empty.txt", b""),
    ("folder/", b""),
]
write_zip(os.path.join(ZDIR, "basic-deflate.zip"), base_files)
write_zip(os.path.join(ZDIR, "stored.zip"), base_files, zipfile.ZIP_STORED)
write_zip(os.path.join(ZDIR, "comment.zip"), base_files[:2], comment="Gói có chú thích — 3T".encode())
write_zip(os.path.join(ZDIR, "unicode-names.zip"),
          [("Tài liệu/báo cáo tháng 10.xml", "<a>Xin chào Việt Nam</a>".encode()),
           ("日本語/ファイル.txt", "テスト".encode())])

big = ('<?xml version="1.0"?><sst>' + ''.join(f'<si><t>Mặt hàng số {i} — tồn kho {i * 17 % 1000}</t></si>' for i in range(60_000)) + '</sst>').encode()
with zipfile.ZipFile(os.path.join(ZDIR, "large-text.zip"), "w", zipfile.ZIP_DEFLATED, compresslevel=9) as zf:
    zf.writestr(fixed_time(zipfile.ZipInfo("xl/sharedStrings.xml")), big, compress_type=zipfile.ZIP_DEFLATED, compresslevel=9)


class Unseekable(io.RawIOBase):
    """Luồng không seek được => zipfile dùng data descriptor (cờ bit 3)."""
    def __init__(self):
        self.buf = bytearray()
    def writable(self):
        return True
    def write(self, b):
        self.buf += b
        return len(b)
    def tell(self):
        return len(self.buf)
    def seekable(self):
        return False

s = Unseekable()
with zipfile.ZipFile(s, "w", zipfile.ZIP_DEFLATED) as zf:
    for name, data in base_files[:3]:
        with zf.open(fixed_time(zipfile.ZipInfo(name, date_time=(2026, 10, 23, 9, 30, 0))), "w") as w:
            w.write(data)
open(os.path.join(ZDIR, "data-descriptor.zip"), "wb").write(bytes(s.buf))

with zipfile.ZipFile(os.path.join(ZDIR, "zip64-local.zip"), "w", zipfile.ZIP_DEFLATED) as zf:
    for name, data in base_files[:3]:
        zi = fixed_time(zipfile.ZipInfo(name))
        zi.compress_type = zipfile.ZIP_DEFLATED
        with zf.open(zi, "w", force_zip64=True) as w:
            w.write(data)


def raw_zip(entries, comment=b""):
    """Bộ ghi ZIP tối giản để tạo ca hỏng/đặc biệt có chủ đích.
    entries: list of dict(name: bytes, data: bytes, flags, method, crc)"""
    out = bytearray()
    cd = bytearray()
    for e in entries:
        name = e["name"]
        data = e["data"]
        method = e.get("method", 0)
        comp = data if method == 0 else zlib.compress(data)[2:-4]
        crc = e.get("crc", zlib.crc32(data) & 0xFFFFFFFF)
        flags = e.get("flags", 0)
        off = len(out)
        out += struct.pack("<IHHHHHIIIHH", 0x04034B50, 20, flags, method, 0, 0x0021, crc, len(comp), len(data), len(name), 0)
        out += name + comp
        cd += struct.pack("<IHHHHHHIIIHHHHHII", 0x02014B50, 20, 20, flags, method, 0, 0x0021, crc, len(comp), len(data), len(name), 0, 0, 0, 0, 0, off)
        cd += name
    cdoff = len(out)
    out += cd
    out += struct.pack("<IHHHHIIH", 0x06054B50, 0, 0, len(entries), len(entries), len(cd), cdoff, len(comment)) + comment
    return bytes(out)

ok = b"hello OOXML"
open(os.path.join(ZDIR, "cp437-name.zip"), "wb").write(raw_zip([{"name": b"r\x82sum\x82.txt", "data": ok}]))
open(os.path.join(ZDIR, "bad-crc.zip"), "wb").write(raw_zip([{"name": b"a.txt", "data": ok, "method": 8, "crc": 0x12345678}]))
open(os.path.join(ZDIR, "encrypted-flag.zip"), "wb").write(raw_zip([{"name": b"a.txt", "data": ok, "flags": 1}]))
open(os.path.join(ZDIR, "path-traversal.zip"), "wb").write(raw_zip([{"name": b"../../evil.txt", "data": ok}]))
open(os.path.join(ZDIR, "duplicate-names.zip"), "wb").write(raw_zip([{"name": b"a.txt", "data": ok}, {"name": b"a.txt", "data": b"other"}]))
# Phương thức 12 (bzip2) — chỉ đổi trường method, dữ liệu giữ nguyên để kiểm sao chép nguyên trạng.
buf = bytearray(raw_zip([{"name": b"a.txt", "data": ok}, {"name": b"b.txt", "data": ok}]))
struct.pack_into("<H", buf, 8, 12)                      # local header method của mục đầu
cd_off = struct.unpack_from("<I", buf, len(buf) - 6)[0]
struct.pack_into("<H", buf, cd_off + 10, 12)            # central directory method của mục đầu
open(os.path.join(ZDIR, "unsupported-method.zip"), "wb").write(bytes(buf))
full = open(os.path.join(ZDIR, "basic-deflate.zip"), "rb").read()
open(os.path.join(ZDIR, "truncated.zip"), "wb").write(full[: len(full) // 2])
open(os.path.join(ZDIR, "not-a-zip.bin"), "wb").write(b"PK\x03\x04 nhung khong phai zip " * 10)

# Luồng DEFLATE thô do zlib tạo, nhiều chiến lược => kiểm Inflate với mọi kiểu khối.
samples = {"xml": XML, "random": RANDOM[:20_000], "zeros": bytes(100_000), "short": b"a", "empty": b""}
strategies = {"default": (6, zlib.Z_DEFAULT_STRATEGY), "best": (9, zlib.Z_DEFAULT_STRATEGY),
              "fixed": (6, zlib.Z_FIXED), "huffman": (6, zlib.Z_HUFFMAN_ONLY), "rle": (6, zlib.Z_RLE),
              "stored": (0, zlib.Z_DEFAULT_STRATEGY)}
for sname, data in samples.items():
    open(os.path.join(DDIR, f"{sname}.raw"), "wb").write(data)
    for stname, (lvl, st) in strategies.items():
        c = zlib.compressobj(lvl, zlib.DEFLATED, -15, 9, st)
        open(os.path.join(DDIR, f"{sname}.{stname}.deflate"), "wb").write(c.compress(data) + c.flush())
print("ZIP fixtures written to", OUT)
