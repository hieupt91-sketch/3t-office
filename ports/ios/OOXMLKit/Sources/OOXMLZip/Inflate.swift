import Foundation

public enum DeflateError: Error, Equatable, CustomStringConvertible {
    case truncatedInput
    case invalidBlockType
    case invalidStoredBlockLength
    case invalidCodeLengths
    case invalidHuffmanCode
    case invalidDistance
    case outputLimitExceeded(limit: Int)

    public var description: String {
        switch self {
        case .truncatedInput: return "Dữ liệu DEFLATE bị cắt cụt"
        case .invalidBlockType: return "Kiểu khối DEFLATE không hợp lệ"
        case .invalidStoredBlockLength: return "Độ dài khối lưu (stored) không khớp"
        case .invalidCodeLengths: return "Bảng độ dài mã Huffman không hợp lệ"
        case .invalidHuffmanCode: return "Mã Huffman không hợp lệ"
        case .invalidDistance: return "Khoảng cách tham chiếu ngược vượt quá dữ liệu đã giải nén"
        case .outputLimitExceeded(let limit): return "Dữ liệu giải nén vượt giới hạn \(limit) byte"
        }
    }
}

/// Bảng hằng số dùng chung cho Inflate/Deflate (RFC 1951 §3.2.5).
enum DeflateTables {
    static let lengthBase: [Int] = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31,
                                    35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258]
    static let lengthExtra: [Int] = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2,
                                     3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0]
    static let distBase: [Int] = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193,
                                  257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145,
                                  8193, 12289, 16385, 24577]
    static let distExtra: [Int] = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6,
                                   7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13]
    static let codeLengthOrder: [Int] = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15]

    static let fixedLitLenLengths: [UInt8] = (0..<288).map { s -> UInt8 in
        switch s {
        case 0...143: return 8
        case 144...255: return 9
        case 256...279: return 7
        default: return 8
        }
    }
    static let fixedDistLengths: [UInt8] = [UInt8](repeating: 5, count: 30)

    @inline(__always)
    static func reverseBits(_ code: Int, _ length: Int) -> Int {
        var c = code
        var r = 0
        for _ in 0..<length {
            r = (r << 1) | (c & 1)
            c >>= 1
        }
        return r
    }
}

/// Bộ giải mã Huffman dạng bảng tra trực tiếp (chỉ số = mã đã đảo bit).
struct HuffmanDecoder {
    /// symbol << 4 | length; 0 = mã không tồn tại.
    private(set) var table: [UInt32]
    private(set) var maxBits: Int

    init(lengths: [UInt8]) throws {
        var count = [Int](repeating: 0, count: 16)
        for l in lengths {
            guard l <= 15 else { throw DeflateError.invalidCodeLengths }
            count[Int(l)] += 1
        }
        count[0] = 0
        var left = 1
        for len in 1...15 {
            left <<= 1
            left -= count[len]
            if left < 0 { throw DeflateError.invalidCodeLengths } // quá tải mã
        }
        var maxBits = 0
        for len in stride(from: 15, through: 1, by: -1) where count[len] > 0 {
            maxBits = len
            break
        }
        self.maxBits = maxBits
        guard maxBits > 0 else {
            table = []
            return
        }
        var nextCode = [Int](repeating: 0, count: 16)
        var code = 0
        for len in 1...15 {
            code = (code + count[len - 1]) << 1
            nextCode[len] = code
        }
        let size = 1 << maxBits
        var table = [UInt32](repeating: 0, count: size)
        for (sym, l) in lengths.enumerated() where l > 0 {
            let len = Int(l)
            let c = nextCode[len]
            nextCode[len] += 1
            let rev = DeflateTables.reverseBits(c, len)
            let entry = UInt32(sym) << 4 | UInt32(len)
            var i = rev
            while i < size {
                table[i] = entry
                i += 1 << len
            }
        }
        self.table = table
    }
}

/// Giải nén DEFLATE thô (RFC 1951), không có header zlib.
public enum Inflate {
    public static func decompress(_ data: Data, expectedSize: Int? = nil, limit: Int = Int.max) throws -> Data {
        try data.withUnsafeBytes { raw in
            var inflater = Inflater(input: raw.bindMemory(to: UInt8.self), limit: limit,
                                    capacityHint: min(expectedSize ?? data.count * 4, limit))
            try inflater.run()
            return inflater.output.takeData()
        }
    }

