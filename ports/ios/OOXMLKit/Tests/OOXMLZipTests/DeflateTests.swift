import XCTest
@testable import OOXMLZip
import OOXMLTestSupport

final class DeflateTests: XCTestCase {
    func testCRC32KnownVectors() {
        XCTAssertEqual(CRC32.checksum(Array("123456789".utf8)), 0xCBF4_3926)
        XCTAssertEqual(CRC32.checksum([UInt8]()), 0)
        XCTAssertEqual(CRC32.checksum(Array("The quick brown fox jumps over the lazy dog".utf8)), 0x414F_A339)
    }

    /// Inflate phải giải đúng mọi kiểu khối mà zlib sinh ra (stored, fixed, dynamic, RLE, Huffman-only).
    func testInflateZlibStreamsAllStrategies() throws {
        let names = Fixtures.list("deflate", extensions: ["deflate"])
        XCTAssertEqual(names.count, 30)
        for name in names {
            let base = (name as NSString).lastPathComponent.split(separator: ".").first!
            let expected = try Fixtures.data("deflate/\(base).raw")
            let compressed = try Fixtures.data(name)
            let out = try Inflate.decompress(compressed)
            XCTAssertEqual(out, expected, name)
        }
    }

    func testDeflateRoundTripVariedInputs() throws {
        var rng = SeededRandom(seed: 42)
        var inputs: [(String, [UInt8])] = [
            ("empty", []),
            ("one", [0x41]),
            ("two", [0, 0]),
            ("all-bytes", (0..<256).map { UInt8($0) }),
            ("zeros-1MB", [UInt8](repeating: 0, count: 1 << 20)),
            ("random-100KB", (0..<100_000).map { _ in UInt8.random(in: 0...255, using: &rng) }),
            ("text", Array(String(repeating: "Cộng hòa xã hội chủ nghĩa Việt Nam — Độc lập, Tự do, Hạnh phúc. ", count: 2000).utf8)),
        ]
        // Mẫu lặp với khoảng cách xa gần biên cửa sổ 32 KB.
        var far = (0..<32_760).map { _ in UInt8.random(in: 0...255, using: &rng) }
        far += far.prefix(5000)
        inputs.append(("far-distance", far))
        // Dữ liệu nửa ngẫu nhiên kiểu XML.
        var xml = [UInt8]()
        for i in 0..<20_000 { xml += Array("<c r=\"A\(i)\" s=\"\(i % 5)\"><v>\(Int.random(in: 0...99999, using: &rng))</v></c>".utf8) }
        inputs.append(("xml", xml))

        for level in [Deflate.Level.fast, .default, .best] {
            for (name, input) in inputs {
                let c = Deflate.compress(input, level: level)
                let d = try Inflate.decompress(c)
                XCTAssertEqual(d, input, "\(name) @\(level)")
            }
        }
        let text = inputs.first { $0.0 == "text" }!.1
        XCTAssertLessThan(Deflate.compress(text).count, text.count / 20, "văn bản lặp phải nén tốt")
        let random = inputs.first { $0.0 == "random-100KB" }!.1
        XCTAssertLessThan(Deflate.compress(random).count, random.count + 100, "dữ liệu ngẫu nhiên → khối stored, không phình")
    }

    func testDeflateRatioOnLargeXMLComparableToZlib() throws {
        let archive = try ZipArchive(contentsOf: Fixtures.url("zip/large-text.zip"))
        let entry = archive.entry("xl/sharedStrings.xml")!
        let data = try archive.contents(of: entry)
        let ours = Deflate.compress(data)
        XCTAssertEqual(try Inflate.decompress(ours), data)
        // zlib -9 làm được entry.compressedSize; chấp nhận kém hơn tối đa 35 %.
        XCTAssertLessThan(Double(ours.count), Double(entry.compressedSize) * 1.35,
                          "ours=\(ours.count) zlib9=\(entry.compressedSize)")
    }

    /// Dữ liệu nén hỏng phải báo lỗi, không bao giờ làm sập tiến trình.
    func testInflateFuzzNeverCrashes() {
        var rng = SeededRandom(seed: 7)
        let source = Array(String(repeating: "<row r=\"1\"><c r=\"A1\"><v>1</v></c></row>", count: 200).utf8)
        let good = Deflate.compress(source)
        var failures = 0
        for _ in 0..<500 {
            var bad = good
            for _ in 0..<Int.random(in: 1...4, using: &rng) {
                let i = Int.random(in: 0..<bad.count, using: &rng)
                bad[i] ^= UInt8(1 << Int.random(in: 0...7, using: &rng))
            }
            if Bool.random(using: &rng) { bad = Array(bad.prefix(Int.random(in: 0..<bad.count, using: &rng))) }
            do {
                _ = try Inflate.decompress(bad, limit: 1 << 20)
            } catch {
                failures += 1
            }
        }
        XCTAssertGreaterThan(failures, 0)
    }

