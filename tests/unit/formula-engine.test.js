/**
 * Test Suite: Excel Spreadsheet Formula Engine Tests
 */

import { FormulaEngine } from "../../apps/sheet/formula-engine.js";

export async function runFormulaEngineTests() {
  const results = [];
  const approximatelyEqual = (actual, expected, tolerance = 1e-8) =>
    typeof actual === "number" && Math.abs(actual - expected) <= tolerance;

  const cellsData = new Map();
  cellsData.set("A1", { val: "10", formula: "", style: {} });
  cellsData.set("A2", { val: "20", formula: "", style: {} });
  cellsData.set("A3", { val: "30", formula: "", style: {} });
  cellsData.set("B1", { val: "Xin", formula: "", style: {} });
  cellsData.set("B2", { val: "chào", formula: "", style: {} });
  cellsData.set("C1", { val: "25.000.000 ₫", formula: "", style: {} });
  cellsData.set("C2", { val: "45.000.000 ₫", formula: "", style: {} });
  cellsData.set("D1", { val: "-10000", formula: "", style: {} });
  cellsData.set("D2", { val: "3000", formula: "", style: {} });
  cellsData.set("D3", { val: "4200", formula: "", style: {} });
  cellsData.set("D4", { val: "6800", formula: "", style: {} });
  cellsData.set("E1", { val: "-70000", formula: "", style: {} });
  cellsData.set("E2", { val: "12000", formula: "", style: {} });
  cellsData.set("E3", { val: "15000", formula: "", style: {} });
  cellsData.set("E4", { val: "18000", formula: "", style: {} });
  cellsData.set("E5", { val: "21000", formula: "", style: {} });
  cellsData.set("E6", { val: "26000", formula: "", style: {} });

  const engine = new FormulaEngine(cellsData);

  // 1. SUM
  const sumRes = engine.evaluate("=SUM(A1:A3)");
  results.push({
    name: "Formula: SUM(A1:A3) = 60",
    pass: sumRes === 60
  });

  // 2. SUM với tiền tệ VNĐ
  const sumVndRes = engine.evaluate("=SUM(C1:C2)");
  results.push({
    name: "Formula: SUM tiền tệ (25tr + 45tr = 70.000.000)",
    pass: sumVndRes === 70000000
  });

  // 3. AVERAGE
  const avgRes = engine.evaluate("=AVERAGE(A1:A3)");
  results.push({
    name: "Formula: AVERAGE(A1:A3) = 20",
    pass: avgRes === 20
  });

  // 4. MIN & MAX
  const minRes = engine.evaluate("=MIN(A1:A3)");
  const maxRes = engine.evaluate("=MAX(A1:A3)");
  results.push({
    name: "Formula: MIN = 10, MAX = 30",
    pass: minRes === 10 && maxRes === 30
  });

  // 5. COUNT & COUNTA
  const countRes = engine.evaluate("=COUNT(A1:A3)");
  const countaRes = engine.evaluate("=COUNTA(B1:B2)");
  results.push({
    name: "Formula: COUNT = 3, COUNTA = 2",
    pass: countRes === 3 && countaRes === 2
  });

  // 6. IF logic
  const ifTrueRes = engine.evaluate('=IF(A1 > 5, "Lớn", "Nhỏ")');
  const ifFalseRes = engine.evaluate('=IF(A1 > 50, "Lớn", "Nhỏ")');
  results.push({
    name: 'Formula: IF(A1 > 5, "Lớn", "Nhỏ") hoạt động đúng',
    pass: ifTrueRes === "Lớn" && ifFalseRes === "Nhỏ"
  });

  // 7. CONCAT & Text
  const concatRes = engine.evaluate('=CONCAT(B1, " ", B2)');
  results.push({
    name: 'Formula: CONCAT(B1, " ", B2) = "Xin chào"',
    pass: concatRes === "Xin chào"
  });

  // 8. Số học: =A1 + A2 * 2
  const arithRes = engine.evaluate("=A1 + A2 * 2");
  results.push({
    name: "Formula: A1 + A2 * 2 = 50",
    pass: arithRes === 50
  });

  // 9. PMT — khoản vay 100.000.000, 12%/năm, trả hàng tháng trong 10 năm.
  // Excel: =PMT(12%/12,120,100000000) -> -1.434.709,48402587
  const pmtRes = engine.evaluate("=PMT(0.01,120,100000000)");
  const pmtZeroRateRes = engine.evaluate("=PMT(0,10,1000,0,0)");
  results.push({
    name: "Financial PMT: đúng quy ước dấu Excel và không chia 0 khi rate=0",
    pass: approximatelyEqual(pmtRes, -1434709.4840258735, 1e-6) &&
          approximatelyEqual(pmtZeroRateRes, -100) &&
          engine.evaluate("=PMT(0.01,0,1000)") === "#NUM!"
  });

  // 10. FV — gửi đầu kỳ 10.000 và góp cuối tháng 1.000, lãi 5%/năm trong 10 năm.
  // Excel: =FV(5%/12,120,-1000,-10000,0) -> 171.752,37442257
  const fvRes = engine.evaluate("=FV(0.004166666666666667,120,-1000,-10000,0)");
  const fvZeroRateRes = engine.evaluate("=FV(0,10,-100,-1000,0)");
  results.push({
    name: "Financial FV: đúng giá trị tương lai, quy ước dấu và nhánh rate=0",
    pass: approximatelyEqual(fvRes, 171752.37442257005, 1e-6) &&
          approximatelyEqual(fvZeroRateRes, 2000) &&
          engine.evaluate("=FV(0.01,-1,-100)") === "#NUM!"
  });

  // 11. PV — nhận 1.000 cuối mỗi tháng, chiết khấu 5%/năm trong 10 năm.
  // Excel: =PV(5%/12,120,-1000,0,0) -> 94.281,3503282348
  const pvRes = engine.evaluate("=PV(0.004166666666666667,120,-1000,0,0)");
  const pvZeroRateRes = engine.evaluate("=PV(0,10,-100,0,0)");
  results.push({
    name: "Financial PV: đúng giá trị hiện tại, quy ước dấu và nhánh rate=0",
    pass: approximatelyEqual(pvRes, 94281.35032823475, 1e-6) &&
          approximatelyEqual(pvZeroRateRes, 1000) &&
          engine.evaluate("=PV(0.01,0,-100)") === "#NUM!"
  });

  // 12. NPV — Excel chiết khấu value1 ở cuối kỳ 1, không phải kỳ 0.
  // Excel: =NPV(10%,-10000,3000,4200,6800) -> 1.188,44341233522
  const npvRes = engine.evaluate("=NPV(0.1,-10000,3000,4200,6800)");
  const npvRangeRes = engine.evaluate("=NPV(0.1,D1:D4)");
  results.push({
    name: "Financial NPV: chiết khấu từ kỳ 1 và hỗ trợ vùng dòng tiền",
    pass: approximatelyEqual(npvRes, 1188.4434123352207, 1e-9) &&
          approximatelyEqual(npvRangeRes, 1188.4434123352207, 1e-9) &&
          engine.evaluate("=NPV(-1,100)") === "#NUM!"
  });

  // 13. IRR — dòng tiền đầu tư ban đầu và 5 khoản thu cuối năm.
  // Excel: =IRR(E1:E6) -> 8,66309480365317%
  const irrRes = engine.evaluate("=IRR(E1:E6)");
  results.push({
    name: "Financial IRR: hội tụ đúng nghiệm Excel và báo #NUM! khi không đổi dấu",
    pass: approximatelyEqual(irrRes, 0.08663094803653172, 1e-9) &&
          engine.evaluate("=IRR(D2:D4)") === "#NUM!"
  });

  // 14. RATE — vay 10.000, trả 200 cuối mỗi tháng trong 60 tháng.
  // Excel: =RATE(60,-200,10000) -> 0,618341316125365% mỗi tháng.
  const rateRes = engine.evaluate("=RATE(60,-200,10000)");
  results.push({
    name: "Financial RATE: giải đúng lãi suất mỗi kỳ và kiểm tra nper",
    pass: approximatelyEqual(rateRes, 0.006183413161253651, 1e-10) &&
          engine.evaluate("=RATE(0,-200,10000)") === "#NUM!" &&
          engine.evaluate("=RATE(10,0,1000,1000)") === "#NUM!"
  });

  // 15. SLN — tài sản 1.000.000, giá trị thu hồi 100.000, sử dụng 5 năm.
  // Excel: =SLN(1000000,100000,5) -> 180.000 mỗi năm.
  const slnRes = engine.evaluate("=SLN(1000000,100000,5)");
  results.push({
    name: "Financial SLN: khấu hao đường thẳng đúng và kiểm tra life",
    pass: slnRes === 180000 && engine.evaluate("=SLN(1000000,100000,0)") === "#NUM!"
  });

  // 16. DB — ví dụ chính thức của Excel: tài sản 1.000.000, thu hồi 100.000,
  // đời hữu ích 6 năm, năm đầu dùng 7 tháng. Excel lần lượt trả 186.083,33;
  // 259.639,42 và kỳ cuối 5 tháng là 15.845,10.
  const dbFirstRes = engine.evaluate("=DB(1000000,100000,6,1,7)");
  const dbSecondRes = engine.evaluate("=DB(1000000,100000,6,2,7)");
  const dbLastRes = engine.evaluate("=DB(1000000,100000,6,7,7)");
  results.push({
    name: "Financial DB: đúng hệ số làm tròn, tháng đầu và kỳ cuối kiểu Excel",
    pass: approximatelyEqual(dbFirstRes, 186083.33333333334, 1e-8) &&
          approximatelyEqual(dbSecondRes, 259639.41666666666, 1e-8) &&
          approximatelyEqual(dbLastRes, 15845.098473848071, 1e-8) &&
          engine.evaluate("=DB(1000000,100000,0,1)") === "#NUM!" &&
          engine.evaluate("=DB(1000000,100000,6,1,13)") === "#NUM!"
  });

  return results;
}
