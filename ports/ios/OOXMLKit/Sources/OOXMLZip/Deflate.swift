import Foundation

/// Nén DEFLATE thô (RFC 1951): LZ77 chuỗi băm + so khớp lười, mỗi khối tự chọn
/// stored / Huffman cố định / Huffman động theo kích thước nhỏ nhất.
public enum Deflate {
    public enum Level: Sendable {
        case fast
        case `default`
        case best

        var maxChain: Int {
            switch self {
            case .fast: return 8
            case .default: return 128
            case .best: return 1024
            }
        }
        var niceLength: Int {
            switch self {
            case .fast: return 32
            case .default: return 128
            case .best: return 258
            }
        }
        var lazy: Bool { self != .fast }
    }

    public static func compress(_ data: Data, level: Level = .default) -> Data {
        let bytes = [UInt8](data)
        return Data(compress(bytes, level: level))
    }

    public static func compress(_ bytes: [UInt8], level: Level = .default) -> [UInt8] {
        var encoder = DeflateEncoder(input: bytes, level: level)
        encoder.run()
        return encoder.writer.out
    }
}

struct BitWriter {
    var out: [UInt8] = []
    var buf: UInt64 = 0
    var count = 0

    @inline(__always)
    mutating func write(_ value: Int, _ n: Int) {
        buf |= UInt64(value) << UInt64(count)
        count += n
        while count >= 8 {
            out.append(UInt8(truncatingIfNeeded: buf))
            buf >>= 8
            count -= 8
        }
    }

    mutating func alignToByte() {
        if count > 0 {
            out.append(UInt8(truncatingIfNeeded: buf))
            buf = 0
            count = 0
        }
    }
}

enum HuffmanBuilder {
    /// Độ dài mã Huffman tối ưu có giới hạn `limit` bit. Luôn trả về mã đầy đủ (Kraft = 1)
    /// với ít nhất 2 ký hiệu, để mọi bộ giải nén đều chấp nhận.
    static func lengths(freq: [Int], limit: Int) -> [UInt8] {
        var freq = freq
        var used = freq.indices.filter { freq[$0] > 0 }
        if used.count < 2 {
            // Thêm ký hiệu giả để có đúng 2 mã độ dài 1.
            let filler = used.first == 0 ? 1 : 0
            freq[filler] = max(freq[filler], 1)
            if used.isEmpty { freq[filler == 0 ? 1 : 0] = 1 }
            used = freq.indices.filter { freq[$0] > 0 }
        }
        let leaves = used.sorted { freq[$0] != freq[$1] ? freq[$0] < freq[$1] : $0 < $1 }
        let m = leaves.count
        var nodeFreq = leaves.map { freq[$0] }
        nodeFreq.reserveCapacity(2 * m - 1)
        var parent = [Int](repeating: -1, count: 2 * m - 1)
        var leafIdx = 0
        var internalIdx = m
        // Hai hàng đợi: lá đã sắp xếp + nút trong (tạo ra theo thứ tự tăng dần).
        func pickMin() -> Int {
            if leafIdx < m && (internalIdx >= nodeFreq.count || nodeFreq[leafIdx] <= nodeFreq[internalIdx]) {
                leafIdx += 1
                return leafIdx - 1
            }
            internalIdx += 1
            return internalIdx - 1
        }
        while nodeFreq.count < 2 * m - 1 {
            let a = pickMin()
            let b = pickMin()
            let node = nodeFreq.count
            nodeFreq.append(nodeFreq[a] + nodeFreq[b])
            parent[a] = node
            parent[b] = node
        }
        var depth = [Int](repeating: 0, count: 2 * m - 1)
        for node in stride(from: 2 * m - 3, through: 0, by: -1) {
            depth[node] = depth[parent[node]] + 1
        }
        var numCodes = [Int](repeating: 0, count: 64)
        for i in 0..<m { numCodes[min(depth[i], 63)] += 1 }
        // Giới hạn độ dài (thuật toán của miniz, bảo toàn Kraft).
        for i in (limit + 1)..<64 {
            numCodes[limit] += numCodes[i]
            numCodes[i] = 0
        }
        var total: UInt64 = 0
        for i in stride(from: limit, to: 0, by: -1) {
            total += UInt64(numCodes[i]) << UInt64(limit - i)
        }
        while total != (UInt64(1) << UInt64(limit)) {
            numCodes[limit] -= 1
            for i in stride(from: limit - 1, to: 0, by: -1) where numCodes[i] > 0 {
                numCodes[i] -= 1
                numCodes[i + 1] += 2
                break
            }
            total -= 1
        }
        var result = [UInt8](repeating: 0, count: freq.count)
        var k = 0
        for len in stride(from: limit, to: 0, by: -1) {
            for _ in 0..<numCodes[len] {
                result[leaves[k]] = UInt8(len)
                k += 1
            }
        }
        return result
    }

