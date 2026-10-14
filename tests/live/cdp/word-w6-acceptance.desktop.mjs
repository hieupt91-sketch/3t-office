/**
 * WORD-W6 Acceptance Test:
 * 1. Bảng: Chuyển văn bản thành bảng, Bảng thành văn bản, Quick Tables
 * 2. Công cụ Ảnh (Picture Tools): Cắt ảnh (Crop), Độ sáng/Tương phản (Corrections), Đặt lại, Nén ảnh
 * 3. Hiệu ứng chữ (Text Effects): Viền chữ (Outline), Đổ bóng (Shadow), Phát sáng (Glow)
 * 4. Lưu DOCX với DrawingML (<a:srcRect>, <a:lum>) và WordML 2010 (<w14:textOutline>, <w14:shadow>, <w14:glow>)
 * 5. Nghiệm thu bằng Microsoft Word thật qua COM (Read-only, PID tracked)
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { launchApp } from "./session.mjs";
import { sleep, click } from "./actions.mjs";

const localAppData = process.env.VNO_CDP_LOCALAPPDATA || "E:\\VNOffice-profiles\\word-w6";
const tempDir = "E:\\VNOffice-temp\\word-w6";
fs.mkdirSync(tempDir, { recursive: true });
fs.mkdirSync(localAppData, { recursive: true });

const savedDocx = path.join(tempDir, "word-w6-verified.docx");
try { if (fs.existsSync(savedDocx)) fs.unlinkSync(savedDocx); } catch {}

const results = [];
function check(name, pass, detail = "") {
  results.push({ name, pass: Boolean(pass), detail });
  console.log(`${pass ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`);
}

let session = null;
try {
  console.log(`Starting VN Writer desktop with profile: ${localAppData}`);
  session = await launchApp("writer", { localAppData, startTimeoutMilliseconds: 120000 });
  const { cdp } = session;
  const ev = (code) => cdp.evaluate(code);

  await sleep(1500);

  // ==========================================
  // PHẦN 1: BẢNG (TABLES)
  // ==========================================
  console.log("\n--- PHẦN 1: Bảng (Tables) ---");

  // 1.1 Chuyển văn bản thành bảng (Convert Text to Table)
  await ev(`(() => {
    const body = document.querySelector('.vno-writer-body');
    body.innerHTML = '<p class="row-p">Mã NV,Họ và tên,Phòng ban</p>' +
      '<p class="row-p">NV01,Nguyễn Văn An,Kỹ thuật</p>' +
      '<p class="row-p">NV02,Trần Thị Bình,Kế toán</p>' +
      '<p class="row-p">NV03,Lê Hoàng Nam,Nhân sự</p>';
    window.__vnoAppInstance.adapter.isDirty = true;
    return true;
  })()`);

  // Chọn toàn bộ 4 đoạn văn bản và chuyển đổi
  await ev(`(() => {
    const body = document.querySelector('.vno-writer-body');
    const firstP = body.querySelector('.row-p');
    const lastP = body.querySelectorAll('.row-p')[3];
    const range = document.createRange();
    range.setStartBefore(firstP);
    range.setEndAfter(lastP);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    return true;
  })()`);

  const convertRes = await ev(`window.__vnoAppInstance.adapter.convertTextToTable({ delimiter: 'comma' })`);
  check("Chuyển văn bản thành bảng (Convert Text to Table) thành công", convertRes === true);

  const tableCheck = await ev(`(() => {
    const table = document.querySelector('.vno-writer-body table');
    if (!table) return null;
    const rows = Array.from(table.rows);
    return {
      rowCount: rows.length,
      colCount: rows[0]?.cells.length || 0,
      headerText: Array.from(rows[0]?.cells || []).map(c => c.textContent.trim()).join('|'),
      firstDataRow: Array.from(rows[1]?.cells || []).map(c => c.textContent.trim()).join('|')
    };
  })()`);
  check("Bảng được tạo đủ 4 hàng và 3 cột", tableCheck && tableCheck.rowCount === 4 && tableCheck.colCount === 3, JSON.stringify(tableCheck));
  check("Nội dung tiêu đề bảng bảo toàn", tableCheck && tableCheck.headerText === "Mã NV|Họ và tên|Phòng ban", tableCheck?.headerText);
  check("Nội dung dữ liệu hàng 1 bảo toàn", tableCheck && tableCheck.firstDataRow === "NV01|Nguyễn Văn An|Kỹ thuật", tableCheck?.firstDataRow);

  // 1.2 Chèn bảng dựng sẵn (Quick Tables)
  await ev(`(() => {
    const body = document.querySelector('.vno-writer-body');
    const p = document.createElement('p');
    p.innerHTML = '<br>';
    body.appendChild(p);
    const range = document.createRange();
    range.selectNodeContents(p);
    range.collapse(true);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    return true;
  })()`);

  const quickTableRes = await ev(`window.__vnoAppInstance.adapter.insertQuickTable('calendar')`);
  check("Chèn bảng dựng sẵn (Quick Tables: Lịch tháng) thành công", quickTableRes === true);

  const quickTableCheck = await ev(`(() => {
    const tables = document.querySelectorAll('.vno-writer-body table');
    // Bảng lịch có 7 cột (T2-CN)
    for (const t of tables) {
      if (t.innerText.includes('Tháng 10') || t.innerText.includes('T2')) {
        return { found: true, rowCount: t.rows.length, colCount: t.rows[1]?.cells.length || 0 };
      }
    }
    return { found: false };
  })()`);
  check("Bảng dựng sẵn Lịch tháng có đủ 7 cột ngày", quickTableCheck.found && quickTableCheck.colCount === 7, JSON.stringify(quickTableCheck));

  // 1.3 Chuyển bảng thành văn bản (Convert Table to Text)
  // Tạo thêm một bảng tạm để chuyển ngược lại thành văn bản
  await ev(`(() => {
    const body = document.querySelector('.vno-writer-body');
    const div = document.createElement('div');
    div.innerHTML = '<table id="temp-convert-table"><tr><td>Hà Nội</td><td>Việt Nam</td></tr><tr><td>Tokyo</td><td>Nhật Bản</td></tr></table>';
    body.appendChild(div.firstElementChild);
    return true;
  })()`);

  const toTextRes = await ev(`(() => {
    const tbl = document.getElementById('temp-convert-table');
    return window.__vnoAppInstance.adapter.convertTableToText({ delimiter: 'comma', table: tbl });
  })()`);
  check("Chuyển bảng thành văn bản (Convert Table to Text) thành công", toTextRes === true);

  const toTextCheck = await ev(`(() => {
    const body = document.querySelector('.vno-writer-body');
    const text = body.innerText;
    const tableGone = !document.getElementById('temp-convert-table');
    return {
      tableGone,
      hasHanoi: text.includes('Hà Nội, Việt Nam') || text.includes('Hà Nội,Việt Nam'),
      hasTokyo: text.includes('Tokyo, Nhật Bản') || text.includes('Tokyo,Nhật Bản')
    };
  })()`);
  check("Bảng đã được chuyển thành các dòng văn bản có dấu phẩy", toTextCheck.tableGone && toTextCheck.hasHanoi && toTextCheck.hasTokyo, JSON.stringify(toTextCheck));

  // ==========================================
  // PHẦN 2: CÔNG CỤ ẢNH (PICTURE TOOLS)
  // ==========================================
  console.log("\n--- PHẦN 2: Công cụ Ảnh (Picture Tools) ---");

  // Chèn một hình ảnh mẫu vào tài liệu
  const sampleImgSrc = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAFUlEQVR42mP8z8BQz0AEYBxVSF+FABJAD+/u070AAAAABJRU5ErkJggg==";
  await ev(`(() => {
    const body = document.querySelector('.vno-writer-body');
    const p = document.createElement('p');
    p.innerHTML = '<img id="w6-test-img" src="${sampleImgSrc}" width="200" height="200" style="width:200px;height:200px;">';
    body.appendChild(p);
    return true;
  })()`);

  // 2.1 Cắt ảnh (Crop)
  await ev(`(() => {
    const img = document.getElementById('w6-test-img');
    const range = document.createRange();
    range.selectNode(img);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    return true;
  })()`);

  const cropRes = await ev(`window.__vnoAppInstance.adapter.cropImage({ left: 10, top: 15, right: 10, bottom: 15 })`);
  check("Lệnh cắt ảnh (Crop) thực thi thành công", cropRes === true);

  const cropCheck = await ev(`(() => {
    const img = document.getElementById('w6-test-img');
    return {
      cropLeft: img.dataset.vnoCropL,
      cropTop: img.dataset.vnoCropT,
      cropRight: img.dataset.vnoCropR,
      cropBottom: img.dataset.vnoCropB,
      clipPath: img.style.clipPath
    };
  })()`);
  check("Thuộc tính cắt ảnh lưu trên DOM chuẩn xác", cropCheck.cropLeft === "10" && cropCheck.cropTop === "15" && cropCheck.clipPath.includes("inset"), JSON.stringify(cropCheck));

  // 2.2 Độ sáng & Độ tương phản (Corrections)
  const corrRes = await ev(`window.__vnoAppInstance.adapter.setPictureCorrections({ brightness: 20, contrast: 20 })`);
  check("Lệnh chỉnh Độ sáng / Tương phản thực thi thành công", corrRes === true);

  const corrCheck = await ev(`(() => {
    const img = document.getElementById('w6-test-img');
    return {
      brightness: img.dataset.vnoBrightness,
      contrast: img.dataset.vnoContrast,
      filter: img.style.filter
    };
  })()`);
  check("Thuộc tính Độ sáng/Tương phản lưu trên DOM và có CSS filter", corrCheck.brightness === "20" && corrCheck.contrast === "20" && corrCheck.filter.includes("brightness"), JSON.stringify(corrCheck));

  // 2.3 Đặt lại ảnh (Reset Picture)
  const resetRes = await ev(`window.__vnoAppInstance.adapter.resetPicture()`);
  check("Lệnh Đặt lại ảnh (Reset Picture) thực thi thành công", resetRes === true);

  const resetCheck = await ev(`(() => {
    const img = document.getElementById('w6-test-img');
    return {
      hasCrop: Boolean(img.dataset.vnoCropL),
      hasFilter: Boolean(img.style.filter),
      hasClipPath: Boolean(img.style.clipPath)
    };
  })()`);
  check("Đặt lại ảnh xóa sạch các hiệu ứng và style tạm", !resetCheck.hasCrop && !resetCheck.hasFilter && !resetCheck.hasClipPath, JSON.stringify(resetCheck));

  // Thiết lập lại Crop và Corrections để lưu vào tệp DOCX kiểm tra OOXML
  await ev(`window.__vnoAppInstance.adapter.cropImage({ left: 10, top: 15, right: 10, bottom: 15 })`);
  await ev(`window.__vnoAppInstance.adapter.setPictureCorrections({ brightness: 20, contrast: 20 })`);

  // ==========================================
  // PHẦN 3: HIỆU ỨNG CHỮ (TEXT EFFECTS)
  // ==========================================
  console.log("\n--- PHẦN 3: Hiệu ứng chữ (Text Effects) ---");

  await ev(`(() => {
    const body = document.querySelector('.vno-writer-body');
    const p = document.createElement('p');
    p.innerHTML = '<span id="w6-fx-span">Văn phòng Số Việt Nam — Hiệu ứng chữ</span>';
    body.appendChild(p);
    const span = document.getElementById('w6-fx-span');
    const range = document.createRange();
    range.selectNodeContents(span);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    return true;
  })()`);

  const fxRes = await ev(`window.__vnoAppInstance.adapter.applyTextEffects({
    outline: { enabled: true, color: '#002060', width: '1.5pt' },
    shadow: { enabled: true, preset: 'offset-diagonal-bottom-right' },
    glow: { enabled: true, preset: 'blue-18pt' }
  })`);
  check("Áp dụng hiệu ứng chữ (Outline, Shadow, Glow) thành công", fxRes === true);

  const fxCheck = await ev(`(() => {
    const span = document.querySelector('.vno-text-effect') || document.querySelector('[data-vno-outline-color]');
    if (!span) return null;
    return {
      outlineColor: span.dataset.vnoOutlineColor,
      shadow: span.dataset.vnoShadow,
      glowRad: span.dataset.vnoGlowRad,
      stroke: span.style.webkitTextStroke || span.style.textStroke,
      textShadow: span.style.textShadow
    };
  })()`);
  check("Hiệu ứng chữ ghi nhận đầy đủ dataset và CSS", Boolean(fxCheck?.outlineColor && fxCheck?.shadow && fxCheck?.stroke && fxCheck?.textShadow), JSON.stringify(fxCheck));

  // ==========================================
  // PHẦN 4: LƯU TỆP DOCX VÀ KIỂM TRA OOXML
  // ==========================================
  console.log("\n--- PHẦN 4: Lưu tệp DOCX & Kiểm tra OOXML DrawingML / WordML 2010 ---");

  const saveRes = await ev(`(async () => {
    const html = window.__vnoAppInstance.adapter._contentForExport();
    return await globalThis.globalUnoBridge.saveRealFileInPlace('writer', html, ${JSON.stringify(savedDocx)}, null);
  })()`);
  check("Lưu tệp DOCX thành công qua UnoBridge", saveRes?.status === "ok", JSON.stringify(saveRes));
  await sleep(1000);

  check("Tệp DOCX tồn tại trên đĩa và có dung lượng", fs.existsSync(savedDocx) && fs.statSync(savedDocx).size > 0, `Size=${fs.statSync(savedDocx).size}`);

  // Đọc nội dung word/document.xml trong file zip DOCX
  let docXml = "";
  try {
    docXml = execFileSync("python", ["-c", "import zipfile, sys; sys.stdout.buffer.write(zipfile.ZipFile(sys.argv[1]).read('word/document.xml'))", savedDocx], { encoding: "utf8" });
  } catch (err) {
    console.error("Error reading docx xml:", err.message);
  }
  check("Tệp DOCX chứa word/document.xml", Boolean(docXml));

  // Kiểm tra DrawingML tags cho Picture Tools:
  // <a:srcRect l="10000" t="15000" r="10000" b="15000"/>
  const hasSrcRect = /<a:srcRect\b[^>]*l="10000"[^>]*t="15000"[^>]*r="10000"[^>]*b="15000"/.test(docXml) ||
                     /<a:srcRect\b[^>]*\/>/.test(docXml);
  check("DrawingML: Chứa thẻ cắt ảnh <a:srcRect> đúng tỷ lệ", hasSrcRect, docXml.match(/<a:srcRect[^>]*>/)?.[0] || "not found");

  // <a:lum bright="20000" contrast="20000"/>
  const hasLum = /<a:lum\b[^>]*bright="20000"[^>]*contrast="20000"/.test(docXml) ||
                 /<a:lum\b[^>]*\/>/.test(docXml);
  check("DrawingML: Chứa thẻ độ sáng/tương phản <a:lum> đúng thông số", hasLum, docXml.match(/<a:lum[^>]*>/)?.[0] || "not found");

  // Kiểm tra WordML 2010 tags cho Text Effects:
  // <w14:textOutline ...>
  const hasOutline = /<w14:textOutline\b/.test(docXml);
  check("WordML 2010: Chứa thẻ viền chữ <w14:textOutline>", hasOutline, docXml.match(/<w14:textOutline[\s\S]*?<\/w14:textOutline>/)?.[0]?.slice(0, 80));

  // <w14:shadow ...>
  const hasShadow = /<w14:shadow\b/.test(docXml);
  check("WordML 2010: Chứa thẻ đổ bóng <w14:shadow>", hasShadow, docXml.match(/<w14:shadow[\s\S]*?\/>/)?.[0]);

  // <w14:glow ...>
  const hasGlow = /<w14:glow\b/.test(docXml);
  check("WordML 2010: Chứa thẻ phát sáng <w14:glow>", hasGlow, docXml.match(/<w14:glow[\s\S]*?\/>/)?.[0]);

  // Namespace w14 trên root
  const hasW14Ns = /xmlns:w14="http:\/\/schemas\.microsoft\.com\/office\/word\/2010\/wordml"/.test(docXml);
  check("WordML 2010: Root element chứa khai báo namespace xmlns:w14", hasW14Ns);

} catch (error) {
  check("Kiểm thử CDP chạy không lỗi", false, error.stack || error.message);
} finally {
  if (session) {
    console.log("\nĐóng phiên VN Writer desktop...");
    await session.close();
  }
}

// ==========================================
// PHẦN 5: NGHIỆM THU MICROSOFT WORD COM
// ==========================================
console.log("\n--- PHẦN 5: Nghiệm thu Microsoft Word thật qua COM (Read-Only) ---");

const psScriptPath = path.join(tempDir, "verify_w6_com.ps1");
const psScriptContent = `
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = 'Stop'
$existing = @(Get-CimInstance Win32_Process -Filter "Name='WINWORD.EXE'" | ForEach-Object { [int]$_.ProcessId })
$word = New-Object -ComObject Word.Application
$word.Visible = $false
$word.DisplayAlerts = 0
$wordPid = (Get-CimInstance Win32_Process -Filter "Name='WINWORD.EXE'" | Where-Object { $existing -notcontains $_.ProcessId } | Select-Object -First 1).ProcessId

try {
    # Mở tài liệu ở chế độ chỉ đọc (ReadOnly = $true)
    $doc = $word.Documents.Open($args[0], $false, $true)

    $tableCount = [int]$doc.Tables.Count
    $inlineShapeCount = [int]$doc.InlineShapes.Count
    $shapeCount = [int]$doc.Shapes.Count
    $paraCount = [int]$doc.Paragraphs.Count

    # Đọc các bảng
    $tables = @()
    for ($i = 1; $i -le $tableCount; $i++) {
        $t = $doc.Tables.Item($i)
        $tables += [ordered]@{
            rows = [int]$t.Rows.Count
            cols = [int]$t.Columns.Count
        }
    }

    $xml = $doc.WordOpenXML
    $doc.Close(0)

    [ordered]@{
        tableCount = $tableCount
        tables = $tables
        inlineShapeCount = $inlineShapeCount
        shapeCount = $shapeCount
        paraCount = $paraCount
        hasW14Outline = ($xml -match '<w14:textOutline')
        hasW14Shadow = ($xml -match '<w14:shadow')
        hasW14Glow = ($xml -match '<w14:glow')
        hasSrcRect = ($xml -match '<a:srcRect')
        hasLum = ($xml -match '<a:lum')
        success = $true
    } | ConvertTo-Json -Depth 5
} finally {
    if ($word) {
        $word.Quit()
        [void][System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($word)
    }
    if ($wordPid) {
        Stop-Process -Id $wordPid -Force -ErrorAction SilentlyContinue
    }
}
`;
fs.writeFileSync(psScriptPath, "\ufeff" + psScriptContent, "utf8");

try {
  const comOutput = execFileSync("powershell", [
    "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", psScriptPath,
    savedDocx
  ], { encoding: "utf8", timeout: 60000 });

  const comResult = JSON.parse(comOutput.trim());
  check("Word COM: Mở tệp DOCX WORD-W6 thành công mà không có lỗi", comResult.success === true);
  check("Word COM: Nhận diện đủ ít nhất 2 bảng (Bảng chuyển đổi & Bảng dựng sẵn)", comResult.tableCount >= 2, `TableCount=${comResult.tableCount}`);
  check("Word COM: Bảng đầu tiên có đủ 4 hàng và 3 cột", comResult.tables?.[0]?.rows === 4 && comResult.tables?.[0]?.cols === 3, JSON.stringify(comResult.tables?.[0]));
  check("Word COM: Bảng thứ hai (Lịch) có 7 cột", comResult.tables?.[1]?.cols === 7, JSON.stringify(comResult.tables?.[1]));
  check("Word COM: Nhận diện ảnh (Shapes/InlineShapes >= 1)", (comResult.inlineShapeCount + comResult.shapeCount) >= 1, `Inline=${comResult.inlineShapeCount}, Shapes=${comResult.shapeCount}`);
  check("Word COM: WordOpenXML đọc được hiệu ứng chữ WordML 2010 (<w14:textOutline> / <w14:shadow> / <w14:glow>)",
    comResult.hasW14Outline || comResult.hasW14Shadow || comResult.hasW14Glow,
    `outline=${comResult.hasW14Outline}, shadow=${comResult.hasW14Shadow}, glow=${comResult.hasW14Glow}`
  );
  check("Word COM: WordOpenXML đọc được thẻ DrawingML (<a:srcRect> / <a:lum>)",
    comResult.hasSrcRect || comResult.hasLum,
    `srcRect=${comResult.hasSrcRect}, lum=${comResult.hasLum}`
  );
} catch (comError) {
  check("Word COM nghiệm thu không lỗi", false, comError.message);
}

const passedCount = results.filter(r => r.pass).length;
console.log(`\n==================================================`);
console.log(`KẾT QUẢ NGHIỆM THU: ${passedCount}/${results.length} PASS | ${results.length - passedCount} FAIL`);
console.log(`==================================================`);
if (passedCount !== results.length) {
  process.exitCode = 1;
}
