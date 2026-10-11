/**
 * Live soffice: Xác nhận 5 file .doc THẬT của người dùng mở được qua
 * vòng soffice thật → parseFodt(). Đây là bằng chứng thật quan trọng nhất
 * cho 3 lỗi đã sửa: header/footer khác nhau giữa master-page, table-cell
 * nhiều text:p, draw:connector inline.
 *
 * Chạy: node tests/live/writer-fodt-real-doc-files-batch2.mjs
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";
import { convertWithSoffice, findSoffice } from "../helpers/soffice-convert.mjs";

assert.ok(findSoffice(), "LibreOffice soffice.exe not found — skip live test");

const REAL_DOC_FILES = [
  `E:\\VN OFice\\file test\\GÓI THẦU MUA SẮM MÁY BẢO MẬT\\file mới\\1 HĐ.doc`,
  `E:\\VN OFice\\file test\\GÓI THẦU MUA SẮM MÁY BẢO MẬT\\file mới\\3 BBNT TLHĐ.doc`,
  `E:\\VN OFice\\file test\\GÓI THẦU MUA SẮM MÁY BẢO MẬT\\file mới\\8 BC.doc`,
  `E:\\VN OFice\\file test\\GÓI THẦU MUA SẮM MÁY BẢO MẬT\\file mới\\9 CT.doc`,
  `E:\\VN OFice\\file test\\Hồ sơ sữa chữa\\HĐ SỮA CHỮA, THAY THẾ LINH KIỆN.doc`
];

for (const docPath of REAL_DOC_FILES) {
  assert.ok(fs.existsSync(docPath), `File không tồn tại: ${docPath}`);
}

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "vno-writer-real-doc-batch2-"));
try {
  for (const docPath of REAL_DOC_FILES) {
    const baseName = path.basename(docPath, path.extname(docPath));
    console.log(`\n--- ${baseName} ---`);
    const outDir = path.join(tempRoot, baseName);
    const profileDir = path.join(outDir, "profile");
    let fodtPath;
    try {
      fodtPath = convertWithSoffice(docPath, "fodt", path.join(outDir, "fodt"), { profileDir, appKind: "writer" });
    } catch (err) {
      console.log(`FAIL: soffice convert failed for ${baseName}: ${err.message}`);
      assert.fail(`soffice convert thất bại cho ${baseName}: ${err.message}`);
    }
    const fodtXml = fs.readFileSync(fodtPath, "utf8");
    assert.ok(fodtXml.length > 0, `FODT rỗng cho ${baseName}`);

    const bodyEl = { innerHTML: "" };
    const adapter = new WriterAdapter({
      innerHTML: "",
      querySelector(sel) { return sel === ".vno-writer-body" ? bodyEl : null; }
    });

    let threw = false;
    try {
      adapter.parseFodt(fodtXml);
    } catch (err) {
      threw = true;
      console.log(`FAIL: parseFodt ném lỗi cho ${baseName}: ${err.message}`);
      assert.fail(`parseFodt ném lỗi cho ${baseName}: ${err.message}`);
    }

    assert.ok(!threw, `parseFodt không được ném lỗi cho ${baseName}`);
    assert.ok(bodyEl.innerHTML.length > 0, `body.innerHTML rỗng cho ${baseName}`);
    console.log(`PASS: ${baseName} — body length=${bodyEl.innerHTML.length}`);
  }

  console.log("\nPASS: Cả 5 file .doc thật mở được qua soffice → parseFodt(), không ném lỗi, có nội dung.");
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
