/**
 * Test Suite: Excel Spreadsheet Formula Engine Tests
 */

import { FormulaEngine } from "../../apps/sheet/formula-engine.js";

export async function runFormulaEngineTests() {
  const results = [];

  const cellsData = new Map();
  cellsData.set("A1", { val: "10", formula: "", style: {} });
  cellsData.set("A2", { val: "20", formula: "", style: {} });
  cellsData.set("A3", { val: "30", formula: "", style: {} });
  cellsData.set("B1", { val: "Xin", formula: "", style: {} });
  cellsData.set("B2", { val: "chào", formula: "", style: {} });
  cellsData.set("C1", { val: "25.000.000 ₫", formula: "", style: {} });
  cellsData.set("C2", { val: "45.000.000 ₫", formula: "", style: {} });

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

  return results;
}
