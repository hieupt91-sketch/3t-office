/**
 * Live Desktop CDP Test for Sheet File Info & Mark as Final (AGY-SHEET-INFO)
 * 1. Mở app VN Sheet thật bằng profile sạch.
 * 2. Thiết lập 7 thuộc tính: Tiêu đề, Chủ đề, Tác giả, Quản lý, Công ty, Thẻ, Ghi chú.
 * 3. Kiểm tra hiển thị giao diện Thông tin (Backstage Info).
 * 4. Bật "Đánh dấu là cuối cùng" (Mark as Final): banner vàng + khóa sửa ô/công thức.
 * 5. Lưu ra XLSX chuẩn: kiểm tra bằng Excel 2016 COM thật:
 *    - BuiltinDocumentProperties: Title, Subject, Author, Manager, Company, Keywords, Comments.
 *    - Workbook.Final === True.
 * 6. Mở lại tệp trong VN Sheet bằng phiên ứng dụng mới (launchApp với filePath):
 *    - Tự hiện banner vàng "ĐÃ ĐÁNH DẤU LÀ CUỐI CÙNG", nút "Vẫn chỉnh sửa".
 *    - Giữ nguyên 7 thuộc tính.
 *    - Khóa sửa ô/thanh công thức.
 * 7. Gỡ đánh dấu cuối cùng (Vẫn chỉnh sửa), lưu lại và kiểm tra Excel COM Workbook.Final === False.
 */

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { launchApp } from "./session.mjs";
import { platformOutputPath } from "./output-path.mjs";

const profile = process.env.VNO_CDP_LOCALAPPDATA || platformOutputPath("E:\\VNOffice-profiles\\sinfo-cdp", { directory: true });
const tempDir = platformOutputPath("E:\\VNOffice-temp\\sinfo-audit", { directory: true });
fs.mkdirSync(profile, { recursive: true });
fs.mkdirSync(tempDir, { recursive: true });

const results = [];
function check(id, pass, detail = "") {
  results.push({ id, pass: Boolean(pass), detail });
  console.log(`${pass ? "PASS" : "FAIL"} | ${id}${detail ? ` | ${detail}` : ""}`);
}