    public static func decompress(_ bytes: [UInt8], limit: Int = Int.max) throws -> [UInt8] {
        try bytes.withUnsafeBufferPointer { buf in
            var inflater = Inflater(input: buf, limit: limit, capacityHint: min(bytes.count * 4, limit))
            try inflater.run()
            return [UInt8](inflater.output.takeData())
        }
    }
}

struct Inflater {
    let input: UnsafeBufferPointer<UInt8>
    let limit: Int
    var pos = 0
    var bitBuf: UInt64 = 0
    var bitCount = 0
    /// Số bit 0 đệm thêm khi đã hết dữ liệu vào (nằm ở các bit cao nhất của bộ đệm).
    var padBits = 0
    var output: OutputBuffer

    init(input: UnsafeBufferPointer<UInt8>, limit: Int, capacityHint: Int) {
        self.input = input
        self.limit = limit
        self.output = OutputBuffer(capacity: max(capacityHint, 1024))
    }

    @inline(__always)
    mutating func refill() {
        while bitCount <= 56 {
            if pos < input.count {
                bitBuf |= UInt64(input[pos]) << UInt64(bitCount)
                pos += 1
            } else {
                padBits += 8
            }
            bitCount += 8
        }
    }

    @inline(__always)
    mutating func consume(_ n: Int) throws {
        bitBuf >>= UInt64(n)
        bitCount -= n
        if bitCount < padBits { throw DeflateError.truncatedInput }
    }

    @inline(__always)
    mutating func bits(_ n: Int) throws -> Int {
        if n == 0 { return 0 }
        if bitCount < n { refill() }
        let v = Int(bitBuf & ((UInt64(1) << UInt64(n)) - 1))
        try consume(n)
        return v
    }

    @inline(__always)
    mutating func decode(_ h: HuffmanDecoder) throws -> Int {
        guard h.maxBits > 0 else { throw DeflateError.invalidHuffmanCode }
        if bitCount < h.maxBits { refill() }
        let entry = h.table[Int(bitBuf & ((UInt64(1) << UInt64(h.maxBits)) - 1))]
        let len = Int(entry & 0xF)
        if len == 0 { throw DeflateError.invalidHuffmanCode }
        try consume(len)
        return Int(entry >> 4)
    }

    mutating func run() throws {
        var final = false
        while !final {
            final = try bits(1) == 1
            let type = try bits(2)
            switch type {
            case 0: try storedBlock()
            case 1:
                try codesBlock(Inflater.fixedLit, Inflater.fixedDist)
            case 2:
                let (lit, dist) = try dynamicTables()
                try codesBlock(lit, dist)
            default:
                throw DeflateError.invalidBlockType
            }
        }
    }

    static let fixedLit = try! HuffmanDecoder(lengths: DeflateTables.fixedLitLenLengths)
    static let fixedDist = try! HuffmanDecoder(lengths: DeflateTables.fixedDistLengths)

    mutating func storedBlock() throws {
        let skip = bitCount % 8
        try consume(skip)
        let len = try bits(16)
        let nlen = try bits(16)
        guard len == (~nlen & 0xFFFF) else { throw DeflateError.invalidStoredBlockLength }
        guard output.count + len <= limit else { throw DeflateError.outputLimitExceeded(limit: limit) }
        var remaining = len
        while remaining > 0 && bitCount - padBits >= 8 {
            output.append(UInt8(try bits(8)))
            remaining -= 1
        }
        if remaining > 0 {
            bitBuf = 0
            bitCount = 0
            padBits = 0
            guard pos + remaining <= input.count else { throw DeflateError.truncatedInput }
            output.append(UnsafeBufferPointer(rebasing: input[pos..<(pos + remaining)]))
            pos += remaining
        }
    }

