/**
 * Test Suite: VND() — số tiền bằng chữ (tương thích add-in XLL phổ biến ở Việt Nam)
 * Expected strings are the cached values Excel stored in real user workbooks (28/9/2026).
 */

import { vndInWords, readVietnameseInteger } from "../../apps/sheet/vnd-words.js";
import { FormulaEngine } from "../../apps/sheet/formula-engine.js";

export async function runSheetVndWordsTests() {
  const results = [];
  const check = (name, actual, expected) => results.push({ name, pass: actual === expected, error: `got ${JSON.stringify(actual)}` });

  check("VND: 24975666 (mẫu thật)", vndInWords(24975666),
    "Hai mươi bốn triệu chín trăm bảy mươi lăm ngàn sáu trăm sáu mươi sáu đồng chẵn.");
  check("VND: 3193080 — 'không trăm' giữa số (mẫu thật)", vndInWords(3193080),
    "Ba triệu một trăm chín mươi ba ngàn không trăm tám mươi đồng chẵn.");
  check("VND: số lẻ đọc 7 chữ số thập phân + xu (mẫu thật)", vndInWords(13625921.489263842),
    "Mười ba triệu sáu trăm hai mươi lăm ngàn chín trăm hai mươi mốt đồng và bốn triệu tám trăm chín mươi hai ngàn sáu trăm ba mươi tám xu.");
  check("Đọc số: 105 = một trăm lẻ năm", readVietnameseInteger(105), "một trăm lẻ năm");
  check("Đọc số: 1015 = một ngàn không trăm mười lăm", readVietnameseInteger(1015), "một ngàn không trăm mười lăm");
  check("Đọc số: 21 = hai mươi mốt, 15 = mười lăm", `${readVietnameseInteger(21)}|${readVietnameseInteger(15)}`, "hai mươi mốt|mười lăm");
  check("Đọc số: nghìn tỷ", readVietnameseInteger(1234567890123),
    "một ngàn hai trăm ba mươi bốn tỷ năm trăm sáu mươi bảy triệu tám trăm chín mươi ngàn một trăm hai mươi ba");
  check("VND: 0 và số âm", `${vndInWords(0)}|${vndInWords(-5000)}`, "Không đồng chẵn.|Âm năm ngàn đồng chẵn.");

  const cells = new Map([["H13", { val: 3193080, formula: "", style: {} }]]);
  const engine = new FormulaEngine(cells);
  check("Engine: =VND(H13)", engine.evaluate("=VND(H13)"), "Ba triệu một trăm chín mươi ba ngàn không trăm tám mươi đồng chẵn.");
  check("Engine: =_xll.VND(H13) (cách XLSX lưu hàm add-in)", engine.evaluate("=_xll.VND(H13)"),
    "Ba triệu một trăm chín mươi ba ngàn không trăm tám mươi đồng chẵn.");
  check("Engine: VND sai số đối số → #VALUE!", engine.evaluate("=VND(H13,1)"), "#VALUE!");
  return results;
}
