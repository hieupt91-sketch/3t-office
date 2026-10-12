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
  cellsData.set("F1", { val: "-1", formula: "", style: {} });
  cellsData.set("F2", { val: "2", formula: "", style: {} });
  cellsData.set("F3", { val: "-2", formula: "", style: {} });

  const engine = new FormulaEngine(cellsData);

  const staticReferences = engine.getStaticFormulaReferences('=IF(A1>0,SUM(B2:B4),"C99")', "Sheet1");
  results.push({
    name: "Formula dependencies: extract cell and range refs while ignoring quoted text",
    pass: staticReferences.safe && staticReferences.references.length === 2 &&
      staticReferences.references[0].sheet === "Sheet1" &&
      staticReferences.references[0].startRow === 1 &&
      staticReferences.references[1].startColumn === 1 &&
      staticReferences.references[1].startRow === 2 &&
      staticReferences.references[1].endRow === 4
  });
  results.push({
    name: "Formula dependencies: dynamic references request full-recalculation fallback",
    pass: engine.getStaticFormulaReferences('=INDIRECT("A1")', "Sheet1").safe === false
  });
  const wholeColumnReferences = engine.getStaticFormulaReferences("=VLOOKUP(A1,P:AD,2,0)", "Sheet1");
  results.push({
    name: "Formula dependencies: index whole-column lookup ranges",
    pass: wholeColumnReferences.safe && wholeColumnReferences.references.length === 2 &&
      wholeColumnReferences.references[1].startColumn === engine._columnIndex("P") &&
      wholeColumnReferences.references[1].endColumn === engine._columnIndex("AD") &&
      wholeColumnReferences.references[1].startRow === 1 &&
      wholeColumnReferences.references[1].endRow === Number.MAX_SAFE_INTEGER
  });
  results.push({
    name: "Formula dependencies: recognize literal spreadsheet errors without references",
    pass: engine.getStaticFormulaReferences("=#N/A", "Sheet1").safe &&
      engine.getStaticFormulaReferences("=#REF!", "Sheet1").safe
  });

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
          engine.evaluate("=IRR(D2:D4)") === "#NUM!" &&
          engine.evaluate("=IRR(F1:F3)") === "#NUM!"
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

  // 17. NPER — ví dụ chính thức của Excel: lãi 12%/năm, góp đầu tháng 100,
  // vốn ban đầu 1.000 và mục tiêu 10.000. Excel: =NPER(12%/12,-100,-1000,10000,1) -> 59,6738656742946
  const nperRes = engine.evaluate("=NPER(0.01,-100,-1000,10000,1)");
  const nperZeroRateRes = engine.evaluate("=NPER(0,-100,1000,0,0)");
  results.push({
    name: "Financial NPER: đúng số kỳ Excel, quy ước type và nhánh rate=0",
    pass: approximatelyEqual(nperRes, 59.67386567429457, 1e-10) &&
          approximatelyEqual(nperZeroRateRes, 10) &&
          engine.evaluate("=NPER(0,0,1000)") === "#NUM!" &&
          engine.evaluate("=NPER(0.01,-10,1000,0,2)") === "#NUM!"
  });

  // 18. IPMT — khoản vay 2.000, lãi 10%/năm, trả hàng tháng trong 2 năm.
  // Excel: =IPMT(10%/12,1,2*12,2000) -> -16,6666666666667
  const ipmtRes = engine.evaluate("=IPMT(0.008333333333333333,1,24,2000)");
  const ipmtTypeOneRes = engine.evaluate("=IPMT(0.008333333333333333,1,24,2000,0,1)");
  const ipmtZeroRateRes = engine.evaluate("=IPMT(0,5,10,1000)");
  results.push({
    name: "Financial IPMT: đúng phần lãi Excel, đầu kỳ đầu không có lãi và rate=0",
    pass: approximatelyEqual(ipmtRes, -16.666666666666668, 1e-10) &&
          approximatelyEqual(ipmtTypeOneRes, 0) &&
          approximatelyEqual(ipmtZeroRateRes, 0) &&
          engine.evaluate("=IPMT(0.01,0,12,1000)") === "#NUM!" &&
          engine.evaluate("=IPMT(0.01,13,12,1000)") === "#NUM!"
  });

  // 19. PPMT — cùng khoản vay 2.000; phần gốc kỳ đầu bằng PMT trừ IPMT.
  // Excel: =PPMT(10%/12,1,2*12,2000) -> -75,6231860083666
  const ppmtRes = engine.evaluate("=PPMT(0.008333333333333333,1,24,2000)");
  const ppmtZeroRateRes = engine.evaluate("=PPMT(0,5,10,1000)");
  const matchingPmtRes = engine.evaluate("=PMT(0.008333333333333333,24,2000)");
  results.push({
    name: "Financial PPMT: đúng phần gốc Excel và luôn thỏa PPMT = PMT - IPMT",
    pass: approximatelyEqual(ppmtRes, -75.62318600836664, 1e-10) &&
          approximatelyEqual(ppmtZeroRateRes, -100) &&
          approximatelyEqual(ppmtRes, matchingPmtRes - ipmtRes, 1e-12) &&
          engine.evaluate("=PPMT(0.01,0,12,1000)") === "#NUM!" &&
          engine.evaluate("=PPMT(0.01,13,12,1000)") === "#NUM!"
  });

  // 20. TEXT — các mẫu số, phần trăm, ngày tháng và VNĐ thông dụng.
  const textCases = [
    ['=TEXT(1234.5,"0")', "1235"],
    ['=TEXT(1234.5,"0.0")', "1234.5"],
    ['=TEXT(1234.5,"0.000")', "1234.500"],
    ['=TEXT(1234.5,"#,##0.00")', "1,234.50"],
    ['=TEXT(0.125,"0%")', "13%"],
    ['=TEXT(0.125,"0.00%")', "12.50%"],
    ['=TEXT("2024-03-10","mm/dd/yyyy")', "03/10/2024"],
    ['=TEXT("2024-03-10","dd-mm-yyyy")', "10-03-2024"],
    ['=TEXT("2024-03-10","yyyy-mm-dd")', "2024-03-10"],
    ['=TEXT("2024-03-10","dd mmmm yyyy")', "10 tháng Ba 2024"],
    ['=TEXT(1234.5,"#,##0.00 ₫")', "1,234.50 ₫"]
  ];
  results.push({
    name: "TEXT: hỗ trợ đầy đủ mẫu số, phần trăm, ngày và tiền tệ mới",
    pass: textCases.every(([formula, expected]) => engine.evaluate(formula) === expected)
  });

  // 21. TEXT — ba mẫu cũ giữ nguyên đầu ra.
  results.push({
    name: "TEXT regression: #,##0, 0.00 và dd/mm/yyyy giữ nguyên hành vi",
    pass: engine.evaluate('=TEXT(1234.5,"#,##0")') === "1,235" &&
          engine.evaluate('=TEXT(1234.5,"0.00")') === "1234.50" &&
          engine.evaluate('=TEXT("2024-03-10","dd/mm/yyyy")') === "10/03/2024"
  });

  // 22. DATEDIF — phần dư sau năm/tháng đầy đủ, gồm mốc cuối tháng và năm nhuận.
  const datedifCases = [
    ['=DATEDIF("2020-01-15","2024-03-10","md")', 24],
    ['=DATEDIF("2020-01-15","2024-03-10","ym")', 1],
    ['=DATEDIF("2020-01-15","2024-03-10","yd")', 55],
    ['=DATEDIF("2001-06-01","2002-08-15","yd")', 75],
    ['=DATEDIF("2024-01-31","2024-03-01","md")', 1]
  ];
  results.push({
    name: "DATEDIF: md, ym, yd đúng phần dư Excel và xử lý cuối tháng/năm nhuận",
    pass: datedifCases.every(([formula, expected]) => engine.evaluate(formula) === expected)
  });

  // 23. DATEDIF — các đơn vị cũ và lỗi cũ không đổi.
  results.push({
    name: "DATEDIF regression: d, m, y và validation giữ nguyên hành vi",
    pass: engine.evaluate('=DATEDIF("2020-01-15","2024-03-10","d")') === 1516 &&
          engine.evaluate('=DATEDIF("2020-01-15","2024-03-10","m")') === 49 &&
          engine.evaluate('=DATEDIF("2020-01-15","2024-03-10","y")') === 4 &&
          engine.evaluate('=DATEDIF("2024-03-10","2020-01-15","md")') === "#NUM!"
  });

  // 24. Bug thật đã sửa: kết quả công thức KHÔNG được làm tròn 2 chữ số
  // thập phân ở tầng tính toán (trước đây _evaluateArithmetic/AVERAGE tự
  // Math.round(x*100)/100, cắt cụt 1/3 thành 0.33 và làm sai mọi công thức
  // tham chiếu tiếp). Excel giữ nguyên độ chính xác double đầy đủ khi tính,
  // nên (1/3)*3 phải ra đúng 1, không phải 0.99 hay giá trị bị khuếch đại.
  results.push({
    name: "Bug thật: giá trị công thức giữ nguyên độ chính xác double, không bị làm tròn 2 chữ số ở tầng tính toán",
    pass: (() => {
      const chainCells = new Map();
      chainCells.set("Z1", { val: "", formula: "=1/3", style: {} });
      const chainEngine = new FormulaEngine(chainCells);
      const z1 = chainEngine.evaluate("=1/3");
      chainCells.get("Z1").val = z1; // mô phỏng đúng luồng setCellValue lưu kết quả thô
      const z2 = chainEngine.evaluate("=Z1*3");
      return z1 === 1 / 3 && z2 === 1 &&
        chainEngine.evaluate("=123.456789") === 123.456789 &&
        chainEngine.evaluate("=AVERAGE(0.1,0.2)") === (0.1 + 0.2) / 2;
    })()
  });

  // 25. Bug thật đã sửa: getCellValue() không được coi số thực (vd 0.333...)
  // là chuỗi tiền tệ VNĐ rồi xóa dấu "." tưởng là dấu phân cách hàng nghìn
  // (0.333333333333333 -> "0333333333333333" -> 333333333333333).
  results.push({
    name: "Bug thật: getCellValue không hiểu nhầm dấu chấm thập phân của số là dấu phân cách hàng nghìn VNĐ",
    pass: (() => {
      const numCells = new Map();
      numCells.set("Y1", { val: 0.333333333333333, formula: "", style: {} });
      const numEngine = new FormulaEngine(numCells);
      return numEngine.getCellValue("Y1") === 0.333333333333333 &&
        numEngine.evaluate("=Y1*3") > 0.99 && numEngine.evaluate("=Y1*3") < 1.01;
    })()
  });

  // 26. NA() — trả lỗi #N/A
  results.push({
    name: "NA(): =NA() trả về chuỗi lỗi \"#N/A\"",
    pass: engine.evaluate("=NA()") === "#N/A"
  });

  // 27. NA() + ISNA — ISNA(NA()) = TRUE
  results.push({
    name: "NA(): ISNA(NA()) = TRUE",
    pass: engine.evaluate("=ISNA(NA())") === true
  });

  // 28. NA() + IFERROR — IFERROR(NA(), 99) = 99
  results.push({
    name: "NA(): IFERROR(NA(), 99) = 99",
    pass: engine.evaluate("=IFERROR(NA(), 99)") === 99
  });

  // 29. NA() + IFNA — IFNA(NA(), \"thay thế\") = \"thay thế\"
  results.push({
    name: "NA(): IFNA(NA(), \"thay the\") = \"thay the\"",
    pass: engine.evaluate("=IFNA(NA(), \"thay the\")") === "thay the"
  });

  // NOTE: ISNA("#N/A" string literal) không được test ở đây vì engine hiện tại
  // dùng string "#N/A" làm cả error lẫn text (không có type system phân biệt).
  // Excel: ISNA("#N/A") = FALSE (text). Engine hiện tại: TRUE (limitation).
  // Khi engine nâng cấp type system sẽ bổ sung test này.

  // 31. NA() args != 0 → #VALUE!
  results.push({
    name: "NA(): NA(1) → #VALUE! (NA không nhận đối số)",
    pass: engine.evaluate("=NA(1)") === "#VALUE!"
  });

  // 32. VLOOKUP exact match (string, case-insensitive, FALSE & 0)
  const vlookupData = new Map();
  vlookupData.set("A1", { val: "Apple", formula: "", style: {} });
  vlookupData.set("B1", { val: 100, formula: "", style: {} });
  vlookupData.set("A2", { val: "Banana", formula: "", style: {} });
  vlookupData.set("B2", { val: 200, formula: "", style: {} });
  vlookupData.set("A3", { val: "Orange", formula: "", style: {} });
  vlookupData.set("B3", { val: 300, formula: "", style: {} });
  vlookupData.set("A4", { val: "10", formula: "", style: { numberFormat: { category: "text" } } });
  vlookupData.set("B4", { val: 400, formula: "", style: {} });
  vlookupData.set("A5", { val: 20, formula: "", style: {} });
  vlookupData.set("B5", { val: 500, formula: "", style: {} });

  const sheet2Data = new Map();
  sheet2Data.set("A1", { val: "KeyA", formula: "", style: {} });
  sheet2Data.set("B1", { val: "ValueA", formula: "", style: {} });
  sheet2Data.set("A2", { val: "KeyB", formula: "", style: {} });
  sheet2Data.set("B2", { val: "ValueB", formula: "", style: {} });

  const vlEngine = new FormulaEngine(
    vlookupData,
    null,
    (name) => name === "Sheet2" ? sheet2Data : (name === "Sheet1" ? vlookupData : null),
    () => "Sheet1",
    () => ["Sheet1", "Sheet2"]
  );

  // Exact match string with FALSE
  results.push({
    name: "VLOOKUP: Exact match string with FALSE",
    pass: vlEngine.evaluate('=VLOOKUP("Banana", A1:B5, 2, FALSE)') === 200
  });

  // Exact match case-insensitive with 0
  results.push({
    name: "VLOOKUP: Exact match case-insensitive with 0",
    pass: vlEngine.evaluate('=VLOOKUP("apple", A1:B5, 2, 0)') === 100
  });

  const wholeColumnData = new Map([
    ["P1", { val: "Key", formula: "", style: {} }],
    ["Q1", { val: "First", formula: "", style: {} }],
    ["Q2", { val: "First blank row", formula: "", style: {} }],
    ["P3", { val: "Key", formula: "", style: {} }],
    ["Q3", { val: "Second", formula: "", style: {} }],
    ["P5", { val: "Other", formula: "", style: {} }],
    ["Q5", { val: "Third", formula: "", style: {} }]
  ]);
  const wholeColumnEngine = new FormulaEngine(wholeColumnData, null, null, () => "Sheet1", () => ["Sheet1"]);
  let wholeColumnReads = 0;
  const getWholeColumnCell = wholeColumnEngine.getCellValue.bind(wholeColumnEngine);
  wholeColumnEngine.getCellValue = (...args) => { wholeColumnReads++; return getWholeColumnCell(...args); };
  const wholeColumnInitial = wholeColumnEngine.evaluate('=VLOOKUP("Key",P:Q,2,FALSE)');
  const wholeColumnAvoidedMatrix = wholeColumnEngine._rangeMatrixCache.size === 0;
  const wholeColumnBlankMatch = wholeColumnEngine.evaluate("=VLOOKUP(0,P:Q,2,FALSE)");
  const wholeColumnSparseReads = wholeColumnReads < 20;
  wholeColumnData.set("P1", { val: "Updated", formula: "", style: {} });
  wholeColumnEngine.bumpSheetVersion("Sheet1", "P1");
  results.push({
    name: "VLOOKUP: whole-column exact index preserves first match and invalidates on edit",
    pass: wholeColumnInitial === "First" && wholeColumnAvoidedMatrix && wholeColumnBlankMatch === "First blank row" && wholeColumnSparseReads &&
      wholeColumnEngine.evaluate('=VLOOKUP("Key",P:Q,2,FALSE)') === "Second"
  });

  // Numeric lookup key
  results.push({
    name: "VLOOKUP: Numeric lookup key",
    pass: vlEngine.evaluate('=VLOOKUP(20, A1:B5, 2, FALSE)') === 500
  });

  // Numeric string lookup key matching text number
  results.push({
    name: "VLOOKUP: Numeric string lookup key matching text number",
    pass: vlEngine.evaluate('=VLOOKUP("10", A1:B5, 2, FALSE)') === 400
  });

  // Approximate match (omitted 4th argument or TRUE)
  const approxData = new Map();
  approxData.set("A1", { val: 10, formula: "", style: {} });
  approxData.set("B1", { val: "Low", formula: "", style: {} });
  approxData.set("A2", { val: 20, formula: "", style: {} });
  approxData.set("B2", { val: "Med", formula: "", style: {} });
  approxData.set("A3", { val: 30, formula: "", style: {} });
  approxData.set("B3", { val: "High", formula: "", style: {} });
  const approxEngine = new FormulaEngine(approxData);

  results.push({
    name: "VLOOKUP: Approximate match with TRUE",
    pass: approxEngine.evaluate("=VLOOKUP(25, A1:B3, 2, TRUE)") === "Med"
  });

  results.push({
    name: "VLOOKUP: Approximate match with omitted 4th arg",
    pass: approxEngine.evaluate("=VLOOKUP(35, A1:B3, 2)") === "High"
  });

  // Not found -> #N/A
  results.push({
    name: "VLOOKUP: Not found returns #N/A",
    pass: vlEngine.evaluate('=VLOOKUP("NonExistent", A1:B5, 2, FALSE)') === "#N/A"
  });

  // Column index out of range -> #REF!
  results.push({
    name: "VLOOKUP: Column index out of range returns #REF!",
    pass: vlEngine.evaluate('=VLOOKUP("Apple", A1:B5, 3, FALSE)') === "#REF!"
  });

  // Excel: col_index_num < 1 -> #VALUE!
  results.push({
    name: "VLOOKUP: Column index < 1 returns #VALUE! (Excel)",
    pass: vlEngine.evaluate('=VLOOKUP("Apple", A1:B5, 0, FALSE)') === "#VALUE!"
  });

  // Cross-sheet VLOOKUP
  results.push({
    name: "VLOOKUP: Cross-sheet reference Sheet2!A1:B2",
    pass: vlEngine.evaluate('=VLOOKUP("KeyB", Sheet2!A1:B2, 2, FALSE)') === "ValueB"
  });

  // Cache invalidation via bumpSheetVersion
  results.push({
    name: "VLOOKUP: Cache invalidation on bumpSheetVersion",
    pass: (() => {
      const initial = vlEngine.evaluate('=VLOOKUP("KeyA", Sheet2!A1:B2, 2, FALSE)');
      if (initial !== "ValueA") return false;
      sheet2Data.set("B1", { val: "UpdatedValueA", formula: "", style: {} });
      vlEngine.bumpSheetVersion("Sheet2");
      const updated = vlEngine.evaluate('=VLOOKUP("KeyA", Sheet2!A1:B2, 2, FALSE)');
      return updated === "UpdatedValueA";
    })()
  });

  // Reference-parse cache must not reuse a sheet-scoped name across sheets
  // (Claude review 29/9: the cache was keyed by the raw text only).
  results.push({
    name: "Cache tham chiếu: tên định nghĩa theo từng sheet không dùng lẫn giữa các sheet",
    pass: (() => {
      const sheets = {
        S1: new Map([["A1", { val: 10, formula: "", style: {} }]]),
        S2: new Map([["A1", { val: 20, formula: "", style: {} }]]),
      };
      let current = "S1";
      const scopedName = (name) => (name === "TyGia" ? { sheet: current, ref: "A1" } : null);
      const engine = new FormulaEngine(
        () => sheets[current], scopedName, (sheet) => sheets[sheet] || null, () => current, () => ["S1", "S2"]
      );
      const onS1 = engine.evaluate("=SUM(TyGia)");
      current = "S2";
      const onS2 = engine.evaluate("=SUM(TyGia)");
      return onS1 === 10 && onS2 === 20;
    })()
  });

  // Tham chiếu tuyệt đối/hỗn hợp trong biểu thức số học (trước đây $ còn sót lại -> #VALUE!)
  const absCells = new Map([["B1", { val: 2, formula: "", style: {} }], ["B2", { val: 4, formula: "", style: {} }]]);
  const absEngine = new FormulaEngine(absCells);
  for (const [formula, expected] of [["=$B$1+B1", 4], ["=$B1+B$1", 4], ["=B$2*$B$1", 8], ["=$B$2/$B$1-B1", 0], ["=($B$1+$B$2)*2", 12]]) {
    results.push({
      name: `Formula: tham chiếu tuyệt đối trong số học ${formula} = ${expected}`,
      pass: absEngine.evaluate(formula) === expected
    });
  }

  // ROUND chuẩn Excel: làm tròn nửa ra xa 0 cho cả số dương, số âm và midpoint
  const roundCases = [
    ["=ROUND(12.345, 2)", 12.35],
    ["=ROUND(-12.345, 2)", -12.35],
    ["=ROUND(2.5, 0)", 3],
    ["=ROUND(-2.5, 0)", -3],
    ["=ROUND(1.25, 1)", 1.3],
    ["=ROUND(-1.25, 1)", -1.3],
    ["=ROUND(2.675, 2)", 2.68],
    ["=ROUND(-2.675, 2)", -2.68],
    ["=ROUND(125, -1)", 130],
    ["=ROUND(-125, -1)", -130],
    ["=ROUND(1499, -2)", 1500],
    ["=ROUND(-1499, -2)", -1500],
    ["=ROUND(-1500, -3)", -2000],
    ["=ROUND(1500, -3)", 2000],
    ["=ROUND(0, 0)", 0],
    ["=ROUND(0.045, 2)", 0.05],
    ["=ROUND(-0.045, 2)", -0.05]
  ];
  for (const [formula, expected] of roundCases) {
    results.push({
      name: `Formula: ROUND ${formula} = ${expected}`,
      pass: engine.evaluate(formula) === expected
    });
  }

  // IFERROR bắt lỗi số học và lỗi hàm lồng nhau
  const iferrorCells = new Map([["A1", { val: 0, formula: "", style: {} }]]);
  const iferrorEngine = new FormulaEngine(iferrorCells);
  results.push({
    name: 'Formula: IFERROR(1/0, "fallback") bắt #DIV/0!',
    pass: iferrorEngine.evaluate('=IFERROR(1/0, "fallback")') === "fallback"
  });
  results.push({
    name: 'Formula: IFERROR(NA(), "missing") bắt #N/A',
    pass: iferrorEngine.evaluate('=IFERROR(NA(), "missing")') === "missing"
  });
  results.push({
    name: 'Formula: IFERROR(10/2, "fallback") giữ giá trị 5',
    pass: iferrorEngine.evaluate('=IFERROR(10/2, "fallback")') === 5
  });
  results.push({
    name: 'Formula: IFERROR(IF(A1=0, 1/0, 10), 99) bắt lỗi nhánh IF khi A1=0',
    pass: iferrorEngine.evaluate('=IFERROR(IF(A1=0, 1/0, 10), 99)') === 99
  });
  iferrorCells.set("A1", { val: 1, formula: "", style: {} });
  iferrorEngine.clearCache();
  results.push({
    name: 'Formula: IFERROR(IF(A1=0, 1/0, 10), 99) giữ giá trị 10 khi A1=1',
    pass: iferrorEngine.evaluate('=IFERROR(IF(A1=0, 1/0, 10), 99)') === 10
  });
  results.push({
    name: 'Formula: IFERROR(SQRT(-1), "neg") bắt #NUM!',
    pass: iferrorEngine.evaluate('=IFERROR(SQRT(-1), "neg")') === "neg"
  });
  results.push({
    name: 'Formula: IFERROR("hợp lệ", "fb") giữ chuỗi hợp lệ',
    pass: iferrorEngine.evaluate('=IFERROR("hợp lệ", "fb")') === "hợp lệ"
  });

  // SUMIFS/COUNTIFS kiểm tra kích thước vùng sum và criteria
  const ifsCells = new Map([
    ["A1", { val: "North", formula: "", style: {} }],
    ["A2", { val: "North", formula: "", style: {} }],
    ["A3", { val: "South", formula: "", style: {} }],
    ["A4", { val: "South", formula: "", style: {} }],
    ["A5", { val: "North", formula: "", style: {} }],
    ["A6", { val: "West", formula: "", style: {} }],
    ["B1", { val: "Pen", formula: "", style: {} }],
    ["B2", { val: "Pencil", formula: "", style: {} }],
    ["B3", { val: "Pen", formula: "", style: {} }],
    ["B4", { val: "Paper", formula: "", style: {} }],
    ["B5", { val: "Pen", formula: "", style: {} }],
    ["B6", { val: "Pencil", formula: "", style: {} }],
    ["D1", { val: 100, formula: "", style: {} }],
    ["D2", { val: 200, formula: "", style: {} }],
    ["D3", { val: 300, formula: "", style: {} }],
    ["D4", { val: 400, formula: "", style: {} }],
    ["D5", { val: 500, formula: "", style: {} }],
    ["D6", { val: 600, formula: "", style: {} }]
  ]);
  const ifsEngine = new FormulaEngine(ifsCells);
  results.push({
    name: 'Formula: SUMIFS sum_range và criteria_range cùng kích thước tính đúng',
    pass: ifsEngine.evaluate('=SUMIFS(D1:D6, A1:A6, "North")') === 800
  });
  results.push({
    name: 'Formula: SUMIFS sum_range ngắn hơn criteria_range trả về #VALUE!',
    pass: ifsEngine.evaluate('=SUMIFS(D1:D5, A1:A6, "North")') === "#VALUE!"
  });
  results.push({
    name: 'Formula: SUMIFS các criteria_range khác kích thước trả về #VALUE!',
    pass: ifsEngine.evaluate('=SUMIFS(D1:D6, A1:A5, "North", B1:B6, "Pen")') === "#VALUE!"
  });
  results.push({
    name: 'Formula: COUNTIFS các range khác kích thước trả về #VALUE!',
    pass: ifsEngine.evaluate('=COUNTIFS(A1:A6, "North", B1:B5, "Pen")') === "#VALUE!"
  });

  // SB3: Kiểm tra lan truyền lỗi (Error Propagation) theo mục 5.2 báo cáo AUDIT-SHEET-ERRORS-DATES-0710
  const errCells = new Map([
    ["A1", { val: "#DIV/0!", formula: "=1/0", style: {} }],
    ["A2", { val: "#N/A", formula: "=NA()", style: {} }],
    ["A3", { val: "#VALUE!", formula: '="x"+1', style: {} }],
    ["A4", { val: "x", formula: "", style: {} }],
    ["A5", { val: 10, formula: "", style: {} }],
    ["B1", { val: 1, formula: "", style: {} }],
    ["B2", { val: 2, formula: "", style: {} }],
    ["B3", { val: "#NUM!", formula: "", style: {} }],
    ["B4", { val: 4, formula: "", style: {} }],
    ["B5", { val: 5, formula: "", style: {} }]
  ]);
  const errEngine = new FormulaEngine(errCells);

  // 1. Lan truyền lỗi qua toán tử số học
  results.push({
    name: 'Formula: A1 + 1 khi A1 là #DIV/0! trả về #DIV/0!',
    pass: errEngine.evaluate("=A1+1") === "#DIV/0!"
  });
  results.push({
    name: 'Formula: A2 + 1 khi A2 là #N/A trả về #N/A',
    pass: errEngine.evaluate("=A2+1") === "#N/A"
  });
  results.push({
    name: 'Formula: A3 + 1 khi A3 là #VALUE! trả về #VALUE!',
    pass: errEngine.evaluate("=A3+1") === "#VALUE!"
  });
  results.push({
    name: 'Formula: A4 + 1 khi A4 là chuỗi x không ép được thành số trả về #VALUE!',
    pass: errEngine.evaluate("=A4+1") === "#VALUE!"
  });

  // 2. Lan truyền lỗi qua hàm tổng hợp
  results.push({
    name: 'Formula: SUM(A1, 1) khi A1 là #DIV/0! trả về #DIV/0!',
    pass: errEngine.evaluate("=SUM(A1, 1)") === "#DIV/0!"
  });
  results.push({
    name: 'Formula: SUM(B1:B5) chứa ô B3 là #NUM! trả về #NUM!',
    pass: errEngine.evaluate("=SUM(B1:B5)") === "#NUM!"
  });
  results.push({
    name: 'Formula: AVERAGE(A1, 10) chứa ô #DIV/0! trả về #DIV/0!',
    pass: errEngine.evaluate("=AVERAGE(A1, 10)") === "#DIV/0!"
  });
  results.push({
    name: 'Formula: MIN(A1, 5) chứa ô #DIV/0! trả về #DIV/0!',
    pass: errEngine.evaluate("=MIN(A1, 5)") === "#DIV/0!"
  });
  results.push({
    name: 'Formula: MAX(A1, 5) chứa ô #DIV/0! trả về #DIV/0!',
    pass: errEngine.evaluate("=MAX(A1, 5)") === "#DIV/0!"
  });
  results.push({
    name: 'Formula: PRODUCT(A1, 5) chứa ô #DIV/0! trả về #DIV/0!',
    pass: errEngine.evaluate("=PRODUCT(A1, 5)") === "#DIV/0!"
  });

  // 3. Lan truyền lỗi qua hàm logic IF
  results.push({
    name: 'Formula: IF(TRUE, 42, A1) khi A1 là #DIV/0! trả về 42 (ngắn mạch đúng)',
    pass: errEngine.evaluate("=IF(TRUE, 42, A1)") === 42
  });
  results.push({
    name: 'Formula: IF(FALSE, 42, A1) khi A1 là #DIV/0! chọn nhánh lỗi trả về #DIV/0!',
    pass: errEngine.evaluate("=IF(FALSE, 42, A1)") === "#DIV/0!"
  });
  results.push({
    name: 'Formula: IF(A1, 42, 10) khi A1 là #DIV/0! điều kiện lỗi trả về #DIV/0!',
    pass: errEngine.evaluate("=IF(A1, 42, 10)") === "#DIV/0!"
  });

  // 4. SB6 MỤC 1: getCellValue chỉ đổi chuỗi sang số khi toàn bộ là số/tiền tệ
  const sb6Muc1Cells = new Map([
    ["A1", { val: "Máy in canon LBP 2900", formula: "", style: {} }],
    ["A2", { val: "24 tháng", formula: "", style: {} }],
    ["A3", { val: "25.000.000 ₫", formula: "", style: {} }],
    ["A4", { val: "45.000.000 ₫", formula: "", style: {} }],
    ["A5", { val: "15.000 VND", formula: "", style: {} }],
    ["B1", { val: "Canon", formula: "", style: {} }],
    ["B2", { val: "Máy in canon LBP 2900", formula: "", style: {} }],
    ["K1", { val: "Canon", formula: "", style: {} }]
  ]);
  const sb6Muc1Engine = new FormulaEngine(sb6Muc1Cells);

  results.push({
    name: 'SB6 MỤC 1: getCellValue giữ nguyên chuỗi chứa số "Máy in canon LBP 2900"',
    pass: sb6Muc1Engine.getCellValue("A1") === "Máy in canon LBP 2900"
  });
  results.push({
    name: 'SB6 MỤC 1: getCellValue giữ nguyên chuỗi chứa số "24 tháng"',
    pass: sb6Muc1Engine.getCellValue("A2") === "24 tháng"
  });
  results.push({
    name: 'SB6 MỤC 1: VLOOKUP trả về đúng chuỗi văn bản chứa số "Máy in canon LBP 2900"',
    pass: sb6Muc1Engine.evaluate("=VLOOKUP(K1, B1:B2, 1, FALSE)") === "Canon"
  });
  results.push({
    name: 'SB6 MỤC 1: getCellValue chuyển chuỗi tiền tệ "25.000.000 ₫" thành 25000000',
    pass: sb6Muc1Engine.getCellValue("A3") === 25000000
  });
  results.push({
    name: 'SB6 MỤC 1: SUM tính đúng chuỗi tiền tệ (25tr + 45tr = 70.000.000)',
    pass: sb6Muc1Engine.evaluate("=SUM(A3:A4)") === 70000000
  });
  results.push({
    name: 'SB6 MỤC 1: Phép cộng A1+1 với chuỗi chữ có số trả về #VALUE!',
    pass: sb6Muc1Engine.evaluate("=A1+1") === "#VALUE!"
  });

  // 5. SB6 MỤC 2: Tiền tố '+' đầu công thức và toán tử nối chuỗi &
  const sb6Muc2Cells = new Map([
    ["B13", { val: " 19200002 ", formula: "", style: {} }],
    ["F260", { val: "Nguyễn Mạnh", formula: "", style: {} }],
    ["G260", { val: "Thành", formula: "", style: {} }],
    ["U1", { val: 44555, formula: "", style: {} }], // 25/12/2021
    ["G82", { val: "24 tháng", formula: "", style: {} }],
    ["Z1", { val: "", formula: "", style: {} }]
  ]);
  const sb6Muc2Engine = new FormulaEngine(sb6Muc2Cells);

  results.push({
    name: 'SB6 MỤC 2: =+TRIM(B13) giữ kết quả văn bản không ép về số',
    pass: sb6Muc2Engine.evaluate("=+TRIM(B13)") === "19200002"
  });
  results.push({
    name: 'SB6 MỤC 2: =+F260&" "&G260 nối chuỗi văn bản chính xác',
    pass: sb6Muc2Engine.evaluate('=+F260&" "&G260') === "Nguyễn Mạnh Thành"
  });
  results.push({
    name: 'SB6 MỤC 2: =+TEXT(U1,"dd/mm/yyyy") giữ kết quả chuỗi định dạng ngày',
    pass: sb6Muc2Engine.evaluate('=+TEXT(U1,"dd/mm/yyyy")') === "25/12/2021"
  });
  results.push({
    name: 'SB6 MỤC 2: =+G82 với ô "24 tháng" trả về nguyên văn chuỗi',
    pass: sb6Muc2Engine.evaluate("=+G82") === "24 tháng"
  });
  results.push({
    name: 'SB6 MỤC 2: =+15 trên số trả về số 15',
    pass: sb6Muc2Engine.evaluate("=+15") === 15
  });
  results.push({
    name: 'SB6 MỤC 2: Nối chuỗi với ô trống Z1 không sinh ký tự "0"',
    pass: sb6Muc2Engine.evaluate('=+Z1&"hậu tố"') === "hậu tố"
  });

  // 6. SB6 MỤC 3: SUMIF với vùng điều kiện nhiều cột và sum_range 1 cột (được định lại kích thước)
  const sb6Muc3Cells = new Map([
    ["E1", { val: "A", formula: "", style: {} }],
    ["F1", { val: "B", formula: "", style: {} }],
    ["E2", { val: "B", formula: "", style: {} }],
    ["F2", { val: "A", formula: "", style: {} }],
    ["H1", { val: 10, formula: "", style: {} }],
    ["H2", { val: 20, formula: "", style: {} }],
    ["I1", { val: 100, formula: "", style: {} }],
    ["I2", { val: 200, formula: "", style: {} }],
    ["A1", { val: 10, formula: "", style: {} }],
    ["A2", { val: 20, formula: "", style: {} }],
    ["A3", { val: 30, formula: "", style: {} }]
  ]);
  const sb6Muc3Engine = new FormulaEngine(sb6Muc3Cells);

  results.push({
    name: 'SB6 MỤC 3: SUMIF vùng điều kiện 2 cột E1:F2 và sum_range 1 cột H1:H2 mở rộng đúng hình dạng (10 + 200 = 210)',
    pass: sb6Muc3Engine.evaluate('=SUMIF(E1:F2, "A", H1:H2)') === 210
  });
  results.push({
    name: 'SB6 MỤC 3: SUMIF không có sum_range tự cộng trên vùng điều kiện (A1:A3 > 15 -> 50)',
    pass: sb6Muc3Engine.evaluate('=SUMIF(A1:A3, ">15")') === 50
  });
  results.push({
    name: 'SB6 MỤC 3: SUMIFS vẫn yêu cầu các vùng cùng kích thước nếu khác thì #VALUE!',
    pass: sb6Muc3Engine.evaluate('=SUMIFS(H1:H2, E1:F2, "A")') === "#VALUE!"
  });

  // 7. SB6 MỤC 4: Lan truyền mã lỗi tham chiếu (#REF!) và các lỗi nguồn qua phép toán số học
  const sb6Muc4Cells = new Map([
    ["C17", { val: "#REF!", formula: "=#REF!+1", style: {} }],
    ["C18", { val: 0, formula: "=C17+1", style: {} }],
    ["E1", { val: "#VALUE!", formula: "", style: {} }],
    ["E2", { val: "#REF!", formula: "", style: {} }],
    ["E3", { val: "#DIV/0!", formula: "", style: {} }],
    ["E4", { val: "#N/A", formula: "", style: {} }]
  ]);
  const sb6Muc4Engine = new FormulaEngine(sb6Muc4Cells);

  results.push({
    name: 'SB6 MỤC 4: =#REF!+1 trả về mã lỗi #REF! thay vì chuỗi "#REF!+1"',
    pass: sb6Muc4Engine.evaluate("=#REF!+1") === "#REF!"
  });
  results.push({
    name: 'SB6 MỤC 4: =1+#REF! trả về mã lỗi #REF!',
    pass: sb6Muc4Engine.evaluate("=1+#REF!") === "#REF!"
  });
  results.push({
    name: 'SB6 MỤC 4: =+#REF!+1 trả về mã lỗi #REF!',
    pass: sb6Muc4Engine.evaluate("=+#REF!+1") === "#REF!"
  });
  results.push({
    name: 'SB6 MỤC 4: =#REF!*2 và =-#REF! trả về mã lỗi #REF!',
    pass: sb6Muc4Engine.evaluate("=#REF!*2") === "#REF!" && sb6Muc4Engine.evaluate("=-#REF!") === "#REF!"
  });
  results.push({
    name: 'SB6 MỤC 4: Tham chiếu ô chứa #REF! (=C17+1) lan truyền #REF!',
    pass: sb6Muc4Engine.evaluate("=C17+1") === "#REF!"
  });
  results.push({
    name: 'SB6 MỤC 4: Phép cộng nhiều lỗi ưu tiên #REF! trên #VALUE! (=E1+E2)',
    pass: sb6Muc4Engine.evaluate("=E1+E2") === "#REF!"
  });
  results.push({
    name: 'SB6 MỤC 4: Phép cộng nhiều lỗi ưu tiên #N/A trên #DIV/0! (=E3+E4)',
    pass: sb6Muc4Engine.evaluate("=E3+E4") === "#N/A"
  });

  // 8. SB7 NHÓM 1: VLOOKUP và so sánh phân biệt chuỗi rỗng với số 0 (không khớp nhầm ô rỗng)
  const sb7Nhom1Cells = new Map([
    ["A1", { val: "SP01", formula: "", style: {} }],
    ["B1", { val: "Sản phẩm 1", formula: "", style: {} }],
    ["A2", { val: "", formula: "", style: {} }],
    ["B2", { val: "Dòng rỗng", formula: "", style: {} }],
    ["C1", { val: 0, formula: "", style: {} }],
    ["C2", { val: "", formula: "", style: {} }]
  ]);
  const sb7Nhom1Engine = new FormulaEngine(sb7Nhom1Cells);
  results.push({
    name: 'SB7 NHÓM 1: _equals phân biệt chuỗi rỗng "" và số 0 (_equals("", 0) === false)',
    pass: sb7Nhom1Engine._equals("", 0) === false && sb7Nhom1Engine._equals(0, "") === false
  });
  results.push({
    name: 'SB7 NHÓM 1: _equals("0", 0) và _equals("", "") vẫn bằng true',
    pass: sb7Nhom1Engine._equals("0", 0) === true && sb7Nhom1Engine._equals("", "") === true
  });
  results.push({
    name: 'SB7 NHÓM 1: VLOOKUP với lookup=0 không khớp dòng rỗng trong bảng (trả về #N/A)',
    pass: sb7Nhom1Engine.evaluate('=VLOOKUP(C1, A1:B2, 2, FALSE)') === "#N/A"
  });
  results.push({
    name: 'SB7 NHÓM 1: VLOOKUP tham chiếu ô rỗng không khớp dòng rỗng trong bảng (trả về #N/A)',
    pass: sb7Nhom1Engine.evaluate('=VLOOKUP(C2, A1:B2, 2, FALSE)') === "#N/A"
  });

  // 9. SB7 NHÓM 2: SUMIF với điều kiện là hàm lồng nhau (VLOOKUP, INDEX, ...)
  const sb7Nhom2Cells = new Map([
    ["A1", { val: "M01", formula: "", style: {} }],
    ["B1", { val: 10, formula: "", style: {} }],
    ["A2", { val: "M02", formula: "", style: {} }],
    ["B2", { val: 20, formula: "", style: {} }],
    ["A3", { val: "M01", formula: "", style: {} }],
    ["B3", { val: 30, formula: "", style: {} }],
    ["D1", { val: "X", formula: "", style: {} }],
    ["E1", { val: "M01", formula: "", style: {} }]
  ]);
  const sb7Nhom2Engine = new FormulaEngine(sb7Nhom2Cells);
  results.push({
    name: 'SB7 NHÓM 2: SUMIF với điều kiện là hàm lồng VLOOKUP(=SUMIF(A1:A3, VLOOKUP("X", D1:E1, 2, FALSE), B1:B3) -> 40)',
    pass: sb7Nhom2Engine.evaluate('=SUMIF(A1:A3, VLOOKUP("X", D1:E1, 2, FALSE), B1:B3)') === 40
  });

  // 10. SB7 NHÓM 3: Lan truyền mã lỗi qua các ô phụ thuộc khi ô nguồn có formula và val ban đầu là #NAME?
  const sb7Nhom3Cells = new Map([
    ["A12", { val: "#NAME?", formula: "=#ref!+1", style: {} }],
    ["A13", { val: "#NAME?", formula: "=A12+1", style: {} }],
    ["A14", { val: "#NAME?", formula: "=A13+1", style: {} }]
  ]);
  const sb7Nhom3Engine = new FormulaEngine(sb7Nhom3Cells);
  results.push({
    name: 'SB7 NHÓM 3: Ô nguồn chứa =#ref!+1 với val=#NAME? được tính lại thành #REF!',
    pass: sb7Nhom3Engine.getCellValue("A12") === "#REF!"
  });
  results.push({
    name: 'SB7 NHÓM 3: Ô phụ thuộc =A12+1 lan truyền #REF! thay vì #NAME?',
    pass: sb7Nhom3Engine.evaluate("=A12+1") === "#REF!" && sb7Nhom3Engine.evaluate("=A13+1") === "#REF!"
  });

  // 11. SB7 NHÓM 4: Toán tử phần trăm (%) trong biểu thức số học (F7*E7*70%, 100*50%, (10+20)%)
  const sb7Nhom4Cells = new Map([
    ["F7", { val: 200, formula: "", style: {} }],
    ["E7", { val: 50, formula: "", style: {} }]
  ]);
  const sb7Nhom4Engine = new FormulaEngine(sb7Nhom4Cells);
  results.push({
    name: 'SB7 NHÓM 4: Toán tử phần trăm =F7*E7*70% trả về 7000',
    pass: approximatelyEqual(sb7Nhom4Engine.evaluate("=F7*E7*70%"), 7000)
  });
  results.push({
    name: 'SB7 NHÓM 4: Toán tử phần trăm đơn lẻ và ngoặc =100*50% và =(10+20)%',
    pass: sb7Nhom4Engine.evaluate("=100*50%") === 50 && approximatelyEqual(sb7Nhom4Engine.evaluate("=(10+20)%"), 0.3)
  });

  // 12. SB7 NHÓM 5: Tham chiếu ô Text Cell trả về chuỗi nguyên thủy primitive string
  const sb7Nhom5Cells = new Map([
    ["B3", { val: "00990011", formula: "", style: { numberFormat: { category: "text" } } }]
  ]);
  const sb7Nhom5Engine = new FormulaEngine(sb7Nhom5Cells);
  const sb7Nhom5Res = sb7Nhom5Engine.evaluate("=B3");
  results.push({
    name: 'SB7 NHÓM 5: =B3 với ô text trả về primitive string thay vì String object',
    pass: typeof sb7Nhom5Res === "string" && sb7Nhom5Res === "00990011" && !(sb7Nhom5Res instanceof String)
  });

  // 13. SB9 NHÓM 1: Kiểm tra tham số col_index/row_index và lan truyền lỗi cho VLOOKUP/HLOOKUP
  const sb9Nhom1Cells = new Map([
    ["A1", { val: 10, formula: "", style: {} }],
    ["B1", { val: "Ten", formula: "", style: {} }],
    ["A2", { val: 20, formula: "", style: {} }],
    ["B2", { val: "Twenty", formula: "", style: {} }],
    ["D1", { val: "Solo", formula: "", style: {} }],
    ["D2", { val: "Duo", formula: "", style: {} }],
    ["E1", { val: "#DIV/0!", formula: "", style: {} }]
  ]);
  const sb9Nhom1Engine = new FormulaEngine(sb9Nhom1Cells);
  results.push({
    name: "SB9 NHÓM 1: VLOOKUP col_index = 0 trả về #VALUE!",
    pass: sb9Nhom1Engine.evaluate("=VLOOKUP(10, A1:B2, 0, FALSE)") === "#VALUE!"
  });
  results.push({
    name: "SB9 NHÓM 1: VLOOKUP col_index vượt quá số cột trả về #REF!",
    pass: sb9Nhom1Engine.evaluate("=VLOOKUP(10, A1:B2, 3, FALSE)") === "#REF!"
  });
  results.push({
    name: "SB9 NHÓM 1: VLOOKUP lookup_value là lỗi lan truyền đúng mã lỗi",
    pass: sb9Nhom1Engine.evaluate("=VLOOKUP(E1, A1:B2, 2, FALSE)") === "#DIV/0!" &&
          sb9Nhom1Engine.evaluate("=VLOOKUP(1/0, A1:B2, 2, FALSE)") === "#DIV/0!"
  });
  results.push({
    name: "SB9 NHÓM 1: VLOOKUP trên bảng 1 cột hoạt động đúng với col_index=1 và #REF! với col_index=2",
    pass: sb9Nhom1Engine.evaluate('=VLOOKUP("Solo", D1:D2, 1, FALSE)') === "Solo" &&
          sb9Nhom1Engine.evaluate('=VLOOKUP("Solo", D1:D2, 2, FALSE)') === "#REF!"
  });
  results.push({
    name: "SB9 NHÓM 1: HLOOKUP row_index = 0 trả #VALUE! và vượt trả #REF!",
    pass: sb9Nhom1Engine.evaluate("=HLOOKUP(10, A1:B2, 0, FALSE)") === "#VALUE!" &&
          sb9Nhom1Engine.evaluate("=HLOOKUP(10, A1:B2, 3, FALSE)") === "#REF!"
  });

  // 14. SB9 NHÓM 2: Phân biệt số 5 vs chuỗi "5", không phân biệt hoa thường và wildcard (?, *, ~*, ~~) trong exact match
  const sb9Nhom2Cells = new Map([
    ["A1", { val: 5, formula: "", style: {} }],
    ["B1", { val: "NumberFive", formula: "", style: {} }],
    ["A2", { val: "5", formula: "", style: { numberFormat: { category: "text" } } }],
    ["B2", { val: "StringFive", formula: "", style: {} }],
    ["A3", { val: "Product Alpha", formula: "", style: {} }],
    ["B3", { val: 100, formula: "", style: {} }],
    ["A4", { val: "Car", formula: "", style: {} }],
    ["B4", { val: 10, formula: "", style: {} }],
    ["A5", { val: "Cart", formula: "", style: {} }],
    ["B5", { val: 20, formula: "", style: {} }],
    ["A6", { val: "Item*", formula: "", style: {} }],
    ["B6", { val: 99, formula: "", style: {} }],
    ["A7", { val: "Item~A", formula: "", style: {} }],
    ["B7", { val: 77, formula: "", style: {} }],
    ["C1", { val: "North", formula: "", style: {} }],
    ["D1", { val: "South", formula: "", style: {} }],
    ["C2", { val: 100, formula: "", style: {} }],
    ["D2", { val: 200, formula: "", style: {} }]
  ]);
  const sb9Nhom2Engine = new FormulaEngine(sb9Nhom2Cells);
  results.push({
    name: 'SB9 NHÓM 2: VLOOKUP số 5 khớp ô số 5 và chuỗi "5" khớp ô chuỗi "5"',
    pass: sb9Nhom2Engine.evaluate("=VLOOKUP(5, A1:B2, 2, FALSE)") === "NumberFive" &&
          sb9Nhom2Engine.evaluate('=VLOOKUP("5", A1:B2, 2, FALSE)') === "StringFive"
  });
  results.push({
    name: 'SB9 NHÓM 2: VLOOKUP số 5 không khớp chuỗi "5" trên bảng chỉ có chuỗi (trả về #N/A)',
    pass: sb9Nhom2Engine.evaluate("=VLOOKUP(5, A2:B2, 2, FALSE)") === "#N/A" &&
          sb9Nhom2Engine.evaluate('=VLOOKUP("5", A1:B1, 2, FALSE)') === "#N/A"
  });
  results.push({
    name: 'SB9 NHÓM 2: VLOOKUP exact match không phân biệt hoa thường',
    pass: sb9Nhom2Engine.evaluate('=VLOOKUP("pRoDuCt aLpHa", A3:B3, 2, FALSE)') === 100
  });
  results.push({
    name: 'SB9 NHÓM 2: VLOOKUP wildcard * khớp tiền tố và ? khớp một ký tự',
    pass: sb9Nhom2Engine.evaluate('=VLOOKUP("Prod*", A3:B3, 2, FALSE)') === 100 &&
          sb9Nhom2Engine.evaluate('=VLOOKUP("Car?", A4:B5, 2, FALSE)') === 20
  });
  results.push({
    name: 'SB9 NHÓM 2: VLOOKUP wildcard escape ~* và ~~ khớp ký tự thật',
    pass: sb9Nhom2Engine.evaluate('=VLOOKUP("Item~*", A6:B6, 2, FALSE)') === 99 &&
          sb9Nhom2Engine.evaluate('=VLOOKUP("Item~~A", A7:B7, 2, FALSE)') === 77
  });
  results.push({
    name: 'SB9 NHÓM 2: HLOOKUP exact match với wildcard',
    pass: sb9Nhom2Engine.evaluate('=HLOOKUP("So*", C1:D2, 2, FALSE)') === 200
  });
  results.push({
    name: 'SB9 NHÓM 2: MATCH exact phân biệt số 5 vs chuỗi "5" và hỗ trợ wildcard',
    pass: sb9Nhom2Engine.evaluate("=MATCH(5, A1:A2, 0)") === 1 &&
          sb9Nhom2Engine.evaluate('=MATCH("5", A1:A2, 0)') === 2 &&
          sb9Nhom2Engine.evaluate('=MATCH("Car?", A4:A5, 0)') === 2 &&
          sb9Nhom2Engine.evaluate('=MATCH("Item~*", A6:A6, 0)') === 1
  });

  // 15. SB9 NHÓM 3: Khớp gần đúng (approximate match) thuật toán tìm kiếm nhị phân Excel
  const sb9Nhom3Cells = new Map([
    ["A1", { val: 10, formula: "", style: {} }],
    ["B1", { val: "Ten", formula: "", style: {} }],
    ["A2", { val: 20, formula: "", style: {} }],
    ["B2", { val: "Twenty", formula: "", style: {} }],
    ["A3", { val: 30, formula: "", style: {} }],
    ["B3", { val: "Thirty", formula: "", style: {} }],
    // Bảng không sắp xếp
    ["D1", { val: 5, formula: "", style: {} }],
    ["E1", { val: "Nam", formula: "", style: {} }],
    ["D2", { val: 1, formula: "", style: {} }],
    ["E2", { val: "Mot", formula: "", style: {} }],
    ["D3", { val: 9, formula: "", style: {} }],
    ["E3", { val: "Chin", formula: "", style: {} }],
    ["D4", { val: 3, formula: "", style: {} }],
    ["E4", { val: "Ba", formula: "", style: {} }],
    ["D5", { val: 7, formula: "", style: {} }],
    ["E5", { val: "Bay", formula: "", style: {} }],
    // Mảng giảm dần cho MATCH -1
    ["G1", { val: 30, formula: "", style: {} }],
    ["G2", { val: 20, formula: "", style: {} }],
    ["G3", { val: 10, formula: "", style: {} }],
    // Bảng có lỗi
    ["H1", { val: "#DIV/0!", formula: "", style: {} }],
    ["H2", { val: 20, formula: "", style: {} }]
  ]);
  const sb9Nhom3Engine = new FormulaEngine(sb9Nhom3Cells);
  results.push({
    name: "SB9 NHÓM 3: VLOOKUP approximate khóa nhỏ hơn phần tử đầu trả về #N/A",
    pass: sb9Nhom3Engine.evaluate("=VLOOKUP(5, A1:B3, 2, TRUE)") === "#N/A"
  });
  results.push({
    name: "SB9 NHÓM 3: VLOOKUP approximate khóa ở giữa và lớn hơn cuối",
    pass: sb9Nhom3Engine.evaluate("=VLOOKUP(25, A1:B3, 2, TRUE)") === "Twenty" &&
          sb9Nhom3Engine.evaluate("=VLOOKUP(50, A1:B3, 2, TRUE)") === "Thirty"
  });
  results.push({
    name: "SB9 NHÓM 3: VLOOKUP approximate trên bảng chưa sắp xếp cho kết quả nhị phân 'Mot'",
    pass: sb9Nhom3Engine.evaluate("=VLOOKUP(6, D1:E5, 2, TRUE)") === "Mot"
  });
  results.push({
    name: "SB9 NHÓM 3: VLOOKUP approximate lan truyền lỗi trong vùng tra",
    pass: sb9Nhom3Engine.evaluate("=VLOOKUP(15, H1:H2, 1, TRUE)") === "#DIV/0!"
  });
  results.push({
    name: "SB9 NHÓM 3: MATCH approximate type 1 và type -1",
    pass: sb9Nhom3Engine.evaluate("=MATCH(5, A1:A3, 1)") === "#N/A" &&
          sb9Nhom3Engine.evaluate("=MATCH(25, A1:A3, 1)") === 2 &&
          sb9Nhom3Engine.evaluate("=MATCH(35, G1:G3, -1)") === "#N/A" &&
          sb9Nhom3Engine.evaluate("=MATCH(15, G1:G3, -1)") === 2
  });
  results.push({
    name: "SB9 NHÓM 3: LOOKUP approximate vector",
    pass: sb9Nhom3Engine.evaluate("=LOOKUP(25, A1:A3, B1:B3)") === "Twenty" &&
          sb9Nhom3Engine.evaluate("=LOOKUP(5, A1:A3, B1:B3)") === "#N/A"
  });

  // 16. SB9 NHÓM 4: Cải tiến hàm INDEX hàng/cột 0, mảng 1 hàng và ô trống
  const sb9Nhom4Cells = new Map([
    ["A1", { val: 10, formula: "", style: {} }],
    ["A2", { val: 20, formula: "", style: {} }],
    ["A3", { val: 30, formula: "", style: {} }],
    ["B1", { val: 1, formula: "", style: {} }],
    ["C1", { val: 2, formula: "", style: {} }],
    ["D1", { val: 3, formula: "", style: {} }],
    ["E1", { val: 100, formula: "", style: {} }],
    ["F1", { val: 10, formula: "", style: {} }],
    ["E2", { val: 200, formula: "", style: {} }],
    ["F2", { val: 20, formula: "", style: {} }],
    ["G1", { val: "", formula: "", style: {} }]
  ]);
  const sb9Nhom4Engine = new FormulaEngine(sb9Nhom4Cells);
  results.push({
    name: "SB9 NHÓM 4: INDEX trên bảng 1 cột với cột 0",
    pass: sb9Nhom4Engine.evaluate("=INDEX(A1:A3, 2, 0)") === 20
  });
  results.push({
    name: "SB9 NHÓM 4: INDEX trên bảng 1 hàng với hàng 0",
    pass: sb9Nhom4Engine.evaluate("=INDEX(B1:D1, 0, 2)") === 2
  });
  results.push({
    name: "SB9 NHÓM 4: INDEX trên bảng 1 hàng chỉ truyền 1 tham số (coi là cột)",
    pass: sb9Nhom4Engine.evaluate("=INDEX(B1:D1, 3)") === 3
  });
  results.push({
    name: "SB9 NHÓM 4: INDEX hàng 0 trong hàm SUM tính đúng toàn bộ cột",
    pass: sb9Nhom4Engine.evaluate("=SUM(INDEX(E1:F2, 0, 2))") === 30
  });
  results.push({
    name: "SB9 NHÓM 4: INDEX ô kết quả trống trả về 0",
    pass: sb9Nhom4Engine.evaluate("=INDEX(G1, 1, 1)") === 0
  });
  results.push({
    name: "SB9 NHÓM 4: INDEX chỉ số âm trả về #VALUE!",
    pass: sb9Nhom4Engine.evaluate("=INDEX(A1:A3, -1, 1)") === "#VALUE!" &&
          sb9Nhom4Engine.evaluate("=INDEX(A1:A3, 1, -1)") === "#VALUE!"
  });

  const indexedCells = new Map([
    ["A1", { val: 1, formula: "", style: {} }],
    ["B1", { val: "Một", formula: "", style: {} }],
    ["A2", { val: 2, formula: "", style: {} }],
    ["B2", { val: "Hai", formula: "", style: {} }]
  ]);
  const indexedEngine = new FormulaEngine(indexedCells, null, name => name === "S1" ? indexedCells : null, () => "S1");
  const indexedResult = indexedEngine.evaluate("=VLOOKUP(2,A1:B2,2,FALSE)");
  indexedEngine.bumpSheetVersion("S1", "Z99");
  const retainedLookupIndex = indexedEngine._lookupIndexCache.size === 1;
  indexedEngine.bumpSheetVersion("S1", "A2");
  const invalidatedLookupIndex = indexedEngine._lookupIndexCache.size === 0;
  indexedCells.get("A2").val = 3;
  results.push({
    name: "Formula lookup cache: reuse outside its range and invalidate inside its range",
    pass: indexedResult === "Hai" && retainedLookupIndex && invalidatedLookupIndex &&
      indexedEngine.evaluate("=VLOOKUP(3,A1:B2,2,FALSE)") === "Hai"
  });
  const parseCacheEngine = new FormulaEngine(new Map());
  parseCacheEngine._parseNumberOrCurrency("1.234 ₫");
  const parsedNumberCacheSize = parseCacheEngine._parsedNumberCache.size;
  parseCacheEngine._parseNumberOrCurrency("1.234 ₫");
  results.push({
    name: "Formula values: cache repeated localized number parsing",
    pass: parsedNumberCacheSize === 1 && parseCacheEngine._parsedNumberCache.size === 1 &&
      parseCacheEngine._parseNumberOrCurrency("1.234 ₫") === 1234
  });

  const criteriaCells = new Map([
    ["A1", { val: "đạt", formula: "", style: {} }],
    ["A2", { val: "chưa", formula: "", style: {} }],
    ["A3", { val: "đạt", formula: "", style: {} }],
    ["B1", { val: 10, formula: "", style: {} }],
    ["B2", { val: 20, formula: "", style: {} }],
    ["B3", { val: 30, formula: "", style: {} }]
  ]);
  const criteriaEngine = new FormulaEngine(criteriaCells, null, name => name === "S1" ? criteriaCells : null, () => "S1");
  const countBeforeEdit = criteriaEngine.evaluate('=COUNTIF(A1:A3,"đạt")');
  const sumBeforeEdit = criteriaEngine.evaluate('=SUMIF(A1:A3,"đạt",B1:B3)');
  const criteriaIndex = [...criteriaEngine._criteriaIndexCache.values()][0];
  criteriaEngine.bumpSheetVersion("S1", "Z10");
  const indexRetainedOutsideRange = criteriaEngine._criteriaIndexCache.size === 1;
  criteriaEngine.bumpSheetVersion("S1", "A2");
  const indexInvalidatedInsideRange = criteriaEngine._criteriaIndexCache.size === 0;
  criteriaCells.get("A2").val = "đạt";
  results.push({
    name: "Formula criteria indexes: COUNTIF/SUMIF reuse results and invalidate changed ranges",
    pass: countBeforeEdit === 2 && sumBeforeEdit === 40 && criteriaIndex.matches.size === 1 &&
      indexRetainedOutsideRange && indexInvalidatedInsideRange &&
      criteriaEngine.evaluate('=COUNTIF(A1:A3,"đạt")') === 3 &&
      criteriaEngine.evaluate('=SUMIF(A1:A3,"đạt",B1:B3)') === 60
  });
  const matrixCriteriaEngine = new FormulaEngine(new Map([
    ["A1", { val: "có", formula: "", style: {} }], ["B1", { val: "không", formula: "", style: {} }],
    ["A2", { val: "không", formula: "", style: {} }], ["B2", { val: "có", formula: "", style: {} }],
    ["C1", { val: 10, formula: "", style: {} }], ["D1", { val: 20, formula: "", style: {} }],
    ["C2", { val: 30, formula: "", style: {} }], ["D2", { val: 40, formula: "", style: {} }],
    ["E1", { val: "#N/A", formula: "", style: {} }], ["E2", { val: "có", formula: "", style: {} }],
    ["F1", { val: 3, formula: "", style: {} }], ["F2", { val: 5, formula: "", style: {} }]
  ]));
  results.push({
    name: "Formula criteria indexes: SUMIF preserves row-major range alignment and error propagation",
    pass: matrixCriteriaEngine.evaluate('=SUMIF(A1:B2,"có",C1:D2)') === 50 &&
      matrixCriteriaEngine.evaluate('=SUMIF(E1:E2,"có",F1:F2)') === "#N/A"
  });

  const matchCells = new Map(Array.from({ length: 500 }, (_, index) => [
    `A${index + 1}`, { val: `key-${index + 1}`, formula: "", style: {} }
  ]));
  const matchEngine = new FormulaEngine(matchCells);
  let exactScanComparisons = 0;
  const lookupEquals = matchEngine._lookupExactEquals.bind(matchEngine);
  matchEngine._lookupExactEquals = (...args) => { exactScanComparisons++; return lookupEquals(...args); };
  const missingVlookup = matchEngine.evaluate("=VLOOKUP(1001,A1:A500,1,FALSE)");
  const missingMatch = matchEngine.evaluate('=MATCH("absent",A1:A500,0)');
  results.push({
    name: "Formula lookup indexes: VLOOKUP and MATCH misses avoid a full exact scan",
    pass: missingVlookup === "#N/A" && missingMatch === "#N/A" && exactScanComparisons === 0
  });

  return results;
}
