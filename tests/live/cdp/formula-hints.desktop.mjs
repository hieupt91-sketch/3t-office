// Sheet: Formula Autocomplete, Vietnamese IntelliSense & Composing Visual Test over CDP
// Chạy trên ứng dụng Desktop thật qua CDP, không dùng OS SendKeys hay PyAutoGUI.
import path from "node:path";
import fs from "node:fs/promises";
import { launchApp, repoRoot } from "./session.mjs";
import { click, press, typeText } from "./actions.mjs";
import { sleep } from "./client.mjs";

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok: Boolean(ok) });
  console.log(`${ok ? "PASS" : "FAIL"} | ${name}${detail ? " | " + detail : ""}`);
};

const SCREEN_DIR = path.join(repoRoot, "docs", "screens-formula");
await fs.mkdir(SCREEN_DIR, { recursive: true });

async function takeScreenshot(cdp, filename) {
  try {
    const res = await cdp.send("Page.captureScreenshot", { format: "png" });
    const base64Data = res.result?.data || res.data;
    if (base64Data) {
      await fs.writeFile(path.join(SCREEN_DIR, filename), Buffer.from(base64Data, "base64"));
    }
  } catch (err) {
    console.error(`Lỗi chụp ảnh ${filename}:`, err.message);
  }
}

const LOCALAPPDATA_DIR = "E:\\VNOffice-profiles\\agy-formula";
const session = await launchApp("sheet", {
  localAppData: LOCALAPPDATA_DIR,
  readyTimeoutMilliseconds: 60000
});
const { cdp } = session;

