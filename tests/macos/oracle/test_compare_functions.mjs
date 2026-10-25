// Unit tests for compare-lib.mjs (ORACLE-1). Run: node --test tests/macos/oracle/test_compare_functions.mjs
import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { classifyCase, evaluate3T, goldensAgree, matchesGolden, near, summarise } from "./compare-lib.mjs";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

test("near uses relative tolerance with absolute floor", () => {
  assert.ok(near(1e12, 1e12 + 100));
  assert.ok(!near(1e12, 1e12 + 1e4));
  assert.ok(near(0, 5e-10));
  assert.ok(!near(0, 5e-9));
  assert.ok(near(1, 1.0001, 1e-3));
});

test("matchesGolden follows function-golden.test.js rules", () => {
  assert.ok(matchesGolden("number", 2, 2 + 1e-12));
  assert.ok(!matchesGolden("number", 2, "2"));
  assert.ok(matchesGolden("string", "abc", new String("abc")));
  assert.ok(matchesGolden("boolean", true, true));
  assert.ok(!matchesGolden("boolean", true, 1));
  assert.ok(matchesGolden("error", "#N/A", "#N/A extra detail"));
  assert.ok(matchesGolden("array", [1, "x", "#N/A"], [1, "x", "#N/A"]));
  assert.ok(!matchesGolden("array", [1, 2], [1]));
  assert.ok(!matchesGolden("exception", "x", "x"));
});

test("goldensAgree requires the same type", () => {
  assert.ok(goldensAgree({ type: "number", value: 1 }, { type: "number", value: 1 + 1e-12 }));
  assert.ok(!goldensAgree({ type: "number", value: 1 }, { type: "string", value: "1" }));
  assert.ok(!goldensAgree(null, { type: "number", value: 1 }));
});

test("classifyCase: unmeasured Mac is never counted as a match", () => {
  const c = classifyCase({ win: { type: "number", value: 1 }, mac: null, mine: 1 });
  assert.equal(c.tEqMac, null);
  assert.equal(c.macMeasured, false);
  assert.equal(c.tEqWin, true);
  assert.match(c.unmeasuredReason, /golden-mac/);
  const ex = classifyCase({ win: { type: "number", value: 1 }, mac: { type: "exception", value: "boom" }, mine: 1 });
  assert.equal(ex.macMeasured, false);
  assert.match(ex.unmeasuredReason, /exception/);
});

test("classifyCase notes: Mac-Win difference, unsupported, real 3T bug", () => {
  const macWin = classifyCase({ win: { type: "number", value: 1 }, mac: { type: "number", value: 2 }, mine: 1 });
  assert.equal(macWin.tEqMac, false);
  assert.equal(macWin.macEqWin, false);
  assert.match(macWin.note, /Mac-Win/);
  const unsupported = classifyCase({ win: { type: "number", value: 1 }, mac: { type: "number", value: 1 }, mine: "#NAME?" });
  assert.equal(unsupported.note, "chưa hỗ trợ");
  const bug = classifyCase({ win: { type: "number", value: 1 }, mac: { type: "number", value: 1 }, mine: 3 });
  assert.equal(bug.note, "lỗi 3T thật");
});

test("summarise counts each column independently", () => {
  const rows = [
    classifyCase({ win: { type: "number", value: 1 }, mac: { type: "number", value: 1 }, mine: 1 }),
    classifyCase({ win: { type: "number", value: 1 }, mac: { type: "number", value: 2 }, mine: 1 }),
    classifyCase({ win: { type: "number", value: 1 }, mac: null, mine: 1 })
  ];
  const s = summarise(rows);
  assert.deepEqual([s.cases, s.tEqMac, s.tNeMac, s.macNeWin, s.unmeasured, s.tEqWin], [3, 1, 1, 1, 1, 3]);
  assert.equal(s.reasons["không có golden-mac"], 1);
});

test("evaluate3T reuses the real FormulaEngine (cells, 3D sheets, arrays)", async () => {
  const spec = { cells: { A1: 2, A2: 3, B1: 1, B2: 0 }, sheets: { "Sheet 4": { A1: 10 } } };
  const out = await evaluate3T(spec, [
    { formula: "=SUM(A1:A2)" }, { formula: "=SUM('Sheet 4'!A1,A1)" }, { formula: "=MMULT(A1:B2,A1:B2)" }, { formula: "=1/0" }
  ], repo);
  assert.equal(out[0], 5);
  assert.equal(out[1], 12);
  assert.ok(Array.isArray(out[2]));
  assert.equal(String(out[3]).split(" ")[0], "#DIV/0!");
});
