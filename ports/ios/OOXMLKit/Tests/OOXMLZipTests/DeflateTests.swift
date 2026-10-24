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
}