try {
  await sleep(3000);

  // ========================================================
  // Bước 1: Chọn ô C3 và gõ =SU để kiểm tra Autocomplete Popup
  // ========================================================
  await click(cdp, '[data-coord="C3"]');
  await sleep(300);

  await typeText(cdp, "=SU", 100);
  await sleep(600);

  const cellC3State = await cdp.evaluate(`(() => {
    const td = document.querySelector('[data-coord="C3"]');
    const input = document.getElementById('vno-cell-input');
    const popup = document.querySelector('.vno-autocomplete-popup');
    const activeItem = popup?.querySelector('.vno-ac-item.active, .vno-autocomplete-item.is-active');
    const syntaxCode = activeItem?.querySelector('.vno-ac-syntax')?.textContent || '';
    const descText = activeItem?.querySelector('.vno-ac-desc-text')?.textContent || '';
    return {
      tdText: td ? td.textContent.trim() : '',
      inputValue: input ? input.value : '',
      popupVisible: popup ? window.getComputedStyle(popup).display !== 'none' : false,
      popupItemCount: popup ? popup.querySelectorAll('.vno-ac-item, .vno-autocomplete-item').length : 0,
      activeSyntax: syntaxCode,
      activeDesc: descText
    };
  })()`);

  check(
    "Ô C3 đang soạn: Không hiển thị #VALUE! hay #NAME?, hiển thị đúng chuỗi =SU",
    cellC3State.tdText === "=SU" && !cellC3State.tdText.includes("#VALUE!") && !cellC3State.tdText.includes("#NAME?"),
    `tdText="${cellC3State.tdText}", input="${cellC3State.inputValue}"`
  );

  check(
    "Popup gợi ý: Tự động hiển thị và chứa danh sách hàm khớp tiền tố =SU",
    cellC3State.popupVisible && cellC3State.popupItemCount > 0,
    `visible=${cellC3State.popupVisible}, count=${cellC3State.popupItemCount}`
  );

  check(
    "Popup gợi ý: Hiển thị cú pháp rút gọn và mô tả tiếng Việt",
    cellC3State.activeSyntax.length > 0 && cellC3State.activeDesc.length > 0,
    `syntax="${cellC3State.activeSyntax}", desc="${cellC3State.activeDesc}"`
  );

  await takeScreenshot(cdp, "01-autocomplete-su.png");

  // ========================================================
  // Bước 2: Đóng popup bằng Esc, xóa ô C3 để chuẩn bị kiểm tra VLOOKUP
  // ========================================================
  await press(cdp, "Escape");
  await sleep(300);
  await press(cdp, "Escape");
  await sleep(300);

  // Click lại vào C3
  await click(cdp, '[data-coord="C3"]');
  await sleep(200);

  // ========================================================
  // Bước 3: Gõ =VLOOKUP( để kiểm tra đối số 1 (giá_trị_tìm)
  // ========================================================
  await typeText(cdp, "=VLOOKUP(", 80);
  await sleep(600);

  const vlookupStep1 = await cdp.evaluate(`(() => {
    const td = document.querySelector('[data-coord="C3"]');
    const tooltip = document.querySelector('.vno-syntax-tooltip');
    const activeStrong = tooltip?.querySelector('.vno-syntax-param-active')?.textContent || '';
    const descEl = tooltip?.querySelector('.vno-syntax-param-desc')?.textContent || '';
    const exampleEl = tooltip?.querySelector('.vno-syntax-example')?.textContent || '';
    return {
      tdText: td ? td.textContent.trim() : '',
      tooltipVisible: tooltip ? window.getComputedStyle(tooltip).display !== 'none' : false,
      activeParam: activeStrong,
      paramDesc: descEl,
      example: exampleEl
    };
  })()`);

  check(
    "Ô C3 đang gõ =VLOOKUP(: Giữ nguyên chuỗi, không lỗi #VALUE!",
    vlookupStep1.tdText === "=VLOOKUP(" && !vlookupStep1.tdText.includes("#VALUE!"),
    `tdText="${vlookupStep1.tdText}"`
  );

  check(
    "Tooltip cú pháp: Hiển thị và tô đậm đối số 1 (giá_trị_tìm hoặc lookup_value)",
    vlookupStep1.tooltipVisible && (vlookupStep1.activeParam.includes("giá_trị_tìm") || vlookupStep1.activeParam.includes("lookup_value")),
    `activeParam="${vlookupStep1.activeParam}"`
  );

  check(
    "Tooltip cú pháp: Có dòng mô tả tiếng Việt cho đối số đang nhập",
    vlookupStep1.paramDesc.length > 5,
    `paramDesc="${vlookupStep1.paramDesc}"`
  );

  check(
    "Tooltip cú pháp: Có dòng ví dụ thực tế chữ mờ",
    vlookupStep1.example.includes("VLOOKUP"),
    `example="${vlookupStep1.example}"`
  );

  await takeScreenshot(cdp, "02-syntax-param1-lookup-value.png");

  // ========================================================
  // Bước 4: Gõ tiếp A2, để chuyển sang đối số 2 (bảng_dữ_liệu)
  // ========================================================
  await typeText(cdp, "A2, ", 80);
  await sleep(600);

  const vlookupStep2 = await cdp.evaluate(`(() => {
    const td = document.querySelector('[data-coord="C3"]');
    const tooltip = document.querySelector('.vno-syntax-tooltip');
    const activeStrong = tooltip?.querySelector('.vno-syntax-param-active')?.textContent || '';
    const descEl = tooltip?.querySelector('.vno-syntax-param-desc')?.textContent || '';
    return {
      tdText: td ? td.textContent.trim() : '',
      activeParam: activeStrong,
      paramDesc: descEl
    };
  })()`);

  check(
    "Gõ dấu phẩy: Tooltip tự động chuyển vùng tô đậm sang đối số 2 (bảng_dữ_liệu)",
    vlookupStep2.activeParam.includes("bảng_dữ_liệu") || vlookupStep2.activeParam.includes("table_array"),
    `activeParam="${vlookupStep2.activeParam}", desc="${vlookupStep2.paramDesc}"`
  );

  await takeScreenshot(cdp, "03-syntax-param2-table-array.png");

  // ========================================================
  // Bước 5: Gõ tiếp B1:C10, 2, để chuyển sang đối số 4 ([tìm_gần_đúng])
  // ========================================================
  await typeText(cdp, "B1:C10, 2, ", 80);
  await sleep(600);

  const vlookupStep4 = await cdp.evaluate(`(() => {
    const td = document.querySelector('[data-coord="C3"]');
    const tooltip = document.querySelector('.vno-syntax-tooltip');
    const activeStrong = tooltip?.querySelector('.vno-syntax-param-active')?.textContent || '';
    const descEl = tooltip?.querySelector('.vno-syntax-param-desc')?.textContent || '';
    return {
      tdText: td ? td.textContent.trim() : '',
      activeParam: activeStrong,
      paramDesc: descEl
    };
  })()`);

  check(
    "Chuyển tiếp đối số: Tooltip tô đậm đối số 4 ([tìm_gần_đúng])",
    vlookupStep4.activeParam.includes("tìm_gần_đúng") || vlookupStep4.activeParam.includes("range_lookup"),
    `activeParam="${vlookupStep4.activeParam}", desc="${vlookupStep4.paramDesc}"`
  );

  await takeScreenshot(cdp, "04-syntax-param4-range-lookup.png");

  // ========================================================
  // Bước 6: Nhập FALSE) và Enter để hoàn tất công thức
  // ========================================================
  await typeText(cdp, "FALSE)", 80);
  await sleep(400);
  await press(cdp, "Enter");
  await sleep(600);

  const finalState = await cdp.evaluate(`(() => {
    const td = document.querySelector('[data-coord="C3"]');
    const tooltip = document.querySelector('.vno-syntax-tooltip');
    const popup = document.querySelector('.vno-autocomplete-popup');
    return {
      tdText: td ? td.textContent.trim() : '',
      tooltipHidden: !tooltip || window.getComputedStyle(tooltip).display === 'none',
      popupHidden: !popup || window.getComputedStyle(popup).display === 'none'
    };
  })()`);

  check(
    "Sau khi nhấn Enter: Tooltip và popup tự động đóng",
    finalState.tooltipHidden && finalState.popupHidden,
    `tooltipHidden=${finalState.tooltipHidden}, popupHidden=${finalState.popupHidden}`
  );

  await takeScreenshot(cdp, "05-formula-committed.png");

} catch (err) {
  console.error("Lỗi trong quá trình chạy bài kiểm tra CDP:", err);
  check("Thực thi bài kiểm tra CDP formula hints", false, err.message);
} finally {
  await session.close();
}

const failed = results.filter(r => !r.ok).length;
console.log(`\n==================================================`);
console.log(`KẾT QUẢ GỢI Ý VÀ CÚ PHÁP CÔNG THỨC SHEET: ${results.length - failed}/${results.length} PASS | ${failed} FAIL`);
console.log(`==================================================`);
process.exitCode = failed ? 1 : 0;