    /// Mã canonical đã đảo bit (để ghi LSB trước).
    static func reversedCodes(_ lengths: [UInt8]) -> [Int] {
        var count = [Int](repeating: 0, count: 16)
        for l in lengths { count[Int(l)] += 1 }
        count[0] = 0
        var next = [Int](repeating: 0, count: 16)
        var code = 0
        for len in 1...15 {
            code = (code + count[len - 1]) << 1
            next[len] = code
        }
        var codes = [Int](repeating: 0, count: lengths.count)
        for (s, l) in lengths.enumerated() where l > 0 {
            codes[s] = DeflateTables.reverseBits(next[Int(l)], Int(l))
            next[Int(l)] += 1
        }
        return codes
    }
}

struct DeflateEncoder {
    static let hashBits = 15
    static let hashSize = 1 << hashBits
    static let windowSize = 32768
    static let windowMask = windowSize - 1
    static let maxSymbolsPerBlock = 16384

    static let lengthCode: [UInt8] = {
        var t = [UInt8](repeating: 0, count: 259)
        for code in 0..<29 {
            let base = DeflateTables.lengthBase[code]
            let n = code == 28 ? 1 : (1 << DeflateTables.lengthExtra[code])
            for l in base..<min(base + n, 259) { t[l] = UInt8(code) }
        }
        t[258] = 28
        return t
    }()

    static let distCode: [UInt8] = {
        var t = [UInt8](repeating: 0, count: 32769)
        for code in 0..<30 {
            let base = DeflateTables.distBase[code]
            for d in base..<min(base + (1 << DeflateTables.distExtra[code]), 32769) { t[d] = UInt8(code) }
        }
        return t
    }()

    let input: [UInt8]
    let level: Deflate.Level
    var writer = BitWriter()
    var head = [Int32](repeating: -1, count: DeflateEncoder.hashSize)
    var prev = [Int32](repeating: -1, count: DeflateEncoder.windowSize)
    /// literal: giá trị byte; match: bit31 | length << 16 | distance.
    var symbols: [UInt32] = []
    var blockStart = 0

    init(input: [UInt8], level: Deflate.Level) {
        self.input = input
        self.level = level
        writer.out.reserveCapacity(input.count / 3 + 64)
        symbols.reserveCapacity(DeflateEncoder.maxSymbolsPerBlock + 2)
    }

    @inline(__always)
    func hash(_ i: Int) -> Int {
        let h = (Int(input[i]) << 10) ^ (Int(input[i + 1]) << 5) ^ Int(input[i + 2])
        return h & (DeflateEncoder.hashSize - 1)
    }

    @inline(__always)
    mutating func insert(_ i: Int) {
        guard i + 2 < input.count else { return }
        let h = hash(i)
        prev[i & DeflateEncoder.windowMask] = head[h]
        head[h] = Int32(i)
    }

    /// Tìm chuỗi khớp dài nhất cho vị trí i (i đã được chèn vào bảng băm sau lời gọi).
    mutating func findMatch(_ i: Int) -> (Int, Int) {
        let n = input.count
        guard i + 2 < n else { return (0, 0) }
        let h = hash(i)
        var cand = Int(head[h])
        prev[i & DeflateEncoder.windowMask] = head[h]
        head[h] = Int32(i)
        let maxLen = min(258, n - i)
        var best = 0
        var bestDist = 0
        var chain = level.maxChain
        let nice = level.niceLength
        input.withUnsafeBufferPointer { p in
            while cand >= 0 && chain > 0 {
                let dist = i - cand
                if dist <= 0 || dist > DeflateEncoder.windowSize { break }
                if p[cand + best] == p[i + best] && p[cand] == p[i] {
                    var l = 0
                    while l < maxLen && p[cand + l] == p[i + l] { l += 1 }
                    if l > best {
                        best = l
                        bestDist = dist
                        if l >= nice || l == maxLen { break }
                    }
                }
                let next = Int(prev[cand & DeflateEncoder.windowMask])
                if next >= cand { break }
                cand = next
                chain -= 1
            }
        }
        if best == 3 && bestDist > 4096 { return (0, 0) }
        return best >= 3 ? (best, bestDist) : (0, 0)
    }

