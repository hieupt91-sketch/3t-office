# Đối chiếu OOXMLKit FormulaEngine với Excel 2016 thật (05/11/2026)

Nguồn chuẩn: `tests/functions/golden-batch*.json` (Excel 2016 16.0.4266 Application.Evaluate, đã có trong repo; KHÔNG sửa giá trị). Nhánh kiểm: `muse/m7-formulas-0311` @ c3f8a1b8 (Swift 6.0.3, WSL). Bộ test Muse: **362/362 PASS** (Windows chạy lại, khớp báo cáo).

Phạm vi harness: chỉ công thức 1 sheet, bỏ case có `!` (3D) hoặc `{` (hằng mảng); 1345 case.

## Kết quả
TOTAL 399/1345
golden-batch9-odd.json: 0/16
golden-batch8-database.json: 0/108
golden-batch7-securities.json: 0/96
golden-batch6-engineering.json: 0/180
golden-batch5-financial.json: 0/104
golden-batch4-misc.json: 3/114
golden-batch3-text-format.json: 63/94
golden-batch2-stats.json: 45/148
golden-batch16-array-functions.json: 0/24
golden-batch15-array-constants.json: 1/1
golden-batch14-numtext.json: 17/38
golden-batch13-common.json: 116/171
golden-batch12-typical.json: 78/85
golden-batch11-compound.json: 76/82
golden-batch10-3d.json: 0/0
golden-batch1-math.json: 0/84