    func testInflateOutputLimit() {
        let zeros = Deflate.compress([UInt8](repeating: 0, count: 100_000))
        XCTAssertThrowsError(try Inflate.decompress(zeros, limit: 10_000)) { error in
            XCTAssertEqual(error as? DeflateError, .outputLimitExceeded(limit: 10_000))
        }
    }
}

/// Bộ sinh số giả ngẫu nhiên tất định (SplitMix64) để test lặp lại được.
struct SeededRandom: RandomNumberGenerator {
    var state: UInt64
    init(seed: UInt64) { state = seed }
    mutating func next() -> UInt64 {
        state &+= 0x9E37_79B9_7F4A_7C15
        var z = state
        z = (z ^ (z >> 30)) &* 0xBF58_476D_1CE4_E5B9
        z = (z ^ (z >> 27)) &* 0x94D0_49BB_1331_11EB
        return z ^ (z >> 31)
    }

    /// CRC32 slicing-by-8 phải khớp phép tra bảng từng byte ở mọi độ dài và độ lệch, và cộng dồn được qua nhiều lần gọi.
    func testCRC32SlicedMatchesBytewiseReference() {
        var table = [UInt32](repeating: 0, count: 256)
        for n in 0..<256 { var c = UInt32(n); for _ in 0..<8 { c = (c & 1) != 0 ? (0xEDB8_8320 ^ (c >> 1)) : (c >> 1) }; table[n] = c }
        func reference(_ b: [UInt8]) -> UInt32 { var c: UInt32 = ~0; for x in b { c = table[Int((c ^ UInt32(x)) & 0xFF)] ^ (c >> 8) }; return ~c }
        var seed: UInt64 = 0x9E37_79B9_7F4A_7C15
        func next() -> UInt8 { seed = seed &* 6364136223846793005 &+ 1442695040888963407; return UInt8(truncatingIfNeeded: seed >> 33) }
        let data = (0..<5000).map { _ in next() }
        for len in [0, 1, 7, 8, 9, 15, 16, 17, 63, 64, 65, 1000, 4999] {
            for offset in [0, 1, 3] where offset + len <= data.count {
                let slice = Array(data[offset..<(offset + len)])
                XCTAssertEqual(CRC32.checksum(slice), reference(slice), "len \(len) offset \(offset)")
            }
        }
        var crc = CRC32()
        crc.update(data[0..<1234]); crc.update(data[1234..<5000])
        XCTAssertEqual(crc.value, reference(data))
    }

    /// Nén song song: giải ra đúng, tất định, và luồng hợp lệ ở mọi kích thước quanh ranh giới khối.
    func testParallelDeflateRoundTripsAndIsDeterministic() throws {
        let chunk = Deflate.parallelChunkSize
        var seed: UInt64 = 42
        func make(_ n: Int) -> [UInt8] {
            var out = [UInt8](); out.reserveCapacity(n)
            while out.count < n {
                seed = seed &* 6364136223846793005 &+ 1442695040888963407
                // Xen kẽ đoạn lặp (nén được) và ngẫu nhiên (không nén được) để chạm cả khối stored và Huffman.
                if (seed >> 40) % 3 == 0 { for _ in 0..<40 { out.append(UInt8(truncatingIfNeeded: seed >> 50)) } }
                else { out.append(contentsOf: Array("<c r=\"A\(seed % 1000)\"><v>\(seed % 77777)</v></c>".utf8)) }
            }
            return Array(out.prefix(n))
        }
        for n in [2 * chunk, 2 * chunk + 1, 3 * chunk - 1, 3 * chunk, 5 * chunk + 12345] {
            let input = make(n)
            let a = Deflate.compressParallel(input, level: .fast)
            let b = Deflate.compressParallel(input, level: .fast)
            XCTAssertEqual(a, b, "tất định, n=\(n)")
            XCTAssertEqual(try Inflate.decompress(Data(a)), Data(input), "giải ra đúng, n=\(n)")
            let sequential = Deflate.compress(input, level: .fast)
            XCTAssertLessThan(Double(a.count), Double(sequential.count) * 1.10, "ratio không tệ quá 10%, n=\(n)")
        }
        // Dưới hai khối: phải đúng bằng đường tuần tự.
        let small = make(chunk)
        XCTAssertEqual(Deflate.compressParallel(small, level: .fast), Deflate.compress(small, level: .fast))
    }
}
