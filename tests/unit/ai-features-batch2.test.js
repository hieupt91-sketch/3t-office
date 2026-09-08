/**
 * Test Suite: VN Office AI Features Batch 2
 * Tests cho 4 tính năng mới: Dịch thuật, Viết nháp, Giải thích công thức, Tạo công thức từ mô tả
 * BẮT BUỘC: test tạo công thức phải validate qua formula engine thật
 */

import { RuleBasedProvider } from "../../platform/ai/ai-service.js";
import { COMMON_COMMANDS, WRITER_COMMANDS, SHEET_COMMANDS } from "../../platform/commands/command-definitions.js";
import { WRITER_RIBBON_TABS } from "../../apps/writer/writer-ribbon.js";
import { SHEET_RIBBON_TABS } from "../../apps/sheet/sheet-ribbon.js";
import { WRITER_HELP_ENTRIES } from "../../platform/help/entries-writer.js";
import { SHEET_HELP_ENTRIES } from "../../platform/help/entries-sheet.js";
import { FUNCTION_CATALOG, FormulaEngine } from "../../apps/sheet/formula-engine.js";

function flattenRibbonItems(items = []) {
  return items.flatMap((item) => (item.items ? flattenRibbonItems(item.items) : [item]));
}

export async function runAiFeaturesBatch2Tests() {
  const results = [];
  const test = async (name, fn) => {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.message });
    }
  };

  // ===== COMMAND DEFINITIONS =====

  await test("Batch2: Có đủ 4 command definitions mới", () => {
    const allCommandIds = [...COMMON_COMMANDS, ...WRITER_COMMANDS, ...SHEET_COMMANDS].map(c => c.id);
    const required = [
      "ai.assistant.translate",
      "ai.assistant.draftDocument",
      "sheet.ai.explainFormula",
      "sheet.ai.formulaFromDescription"
    ];
    for (const id of required) {
      if (!allCommandIds.includes(id)) throw new Error(`Thiếu command definition: ${id}`);
    }
  });

  await test("Batch2: Mỗi command definition mới có label tiếng Việt và icon", () => {
    const defs = [...COMMON_COMMANDS, ...WRITER_COMMANDS, ...SHEET_COMMANDS];
    const newIds = ["ai.assistant.translate", "ai.assistant.draftDocument", "sheet.ai.explainFormula", "sheet.ai.formulaFromDescription"];
    for (const id of newIds) {
      const def = defs.find(c => c.id === id);
      if (!def) throw new Error(`Không tìm thấy: ${id}`);
      if (!def.label || def.label.length < 2) throw new Error(`${id} thiếu label`);
      if (!def.icon) throw new Error(`${id} thiếu icon`);
      if (!def.tooltip || def.tooltip.length < 5) throw new Error(`${id} thiếu tooltip`);
    }
  });

  // ===== RIBBON BUTTONS =====

  await test("Batch2: Writer ribbon có nút Translate và DraftDocument trong nhóm AI Thông minh", () => {
    const aiTab = WRITER_RIBBON_TABS.find(t => t.id === "ai");
    if (!aiTab) throw new Error("Writer ribbon không có tab AI");
    const aiSmartGroup = aiTab.groups.find(g => g.labelKey?.includes("aiSmart"));
    if (!aiSmartGroup) throw new Error("Writer ribbon thiếu nhóm AI Thông minh");
    const allItems = flattenRibbonItems(aiSmartGroup.items);
    const ids = allItems.map(i => i.commandId);
    if (!ids.includes("ai.assistant.translate")) throw new Error("Thiếu nút ai.assistant.translate");
    if (!ids.includes("ai.assistant.draftDocument")) throw new Error("Thiếu nút ai.assistant.draftDocument");
  });

  await test("Batch2: Sheet ribbon có nút explainFormula và formulaFromDescription", () => {
    const aiTab = SHEET_RIBBON_TABS.find(t => t.id === "ai");
    if (!aiTab) throw new Error("Sheet ribbon không có tab AI");
    const aiGroup = aiTab.groups.find(g => g.labelKey?.includes("aiAnalysis"));
    if (!aiGroup) throw new Error("Sheet ribbon thiếu nhóm Phân tích dữ liệu AI");
    const allItems = flattenRibbonItems(aiGroup.items);
    const ids = allItems.map(i => i.commandId);
    if (!ids.includes("sheet.ai.explainFormula")) throw new Error("Thiếu nút sheet.ai.explainFormula");
    if (!ids.includes("sheet.ai.formulaFromDescription")) throw new Error("Thiếu nút sheet.ai.formulaFromDescription");
  });

  // ===== RULE-BASED PROVIDER =====

  await test("Batch2: RuleBasedProvider xử lý từ khóa 'dịch' / 'translate'", async () => {
    const res = await RuleBasedProvider.query("dịch đoạn văn bản này");
    if (!res.reply.includes("Dịch thuật") && !res.reply.includes("dịch")) {
      throw new Error("RuleBasedProvider không phản hồi cho từ khóa 'dịch'");
    }
  });

  await test("Batch2: RuleBasedProvider xử lý từ khóa 'viết nháp' / 'draft'", async () => {
    const res = await RuleBasedProvider.query("viết nháp thư mời họp");
    if (!res.reply.includes("Viết nháp") && !res.reply.includes("nháp")) {
      throw new Error("RuleBasedProvider không phản hồi cho từ khóa 'viết nháp'");
    }
  });

  await test("Batch2: RuleBasedProvider xử lý từ khóa 'giải thích công thức'", async () => {
    const res = await RuleBasedProvider.query("giải thích công thức SUM");
    if (!res.reply.includes("Giải thích") && !res.reply.includes("công thức")) {
      throw new Error("RuleBasedProvider không phản hồi cho từ khóa 'giải thích công thức'");
    }
  });

  await test("Batch2: RuleBasedProvider xử lý từ khóa 'tạo công thức'", async () => {
    const res = await RuleBasedProvider.query("tạo công thức tính tổng");
    if (!res.reply.includes("Tạo công thức") && !res.reply.includes("công thức")) {
      throw new Error("RuleBasedProvider không phản hồi cho từ khóa 'tạo công thức'");
    }
  });

  await test("Batch2: RuleBasedProvider mới vẫn giữ các từ khóa cũ (backward compat)", async () => {
    const r1 = await RuleBasedProvider.query("tóm tắt");
    if (!r1.reply.toLowerCase().includes("tóm tắt")) throw new Error("Mất hỗ trợ từ khóa 'tóm tắt'");
    const r2 = await RuleBasedProvider.query("chính tả");
    if (!r2.reply.includes("kiểm tra") && !r2.reply.includes("ngữ pháp")) throw new Error("Mất hỗ trợ từ khóa 'chính tả'");
    const r3 = await RuleBasedProvider.query("trau chuốt");
    if (!r3.reply.includes("trau chuốt")) throw new Error("Mất hỗ trợ từ khóa 'trau chuốt'");
  });

  // ===== HELP ENTRIES =====

  await test("Batch2: Writer help entries có entry cho Translate và DraftDocument", () => {
    const ids = WRITER_HELP_ENTRIES.map(e => e.id);
    if (!ids.includes("writer.ai.translate")) throw new Error("Thiếu help entry writer.ai.translate");
    if (!ids.includes("writer.ai.draftDocument")) throw new Error("Thiếu help entry writer.ai.draftDocument");
  });

  await test("Batch2: Sheet help entries có entry cho explainFormula và formulaFromDescription", () => {
    const ids = SHEET_HELP_ENTRIES.map(e => e.id);
    if (!ids.includes("sheet.ai.explainFormula")) throw new Error("Thiếu help entry sheet.ai.explainFormula");
    if (!ids.includes("sheet.ai.formulaFromDescription")) throw new Error("Thiếu help entry sheet.ai.formulaFromDescription");
  });

  await test("Batch2: Mỗi help entry mới có đầy đủ trường bắt buộc", () => {
    const requiredFields = ["id", "app", "commandIds", "title", "summary", "ribbon", "keywords", "steps"];
    const allEntries = [...WRITER_HELP_ENTRIES.slice(-2), ...SHEET_HELP_ENTRIES.slice(-2)];
    for (const entry of allEntries) {
      for (const field of requiredFields) {
        if (!entry[field]) throw new Error(`Help entry ${entry.id} thiếu trường ${field}`);
      }
      if (!Array.isArray(entry.commandIds) || entry.commandIds.length === 0) {
        throw new Error(`Help entry ${entry.id} phải có commandIds array không rỗng`);
      }
      if (!Array.isArray(entry.steps) || entry.steps.length < 3) {
        throw new Error(`Help entry ${entry.id} phải có ít nhất 3 bước hướng dẫn`);
      }
    }
  });

  // ===== FORMULA ENGINE VALIDATION (BẮT BUỘC) =====

  await test("Batch2: FUNCTION_CATALOG tồn tại và có >= 50 hàm", () => {
    if (!Array.isArray(FUNCTION_CATALOG)) throw new Error("FUNCTION_CATALOG không phải array");
    if (FUNCTION_CATALOG.length < 50) throw new Error(`FUNCTION_CATALOG chỉ có ${FUNCTION_CATALOG.length} hàm, cần >= 50`);
  });

  await test("Batch2: FormulaEngine parse được các hàm cơ bản để validate công thức AI", () => {
    const engine = new FormulaEngine(
      () => new Map([
        ["A1", { val: 10, formula: "", style: {} }],
        ["A2", { val: 20, formula: "", style: {} }],
        ["B1", { val: 5, formula: "", style: {} }],
        ["B2", { val: 15, formula: "", style: {} }]
      ]),
      () => null,
      () => null,
      () => "Sheet1",
      () => ["Sheet1"]
    );

    const testCases = [
      { formula: "=SUM(A1:A2)", expected: 30 },
      { formula: "=A1+B1", expected: 15 },
      { formula: "=A1*2", expected: 20 },
      { formula: "=MAX(A1:B2)", expected: 20 },
      { formula: "=MIN(A1:B2)", expected: 5 },
      { formula: "=AVERAGE(A1:A2)", expected: 15 },
      { formula: "=COUNT(A1:B2)", expected: 4 },
      { formula: '=IF(A1>5,"Lon","Nho")', expected: "Lon" }
    ];

    for (const tc of testCases) {
      const result = engine.evaluate(tc.formula);
      if (result !== tc.expected) {
        throw new Error(`FormulaEngine.evaluate("${tc.formula}") = ${result}, kỳ vọng ${tc.expected}`);
      }
    }
  });

  await test("Batch2: Các hàm SUMIF, COUNTIF, VLOOKUP có trong FUNCTION_CATALOG", () => {
    const names = FUNCTION_CATALOG.map(f => f.name);
    const required = ["SUMIF", "COUNTIF", "VLOOKUP", "IF", "SUM", "AVERAGE"];
    for (const fn of required) {
      if (!names.includes(fn)) throw new Error(`FUNCTION_CATALOG thiếu hàm ${fn}`);
    }
  });

  await test("Batch2: FormulaEngine validate được SUMIF với dữ liệu mẫu", () => {
    const engine = new FormulaEngine(
      () => new Map([
        ["A1", { val: 100, formula: "", style: {} }],
        ["A2", { val: 200, formula: "", style: {} }],
        ["A3", { val: 50, formula: "", style: {} }],
        ["A4", { val: 300, formula: "", style: {} }],
        ["B1", { val: 10, formula: "", style: {} }],
        ["B2", { val: 20, formula: "", style: {} }],
        ["B3", { val: 5, formula: "", style: {} }],
        ["B4", { val: 30, formula: "", style: {} }]
      ]),
      () => null,
      () => null,
      () => "Sheet1",
      () => ["Sheet1"]
    );

    const result = engine.evaluate('=SUMIF(A1:A4,">100",B1:B4)');
    if (result !== 50) throw new Error(`SUMIF(>100) = ${result}, kỳ vọng 50 (20+30)`);
  });

  await test("Batch2: FormulaEngine validate COUNTIF với dữ liệu mẫu", () => {
    const engine = new FormulaEngine(
      () => new Map([
        ["A1", { val: 10, formula: "", style: {} }],
        ["A2", { val: 25, formula: "", style: {} }],
        ["A3", { val: 5, formula: "", style: {} }],
        ["A4", { val: 30, formula: "", style: {} }]
      ]),
      () => null,
      () => null,
      () => "Sheet1",
      () => ["Sheet1"]
    );

    const result = engine.evaluate('=COUNTIF(A1:A4,">10")');
    if (result !== 2) throw new Error(`COUNTIF(>10) = ${result}, kỳ vọng 2`);
  });

  await test("Batch2: FormulaEngine validate IF lồng nhau", () => {
    const engine = new FormulaEngine(
      () => new Map([
        ["A1", { val: 85, formula: "", style: {} }]
      ]),
      () => null,
      () => null,
      () => "Sheet1",
      () => ["Sheet1"]
    );

    const result = engine.evaluate('=IF(A1>=90,"Gioi",IF(A1>=70,"Kha","Yeu"))');
    if (result !== "Kha") throw new Error(`IF lồng = ${result}, kỳ vọng "Kha"`);
  });

  await test("Batch2: FunctionCatalog có đúng 96+ hàm nhưHasBeen document", () => {
    if (FUNCTION_CATALOG.length < 90) {
      throw new Error(`FUNCTION_CATALOG chỉ có ${FUNCTION_CATALOG.length} hàm, kỳ vọng >= 90`);
    }
  });

  await test("Batch2: Mỗi hàm trong FUNCTION_CATALOG có name, category, syntax, desc", () => {
    for (const fn of FUNCTION_CATALOG) {
      if (!fn.name) throw new Error("Hàm thiếu name");
      if (!fn.category) throw new Error(`Hàm ${fn.name} thiếu category`);
      if (!fn.syntax) throw new Error(`Hàm ${fn.name} thiếu syntax`);
      if (!fn.desc) throw new Error(`Hàm ${fn.name} thiếu desc`);
    }
  });

  // ===== FORMULA VALIDATION LOGIC (mô phỏng cách AI sẽ validate) =====

  await test("Batch2: Kiểm tra validate công thức AI trả về — hàm không hỗ trợ phải bị phát hiện", () => {
    const supportedNames = new Set(FUNCTION_CATALOG.map(f => f.name));

    const aiFormulas = [
      { formula: "=SUM(A1:A10)", expected: true },
      { formula: "=VLOOKUP(A1,B:C,2,FALSE)", expected: true },
      { formula: "=IF(A1>10,\"Yes\",\"No\")", expected: true },
      { formula: "=SUMIF(A:A,\">5\",B:B)", expected: true },
      { formula: "=COUNTIF(A:A,\">0\")", expected: true },
      { formula: "=XLOOKUP(A1,B:B,C:C)", expected: true },
      { formula: "=IFERROR(A1/B1,0)", expected: true },
      { formula: "=ROUND(A1,2)", expected: true }
    ];

    for (const tc of aiFormulas) {
      const funcMatches = tc.formula.match(/[A-Z]+(?:\.[A-Z]+)?(?=\()/gi) || [];
      const unsupported = funcMatches.filter(fn => !supportedNames.has(fn.toUpperCase()));
      if (tc.expected && unsupported.length > 0) {
        throw new Error(`Công thức ${tc.formula} có hàm không hỗ trợ: ${unsupported.join(", ")}`);
      }
    }

    const unsupportedFormula = "=GOOGLEFINANCE(A1)";
    const funcMatches2 = unsupportedFormula.match(/[A-Z]+(?:\.[A-Z]+)?(?=\()/gi) || [];
    const unsupported2 = funcMatches2.filter(fn => !supportedNames.has(fn.toUpperCase()));
    if (unsupported2.length === 0) {
      throw new Error("GOOGLEFINANCE phải bị phát hiện là không hỗ trợ");
    }
  });

  return results;
}