- Đúng: 399/1345 (29,7%).
- Chưa có hàm (#NAME?): 876 case.
- **Sai kết quả: 70 case**. 5 case do harness (ô bool/chuỗi rỗng của batch11/12: `A1+E1`, `D1=TRUE`, `E1=0`, `D1&"x"`, `B1/E1`), harness Linux đặt TRUE thành số 1, E1 rỗng thành chuỗi rỗng. Còn **65 case sai thật**.

## Lỗi thật cho Muse (ưu tiên)
1. **M7 lát 10, PERCENTRANK sai khi có giá trị trùng hoặc nội suy**: `PERCENTRANK(A1:A8,6)` Excel 0.785, OOXMLKit 0.642; `PERCENTRANK.INC(A1:A8,4.5,4)` Excel 0.5, OOXMLKit 0.2142 (A = 2,4,4,4,5,5,7,9). Excel đếm số giá trị NHỎ HƠN x; quy tắc "trùng lấy hạng lần đầu" chưa đúng.
2. **Mảng trong công thức thường**: `SUMPRODUCT((C1:C4>1)*B1:B4)`, `SUM(IF(A1:B2>1,1,0))` ra #VALUE!. Đây là mẫu rất phổ biến trong tệp LAN thật, cần làm trong phần array/dynamic array của M7.
3. **Số sang chuỗi theo General 15 chữ số của Excel**: `"x"&1E15`, `"x"&1E-7`, `LEN(1E15)`, `123456789012345678` (~22 case). Excel không dùng ký hiệu e+ thường, cắt 15 chữ số có nghĩa, chỉ dùng E+ từ 1E+20/<1E-9.
4. **So sánh theo 15 chữ số**: `F1+F2=0.3` (0.1+0.2) Excel TRUE.
5. **Lũy thừa**: `0^-1` Excel #DIV/0! (OOXMLKit #NUM!); `(-8)^(1/3)` Excel -2 (OOXMLKit #NUM!).
6. **TEXT()** (~30 case): chia nghìn bằng dấu phẩy cuối (`#,##0,`), khoa học (`0.00E+00`), phân số (`# ?/?`), điều kiện (`[>=100]`, `[<10]`, `[=0]`), thời gian dồn (`[h]:mm`, `[m]:ss`), `A/P`, `mmmmm`, mục chữ `@`, chuỗi literal, `-0.001` → `0.00`.
7. **MATCH/VLOOKUP gần đúng trên dữ liệu chưa sắp xếp**: Excel dùng tìm nhị phân (`MATCH(2000000,B1:B5,1)` Excel 5; `VLOOKUP(2,C1:C5,1,TRUE)` Excel 2). VLOOKUP chiếm 91% công thức LAN, cần khớp Excel cả ở hành vi này.

## Hàm chưa có (#NAME?), 293 tên
ACCRINT, ACCRINTM, ACOS, ACOSH, ACOT, ACOTH, AGGREGATE, AMORDEGRC, AMORLINC, ARABIC, AREAS, ASC, ASIN, ASINH, ATAN, ATAN2, ATANH, AVERAGEA, AVERAGEIFS, BASE, BETA.DIST, BETA.INV, BETADIST, BETAINV, BIN2DEC, BIN2HEX, BIN2OCT, BINOM.DIST, BINOM.DIST.RANGE, BINOM.INV, BINOMDIST, BITAND, BITLSHIFT, BITOR, BITRSHIFT, BITXOR, CEILING, CEILING.MATH, CEILING.PRECISE, CHAR, CHIDIST, CHIINV, CHISQ.DIST, CHISQ.DIST.RT, CHISQ.INV, CHISQ.INV.RT, CODE, COLUMNS, COMBIN, COMBINA, COMPLEX, CONFIDENCE, CONFIDENCE.NORM, CONFIDENCE.T, CONVERT, COSH, COT, COTH, COUNTBLANK, COUPDAYBS, COUPDAYS, COUPDAYSNC, COUPNCD, COUPNUM, COUPPCD, COVAR, CRITBINOM, CSC, CSCH, CUMIPMT, CUMPRINC, DATEVALUE, DAVERAGE, DAYS, DAYS360, DCOUNT, DCOUNTA, DDB, DEC2BIN, DEC2HEX, DEC2OCT, DECIMAL, DELTA, DGET, DISC, DMAX, DMIN, DOLLARDE, DOLLARFR, DPRODUCT, DSTDEV, DSTDEVP, DSUM, DURATION, DVAR, DVARP, EFFECT, ERF, ERF.PRECISE, ERFC, ERFC.PRECISE, ERROR.TYPE, EVEN, EXACT, EXPON.DIST, EXPONDIST, F.DIST, F.DIST.RT, F.INV, F.INV.RT, FACT, FACTDOUBLE, FDIST, FINDB, FINV, FIXED, FLOOR, FLOOR.MATH, FLOOR.PRECISE, FREQUENCY, FVSCHEDULE, GAMMA.DIST, GAMMA.INV, GAMMADIST, GAMMAINV, GAMMALN, GAMMALN.PRECISE, GAUSS, GCD, GESTEP, HEX2BIN, HEX2DEC, HEX2OCT, HYPGEOM.DIST, HYPGEOMDIST, IF, IMABS, IMAGINARY, IMARGUMENT, IMCONJUGATE, IMCOS, IMCOSH, IMCOT, IMDIV, IMEXP, IMLN, IMLOG10, IMLOG2, IMPOWER, IMPRODUCT, IMREAL, IMSEC, IMSECH, IMSIN, IMSINH, IMSQRT, IMSUB, IMSUM, IMTAN, INDEX, INTRATE, ISBLANK, ISERR, ISERROR, ISEVEN, ISNA, ISNUMBER, ISO.CEILING, ISODD, ISOWEEKNUM, ISPMT, ISREF, ISTEXT, LCM, LEFTB, LENB, LINEST, LOGEST, LOGINV, LOGNORM.DIST, LOGNORM.INV, LOGNORMDIST, LOOKUP, MAXA, MDETERM, MDURATION, MIDB, MINA, MINVERSE, MIRR, MMULT, MODE.MULT, MROUND, MULTINOMIAL, MUNIT, N, NEGBINOM.DIST, NEGBINOMDIST, NETWORKDAYS, NETWORKDAYS.INTL, NOMINAL, NORM.DIST, NORM.INV, NORM.S.DIST, NORM.S.INV, NORMDIST, NORMINV, NORMSDIST, NORMSINV, NUMBERVALUE, OCT2BIN, OCT2DEC, OCT2HEX, ODD, ODDLPRICE, ODDLYIELD, OFFSET, PDURATION, PERMUT, PERMUTATIONA, PHI, PI, POISSON, POISSON.DIST, PRICE, PRICEDISC, PRICEMAT, PRODUCT, PROPER, QUOTIENT, RECEIVED, REPLACEB, REPT, RIGHTB, ROMAN, ROWS, RRI, SEARCHB, SEC, SECH, SERIESSUM, SHEET, SHEETS, SIGN, SINH, SQRTPI, STDEVA, STDEVPA, SUBTOTAL, SUM, SUMPRODUCT, SUMSQ, SUMX2MY2, SUMX2PY2, SUMXMY2, SYD, T, T.DIST, T.DIST.2T, T.DIST.RT, T.INV, T.INV.2T, TANH, TBILLEQ, TBILLPRICE, TBILLYIELD, TDIST, TIMEVALUE, TINV, TRANSPOSE, TREND, TRUE, TRUNC, TYPE, UNICHAR, UNICODE, VARA, VARPA, VDB, WEEKDAY, WEEKNUM, WEIBULL, WEIBULL.DIST, WORKDAY, WORKDAY.INTL, XIRR, XNPV, XOR, YIELD, YIELDDISC, YIELDMAT, Z.TEST, ZTEST

## Danh sách sai đầy đủ
- golden-batch11-compound.json =A1+E1 excel=1 (number) ooxmlkit=error("#VALUE!")
- golden-batch11-compound.json =0^-1 excel=#DIV/0! (error) ooxmlkit=error("#NUM!")
- golden-batch11-compound.json =(-8)^(1/3) excel=-1.9999999999999998 (number) ooxmlkit=error("#NUM!")
- golden-batch11-compound.json =D1=TRUE excel=1 (boolean) ooxmlkit=bool(false)
- golden-batch11-compound.json =E1=0 excel=1 (boolean) ooxmlkit=bool(false)
- golden-batch11-compound.json =D1&"x" excel=TRUEx (string) ooxmlkit=string("1x")
- golden-batch12-typical.json =SUMPRODUCT((C1:C4>1)*B1:B4) excel=3050000 (number) ooxmlkit=error("#VALUE!")
- golden-batch12-typical.json =B1/E1 excel=#DIV/0! (error) ooxmlkit=error("#VALUE!")
- golden-batch13-common.json =MATCH(2000000,B1:B5,1) excel=5 (number) ooxmlkit=number(1.0)
- golden-batch13-common.json =VLOOKUP(2,C1:C5,1,TRUE) excel=2 (number) ooxmlkit=error("#N/A")
- golden-batch13-common.json =TEXT(B1,"0.0,,")&"tr" excel=1.2tr (string) ooxmlkit=string("1200000.0tr")
- golden-batch13-common.json =F1+F2=0.3 excel=1 (boolean) ooxmlkit=bool(false)
- golden-batch13-common.json =123456789012345678 excel=123456789012345000 (number) ooxmlkit=number(1.2345678901234568e+17)
- golden-batch13-common.json ="x"&1E15 excel=x1000000000000000 (string) ooxmlkit=string("x1e+15")
- golden-batch13-common.json ="x"&1E-7 excel=x0.0000001 (string) ooxmlkit=string("x1e-07")
- golden-batch14-numtext.json ="x"&1E21 excel=x1E+21 (string) ooxmlkit=string("x1e+21")
- golden-batch14-numtext.json ="x"&1E20 excel=x1E+20 (string) ooxmlkit=string("x1e+20")
- golden-batch14-numtext.json ="x"&1E15 excel=x1000000000000000 (string) ooxmlkit=string("x1e+15")
- golden-batch14-numtext.json ="x"&123456789012345678 excel=x123456789012345000 (string) ooxmlkit=string("x1.23456789012346e+17")
- golden-batch14-numtext.json ="x"&12345678901234567890 excel=x12345678901234500000 (string) ooxmlkit=string("x1.23456789012346e+19")
- golden-batch14-numtext.json ="x"&0.1234567890123456789 excel=x0.123456789012345 (string) ooxmlkit=string("x0.123456789012346")
- golden-batch14-numtext.json ="x"&1E-5 excel=x0.00001 (string) ooxmlkit=string("x1e-05")
- golden-batch14-numtext.json ="x"&1E-7 excel=x0.0000001 (string) ooxmlkit=string("x1e-07")
- golden-batch14-numtext.json ="x"&1E-9 excel=x0.000000001 (string) ooxmlkit=string("x1e-09")
- golden-batch14-numtext.json ="x"&1E-10 excel=x0.0000000001 (string) ooxmlkit=string("x1e-10")
- golden-batch14-numtext.json ="x"&1E-11 excel=x0.00000000001 (string) ooxmlkit=string("x1e-11")
- golden-batch14-numtext.json ="x"&0.00001234 excel=x0.00001234 (string) ooxmlkit=string("x1.234e-05")
- golden-batch14-numtext.json ="x"&0.000000000123 excel=x0.000000000123 (string) ooxmlkit=string("x1.23e-10")
- golden-batch14-numtext.json ="x"&100000000000000000000 excel=x1E+20 (string) ooxmlkit=string("x1e+20")
- golden-batch14-numtext.json ="x"&(2^70) excel=x1.18059162071741E+21 (string) ooxmlkit=string("x1.18059162071741e+21")
- golden-batch14-numtext.json ="x"&(2^-20) excel=x9.5367431640625E-07 (string) ooxmlkit=string("x9.5367431640625e-07")
- golden-batch14-numtext.json ="x"&(1E300*10) excel=x1E+301 (string) ooxmlkit=string("x1e+301")
- golden-batch14-numtext.json ="x"&1.5E-300 excel=x1.5E-300 (string) ooxmlkit=string("x1.5e-300")
- golden-batch14-numtext.json ="x"&9999999999999999 excel=x9999999999999990 (string) ooxmlkit=string("x1e+16")
- golden-batch14-numtext.json ="x"&0.9999999999999999 excel=x0.999999999999999 (string) ooxmlkit=string("x1")
- golden-batch14-numtext.json =LEN(1E15) excel=16 (number) ooxmlkit=number(5.0)
- golden-batch16-array-functions.json =SUM(IF(A1:B2>1,1,0)) excel=3 (number) ooxmlkit=error("#VALUE!")
- golden-batch2-stats.json =PERCENTRANK(A1:A8,6) excel=0.785 (number) ooxmlkit=number(0.642)
- golden-batch2-stats.json =PERCENTRANK.INC(A1:A8,4.5,4) excel=0.5 (number) ooxmlkit=number(0.2142)
- golden-batch3-text-format.json =TEXT(A2,"0.00;[Red]-0.00") excel=-1234.57 (string) ooxmlkit=error("#VALUE!")
- golden-batch3-text-format.json =TEXT(A5,"mmmmm") excel=M (string) ooxmlkit=string("March")
- golden-batch3-text-format.json =TEXT(A5,"hh:mm A/P") excel=06:00 P (string) ooxmlkit=string("06:00 PM")
- golden-batch3-text-format.json =TEXT(A6,"[h]:mm") excel=12:00 (string) ooxmlkit=string("[12]:00")
- golden-batch3-text-format.json =TEXT(1.5,"[h]:mm:ss") excel=36:00:00 (string) ooxmlkit=string("[12]:00:00")
- golden-batch3-text-format.json =TEXT(0.0123,"[m]:ss") excel=17:43 (string) ooxmlkit=string("[17]:43")
- golden-batch3-text-format.json =TEXT(0.00012345,"ss.00") excel=10.67 (string) ooxmlkit=string("11.00")
- golden-batch3-text-format.json =TEXT(A7,"#,##0,") excel=1,235 (string) ooxmlkit=string("1,234,568")
- golden-batch3-text-format.json =TEXT(A7,"#,##0.0,,""M""") excel=1.2M (string) ooxmlkit=string("1,234,567.9M")
- golden-batch3-text-format.json =TEXT(A7,"0.00E+00") excel=1.23E+06 (string) ooxmlkit=error("#VALUE!")
- golden-batch3-text-format.json =TEXT(A8,"0.00E+00") excel=1.23E-04 (string) ooxmlkit=error("#VALUE!")
- golden-batch3-text-format.json =TEXT(A7,"##0.0E+0") excel=1.2E+6 (string) ooxmlkit=error("#VALUE!")
- golden-batch3-text-format.json =TEXT(A7,"0E-00") excel=1E06 (string) ooxmlkit=error("#VALUE!")
- golden-batch3-text-format.json =TEXT(A10,"# ?/?") excel=1 3/4 (string) ooxmlkit=error("#VALUE!")
- golden-batch3-text-format.json =TEXT(A10,"# ??/??") excel=1  3/4  (string) ooxmlkit=error("#VALUE!")
- golden-batch3-text-format.json =TEXT(0.333,"?/?") excel=1/3 (string) ooxmlkit=error("#VALUE!")
- golden-batch3-text-format.json =TEXT(2.5,"# ?/2") excel=2 1/2 (string) ooxmlkit=error("#VALUE!")
- golden-batch3-text-format.json =TEXT(0.75,"# ?/?") excel= 3/4 (string) ooxmlkit=error("#VALUE!")
- golden-batch3-text-format.json =TEXT(A11,"[>=100]""big"";""small""") excel=big (string) ooxmlkit=string("[>=1100]big")
- golden-batch3-text-format.json =TEXT(50,"[>=100]""big"";""small""") excel=small (string) ooxmlkit=string("[>=150]big")
- golden-batch3-text-format.json =TEXT(5,"[<10]0.0;0") excel=5.0 (string) ooxmlkit=error("#VALUE!")
- golden-batch3-text-format.json =TEXT(15,"[<10]0.0;0") excel=15 (string) ooxmlkit=error("#VALUE!")
- golden-batch3-text-format.json =TEXT(0,"[=0]""zero"";0") excel=zero (string) ooxmlkit=string("[=0]zero")
- golden-batch3-text-format.json =TEXT(B1,"@@") excel=hellohello (string) ooxmlkit=string("hello")
- golden-batch3-text-format.json =TEXT(B1,"""Hi ""@") excel=Hi hello (string) ooxmlkit=string("hello")
- golden-batch3-text-format.json =TEXT(B1,"0.00;0.00;0.00;""text:""@") excel=text:hello (string) ooxmlkit=string("hello")
- golden-batch3-text-format.json =TEXT(B2,"@") excel=12 (string) ooxmlkit=string("@")
- golden-batch3-text-format.json =TEXT(1234.5,"""Total: ""General") excel=Total: 1234.5 (string) ooxmlkit=error("#VALUE!")
- golden-batch3-text-format.json =TEXT(12345678,"000-0000") excel=1234-5678 (string) ooxmlkit=error("#VALUE!")
- golden-batch3-text-format.json =TEXT(1234567,"(###) ###-####") excel=() 123-4567 (string) ooxmlkit=error("#VALUE!")
- golden-batch3-text-format.json =TEXT(-0.001,"0.00") excel=0.00 (string) ooxmlkit=string("-0.00")

## Harness (Windows dùng tạm, không commit vào OOXMLKit; Muse nên đưa vào Tests chính thức làm cổng M1 #11)
```swift
import XCTest
import Foundation
@testable import OOXMLSpreadsheet

/// TEMP (Windows lead verification, not committed): run OOXMLKit FormulaEngine over
/// Excel 2016 golden cases from tests/functions/*golden*.json and write a report.
final class ZZGoldenOracleTests: XCTestCase {
    func testGoldenOracle() throws {
        let dir = "/mnt/e/VNOffice-main-merge/tests/functions"
        let outPath = "/mnt/e/VNOffice-briefs/tmp/golden-oracle.txt"
        guard let names = try? FileManager.default.contentsOfDirectory(atPath: dir) else { return }
        var lines: [String] = []
        var total = 0, ok = 0
        for name in names.sorted() where name.hasPrefix("golden-batch") && name.hasSuffix(".json") {
            guard let data = FileManager.default.contents(atPath: dir + "/" + name),
                  let root = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let cases = root["cases"] as? [[String: Any]] else { continue }
            let cells = root["cells"] as? [String: Any] ?? [:]
            var fileOk = 0, fileTotal = 0
            for c in cases {
                guard var f = c["formula"] as? String else { continue }
                if f.hasPrefix("=") { f.removeFirst() }
                if f.contains("!") || f.contains("{") { continue } // single-sheet, no array constants
                let e = FormulaEngine()
                e.addSheet("Sheet1")
                for (k, v) in cells {
                    if k.contains("!") { continue }
                    let cv: CellValue
                    if let b = v as? Bool, "\(v)" == "true" || "\(v)" == "false" { cv = .bool(b) }
                    else if let d = v as? Double { cv = .number(d) }
                    else if let s = v as? String { cv = s.hasPrefix("#") ? .error(s) : .string(s) }
                    else { continue }
                    e.setValue(cv, sheet: "Sheet1", at: k)
                }
                e.setFormula(f, sheet: "Sheet1", at: "ZZ999")
                e.recalculate()
                let got = e.value(sheet: "Sheet1", at: "ZZ999")
                let exp = c["excel"]
                let type = c["type"] as? String ?? ""
                var pass = false
                switch got {
                case .number(let d):
                    if let x = exp as? Double, type != "bool" { pass = abs(d - x) <= max(1e-9, abs(x) * 1e-9) }
                case .string(let s): pass = (exp as? String) == s && type != "error"
                case .bool(let b): if let x = exp as? Bool, type == "bool" || type == "boolean" { pass = x == b }
                case .error(let s): pass = type == "error" && (exp as? String) == s
                case .empty: pass = false
                }
                fileTotal += 1; if pass { fileOk += 1 } else { lines.append("  MISMATCH \(name) =\(f) excel=\(exp ?? "nil") (\(type)) ooxmlkit=\(got)") }
            }
            total += fileTotal; ok += fileOk
            lines.insert("\(name): \(fileOk)/\(fileTotal)", at: 0)
        }
        lines.insert("TOTAL \(ok)/\(total)", at: 0)
        try lines.joined(separator: "\n").write(toFile: outPath, atomically: true, encoding: .utf8)
    }
}

```