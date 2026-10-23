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

    public private(set) var value: UInt32 = 0

    public init() {}

    public mutating func update<C: Collection>(_ bytes: C) where C.Element == UInt8 {
        var c = ~value
        CRC32.table.withUnsafeBufferPointer { t in
            for b in bytes {
                c = t[Int((c ^ UInt32(b)) & 0xFF)] ^ (c >> 8)
            }
        }
        value = ~c
    }

    public mutating func update(_ buffer: UnsafeBufferPointer<UInt8>) {
        var c = ~value
        CRC32.table.withUnsafeBufferPointer { t in
            for b in buffer {
                c = t[Int((c ^ UInt32(b)) & 0xFF)] ^ (c >> 8)
            }
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
