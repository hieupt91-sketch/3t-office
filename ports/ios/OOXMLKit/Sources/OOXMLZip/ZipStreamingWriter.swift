import Foundation

/// Ghi ZIP TRUYỀN PHÁT ra `FileHandle` (gói L9, issue #10): từng mục được ghi
/// ngay xuống đích — local header rồi dữ liệu nén theo lát — thay vì dựng
/// toàn bộ byte của gói trong RAM như `ZipArchive.serialize()`.
///
/// Định dạng đầu ra bám đúng `serialize()`: cùng thứ tự mục, cùng cờ (bỏ bit
/// data-descriptor vì đã biết trước kích thước/CRC), cùng quy tắc ZIP64 cho
/// extra field và EOCD. Nhờ vậy, với cùng một trạng thái `ZipArchive`, bản
/// lưu truyền phát khớp TỪNG BYTE với bản lưu thường — tính chất này có test
/// riêng (`StreamingSaveTests`) canh giữ.
///
/// Bộ nhớ phụ thêm bị chặn bởi: lát ghi (mặc định 512 KiB) + central
/// directory tích lũy trong RAM (tỉ lệ với SỐ mục, không tỉ lệ dung lượng
/// dữ liệu — tối đa ~vài MB ở giới hạn 20.000 mục).
public final class ZipStreamingWriter {
    private let handle: FileHandle
    private let chunkSize: Int
    private var offset: Int = 0
    private var central = ByteWriter()
    private var count: Int = 0

    public init(handle: FileHandle, chunkSize: Int = 512 << 10) {
        self.handle = handle
        self.chunkSize = max(64 << 10, chunkSize)
    }

    /// Ghi một mục: `compressed` là dữ liệu nén NGUYÊN TRẠNG của mục (đúng
    /// như `ZipArchive.rawCompressedData(of:)` trả về), `entry` mang siêu dữ
    /// liệu (tên, CRC, kích thước, thuộc tính) đã khớp với dữ liệu đó.
    public func writeEntry(_ entry: ZipEntry, compressed: Data) throws {
        precondition(compressed.count == entry.compressedSize,
                     "dữ liệu nén không khớp kích thước khai báo của mục \(entry.name)")
        let e = entry
        let entryOffset = offset
        let needs64 = e.compressedSize >= 0xFFFF_FFFF || e.uncompressedSize >= 0xFFFF_FFFF
        let flags = e.flags & ~UInt16(0x0008) // đã biết kích thước: bỏ data descriptor
        let versionNeeded = max(e.versionNeeded, needs64 ? 45 : (e.method == ZipEntry.methodDeflate ? 20 : 10))

        var localExtra = e.localExtra
        if needs64 {
            var z = ByteWriter()
            z.u16(0x0001); z.u16(16)
            z.u64(UInt64(e.uncompressedSize)); z.u64(UInt64(e.compressedSize))
            localExtra = z.bytes + localExtra
        }
        var local = ByteWriter()
        local.u32(0x0403_4B50)
        local.u16(versionNeeded)
        local.u16(flags)
        local.u16(e.method)
        local.u16(e.lastModTime)
        local.u16(e.lastModDate)
        local.u32(e.crc32)
        local.u32(needs64 ? 0xFFFF_FFFF : UInt32(e.compressedSize))
        local.u32(needs64 ? 0xFFFF_FFFF : UInt32(e.uncompressedSize))
        local.u16(UInt16(e.rawName.count))
        local.u16(UInt16(localExtra.count))
        local.append(e.rawName)
        local.append(localExtra)
        try write(Data(local.bytes))
        try writeChunked(compressed)

        let cdU = e.uncompressedSize >= 0xFFFF_FFFF
        let cdC = e.compressedSize >= 0xFFFF_FFFF
        let cdO = entryOffset >= 0xFFFF_FFFF
        var centralExtra = e.centralExtra
        if cdU || cdC || cdO {
            var z = ByteWriter()
            var fields: [UInt64] = []
            if cdU { fields.append(UInt64(e.uncompressedSize)) }
            if cdC { fields.append(UInt64(e.compressedSize)) }
            if cdO { fields.append(UInt64(entryOffset)) }
            z.u16(0x0001); z.u16(UInt16(fields.count * 8))
            for f in fields { z.u64(f) }
            centralExtra = z.bytes + centralExtra
        }
        central.u32(0x0201_4B50)
        central.u16(e.versionMadeBy)
        central.u16(max(versionNeeded, (cdU || cdC || cdO) ? 45 : 0))
        central.u16(flags)
        central.u16(e.method)
        central.u16(e.lastModTime)
        central.u16(e.lastModDate)
        central.u32(e.crc32)
        central.u32(cdC ? 0xFFFF_FFFF : UInt32(e.compressedSize))
        central.u32(cdU ? 0xFFFF_FFFF : UInt32(e.uncompressedSize))
        central.u16(UInt16(e.rawName.count))
        central.u16(UInt16(centralExtra.count))
        central.u16(UInt16(e.comment.count))
        central.u16(0)
        central.u16(e.internalAttributes)
        central.u32(e.externalAttributes)
        central.u32(cdO ? 0xFFFF_FFFF : UInt32(entryOffset))
        central.append(e.rawName)
        central.append(centralExtra)
        central.append(e.comment)
        count += 1
    }

    /// Ghi central directory + EOCD (và ZIP64 EOCD khi cần), rồi đồng bộ
    /// xuống đĩa. Sau lời gọi này writer không dùng được nữa.
    public func finish(comment: [UInt8]) throws {
        let cdOffset = offset
        let cdSize = central.count
        try write(Data(central.bytes))
        central.bytes.removeAll()
        var tail = ByteWriter()
        let needs64 = count >= 0xFFFF || cdOffset >= 0xFFFF_FFFF || cdSize >= 0xFFFF_FFFF
        if needs64 {
            let zip64EOCDOffset = offset
            tail.u32(0x0606_4B50)
            tail.u64(44)
            tail.u16(45); tail.u16(45)
            tail.u32(0); tail.u32(0)
            tail.u64(UInt64(count)); tail.u64(UInt64(count))
            tail.u64(UInt64(cdSize)); tail.u64(UInt64(cdOffset))
            tail.u32(0x0706_4B50)
            tail.u32(0)
            tail.u64(UInt64(zip64EOCDOffset))
            tail.u32(1)
        }
        tail.u32(0x0605_4B50)
        tail.u16(0); tail.u16(0)
        tail.u16(needs64 ? 0xFFFF : UInt16(count))
        tail.u16(needs64 ? 0xFFFF : UInt16(count))
        tail.u32(needs64 ? 0xFFFF_FFFF : UInt32(cdSize))
        tail.u32(needs64 ? 0xFFFF_FFFF : UInt32(cdOffset))
        let c = comment.prefix(0xFFFF)
        tail.u16(UInt16(c.count))
        tail.append(Array(c))
        try write(Data(tail.bytes))
        try handle.synchronize()
    }

    private func write(_ data: Data) throws {
        guard !data.isEmpty else { return }
        try handle.write(contentsOf: data)
        offset += data.count
    }

    /// Ghi dữ liệu theo lát để đỉnh bộ nhớ phụ thêm không vượt quá một lát.
    private func writeChunked(_ data: Data) throws {
        var start = data.startIndex
        while start < data.endIndex {
            let end = data.index(start, offsetBy: chunkSize, limitedBy: data.endIndex) ?? data.endIndex
            try write(data.subdata(in: start..<end))
            start = end
        }
    }
}
