"""Mã hóa / giải mã tệp Office (docx, xlsx, pptx) bằng mật khẩu mở tệp: ECMA-376 "Agile Encryption" (MS-OFFCRYPTO 2.3.4).

- Ghi: gói OOXML (zip) -> vỏ CFB gồm hai luồng EncryptionInfo + EncryptedPackage (AES-256-CBC, SHA-512, 100000 vòng băm).
- Đọc: Agile (Office 2010+) và Standard (Office 2007, AES-128 + SHA-1); sai mật khẩu báo `WrongPasswordError`.
- Chỉ dùng thư viện `cryptography` đã có sẵn trong bộ cài (dùng cho chữ ký bản vá); không phụ thuộc mới.
- Mật khẩu chỉ nằm trong bộ nhớ trong lúc gọi hàm: không ghi tệp, không ghi nhật ký, không đưa vào dòng lệnh.
"""
from __future__ import annotations

import base64
import hashlib
import hmac
import os
import struct
import xml.etree.ElementTree as ET
from dataclasses import dataclass

from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

CFB_SIGNATURE = b"\xD0\xCF\x11\xE0\xA1\xB1\x1A\xE1"
ENDOFCHAIN = 0xFFFFFFFE
FREESECT = 0xFFFFFFFF
FATSECT = 0xFFFFFFFD
DIFSECT = 0xFFFFFFFC
NOSTREAM = 0xFFFFFFFF
SECTOR = 512
MINI_SECTOR = 64
MINI_CUTOFF = 4096

SPIN_COUNT = 100000
SEGMENT = 4096

# Khóa khối cố định theo MS-OFFCRYPTO 2.3.4.13 / 2.3.4.14 / 2.3.4.15
BLOCK_VERIFIER_INPUT = bytes.fromhex("fea7d2763b4b9e79")
BLOCK_VERIFIER_VALUE = bytes.fromhex("d7aa0f6d3061344e")
BLOCK_ENCRYPTED_KEY = bytes.fromhex("146e0be7abacd0d6")
BLOCK_HMAC_KEY = bytes.fromhex("5fb2ad010cb9e1f6")
BLOCK_HMAC_VALUE = bytes.fromhex("a0677f02b22c8433")

NS_ENC = "http://schemas.microsoft.com/office/2006/encryption"
NS_PWD = "http://schemas.microsoft.com/office/2006/keyEncryptor/password"


class OfficeEncryptionError(Exception):
    """Tệp không đọc được hoặc không phải tệp Office mã hóa hợp lệ."""


class WrongPasswordError(OfficeEncryptionError):
    """Mật khẩu không đúng."""


def is_encrypted_package(data: bytes) -> bool:
    """Tệp có vỏ CFB (chữ ký OLE) thay vì zip OOXML: dấu hiệu của tệp Office đã mã hóa."""
    return data[:8] == CFB_SIGNATURE


# ----------------------------------------------------------------------------------------------
# Hàm mật mã
# ----------------------------------------------------------------------------------------------
def _hash(name: str, *parts: bytes) -> bytes:
    h = hashlib.new(name.lower().replace("-", ""))
    for part in parts:
        h.update(part)
    return h.digest()


def _aes_cbc(key: bytes, iv: bytes, data: bytes, encrypt: bool) -> bytes:
    cipher = Cipher(algorithms.AES(key), modes.CBC(iv))
    op = cipher.encryptor() if encrypt else cipher.decryptor()
    return op.update(data) + op.finalize()


def _pad(data: bytes, block: int) -> bytes:
    remainder = len(data) % block
    return data if remainder == 0 else data + b"\x00" * (block - remainder)


def _fit(data: bytes, size: int, pad: int = 0x36) -> bytes:
    return data[:size] if len(data) >= size else data + bytes([pad]) * (size - len(data))


def _password_hash(password: str, salt: bytes, algorithm: str, spin: int) -> bytes:
    h = _hash(algorithm, salt, password.encode("utf-16-le"))
    for i in range(spin):
        h = _hash(algorithm, struct.pack("<I", i), h)
    return h


