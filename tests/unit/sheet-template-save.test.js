/**
 * Test Suite: Lưu thành mẫu .xltx của VN Sheet (loại tệp lưu, đường lưu xlsx đầy đủ + đổi loại nội dung).
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const PY = String.raw`
import sys, os, tempfile, zipfile, json
sys.path.insert(0, os.getcwd())
import main
fods = open(sys.argv[1], encoding="utf-8").read()
dest = sys.argv[2]
with tempfile.TemporaryDirectory() as tmp:
    sp = main._write_save_source(fods, "sheet", tmp, "xlsx")
    out = main._convert_save_source_to_native(sp, "sheet", "xlsx", source_document_path=None)
    main._convert_xlsx_to_template(out)
    main._atomic_replace_file(out, dest)
ct = zipfile.ZipFile(dest).read("[Content_Types].xml").decode()
print(json.dumps({
  "template": "spreadsheetml.template.main+xml" in ct,
  "plain": "spreadsheetml.sheet.main+xml" in ct,
  "infer": main._infer_save_format_from_path("C:/x/mau.xltx", app_kind="sheet")[1],
  "saveTypes": [s for s in main.SAVE_FILE_TYPES["sheet"] if "xltx" in s],
  "openTypes": "*.xltx" in main.OPEN_FILE_TYPES["sheet"][0],
}))
`;

export async function runSheetTemplateSaveTests() {
  const results = [];
  const test = (name, fn) => {
    try { fn(); results.push({ name, pass: true }); } catch (error) { results.push({ name, pass: false, error: error.message }); }
  };
  const eq = (actual, expected, label = "") => {
    if (actual !== expected) throw new Error(`${label} mong đợi ${JSON.stringify(expected)}, nhận ${JSON.stringify(actual)}`);
  };
  test("Lưu .xltx: gói có loại nội dung mẫu, không còn loại sổ thường; .xltx nhận diện được ở hộp thoại Lưu/Mở", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "vno-xltx-"));
    try {
      const fods = path.resolve("tests/fixtures/real-office-samples/src/sample-sheet-charts.fods");
      const dest = path.join(dir, "mau.xltx");
      const run = spawnSync("python", ["-I", "-c", "import sys,os;sys.path.insert(0,os.getcwd());exec(compile(sys.stdin.read(),'t','exec'))", fods, dest], {
        cwd: path.resolve("."), encoding: "utf8", input: PY, timeout: 120000,
      });
      if (run.status !== 0) throw new Error(`python lỗi: ${(run.stderr || "").slice(-400)}`);
      const info = JSON.parse(run.stdout.trim().split(/\r?\n/).pop());
      eq(info.template, true, "loại nội dung mẫu");
      eq(info.plain, false, "không còn loại sổ thường");
      eq(info.infer, "xltx", "suy luận định dạng từ đuôi");
      eq(info.saveTypes.length, 1, "có một loại lưu .xltx");
      eq(info.openTypes, true, "hộp thoại Mở có .xltx");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
  return results;
}