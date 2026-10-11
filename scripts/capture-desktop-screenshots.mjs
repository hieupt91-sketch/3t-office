import { launchApp } from "../tests/live/cdp/session.mjs";
import { click, press, typeText } from "../tests/live/cdp/actions.mjs";
import { sleep } from "../tests/live/cdp/client.mjs";
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const screenshotsDir = path.resolve(__dirname, "../server/3t-web/assets/screenshots");

async function captureWriter() {
  console.log("=== Đang chụp ảnh màn hình 3T Doc (Writer) ===");
  const session = await launchApp("writer", { startTimeoutMilliseconds: 60000 });
  try {
    const { cdp } = session;
    await sleep(2000);
    // Nhấp vào vùng soạn thảo
    await click(cdp, ".vno-writer-body p");
    await sleep(300);
    await typeText(cdp, "KẾ HOẠCH PHÁT TRIỂN 3T OFFICE 2026");
    await press(cdp, "Enter");
    await sleep(300);
    await typeText(cdp, "3T Office là bộ ứng dụng văn phòng đa nền tảng, hoạt động ngoại tuyến và tương thích hoàn toàn với các định dạng .docx, .xlsx, .pptx.");
    await press(cdp, "Enter");
    await sleep(300);
    await typeText(cdp, "Hệ thống đáp ứng tiêu chuẩn văn bản hành chính Việt Nam, hỗ trợ kiểm tra chính tả tiếng Việt và cập nhật một chạm an toàn.");
    await sleep(2000);

    // Chụp WebP và PNG
    const webpRes = await cdp.send("Page.captureScreenshot", { format: "webp", quality: 82 });
    const pngRes = await cdp.send("Page.captureScreenshot", { format: "png" });

    const webpData = webpRes.result?.data || webpRes.data;
    const pngData = pngRes.result?.data || pngRes.data;
    if (!pngData) throw new Error("Không nhận được dữ liệu ảnh từ CDP: " + JSON.stringify(pngRes));

    const webpBuf = Buffer.from(webpData, "base64");
    const pngBuf = Buffer.from(pngData, "base64");

    await writeFile(path.join(screenshotsDir, "doc-preview.webp"), webpBuf);
    await writeFile(path.join(screenshotsDir, "doc-preview.png"), pngBuf);
    console.log(`  -> Đã lưu doc-preview.webp (${webpBuf.length} bytes), doc-preview.png (${pngBuf.length} bytes)`);
  } finally {
    await session.close();
  }
}

async function captureSheet() {
  console.log("=== Đang chụp ảnh màn hình 3T Sheet ===");
  const session = await launchApp("sheet", { startTimeoutMilliseconds: 60000 });
  try {
    const { cdp } = session;
    await sleep(2000);
    // Điền tiêu đề và bảng số liệu
    await click(cdp, '[data-coord="A1"]');
    await sleep(200);
    await typeText(cdp, "BÁO CÁO DOANH THU & LỢI NHUẬN");
    await press(cdp, "Enter");

    // Tiêu đề cột
    await click(cdp, '[data-coord="A2"]');
    await typeText(cdp, "Tháng");
    await press(cdp, "Tab");
    await typeText(cdp, "Doanh thu");
    await press(cdp, "Tab");
    await typeText(cdp, "Chi phí");
    await press(cdp, "Tab");
    await typeText(cdp, "Lợi nhuận");
    await press(cdp, "Enter");

    // Dòng 1
    await click(cdp, '[data-coord="A3"]');
    await typeText(cdp, "Tháng 01");
    await press(cdp, "Tab");
    await typeText(cdp, "150000000");
    await press(cdp, "Tab");
    await typeText(cdp, "90000000");
    await press(cdp, "Tab");
    await typeText(cdp, "=B3-C3");
    await press(cdp, "Enter");

    // Dòng 2
    await click(cdp, '[data-coord="A4"]');
    await typeText(cdp, "Tháng 02");
    await press(cdp, "Tab");
    await typeText(cdp, "185000000");
    await press(cdp, "Tab");
    await typeText(cdp, "105000000");
    await press(cdp, "Tab");
    await typeText(cdp, "=B4-C4");
    await press(cdp, "Enter");

    // Dòng 3
    await click(cdp, '[data-coord="A5"]');
    await typeText(cdp, "Tháng 03");
    await press(cdp, "Tab");
    await typeText(cdp, "210000000");
    await press(cdp, "Tab");
    await typeText(cdp, "115000000");
    await press(cdp, "Tab");
    await typeText(cdp, "=B5-C5");
    await press(cdp, "Enter");

    // Chọn lại A2 để hiển thị đẹp
    await click(cdp, '[data-coord="A2"]');
    await sleep(2000);

    const webpRes = await cdp.send("Page.captureScreenshot", { format: "webp", quality: 82 });
    const pngRes = await cdp.send("Page.captureScreenshot", { format: "png" });

    const webpData = webpRes.result?.data || webpRes.data;
    const pngData = pngRes.result?.data || pngRes.data;
    if (!pngData) throw new Error("Không nhận được dữ liệu ảnh từ CDP: " + JSON.stringify(pngRes));

    const webpBuf = Buffer.from(webpData, "base64");
    const pngBuf = Buffer.from(pngData, "base64");

    await writeFile(path.join(screenshotsDir, "sheet-preview.webp"), webpBuf);
    await writeFile(path.join(screenshotsDir, "sheet-preview.png"), pngBuf);
    console.log(`  -> Đã lưu sheet-preview.webp (${webpBuf.length} bytes), sheet-preview.png (${pngBuf.length} bytes)`);
  } finally {
    await session.close();
  }
}