def _derive_key(h: bytes, block_key: bytes, algorithm: str, key_bits: int) -> bytes:
    return _fit(_hash(algorithm, h, block_key), key_bits // 8)


# ----------------------------------------------------------------------------------------------
# Vỏ CFB tối giản (ghi) và đọc
# ----------------------------------------------------------------------------------------------
def _dir_entry(name: str, kind: int, color: int, left: int, right: int, child: int, start: int, size: int) -> bytes:
    raw = name.encode("utf-16-le")
    name_field = (raw + b"\x00\x00").ljust(64, b"\x00")
    name_len = len(raw) + 2 if name else 0
    return (
        name_field + struct.pack("<H", name_len) + bytes([kind, color])
        + struct.pack("<III", left, right, child)
        + b"\x00" * 16 + struct.pack("<I", 0) + b"\x00" * 16
        + struct.pack("<I", start) + struct.pack("<Q", size)
    )


def _build_cfb(streams: dict[str, bytes]) -> bytes:
    """Ghi vỏ CFB (phiên bản 3, sector 512 byte) với các luồng ở gốc; luồng < 4096 byte vào mini stream."""
    names = sorted(streams, key=lambda n: (len(n), n.upper()))
    small = [n for n in names if len(streams[n]) < MINI_CUTOFF]
    big = [n for n in names if len(streams[n]) >= MINI_CUTOFF]

    # Mini stream: ghép các luồng nhỏ, mỗi luồng làm tròn tới 64 byte.
    mini_data = bytearray()
    mini_start: dict[str, int] = {}
    for n in small:
        mini_start[n] = len(mini_data) // MINI_SECTOR
        mini_data += streams[n].ljust((len(streams[n]) + MINI_SECTOR - 1) // MINI_SECTOR * MINI_SECTOR, b"\x00")
    mini_sectors = len(mini_data) // MINI_SECTOR
    mini_fat = bytearray()
    for n in small:
        first = mini_start[n]
        count = (len(streams[n]) + MINI_SECTOR - 1) // MINI_SECTOR
        for i in range(count):
            mini_fat += struct.pack("<I", first + i + 1 if i < count - 1 else ENDOFCHAIN)
    mini_fat = bytearray(mini_fat.ljust((len(mini_fat) + SECTOR - 1) // SECTOR * SECTOR, b"\xFF")) if mini_fat else bytearray()

    def sectors_for(size: int) -> int:
        return (size + SECTOR - 1) // SECTOR

    big_sectors = {n: sectors_for(len(streams[n])) for n in big}
    mini_container_sectors = sectors_for(len(mini_data))
    mini_fat_sectors = len(mini_fat) // SECTOR
    entries = 1 + len(names)  # gốc + luồng
    dir_sectors = (entries * 128 + SECTOR - 1) // SECTOR

    data_total = sum(big_sectors.values()) + mini_container_sectors + mini_fat_sectors + dir_sectors
    # FAT phải phủ cả chính nó và các sector DIFAT (mỗi sector DIFAT chứa 127 chỉ số FAT + con trỏ kế tiếp).
    fat_sectors = 1
    difat_sectors = 0
    while True:
        difat_sectors = max(0, fat_sectors - 109 + 126) // 127
        if data_total + fat_sectors + difat_sectors <= fat_sectors * (SECTOR // 4):
            break
        fat_sectors += 1

    # Bố trí sector: [luồng lớn...][mini container][mini FAT][thư mục][FAT]
    cursor = 0
    layout: dict[str, int] = {}
    for n in big:
        layout[n] = cursor
        cursor += big_sectors[n]
    mini_container_start = cursor if mini_container_sectors else ENDOFCHAIN
    cursor += mini_container_sectors
    mini_fat_start = cursor if mini_fat_sectors else ENDOFCHAIN
    cursor += mini_fat_sectors
    dir_start = cursor
    cursor += dir_sectors
    difat_start = cursor if difat_sectors else ENDOFCHAIN
    cursor += difat_sectors
    fat_start = cursor
    total_sectors = cursor + fat_sectors

    fat = [FREESECT] * (fat_sectors * (SECTOR // 4))

    def chain(first: int, count: int) -> None:
        for i in range(count):
            fat[first + i] = first + i + 1 if i < count - 1 else ENDOFCHAIN

    for n in big:
        chain(layout[n], big_sectors[n])
    if mini_container_sectors:
        chain(mini_container_start, mini_container_sectors)
    if mini_fat_sectors:
        chain(mini_fat_start, mini_fat_sectors)
    chain(dir_start, dir_sectors)
    for i in range(difat_sectors):
        fat[difat_start + i] = DIFSECT
    for i in range(fat_sectors):
        fat[fat_start + i] = FATSECT

    # Thư mục: gốc + các luồng, cây nhị phân tìm kiếm theo (độ dài tên, tên hoa)
    index = {n: i + 1 for i, n in enumerate(names)}
    def tree(lo: int, hi: int) -> tuple[int, dict[int, tuple[int, int]]]:
        links: dict[int, tuple[int, int]] = {}
        def build(a: int, b: int) -> int:
            if a >= b:
                return NOSTREAM
            mid = (a + b) // 2
            left = build(a, mid)
            right = build(mid + 1, b)
            links[mid] = (left, right)
            return mid
        root = build(lo, hi)
        return root, links
    root_child, links = tree(0, len(names))
    root_entry = _dir_entry("Root Entry", 5, 1, NOSTREAM, NOSTREAM, index[names[root_child]] if names else NOSTREAM,
                            mini_container_start if mini_data else ENDOFCHAIN, len(mini_data))
    dir_bytes = bytearray(root_entry)
    for i, n in enumerate(names):
        left, right = links.get(i, (NOSTREAM, NOSTREAM))
        left_id = index[names[left]] if left != NOSTREAM else NOSTREAM
        right_id = index[names[right]] if right != NOSTREAM else NOSTREAM
        if n in streams and len(streams[n]) < MINI_CUTOFF:
            start = mini_start[n]
        else:
            start = layout[n]
        dir_bytes += _dir_entry(n, 2, 1, left_id, right_id, NOSTREAM, start, len(streams[n]))
    dir_bytes = bytearray(dir_bytes.ljust(dir_sectors * SECTOR, b"\x00"))
    for i in range(entries, dir_sectors * SECTOR // 128):
        dir_bytes[i * 128:(i + 1) * 128] = _dir_entry("", 0, 0, NOSTREAM, NOSTREAM, NOSTREAM, 0, 0)

    header = bytearray(SECTOR)
    header[0:8] = CFB_SIGNATURE
    struct.pack_into("<HHHHH", header, 24, 0x003E, 0x0003, 0xFFFE, 9, 6)
    struct.pack_into("<I", header, 40, 0)                 # số sector thư mục (v3 = 0)
    struct.pack_into("<I", header, 44, fat_sectors)
    struct.pack_into("<I", header, 48, dir_start)
    struct.pack_into("<I", header, 52, 0)
    struct.pack_into("<I", header, 56, MINI_CUTOFF)
    struct.pack_into("<I", header, 60, mini_fat_start)
    struct.pack_into("<I", header, 64, mini_fat_sectors)
    struct.pack_into("<I", header, 68, difat_start)      # sector DIFAT đầu
    struct.pack_into("<I", header, 72, difat_sectors)
    fat_ids = [fat_start + i for i in range(fat_sectors)]
    for i in range(109):
        struct.pack_into("<I", header, 76 + i * 4, fat_ids[i] if i < len(fat_ids) else FREESECT)
    difat_bytes = bytearray()
    overflow = fat_ids[109:]
    for d in range(difat_sectors):
        chunk = overflow[d * 127:(d + 1) * 127]
        block = struct.pack("<127I", *(chunk + [FREESECT] * (127 - len(chunk))))
        following = difat_start + d + 1 if d < difat_sectors - 1 else ENDOFCHAIN
        difat_bytes += block + struct.pack("<I", following)

    out = bytearray(header)
    for n in big:
        out += streams[n].ljust(big_sectors[n] * SECTOR, b"\x00")
    out += bytes(mini_data).ljust(mini_container_sectors * SECTOR, b"\x00")
    out += bytes(mini_fat)
    out += bytes(dir_bytes)
    out += bytes(difat_bytes)
    out += struct.pack(f"<{len(fat)}I", *fat)
    assert len(out) == SECTOR + total_sectors * SECTOR
    return bytes(out)


@dataclass
class _Entry:
    name: str
    kind: int
    start: int
    size: int
    left: int
    right: int
    child: int


def _read_cfb(data: bytes) -> dict[str, bytes]:
    """Đọc mọi luồng (theo tên phẳng; luồng trong thư mục con có tên "Thư mục/Luồng")."""
    if data[:8] != CFB_SIGNATURE:
        raise OfficeEncryptionError("Không phải vỏ CFB.")
    sector_shift = struct.unpack_from("<H", data, 30)[0]
    mini_shift = struct.unpack_from("<H", data, 32)[0]
    sector = 1 << sector_shift
    mini = 1 << mini_shift
    fat_count = struct.unpack_from("<I", data, 44)[0]
    dir_start = struct.unpack_from("<I", data, 48)[0]
    cutoff = struct.unpack_from("<I", data, 56)[0]
    mini_fat_start = struct.unpack_from("<I", data, 60)[0]
    difat_start = struct.unpack_from("<I", data, 68)[0]
    difat_count = struct.unpack_from("<I", data, 72)[0]

    def sector_bytes(index: int) -> bytes:
        offset = sector * (index + 1)
        if offset + sector > len(data):
            raise OfficeEncryptionError("Vỏ CFB bị cắt cụt.")
        return data[offset:offset + sector]

    difat = [struct.unpack_from("<I", data, 76 + i * 4)[0] for i in range(109)]
    nxt = difat_start
    for _ in range(difat_count):
        block = sector_bytes(nxt)
        difat += [struct.unpack_from("<I", block, i * 4)[0] for i in range(sector // 4 - 1)]
        nxt = struct.unpack_from("<I", block, sector - 4)[0]
    fat: list[int] = []
    for sid in difat[:fat_count]:
        block = sector_bytes(sid)
        fat += list(struct.unpack(f"<{sector // 4}I", block))

    def read_chain(first: int, size: int | None = None) -> bytes:
        out = bytearray()
        seen = set()
        cur = first
        while cur not in (ENDOFCHAIN, FREESECT) and cur < len(fat):
            if cur in seen:
                raise OfficeEncryptionError("Vỏ CFB có chuỗi sector vòng.")
            seen.add(cur)
            out += sector_bytes(cur)
            cur = fat[cur]
        return bytes(out if size is None else out[:size])

    directory = read_chain(dir_start)
    entries: list[_Entry] = []
    for i in range(len(directory) // 128):
        raw = directory[i * 128:(i + 1) * 128]
        name_len = struct.unpack_from("<H", raw, 64)[0]
        name = raw[:max(0, name_len - 2)].decode("utf-16-le", errors="replace") if name_len >= 2 else ""
        kind = raw[66]
        left, right, child = struct.unpack_from("<III", raw, 68)
        start = struct.unpack_from("<I", raw, 116)[0]
        size = struct.unpack_from("<Q", raw, 120)[0] & 0xFFFFFFFF
        entries.append(_Entry(name, kind, start, size, left, right, child))
    if not entries or entries[0].kind != 5:
        raise OfficeEncryptionError("Vỏ CFB thiếu mục gốc.")

    mini_stream = read_chain(entries[0].start, entries[0].size) if entries[0].size else b""
    mini_fat: list[int] = []
    if mini_fat_start not in (ENDOFCHAIN, FREESECT):
        raw = read_chain(mini_fat_start)
        mini_fat = list(struct.unpack(f"<{len(raw) // 4}I", raw))

    def read_mini(first: int, size: int) -> bytes:
        out = bytearray()
        cur = first
        guard = 0
        while cur not in (ENDOFCHAIN, FREESECT) and cur < len(mini_fat) and guard < 1_000_000:
            out += mini_stream[cur * mini:(cur + 1) * mini]
            cur = mini_fat[cur]
            guard += 1
        return bytes(out[:size])

    streams: dict[str, bytes] = {}

    def walk(node: int, prefix: str, seen: set[int]) -> None:
        if node == NOSTREAM or node >= len(entries) or node in seen:
            return
        seen.add(node)
        entry = entries[node]
        walk(entry.left, prefix, seen)
        walk(entry.right, prefix, seen)
        if entry.kind == 2:
            body = read_mini(entry.start, entry.size) if entry.size < cutoff else read_chain(entry.start, entry.size)
            streams[prefix + entry.name] = body
        elif entry.kind == 1:
            walk(entry.child, prefix + entry.name + "/", seen)

    walk(entries[0].child, "", set())
    return streams


# ----------------------------------------------------------------------------------------------
# Agile: ghi
# ----------------------------------------------------------------------------------------------
def encrypt_package(zip_bytes: bytes, password: str, spin_count: int = SPIN_COUNT) -> bytes:
    """Mã hóa một gói OOXML (zip docx/xlsx/pptx) thành tệp Office có mật khẩu mở (Agile, AES-256, SHA-512)."""
    if not password:
        raise OfficeEncryptionError("Mật khẩu không được để trống.")
    if zip_bytes[:2] != b"PK":
        raise OfficeEncryptionError("Đầu vào không phải gói OOXML (zip).")
    algorithm, key_bits, block, hash_size = "SHA512", 256, 16, 64
    key_data_salt = os.urandom(16)
    secret_key = os.urandom(key_bits // 8)

    # 1. Mã hóa dữ liệu theo từng đoạn 4096 byte
    package = bytearray(struct.pack("<Q", len(zip_bytes)))
    padded = _pad(zip_bytes, block)
    for index in range(0, len(padded), SEGMENT):
        iv = _hash(algorithm, key_data_salt, struct.pack("<I", index // SEGMENT))[:block]
        package += _aes_cbc(secret_key, iv, padded[index:index + SEGMENT], True)

    # 2. Toàn vẹn dữ liệu: HMAC-SHA512 trên cả luồng EncryptedPackage
    hmac_key = os.urandom(hash_size)
    hmac_value = hmac.new(hmac_key, bytes(package), hashlib.sha512).digest()
    iv_key = _hash(algorithm, key_data_salt, BLOCK_HMAC_KEY)[:block]
    iv_value = _hash(algorithm, key_data_salt, BLOCK_HMAC_VALUE)[:block]
    enc_hmac_key = _aes_cbc(secret_key, iv_key, _pad(hmac_key, block), True)
    enc_hmac_value = _aes_cbc(secret_key, iv_value, _pad(hmac_value, block), True)

    # 3. Khóa mã hóa bằng mật khẩu
    pwd_salt = os.urandom(16)
    h = _password_hash(password, pwd_salt, algorithm, spin_count)
    verifier = os.urandom(16)
    k_in = _derive_key(h, BLOCK_VERIFIER_INPUT, algorithm, key_bits)
    k_val = _derive_key(h, BLOCK_VERIFIER_VALUE, algorithm, key_bits)
    k_key = _derive_key(h, BLOCK_ENCRYPTED_KEY, algorithm, key_bits)
    enc_verifier_input = _aes_cbc(k_in, pwd_salt, _pad(verifier, block), True)
    enc_verifier_hash = _aes_cbc(k_val, pwd_salt, _pad(_hash(algorithm, verifier), block), True)
    enc_key_value = _aes_cbc(k_key, pwd_salt, _pad(secret_key, block), True)

    b64 = lambda raw: base64.b64encode(raw).decode("ascii")
    xml = (
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n'
        f'<encryption xmlns="{NS_ENC}" xmlns:p="{NS_PWD}" xmlns:c="http://schemas.microsoft.com/office/2006/keyEncryptor/certificate">'
        f'<keyData saltSize="16" blockSize="16" keyBits="{key_bits}" hashSize="{hash_size}" cipherAlgorithm="AES" '
        f'cipherChaining="ChainingModeCBC" hashAlgorithm="{algorithm}" saltValue="{b64(key_data_salt)}"/>'
        f'<dataIntegrity encryptedHmacKey="{b64(enc_hmac_key)}" encryptedHmacValue="{b64(enc_hmac_value)}"/>'
        '<keyEncryptors><keyEncryptor uri="http://schemas.microsoft.com/office/2006/keyEncryptor/password">'
        f'<p:encryptedKey spinCount="{spin_count}" saltSize="16" blockSize="16" keyBits="{key_bits}" hashSize="{hash_size}" '
        f'cipherAlgorithm="AES" cipherChaining="ChainingModeCBC" hashAlgorithm="{algorithm}" saltValue="{b64(pwd_salt)}" '
        f'encryptedVerifierHashInput="{b64(enc_verifier_input)}" encryptedVerifierHashValue="{b64(enc_verifier_hash)}" '
        f'encryptedKeyValue="{b64(enc_key_value)}"/></keyEncryptor></keyEncryptors></encryption>'
    )
    info = struct.pack("<HHI", 4, 4, 0x40) + xml.encode("utf-8")
    return _build_cfb({"EncryptionInfo": info, "EncryptedPackage": bytes(package)})


# ----------------------------------------------------------------------------------------------
# Đọc
# ----------------------------------------------------------------------------------------------
def decrypt_package(data: bytes, password: str) -> bytes:
    """Giải mã tệp Office có mật khẩu mở; trả về gói zip OOXML. Sai mật khẩu -> WrongPasswordError."""
    try:
        streams = _read_cfb(data)
    except struct.error as exc:
        raise OfficeEncryptionError("Vỏ CFB bị hỏng hoặc cắt cụt.") from exc
    info = streams.get("EncryptionInfo")
    package = streams.get("EncryptedPackage")
    if info is None or package is None:
        raise OfficeEncryptionError("Thiếu EncryptionInfo/EncryptedPackage: không phải tệp Office đã mã hóa bằng mật khẩu.")
    major, minor = struct.unpack_from("<HH", info, 0)
    if (major, minor) == (4, 4):
        return _decrypt_agile(info, package, password)
    if major in (2, 3, 4) and minor == 2:
        return _decrypt_standard(info, package, password)
    raise OfficeEncryptionError(f"Kiểu mã hóa chưa hỗ trợ (phiên bản {major}.{minor}).")


def _decrypt_agile(info: bytes, package: bytes, password: str) -> bytes:
    root = ET.fromstring(info[8:].decode("utf-8-sig"))
    key_data = root.find(f"{{{NS_ENC}}}keyData")
    encryptor = root.find(f".//{{{NS_PWD}}}encryptedKey")
    if key_data is None or encryptor is None:
        raise OfficeEncryptionError("EncryptionInfo thiếu keyData/encryptedKey (chỉ hỗ trợ khóa bằng mật khẩu).")
    if key_data.get("cipherAlgorithm") != "AES" or key_data.get("cipherChaining") != "ChainingModeCBC":
        raise OfficeEncryptionError("Thuật toán mã hóa chưa hỗ trợ.")
    algorithm = key_data.get("hashAlgorithm", "SHA512")
    block = int(key_data.get("blockSize", "16"))
    key_bits = int(encryptor.get("keyBits", "256"))
    spin = int(encryptor.get("spinCount", "100000"))
    pwd_salt = base64.b64decode(encryptor.get("saltValue", ""))
    h = _password_hash(password, pwd_salt, algorithm, spin)
    k_in = _derive_key(h, BLOCK_VERIFIER_INPUT, algorithm, key_bits)
    k_val = _derive_key(h, BLOCK_VERIFIER_VALUE, algorithm, key_bits)
    k_key = _derive_key(h, BLOCK_ENCRYPTED_KEY, algorithm, key_bits)
    verifier = _aes_cbc(k_in, pwd_salt, base64.b64decode(encryptor.get("encryptedVerifierHashInput", "")), False)[:block]
    expected = _aes_cbc(k_val, pwd_salt, base64.b64decode(encryptor.get("encryptedVerifierHashValue", "")), False)
    digest = _hash(algorithm, verifier)
    if not hmac.compare_digest(expected[:len(digest)], digest):
        raise WrongPasswordError("Mật khẩu không đúng.")
    secret_key = _aes_cbc(k_key, pwd_salt, base64.b64decode(encryptor.get("encryptedKeyValue", "")), False)[:key_bits // 8]
    key_salt = base64.b64decode(key_data.get("saltValue", ""))

    integrity = root.find(f"{{{NS_ENC}}}dataIntegrity")
    if integrity is not None:
        iv_key = _hash(algorithm, key_salt, BLOCK_HMAC_KEY)[:block]
        iv_value = _hash(algorithm, key_salt, BLOCK_HMAC_VALUE)[:block]
        hash_size = int(key_data.get("hashSize", "64"))
        hmac_key = _aes_cbc(secret_key, iv_key, base64.b64decode(integrity.get("encryptedHmacKey", "")), False)[:hash_size]
        hmac_value = _aes_cbc(secret_key, iv_value, base64.b64decode(integrity.get("encryptedHmacValue", "")), False)[:hash_size]
        computed = hmac.new(hmac_key, package, getattr(hashlib, algorithm.lower())).digest()
        if not hmac.compare_digest(computed, hmac_value):
            raise OfficeEncryptionError("Tệp bị sửa hoặc hỏng (sai mã toàn vẹn).")

    total = struct.unpack_from("<Q", package, 0)[0]
    body = package[8:]
    out = bytearray()
    for index in range(0, len(body), SEGMENT):
        iv = _hash(algorithm, key_salt, struct.pack("<I", index // SEGMENT))[:block]
        segment = body[index:index + SEGMENT]
        segment = segment[:len(segment) // block * block]
        out += _aes_cbc(secret_key, iv, segment, False)
    result = bytes(out[:total])
    if result[:2] != b"PK":
        raise OfficeEncryptionError("Giải mã xong nhưng không phải gói zip (dữ liệu hỏng).")
    return result


def _decrypt_standard(info: bytes, package: bytes, password: str) -> bytes:
    """Office 2007 (Standard): AES-128, SHA-1, ECB. MS-OFFCRYPTO 2.3.4.7."""
    flags = struct.unpack_from("<I", info, 4)[0]
    header_size = struct.unpack_from("<I", info, 8)[0]
    header = info[12:12 + header_size]
    alg_id = struct.unpack_from("<I", header, 8)[0]
    key_size = struct.unpack_from("<I", header, 16)[0]
    if alg_id not in (0x660E, 0x660F, 0x6610, 0) or not flags & 0x20:
        raise OfficeEncryptionError("Kiểu mã hóa Standard chưa hỗ trợ (chỉ AES).")
    pos = 12 + header_size
    salt_size = struct.unpack_from("<I", info, pos)[0]
    salt = info[pos + 4:pos + 4 + salt_size]
    enc_verifier = info[pos + 20:pos + 36]
    enc_verifier_hash = info[pos + 40:pos + 72]
    h = _hash("sha1", salt, password.encode("utf-16-le"))
    for i in range(50000):
        h = _hash("sha1", struct.pack("<I", i), h)
    h = _hash("sha1", h, struct.pack("<I", 0))
    x1 = _hash("sha1", bytes(0x36 ^ b for b in h.ljust(64, b"\x00")[:64]))
    x2 = _hash("sha1", bytes(0x5C ^ b for b in h.ljust(64, b"\x00")[:64]))
    key = (x1 + x2)[:key_size // 8]

    def ecb(data: bytes) -> bytes:
        cipher = Cipher(algorithms.AES(key), modes.ECB())
        op = cipher.decryptor()
        return op.update(data) + op.finalize()

    verifier = ecb(enc_verifier)
    if ecb(enc_verifier_hash)[:20] != _hash("sha1", verifier):
        raise WrongPasswordError("Mật khẩu không đúng.")
    total = struct.unpack_from("<Q", package, 0)[0]
    body = package[8:]
    result = ecb(body[:len(body) // 16 * 16])[:total]
    if result[:2] != b"PK":
        raise OfficeEncryptionError("Giải mã xong nhưng không phải gói zip (dữ liệu hỏng).")
    return result
