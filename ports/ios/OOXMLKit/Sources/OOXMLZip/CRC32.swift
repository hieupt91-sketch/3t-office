import Foundation

/// CRC-32 (IEEE 802.3, đa thức 0xEDB88320) dùng cho ZIP.
public struct CRC32 {
    private static let table: [UInt32] = (0..<256).map { n -> UInt32 in
        var c = UInt32(n)
        for _ in 0..<8 {
            c = (c & 1) != 0 ? (0xEDB8_8320 ^ (c >> 1)) : (c >> 1)
        }
        return c
    }

    /// Bảng "slicing-by-8": xử lý 8 byte mỗi vòng, nhanh hơn nhiều so với tra bảng từng byte; kết quả giống hệt.
    private static let tables: [[UInt32]] = {
        var t = [table]
        for k in 1..<8 {
            var next = [UInt32](repeating: 0, count: 256)
            for i in 0..<256 { next[i] = (t[k - 1][i] >> 8) ^ table[Int(t[k - 1][i] & 0xFF)] }
            t.append(next)
        }
        return t
    }()

    private static let flat: [UInt32] = tables.flatMap { $0 }

    public private(set) var value: UInt32 = 0

    public init() {}

    public mutating func update<C: Collection>(_ bytes: C) where C.Element == UInt8 {
        if let r = bytes.withContiguousStorageIfAvailable({ buf -> UInt32 in
            var tmp = CRC32(); tmp.value = value; tmp.update(buf); return tmp.value
        }) { value = r; return }
        var c = ~value
        CRC32.table.withUnsafeBufferPointer { t in
            for b in bytes { c = t[Int((c ^ UInt32(b)) & 0xFF)] ^ (c >> 8) }
        }
        value = ~c
    }

    public mutating func update(_ buffer: UnsafeBufferPointer<UInt8>) {
        var c = ~value
        let n = buffer.count
        var i = 0
        CRC32.flat.withUnsafeBufferPointer { t in
            while i + 8 <= n {
                let b0 = UInt32(buffer[i]), b1 = UInt32(buffer[i + 1]), b2 = UInt32(buffer[i + 2]), b3 = UInt32(buffer[i + 3])
                let one: UInt32 = c ^ (b0 | (b1 << 8) | (b2 << 16) | (b3 << 24))
                var x: UInt32 = t[1792 + Int(one & 0xFF)]
                x ^= t[1536 + Int((one >> 8) & 0xFF)]
                x ^= t[1280 + Int((one >> 16) & 0xFF)]
                x ^= t[1024 + Int(one >> 24)]
                x ^= t[768 + Int(buffer[i + 4])]
                x ^= t[512 + Int(buffer[i + 5])]
                x ^= t[256 + Int(buffer[i + 6])]
                x ^= t[Int(buffer[i + 7])]
                c = x
                i += 8
            }
            while i < n { c = t[Int((c ^ UInt32(buffer[i])) & 0xFF)] ^ (c >> 8); i += 1 }
        }
        value = ~c
    }

    public static func checksum(_ data: Data) -> UInt32 {
        var crc = CRC32()
        data.withUnsafeBytes { raw in
            crc.update(raw.bindMemory(to: UInt8.self))
        }
        return crc.value
    }

    public static func checksum(_ bytes: [UInt8]) -> UInt32 {
        var crc = CRC32()
        bytes.withUnsafeBufferPointer { crc.update($0) }
        return crc.value
    }
}