    mutating func dynamicTables() throws -> (HuffmanDecoder, HuffmanDecoder) {
        let hlit = try bits(5) + 257
        let hdist = try bits(5) + 1
        let hclen = try bits(4) + 4
        guard hlit <= 286, hdist <= 30 else { throw DeflateError.invalidCodeLengths }
        var clLengths = [UInt8](repeating: 0, count: 19)
        for i in 0..<hclen {
            clLengths[DeflateTables.codeLengthOrder[i]] = UInt8(try bits(3))
        }
        let clDecoder = try HuffmanDecoder(lengths: clLengths)
        var lengths = [UInt8]()
        lengths.reserveCapacity(hlit + hdist)
        while lengths.count < hlit + hdist {
            let sym = try decode(clDecoder)
            switch sym {
            case 0...15:
                lengths.append(UInt8(sym))
            case 16:
                guard let prev = lengths.last else { throw DeflateError.invalidCodeLengths }
                let n = 3 + (try bits(2))
                lengths.append(contentsOf: repeatElement(prev, count: n))
            case 17:
                lengths.append(contentsOf: repeatElement(0, count: 3 + (try bits(3))))
            case 18:
                lengths.append(contentsOf: repeatElement(0, count: 11 + (try bits(7))))
            default:
                throw DeflateError.invalidCodeLengths
            }
        }
        guard lengths.count == hlit + hdist else { throw DeflateError.invalidCodeLengths }
        guard lengths[256] != 0 else { throw DeflateError.invalidCodeLengths }
        let lit = try HuffmanDecoder(lengths: Array(lengths[0..<hlit]))
        let dist = try HuffmanDecoder(lengths: Array(lengths[hlit...]))
        return (lit, dist)
    }

    mutating func codesBlock(_ lit: HuffmanDecoder, _ dist: HuffmanDecoder) throws {
        while true {
            let sym = try decode(lit)
            if sym < 256 {
                if output.count >= limit { throw DeflateError.outputLimitExceeded(limit: limit) }
                output.append(UInt8(sym))
            } else if sym == 256 {
                return
            } else {
                let li = sym - 257
                guard li < 29 else { throw DeflateError.invalidHuffmanCode }
                let length = DeflateTables.lengthBase[li] + (try bits(DeflateTables.lengthExtra[li]))
                let ds = try decode(dist)
                guard ds < 30 else { throw DeflateError.invalidDistance }
                let distance = DeflateTables.distBase[ds] + (try bits(DeflateTables.distExtra[ds]))
                guard distance <= output.count else { throw DeflateError.invalidDistance }
                guard output.count + length <= limit else { throw DeflateError.outputLimitExceeded(limit: limit) }
                output.copyBack(distance: distance, length: length)
            }
        }
    }
}

/// Bộ đệm đầu ra tăng dần, sao chép tham chiếu ngược trực tiếp trên bộ nhớ (tránh sao chép mảng).
final class OutputBuffer {
    private(set) var base: UnsafeMutablePointer<UInt8>
    private(set) var capacity: Int
    private(set) var count = 0
    private var taken = false

    init(capacity: Int) {
        self.capacity = capacity
        base = .allocate(capacity: capacity)
    }

    deinit {
        if !taken { base.deallocate() }
    }

    @inline(__always)
    private func reserve(_ extra: Int) {
        let needed = count + extra
        guard needed > capacity else { return }
        var newCap = capacity * 2
        while newCap < needed { newCap *= 2 }
        let nb = UnsafeMutablePointer<UInt8>.allocate(capacity: newCap)
        nb.update(from: base, count: count)
        base.deallocate()
        base = nb
        capacity = newCap
    }

    @inline(__always)
    func append(_ b: UInt8) {
        if count == capacity { reserve(1) }
        base[count] = b
        count += 1
    }

    func append(_ buf: UnsafeBufferPointer<UInt8>) {
        guard let src = buf.baseAddress, !buf.isEmpty else { return }
        reserve(buf.count)
        (base + count).update(from: src, count: buf.count)
        count += buf.count
    }

    @inline(__always)
    func copyBack(distance: Int, length: Int) {
        reserve(length)
        let dst = base + count
        let src = dst - distance
        if distance >= length {
            dst.update(from: src, count: length)
        } else {
            for i in 0..<length { dst[i] = src[i] }
        }
        count += length
    }

    func takeData() -> Data {
        taken = true
        return Data(bytesNoCopy: base, count: count, deallocator: .custom { p, _ in p.deallocate() })
    }
}