function verifyWithExcelCom(filePath) {
  const target = path.resolve(filePath).replace(/'/g, "''");
  const psScript = `
    $resolved = '${target}'
    $x = $null
    $wb = $null
    $props = $null
    function Get-PropValue($properties, $name) {
      $item = $null
      try {
        $flags = [Reflection.BindingFlags]::GetProperty
        $item = [System.__ComObject].InvokeMember("Item", $flags, $null, $properties, @($name))
        return [string]([System.__ComObject].InvokeMember("Value", $flags, $null, $item, $null))
      } catch {
        return ""
      } finally {
        if ($item -ne $null -and [Runtime.InteropServices.Marshal]::IsComObject($item)) {
          [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($item)
        }
      }
    }

    try {
      for ($attempt = 0; $attempt -lt 20 -and -not $x; $attempt++) {
        try { $x = New-Object -ComObject Excel.Application } catch { Start-Sleep -Milliseconds 500 }
      }
      if (-not $x) { throw "Excel.Application unavailable" }
      try { $x.DisplayAlerts = $false } catch {}
      for ($attempt = 0; $attempt -lt 25 -and -not $wb; $attempt++) {
        try { $wb = $x.Workbooks.Open($resolved, 0, $true) } catch { Start-Sleep -Milliseconds 700 }
      }
      if (-not $wb) { throw "Workbooks.Open returned null" }

      $flags = [Reflection.BindingFlags]::GetProperty
      $final = $false
      try {
        $final = [bool]$wb.Final
      } catch {}

      try {
        $props = [System.__ComObject].InvokeMember("BuiltinDocumentProperties", $flags, $null, $wb, $null)
      } catch {}

      $result = [ordered]@{
        ok = $true
        Final = $final
        Title = (Get-PropValue $props "Title")
        Author = (Get-PropValue $props "Author")
        Subject = (Get-PropValue $props "Subject")
        Company = (Get-PropValue $props "Company")
        Manager = (Get-PropValue $props "Manager")
        Keywords = (Get-PropValue $props "Keywords")
        Comments = (Get-PropValue $props "Comments")
      }
      $result | ConvertTo-Json -Depth 5 -Compress
    } catch {
      [PSCustomObject]@{ ok = $false; error = $_.Exception.Message } | ConvertTo-Json -Compress
    } finally {
      if ($props -ne $null -and [Runtime.InteropServices.Marshal]::IsComObject($props)) {
        [void][Runtime.InteropServices.Marshal]::FinalReleaseComObject($props)
      }
      if ($wb -ne $null) { try { $wb.Close($false) | Out-Null } catch {} }
      if ($x -ne $null) { try { $x.Quit() } catch {} }
      if ($wb -ne $null) { [Runtime.InteropServices.Marshal]::ReleaseComObject($wb) | Out-Null }
      if ($x -ne $null) { [Runtime.InteropServices.Marshal]::ReleaseComObject($x) | Out-Null }
      [GC]::Collect()
      [GC]::WaitForPendingFinalizers()
    }
  `;
  try {
    const raw = execFileSync("powershell", ["-NoProfile", "-Command", psScript], { encoding: "utf8", timeout: 60000 });
    return JSON.parse(raw.trim());
  } catch (err) {
    return { ok: false, error: err.message };
  }
}

const finalXlsxPath = path.join(tempDir, "sinfo-final-test.xlsx");
const unfinalXlsxPath = path.join(tempDir, "sinfo-unfinal-test.xlsx");
try { if (fs.existsSync(finalXlsxPath)) fs.unlinkSync(finalXlsxPath); } catch {}
try { if (fs.existsSync(unfinalXlsxPath)) fs.unlinkSync(unfinalXlsxPath); } catch {}

// ========================================================
// PHIÊN 1: Soạn thảo, gán 7 thuộc tính, đánh dấu Final, lưu
// ========================================================
console.log(`\n=== PHIÊN 1: Khởi động VN Sheet (phiên trống) với profile: ${profile} ===`);
const session1 = await launchApp("sheet", {
  localAppData: profile,
  startTimeoutMilliseconds: 180000,
  readyTimeoutMilliseconds: 180000
});

try {
  const { cdp } = session1;
  await cdp.waitFor("!!window.__vnoAppInstance?.adapter && !!document.querySelector('.vno-sheet-container')", {
    timeoutMilliseconds: 120000
  });

  const run1 = async (script) => {
    const expr = `(async () => {
      const adapter = window.__vnoAppInstance.adapter;
      const shell = window.__vnoAppInstance.shell;
      const grid = window.__vnoAppInstance.grid;
      ${script}
    })()`;
    const res = await cdp.evaluate(expr, { awaitPromise: true, timeoutMilliseconds: 60000 });
    return typeof res === "string" ? JSON.parse(res) : res;
  };

  // 1.1 Gán dữ liệu và 7 thuộc tính
  console.log("\n--- PHẦN 1: Thiết lập dữ liệu và 7 thuộc tính sổ làm việc ---");
  const initRes = await run1(`
    grid.setCellValue("A", 1, "Mã hàng");
    grid.setCellValue("B", 1, "Tên hàng");
    grid.setCellValue("C", 1, "Số lượng");
    grid.setCellValue("D", 1, "Đơn giá");
    grid.setCellValue("E", 1, "Thành tiền");
    grid.setCellValue("A", 2, "SP001");
    grid.setCellValue("B", 2, "Máy in laser 3T");
    grid.setCellValue("C", 2, 10);
    grid.setCellValue("D", 2, 2500000);
    grid.setCellValue("E", 2, "=C2*D2");

    adapter.documentProperties = {
      title: "Báo cáo doanh thu quý 4 năm 2026",
      subject: "Kế hoạch tài chính & dự toán",
      creator: "Nguyễn Văn An",
      manager: "Trần Thị Bình",
      company: "Tập đoàn Công nghệ 3T",
      keywords: "doanh thu, lợi nhuận, ngân sách",
      description: "Ghi chú nghiệm thu nội bộ 3T Office\\nPhiên bản chính thức."
    };
    adapter.isDirty = true;
    return JSON.stringify({ ok: true, props: adapter.documentProperties });
  `);
  check("Thiết lập thành công 7 thuộc tính trong adapter", initRes.ok && initRes.props.title === "Báo cáo doanh thu quý 4 năm 2026");

  // 1.2 Kiểm tra giao diện Backstage Info
  console.log("\n--- PHẦN 2: Kiểm tra giao diện Thông tin (Backstage Info) ---");
  const backstageRes = await run1(`
    const testContainer = document.createElement("div");
    testContainer.id = "vno-test-info-panel-container";
    document.body.appendChild(testContainer);
    shell._renderBackstageInfoPanel(testContainer, () => {});

    const titleEl = testContainer.querySelector("#vno-info-prop-title");
    const subjectEl = testContainer.querySelector("#vno-info-prop-subject");
    const authorEl = testContainer.querySelector("#vno-info-prop-author");
    const managerEl = testContainer.querySelector("#vno-info-prop-manager");
    const companyEl = testContainer.querySelector("#vno-info-prop-company");
    const keywordsEl = testContainer.querySelector("#vno-info-prop-keywords");
    const commentsEl = testContainer.querySelector("#vno-info-prop-comments");
    const pagesEl = testContainer.querySelector("#vno-info-prop-pages");

    const data = {
      title: titleEl?.textContent?.trim() || "",
      subject: subjectEl?.textContent?.trim() || "",
      author: authorEl?.textContent?.trim() || "",
      manager: managerEl?.textContent?.trim() || "",
      company: companyEl?.textContent?.trim() || "",
      keywords: keywordsEl?.textContent?.trim() || "",
      comments: commentsEl?.textContent?.trim() || "",
      sheetsCount: pagesEl?.textContent?.trim() || ""
    };
    testContainer.remove();
    return JSON.stringify(data);
  `);
  check("Backstage Info hiển thị đúng Tiêu đề", backstageRes.title === "Báo cáo doanh thu quý 4 năm 2026", backstageRes.title);
  check("Backstage Info hiển thị đúng Chủ đề", backstageRes.subject === "Kế hoạch tài chính & dự toán", backstageRes.subject);
  check("Backstage Info hiển thị đúng Tác giả", backstageRes.author === "Nguyễn Văn An", backstageRes.author);
  check("Backstage Info hiển thị đúng Quản lý", backstageRes.manager === "Trần Thị Bình", backstageRes.manager);
  check("Backstage Info hiển thị đúng Công ty", backstageRes.company === "Tập đoàn Công nghệ 3T", backstageRes.company);
  check("Backstage Info hiển thị đúng Thẻ (Keywords)", backstageRes.keywords === "doanh thu, lợi nhuận, ngân sách", backstageRes.keywords);
  check("Backstage Info hiển thị đúng Ghi chú (Comments)", backstageRes.comments.includes("Ghi chú nghiệm thu"), backstageRes.comments);
  check("Backstage Info hiển thị đúng Số trang tính", Number(backstageRes.sheetsCount) >= 1, backstageRes.sheetsCount);

  // 1.3 Bật Đánh dấu là cuối cùng
  console.log("\n--- PHẦN 3: Bật Đánh dấu là cuối cùng (Mark as Final) ---");
  const markRes = await run1(`
    adapter.markAsFinal(true);
    const isFinal = adapter.isFinal;
    const contentStatus = adapter.documentProperties?.contentStatus;
    const banner = document.querySelector(".vno-notification-bar");
    const bannerText = banner ? banner.textContent : "";
    const hasActionBtn = banner ? !!banner.querySelector(".vno-notification-bar-action-btn") : false;
    const formulaReadOnly = !!grid.formulaInput?.readOnly;
    const editBlocked = grid.setCellValue("A", 3, "Dữ liệu cấm sửa", true) === false;

    return JSON.stringify({
      isFinal,
      contentStatus,
      hasBanner: !!banner,
      bannerText,
      hasActionBtn,
      formulaReadOnly,
      editBlocked
    });
  `);
  check("Đánh dấu là cuối cùng: Trạng thái isFinal = true", markRes.isFinal === true);
  check("Đánh dấu là cuối cùng: Ghi contentStatus = 'Final'", markRes.contentStatus === "Final");
  check("Đánh dấu là cuối cùng: Hiển thị thanh thông báo và nút 'Vẫn chỉnh sửa'", markRes.hasBanner && markRes.hasActionBtn, markRes.bannerText.slice(0, 80));
  check("Đánh dấu là cuối cùng: Thanh công thức ở chế độ readOnly", markRes.formulaReadOnly === true);
  check("Đánh dấu là cuối cùng: Chặn thao tác sửa ô trên lưới", markRes.editBlocked === true);

  // 1.4 Lưu ra XLSX chuẩn
  console.log("\n--- PHẦN 4: Lưu XLSX và kiểm tra bằng Excel 2016 COM thật ---");
  await run1(`
    const target = ${JSON.stringify(finalXlsxPath)};
    await window.globalUnoBridge.saveRealFileInPlace("sheet", adapter.serializeToFods(), target);
    return JSON.stringify({ saved: true });
  `);

} finally {
  console.log("\nĐóng phiên 1...");
  await session1.close();
}

// 1.5 Kiểm tra Excel COM
const excelFinalCheck = verifyWithExcelCom(finalXlsxPath);
console.log("Excel COM Final Check Result:", JSON.stringify(excelFinalCheck));
check("Excel COM mở thành công tệp XLSX đã lưu", excelFinalCheck.ok === true, excelFinalCheck.error || "");
check("Excel COM nhận diện Workbook.Final === True", excelFinalCheck.ok && excelFinalCheck.Final === true, String(excelFinalCheck.Final));
check("Excel COM đọc đúng Tiêu đề (Title)", excelFinalCheck.Title === "Báo cáo doanh thu quý 4 năm 2026", excelFinalCheck.Title);
check("Excel COM đọc đúng Chủ đề (Subject)", excelFinalCheck.Subject === "Kế hoạch tài chính & dự toán", excelFinalCheck.Subject);
check("Excel COM đọc đúng Tác giả (Author)", excelFinalCheck.Author === "Nguyễn Văn An", excelFinalCheck.Author);
check("Excel COM đọc đúng Quản lý (Manager)", excelFinalCheck.Manager === "Trần Thị Bình", excelFinalCheck.Manager);
check("Excel COM đọc đúng Công ty (Company)", excelFinalCheck.Company === "Tập đoàn Công nghệ 3T", excelFinalCheck.Company);
check("Excel COM đọc đúng Thẻ (Keywords)", excelFinalCheck.Keywords === "doanh thu, lợi nhuận, ngân sách", excelFinalCheck.Keywords);
check("Excel COM đọc đúng Ghi chú (Comments)", Boolean(excelFinalCheck.Comments && excelFinalCheck.Comments.includes("Ghi chú nghiệm thu")), excelFinalCheck.Comments);

// ========================================================
// PHIÊN 2: Khởi động app mở lại tệp Final từ đĩa (reopen)
// ========================================================
console.log(`\n=== PHIÊN 2: Khởi động VN Sheet mở lại tệp ${finalXlsxPath} ===`);
const session2 = await launchApp("sheet", {
  filePath: finalXlsxPath,
  localAppData: profile,
  startTimeoutMilliseconds: 180000,
  readyTimeoutMilliseconds: 180000
});

try {
  const { cdp } = session2;
  const expectedPath = finalXlsxPath.replace(/\\/g, "/").toLowerCase();
  await cdp.waitFor(
    `String(window.__vnoAppInstance?.adapter?._sourcePath || window.__vnoAppInstance?.adapter?.sourceFilePath || "").replace(/\\\\/g, "/").toLowerCase() === ${JSON.stringify(expectedPath)} && !!window.__vnoAppInstance?.grid?.sheets?.length`,
    { timeoutMilliseconds: 120000 }
  );

  const run2 = async (script) => {
    const expr = `(async () => {
      const adapter = window.__vnoAppInstance.adapter;
      const shell = window.__vnoAppInstance.shell;
      const grid = window.__vnoAppInstance.grid;
      ${script}
    })()`;
    const res = await cdp.evaluate(expr, { awaitPromise: true, timeoutMilliseconds: 60000 });
    return typeof res === "string" ? JSON.parse(res) : res;
  };

  // 2.1 Kiểm tra trạng thái khi mở lại
  console.log("\n--- PHẦN 5: Kiểm tra trạng thái tệp khi mở lại trong VN Sheet ---");
  const reopenCheck = await run2(`
    const banner = document.querySelector(".vno-notification-bar");
    const bannerText = banner ? banner.textContent : "";
    const hasActionBtn = banner ? !!banner.querySelector(".vno-notification-bar-action-btn") : false;
    const formulaReadOnly = !!grid.formulaInput?.readOnly;
    const isFinal = adapter.isFinal;
    const props = adapter.documentProperties;
    const editBlocked = grid.setCellValue("A", 4, "Sửa khi mở lại", true) === false;

    return JSON.stringify({
      isFinal,
      hasBanner: !!banner,
      bannerText,
      hasActionBtn,
      formulaReadOnly,
      editBlocked,
      title: props?.title || "",
      subject: props?.subject || "",
      author: props?.creator || "",
      manager: props?.manager || "",
      company: props?.company || "",
      keywords: props?.keywords || "",
      comments: props?.description || ""
    });
  `);
  check("Tệp mở lại tự nhận diện isFinal = true", reopenCheck.isFinal === true);
  check("Tệp mở lại tự hiển thị thanh thông báo Final với nút Vẫn chỉnh sửa", reopenCheck.hasBanner && reopenCheck.hasActionBtn, reopenCheck.bannerText.slice(0, 80));
  check("Tệp mở lại giữ nguyên chế độ chỉ đọc mềm trên thanh công thức", reopenCheck.formulaReadOnly === true);
  check("Tệp mở lại chặn sửa dữ liệu ô", reopenCheck.editBlocked === true);
  check("Tệp mở lại nạp đúng Tiêu đề", reopenCheck.title === "Báo cáo doanh thu quý 4 năm 2026", reopenCheck.title);
  check("Tệp mở lại nạp đúng Chủ đề", reopenCheck.subject === "Kế hoạch tài chính & dự toán", reopenCheck.subject);
  check("Tệp mở lại nạp đúng Tác giả", reopenCheck.author === "Nguyễn Văn An", reopenCheck.author);
  check("Tệp mở lại nạp đúng Quản lý", reopenCheck.manager === "Trần Thị Bình", reopenCheck.manager);
  check("Tệp mở lại nạp đúng Công ty", reopenCheck.company === "Tập đoàn Công nghệ 3T", reopenCheck.company);
  check("Tệp mở lại nạp đúng Thẻ", reopenCheck.keywords === "doanh thu, lợi nhuận, ngân sách", reopenCheck.keywords);
  check("Tệp mở lại nạp đúng Ghi chú", reopenCheck.comments.includes("Ghi chú nghiệm thu"), reopenCheck.comments);

  // 2.2 Gỡ đánh dấu cuối cùng (unmarkFinal)
  console.log("\n--- PHẦN 6: Gỡ đánh dấu cuối cùng (Vẫn chỉnh sửa) ---");
  const unmarkRes = await run2(`
    adapter.unmarkFinal();
    const isFinal = adapter.isFinal;
    const banner = document.querySelector(".vno-notification-bar");
    const formulaReadOnly = !!grid.formulaInput?.readOnly;
    const contentStatus = adapter.documentProperties?.contentStatus;

    return JSON.stringify({
      isFinal,
      hasBanner: !!banner,
      formulaReadOnly,
      contentStatus
    });
  `);
  check("Gỡ đánh dấu: isFinal = false", unmarkRes.isFinal === false);
  check("Gỡ đánh dấu: Thanh thông báo được xóa", unmarkRes.hasBanner === false);
  check("Gỡ đánh dấu: Thanh công thức mở khóa readOnly = false", unmarkRes.formulaReadOnly === false);
  check("Gỡ đánh dấu: contentStatus rỗng", !unmarkRes.contentStatus);

  // 2.3 Lưu lại tệp sau khi gỡ Final
  console.log("\n--- PHẦN 7: Lưu lại tệp sau khi gỡ Final và đối chiếu Excel COM ---");
  await run2(`
    const target = ${JSON.stringify(unfinalXlsxPath)};
    await window.globalUnoBridge.saveRealFileInPlace("sheet", adapter.serializeToFods(), target);
    return JSON.stringify({ saved: true });
  `);

} finally {
  console.log("\nĐóng phiên 2...");
  await session2.close();
}

// 2.4 Kiểm tra Excel COM sau khi gỡ Final
const excelUnfinalCheck = verifyWithExcelCom(unfinalXlsxPath);
console.log("Excel COM Unfinal Check Result:", JSON.stringify(excelUnfinalCheck));
check("Excel COM nhận diện tệp đã gỡ Final (Workbook.Final === False)", excelUnfinalCheck.ok && excelUnfinalCheck.Final === false, String(excelUnfinalCheck.Final));
check("Excel COM xác nhận các thuộc tính vẫn được bảo toàn sau khi gỡ Final", excelUnfinalCheck.Title === "Báo cáo doanh thu quý 4 năm 2026" && excelUnfinalCheck.Company === "Tập đoàn Công nghệ 3T");

console.log("\n==========================================");
const passedCount = results.filter(r => r.pass).length;
console.log(`KẾT QUẢ AUDIT SHEET-INFO: ${passedCount}/${results.length} PASS`);
console.log("==========================================");

if (passedCount < results.length) {
  process.exit(1);
} else {
  process.exit(0);
}