    mutating func run() {
        let n = input.count
        var i = 0
        var finished = false
        while i < n {
            var (len, dist) = findMatch(i)
            if len >= 3 && level.lazy && len < level.niceLength && i + 1 < n {
                let (len2, dist2) = findMatch(i + 1)
                if len2 > len {
                    emitLiteral(input[i])
                    i += 1
                    len = len2
                    dist = dist2
                    emitMatch(len, dist)
                    for j in (i + 1)..<(i + len) { insert(j) }
                    i += len
                } else {
                    emitMatch(len, dist)
                    if len > 2 { for j in (i + 2)..<(i + len) { insert(j) } }
                    i += len
                }
            } else if len >= 3 {
                emitMatch(len, dist)
                for j in (i + 1)..<(i + len) { insert(j) }
                i += len
            } else {
                emitLiteral(input[i])
                i += 1
            }
            if symbols.count >= DeflateEncoder.maxSymbolsPerBlock {
                let isFinal = i >= n
                flushBlock(end: i, final: isFinal)
                finished = isFinal
            }
        }
        if !finished {
            flushBlock(end: n, final: true)
        }
        writer.alignToByte()
    }

    @inline(__always)
    mutating func emitLiteral(_ b: UInt8) { symbols.append(UInt32(b)) }

    @inline(__always)
    mutating func emitMatch(_ len: Int, _ dist: Int) {
        symbols.append(0x8000_0000 | UInt32(len) << 16 | UInt32(dist))
    }

    mutating func flushBlock(end: Int, final: Bool) {
        var litFreq = [Int](repeating: 0, count: 286)
        var distFreq = [Int](repeating: 0, count: 30)
        var extraBits = 0
        for s in symbols {
            if s & 0x8000_0000 == 0 {
                litFreq[Int(s)] += 1
            } else {
                let len = Int((s >> 16) & 0x1FF)
                let dist = Int(s & 0xFFFF)
                let lc = Int(DeflateEncoder.lengthCode[len])
                let dc = Int(DeflateEncoder.distCode[dist])
                litFreq[257 + lc] += 1
                distFreq[dc] += 1
                extraBits += DeflateTables.lengthExtra[lc] + DeflateTables.distExtra[dc]
            }
        }
        litFreq[256] += 1

        let litLens = HuffmanBuilder.lengths(freq: litFreq, limit: 15)
        let distLens = HuffmanBuilder.lengths(freq: distFreq, limit: 15)
        var hlit = 286
        while hlit > 257 && litLens[hlit - 1] == 0 { hlit -= 1 }
        var hdist = 30
        while hdist > 1 && distLens[hdist - 1] == 0 { hdist -= 1 }
        let combined = Array(litLens[0..<hlit]) + Array(distLens[0..<hdist])
        let rle = DeflateEncoder.runLength(combined)
        var clFreq = [Int](repeating: 0, count: 19)
        for (sym, _) in rle { clFreq[sym] += 1 }
        let clLens = HuffmanBuilder.lengths(freq: clFreq, limit: 7)
        var hclen = 19
        while hclen > 4 && clLens[DeflateTables.codeLengthOrder[hclen - 1]] == 0 { hclen -= 1 }

        var dynamicBits = 3 + 14 + 3 * hclen
        for (sym, _) in rle {
            dynamicBits += Int(clLens[sym]) + (sym == 16 ? 2 : sym == 17 ? 3 : sym == 18 ? 7 : 0)
        }
        var fixedBits = 3
        for s in 0..<286 {
            dynamicBits += litFreq[s] * Int(litLens[s])
            fixedBits += litFreq[s] * Int(DeflateTables.fixedLitLenLengths[s])
        }
        for s in 0..<30 {
            dynamicBits += distFreq[s] * Int(distLens[s])
            fixedBits += distFreq[s] * 5
        }
        dynamicBits += extraBits
        fixedBits += extraBits
        let rawLen = end - blockStart
        let storedBlocks = max(1, (rawLen + 65534) / 65535)
        let storedBits = 3 + 7 + (rawLen + 4 * storedBlocks) * 8 + (storedBlocks - 1) * 3

        if storedBits < dynamicBits && storedBits < fixedBits {
            writeStored(from: blockStart, to: end, final: final)
        } else if fixedBits <= dynamicBits {
            writer.write(final ? 1 : 0, 1)
            writer.write(1, 2)
            writeSymbols(litLens: DeflateTables.fixedLitLenLengths, distLens: DeflateTables.fixedDistLengths)
        } else {
            writer.write(final ? 1 : 0, 1)
            writer.write(2, 2)
            writer.write(hlit - 257, 5)
            writer.write(hdist - 1, 5)
            writer.write(hclen - 4, 4)
            for i in 0..<hclen {
                writer.write(Int(clLens[DeflateTables.codeLengthOrder[i]]), 3)
            }
            let clCodes = HuffmanBuilder.reversedCodes(clLens)
            for (sym, extra) in rle {
                writer.write(clCodes[sym], Int(clLens[sym]))
                switch sym {
                case 16: writer.write(extra, 2)
                case 17: writer.write(extra, 3)
                case 18: writer.write(extra, 7)
                default: break
                }
            }
            writeSymbols(litLens: litLens, distLens: distLens)
        }
        symbols.removeAll(keepingCapacity: true)
        blockStart = end
    }