async function captureSlides() {
  console.log("=== Đang chụp ảnh màn hình 3T Slide ===");
  const session = await launchApp("slides", { startTimeoutMilliseconds: 60000 });
  try {
    const { cdp } = session;
    await sleep(2000);

    // Tìm selector tiêu đề hoặc canvas
    const titleSelector = await cdp.evaluate(
      "document.querySelector('.vno-slide-title') ? '.vno-slide-title' : document.querySelector('[data-role=\"title\"]') ? '[data-role=\"title\"]' : ''"
    );

    if (titleSelector) {
      await click(cdp, titleSelector);
      await sleep(200);
      await typeText(cdp, "3T Slide — Trình Chiếu Chuyên Nghiệp");
    }

    const bodySelector = await cdp.evaluate(
      "document.querySelector('.vno-slide-body') ? '.vno-slide-body' : document.querySelector('[data-role=\"body\"]') ? '[data-role=\"body\"]' : ''"
    );

    if (bodySelector) {
      await click(cdp, bodySelector);
      await sleep(200);
      await typeText(cdp, "Bộ ứng dụng văn phòng Việt chạy ngoại tuyến, tương thích hoàn hảo định dạng .pptx");
      await press(cdp, "Enter");
      await typeText(cdp, "Hỗ trợ Slide Master, hiệu ứng chuyển trang mượt mà và chế độ Presenter 2 màn hình");
    }

    await sleep(2000);

    const webpRes = await cdp.send("Page.captureScreenshot", { format: "webp", quality: 82 });
    const pngRes = await cdp.send("Page.captureScreenshot", { format: "png" });

    const webpData = webpRes.result?.data || webpRes.data;
    const pngData = pngRes.result?.data || pngRes.data;
    if (!pngData) throw new Error("Không nhận được dữ liệu ảnh từ CDP: " + JSON.stringify(pngRes));

    const webpBuf = Buffer.from(webpData, "base64");
    const pngBuf = Buffer.from(pngData, "base64");

    await writeFile(path.join(screenshotsDir, "slide-preview.webp"), webpBuf);
    await writeFile(path.join(screenshotsDir, "slide-preview.png"), pngBuf);
    console.log(`  -> Đã lưu slide-preview.webp (${webpBuf.length} bytes), slide-preview.png (${pngBuf.length} bytes)`);
  } finally {
    await session.close();
  }
}

async function run() {
  const targetApp = process.argv[2];
  try {
    if (!targetApp || targetApp === "writer") await captureWriter();
    if (!targetApp || targetApp === "sheet") await captureSheet();
    if (!targetApp || targetApp === "slides") await captureSlides();
    console.log("=== Hoàn tất chụp ảnh ===");
  } catch (err) {
    console.error("Lỗi khi chụp ảnh màn hình:", err);
    process.exit(1);
  }
}

run();
