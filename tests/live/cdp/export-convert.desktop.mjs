// Test CDP: Mục XUẤT VÀ CHUYỂN ĐỔI FILE trong Backstage (menu Tệp) trên app Desktop
// Cho cả 3 ứng dụng: Writer, Sheet, Slides (Shared Platform)

import { launchApp } from "./session.mjs";
import { sleep } from "./client.mjs";

const results = [];
const check = (name, ok, detail = "") => {
  results.push({ name, ok: Boolean(ok), detail });
  console.log(`${ok ? "PASS" : "FAIL"} | ${name}${detail ? " | " + detail : ""}`);
};

const localAppData = process.env.VNO_CDP_LOCALAPPDATA || "E:\\VNOffice-profiles\\agy-export\\localappdata";

async function testAppExport(appKind, expectedFormats) {
  console.log(`\n=== BẮT ĐẦU KIỂM THỬ CDP: ${appKind.toUpperCase()} ===`);
  const session = await launchApp(appKind, { localAppData });
  const { cdp } = session;

  try {
    await sleep(2500);

    // 1. Mở Backstage qua lệnh common.file.backstage
    await cdp.evaluate(`import('/platform/commands/command-bus.js').then(m => m.globalCommandBus.execute('common.file.backstage'))`);
    await sleep(800);

    const isBackstageOpen = await cdp.evaluate(`(() => {
      const modal = document.querySelector('.vno-backstage-overlay');
      return Boolean(modal && modal.isConnected);
    })()`);
    check(`[${appKind}] Mở menu Tệp (Backstage) thành công`, isBackstageOpen);

    // 2. Kiểm tra sự hiện diện của nút "Xuất & Chuyển đổi" trong danh mục bên trái
    const navExportBtn = await cdp.evaluate(`(() => {
      const btn = document.querySelector('#vno-backstage-nav-export');
      if (!btn) return null;
      return {
        text: btn.textContent.trim(),
        hasId: btn.id === 'vno-backstage-nav-export'
      };
    })()`);
    check(
      `[${appKind}] Nút điều hướng 'Xuất & Chuyển đổi' (#vno-backstage-nav-export) hiển thị`,
      Boolean(navExportBtn && navExportBtn.text.length > 0),
      navExportBtn ? `nhãn: "${navExportBtn.text}"` : "không tìm thấy nút"
    );

    // 3. Nhấp vào nút "Xuất & Chuyển đổi"
    await cdp.evaluate(`(() => {
      const btn = document.querySelector('#vno-backstage-nav-export');
      if (btn) btn.click();
    })()`);
    await sleep(600);

    // 4. Kiểm tra xem View Xuất & Chuyển đổi có hiển thị và có khung Tùy chọn Tương thích Office
    const exportViewStatus = await cdp.evaluate(`(() => {
      const view = document.querySelector('#vno-backstage-export-view');
      const isVisible = Boolean(view && view.style.display !== 'none' && view.offsetHeight > 0);
      const checkbox = document.querySelector('#vno-export-compat-checkbox');
      const isCheckboxChecked = Boolean(checkbox && checkbox.checked);
      const titleEl = document.querySelector('.vno-export-title');
      const title = titleEl ? titleEl.textContent.trim() : '';

      return {
        isVisible,
        hasTitle: title.length > 0,
        title,
        hasCheckbox: Boolean(checkbox),
        isCheckboxChecked
      };
    })()`);

    check(
      `[${appKind}] Giao diện #vno-backstage-export-view mở ra với tiêu đề hợp lệ`,
      Boolean(exportViewStatus && exportViewStatus.isVisible && exportViewStatus.hasTitle),
      exportViewStatus ? `tiêu đề: "${exportViewStatus.title}"` : "không hiển thị"
    );

    check(
      `[${appKind}] Khung Tùy chọn có tick 'Tương thích Office' mặc định BẬT`,
      Boolean(exportViewStatus && exportViewStatus.hasCheckbox && exportViewStatus.isCheckboxChecked),
      exportViewStatus ? `checkbox tồn tại: ${exportViewStatus.hasCheckbox}, checked: ${exportViewStatus.isCheckboxChecked}` : ""
    );

    // 5. Kiểm tra nhóm Xuất PDF
    const pdfCardStatus = await cdp.evaluate(`(() => {
      const card = document.querySelector('#vno-export-card-pdf');
      if (!card) return null;
      const title = card.querySelector('.vno-export-card-title')?.textContent?.trim() || '';
      const desc = card.querySelector('.vno-export-card-desc')?.textContent?.trim() || '';
      const badge = card.querySelector('.vno-export-card-badge')?.textContent?.trim() || '';
      return {
        hasCard: true,
        title,
        desc,
        badge,
        tabIndex: card.getAttribute('tabindex'),
        role: card.getAttribute('role')
      };
    })()`);

    check(
      `[${appKind}] Nhóm Xuất PDF: thẻ #vno-export-card-pdf hiển thị chuẩn với mô tả và badge`,
      Boolean(pdfCardStatus && pdfCardStatus.badge === 'PDF' && pdfCardStatus.desc.length > 10 && pdfCardStatus.role === 'button'),
      pdfCardStatus ? `badge: ${pdfCardStatus.badge}, mô tả: "${pdfCardStatus.desc.slice(0, 35)}..."` : "không tìm thấy"
    );

    // 6. Kiểm tra các định dạng chuyển đổi theo app
    const formatCards = await cdp.evaluate(`(() => {
      const cards = Array.from(document.querySelectorAll('.vno-export-section:last-child .vno-export-card'));
      return cards.map(c => ({
        format: c.getAttribute('data-export-format'),
        title: c.querySelector('.vno-export-card-title')?.textContent?.trim() || '',
        desc: c.querySelector('.vno-export-card-desc')?.textContent?.trim() || '',
        badge: c.querySelector('.vno-export-card-badge')?.textContent?.trim() || '',
        isKeyboardFocusable: c.getAttribute('tabindex') === '0'
      }));
    })()`);

    const formatsFound = formatCards ? formatCards.map(c => c.format) : [];
    const hasAllFormats = expectedFormats.every(f => formatsFound.includes(f));
    const allHaveDescs = Boolean(formatCards && formatCards.length > 0 && formatCards.every(c => c.desc.length > 10 && c.badge.length > 0 && c.isKeyboardFocusable));

    check(
      `[${appKind}] Nhóm Chuyển đổi định dạng: có đủ các định dạng [${expectedFormats.join(", ")}] với mô tả tiếng Việt và badge`,
      Boolean(hasAllFormats && allHaveDescs),
      `tìm thấy: [${formatsFound.join(", ")}], toàn bộ có mô tả và phím điều hướng: ${allHaveDescs}`
    );

    // 7. Đóng Backstage
    await cdp.evaluate(`(() => {
      const backBtn = document.querySelector('#vno-backstage-back');
      if (backBtn) backBtn.click();
    })()`);
    await sleep(500);

    // 8. Kiểm tra gọi trực tiếp lệnh common.file.exportConvert
    await cdp.evaluate(`import('/platform/commands/command-bus.js').then(m => m.globalCommandBus.execute('common.file.exportConvert'))`);
    await sleep(600);

    const isDirectExportOpen = await cdp.evaluate(`(() => {
      const view = document.querySelector('#vno-backstage-export-view');
      const navBtn = document.querySelector('#vno-backstage-nav-export');
      const isVisible = Boolean(view && view.style.display !== 'none' && view.offsetHeight > 0);
      const isActive = Boolean(navBtn && navBtn.classList.contains('is-active'));
      return isVisible && isActive;
    })()`);

    check(
      `[${appKind}] Lệnh common.file.exportConvert mở thẳng vào mục Xuất và chuyển đổi trong Backstage`,
      isDirectExportOpen
    );

    // Đóng Backstage sau khi kiểm tra xong
    await cdp.evaluate(`(() => {
      const backBtn = document.querySelector('#vno-backstage-back');
      if (backBtn) backBtn.click();
    })()`);
    await sleep(300);

  } catch (err) {
    check(`[${appKind}] CDP Test gặp lỗi ngoại lệ`, false, err.stack || err.message);
  } finally {
    try {
      await session.close();
    } catch {}
  }
}

// Chạy lần lượt cho cả 3 ứng dụng
try {
  await testAppExport("writer", ["docx", "doc", "odt", "rtf", "txt"]);
  await testAppExport("sheet", ["xlsx", "xls", "ods", "csv"]);
  await testAppExport("slides", ["pptx", "ppt", "odp"]);
} catch (e) {
  console.error("Lỗi thực thi tổng thể:", e);
}

const failed = results.filter(r => !r.ok);
console.log(`\n==================================================`);
if (results.length === 0 || failed.length > 0) {
  console.error(`TỔNG KẾT: Có ${failed.length} câu kiểm tra CDP thất bại (tổng số test: ${results.length}).`);
  process.exit(1);
} else {
  console.log(`TỔNG KẾT: Toàn bộ kiểm thử CDP XANH 100% (${results.length}/${results.length} PASS).`);
  process.exit(0);
}