    mutating func writeSymbols(litLens: [UInt8], distLens: [UInt8]) {
        let litCodes = HuffmanBuilder.reversedCodes(litLens)
        let distCodes = HuffmanBuilder.reversedCodes(distLens)
        for s in symbols {
            if s & 0x8000_0000 == 0 {
                writer.write(litCodes[Int(s)], Int(litLens[Int(s)]))
            } else {
                let len = Int((s >> 16) & 0x1FF)
                let dist = Int(s & 0xFFFF)
                let lc = Int(DeflateEncoder.lengthCode[len])
                let dc = Int(DeflateEncoder.distCode[dist])
                writer.write(litCodes[257 + lc], Int(litLens[257 + lc]))
                let le = DeflateTables.lengthExtra[lc]
                if le > 0 { writer.write(len - DeflateTables.lengthBase[lc], le) }
                writer.write(distCodes[dc], Int(distLens[dc]))
                let de = DeflateTables.distExtra[dc]
                if de > 0 { writer.write(dist - DeflateTables.distBase[dc], de) }
            }
        }
        writer.write(litCodes[256], Int(litLens[256]))
    }

    mutating func writeStored(from start: Int, to end: Int, final: Bool) {
        var p = start
        repeat {
            let len = min(65535, end - p)
            let last = final && p + len >= end
            writer.write(last ? 1 : 0, 1)
            writer.write(0, 2)
            writer.alignToByte()
            writer.write(len & 0xFFFF, 16)
            writer.write(~len & 0xFFFF, 16)
            writer.out.append(contentsOf: input[p..<(p + len)])
            p += len
        } while p < end
    }

    /// Mã hóa loạt độ dài bằng ký hiệu 16/17/18. Trả về (ký hiệu, giá trị extra).
    static func runLength(_ lens: [UInt8]) -> [(Int, Int)] {
        var out: [(Int, Int)] = []
        var i = 0
        while i < lens.count {
            let v = lens[i]
            var run = 1
            while i + run < lens.count && lens[i + run] == v { run += 1 }
            if v == 0 {
                var r = run
                while r >= 11 {
                    let n = min(r, 138)
                    out.append((18, n - 11))
                    r -= n
                }
                if r >= 3 {
                    out.append((17, r - 3))
                    r = 0
                }
                for _ in 0..<r { out.append((0, 0)) }
            } else {
                out.append((Int(v), 0))
                var r = run - 1
                while r >= 3 {
                    let n = min(r, 6)
                    out.append((16, n - 3))
                    r -= n
                }
                for _ in 0..<r { out.append((Int(v), 0)) }
            }
            i += run
        }
        return out
    }
}
