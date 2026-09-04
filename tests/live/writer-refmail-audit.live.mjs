import { pathToFileURL } from "node:url";
import path from "node:path";
import { spawn } from "node:child_process";

const playwrightRoot = "C:/Users/3T Computer/AppData/Local/Temp/vno-ui-audit-playwright";
const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));

// 1. Khởi động python http.server ở cổng 8766
const serverProcess = spawn("python", ["-m", "http.server", "8766"], {
  cwd: "E:\\VNOffice-agy-writer-refmail",
  stdio: "ignore"
});

// Chờ 1 giây để server sẵn sàng
await new Promise(r => setTimeout(r, 1000));

let failures = 0;
const results = [];

function report(status, locale, testName, detail = "") {
  const line = `${status}\t[${locale}]\t${testName}${detail ? ` — ${detail}` : ""}`;
  console.log(line);
  results.push({ status, locale, testName, detail });
  if (status === "FAIL") failures++;
}

try {
  const browser = await chromium.launch({
    executablePath: "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    headless: true
  });

  for (const locale of ["vi", "en"]) {
    console.log(`\n========================================`);
    console.log(`BẮT ĐẦU AUDIT BẰNG TRÌNH DUYỆT THẬT: LOCALE = ${locale}`);
    console.log(`========================================\n`);

    const context = await browser.newContext({
      locale: locale === "vi" ? "vi-VN" : "en-US",
      viewport: { width: 1440, height: 900 }
    });
    const page = await context.newPage();

    const pageErrors = [];
    page.on("pageerror", err => {
      pageErrors.push(err.message);
      console.error(`[Browser Error][${locale}]`, err.message);
    });

    await page.addInitScript(val => localStorage.setItem("vno-locale", val), locale);
    await page.goto("http://127.0.0.1:8766/", { waitUntil: "networkidle" });
    await page.waitForSelector(".vno-writer-body");

    // Helper hàm chuyển tab ribbon
    const clickRibbonTab = async (tabId) => {
      const tab = page.locator(`.vno-ribbon-tab[data-tab-id="${tabId}"]`);
      if (await tab.count() > 0) {
        await tab.click();
      } else {
        const tabTexts = {
          home: /^(Trang đầu|Home)$/,
          insert: /^(Chèn|Insert)$/,
          design: /^(Thiết kế|Design)$/,
          layout: /^(Bố cục|Layout)$/,
          references: /^(Tham chiếu|References)$/,
          mailings: /^(Trộn thư|Mailings)$/,
          review: /^(Đánh giá|Review)$/
        };
        await page.locator(".vno-ribbon-tab").filter({ hasText: tabTexts[tabId] }).first().click();
      }
      await page.waitForTimeout(200);
    };

    // --- TEST 1: TAB THAM CHIẾU (REFERENCES) ---
    await page.evaluate(() => {
      const body = document.querySelector(".vno-writer-body");
      body.innerHTML = `
        <h1 id="heading-gioi-thieu">1. Giới thiệu chung</h1>
        <p>Đây là phần nội dung giới thiệu của tài liệu nghiên cứu khoa học.</p>
        <h2 id="heading-phuong-phap">1.1. Phương pháp nghiên cứu</h2>
        <p>Nội dung mô tả phương pháp thực nghiệm và khảo sát dữ liệu.</p>
        <h1 id="heading-ket-qua">2. Kết quả và Thảo luận</h1>
        <p>Kết quả đạt được qua các đợt kiểm thử thực tế.</p>
      `;
    });

    await clickRibbonTab("references");

    // 1.2: Chèn Mục lục tự động bằng click nút thật
    try {
      const tocBtn = page.locator('button[data-command-id="writer.reference.tocInsert"]');
      await tocBtn.click();
      await page.waitForSelector('.vno-toc-block');
      const tocCount = await page.locator('.vno-toc-block').count();
      const itemsCount = await page.locator('.vno-toc-item').count();
      if (tocCount === 1 && itemsCount >= 3) {
        report("PASS", locale, "Tham chiếu: Chèn Mục lục tự động (TOC) thành công", `Tạo khối TOC với ${itemsCount} mục`);
      } else {
        report("FAIL", locale, "Tham chiếu: Chèn Mục lục tự động (TOC)", `tocCount=${tocCount}, itemsCount=${itemsCount}`);
      }
    } catch (e) {
      report("FAIL", locale, "Tham chiếu: Chèn Mục lục tự động (TOC)", e.message);
    }

    // 1.3: Click link trên Mục lục nhảy tới heading
    try {
      const firstTocLink = page.locator('.vno-toc-link').first();
      await firstTocLink.click();
      report("PASS", locale, "Tham chiếu: Click liên kết mục lục (TOC Link) cuộn/focus tới Heading");
    } catch (e) {
      report("FAIL", locale, "Tham chiếu: Click liên kết mục lục (TOC Link)", e.message);
    }

    // 1.4: Thêm heading mới vào bài, bấm nút Cập nhật mục lục thật
    try {
      await page.evaluate(() => {
        const body = document.querySelector(".vno-writer-body");
        const newH1 = document.createElement("h1");
        newH1.id = "heading-ket-luan";
        newH1.textContent = "3. Kết luận và Khuyến nghị";
        body.appendChild(newH1);
      });
      const tocUpdateBtn = page.locator('button[data-command-id="writer.reference.tocUpdate"]');
      await tocUpdateBtn.click();
      await page.waitForTimeout(200);
      const itemsCountAfter = await page.locator('.vno-toc-item').count();
      if (itemsCountAfter >= 4) {
        report("PASS", locale, "Tham chiếu: Nút 'Cập nhật mục lục' trên Ribbon cập nhật đúng", `Tổng cộng ${itemsCountAfter} mục`);
      } else {
        report("FAIL", locale, "Tham chiếu: Nút 'Cập nhật mục lục' trên Ribbon", `itemsCountAfter=${itemsCountAfter}`);
      }
    } catch (e) {
      report("FAIL", locale, "Tham chiếu: Nút 'Cập nhật mục lục' trên Ribbon", e.message);
    }

    // 1.5: Bấm nút Xóa mục lục trực tiếp trên khối TOC
    try {
      const deleteTocBtn = page.locator('.vno-toc-btn-delete');
      await deleteTocBtn.click();
      await page.waitForTimeout(200);
      const tocCountAfter = await page.locator('.vno-toc-block').count();
      if (tocCountAfter === 0) {
        report("PASS", locale, "Tham chiếu: Nút xóa mục lục trên khối TOC xóa thành công");
      } else {
        report("FAIL", locale, "Tham chiếu: Nút xóa mục lục trên khối TOC", `tocCountAfter=${tocCountAfter}`);
      }
    } catch (e) {
      report("FAIL", locale, "Tham chiếu: Nút xóa mục lục trên khối TOC", e.message);
    }

    // 1.6: Chú thích cuối trang (Footnote) — Chèn bằng click nút thật
    try {
      await page.locator(".vno-writer-body p").first().click();
      const fnBtn = page.locator('button[data-command-id="writer.reference.footnoteInsert"]');
      await fnBtn.click();
      await page.waitForTimeout(300);

      const supCount = await page.locator('sup[data-vno-footnote-ref]').count();
      const fnItemCount = await page.locator('.vno-footnote-item').count();
      if (supCount === 1 && fnItemCount === 1) {
        report("PASS", locale, "Tham chiếu: Chèn Chú thích chân trang (Footnote) qua nút Ribbon", "Tạo số mũ 1 và container chú thích");
      } else {
        report("FAIL", locale, "Tham chiếu: Chèn Chú thích chân trang (Footnote) qua nút Ribbon", `supCount=${supCount}, fnItemCount=${fnItemCount}`);
      }
    } catch (e) {
      report("FAIL", locale, "Tham chiếu: Chèn Chú thích chân trang (Footnote) qua nút Ribbon", e.message);
    }

    // 1.7: Phím tắt thật Ctrl+Alt+F chèn Footnote thứ 2
    try {
      await page.locator(".vno-writer-body p").nth(1).click();
      await page.keyboard.press("Control+Alt+F");
      await page.waitForTimeout(300);

      const supCount2 = await page.locator('sup[data-vno-footnote-ref]').count();
      const fnItemCount2 = await page.locator('.vno-footnote-item').count();
      if (supCount2 === 2 && fnItemCount2 === 2) {
        report("PASS", locale, "Tham chiếu: Phím tắt Ctrl+Alt+F chèn Footnote thứ 2 hoạt động thật", `supCount=${supCount2}, fnItemCount=${fnItemCount2}`);
      } else {
        report("FAIL", locale, "Tham chiếu: Phím tắt Ctrl+Alt+F chèn Footnote thứ 2", `supCount=${supCount2}, fnItemCount=${fnItemCount2}`);
      }
    } catch (e) {
      report("FAIL", locale, "Tham chiếu: Phím tắt Ctrl+Alt+F chèn Footnote thứ 2", e.message);
    }

    // 1.8: Xóa Footnote 1 bằng nút delete, xác nhận Footnote 2 tự động đánh số lại thành 1
    try {
      const deleteFirstFn = page.locator('.vno-footnote-item .vno-note-delete-btn').first();
      await deleteFirstFn.click();
      await page.waitForTimeout(200);

      const remainingSups = await page.locator('sup[data-vno-footnote-ref]').allTextContents();
      const remainingItems = await page.locator('.vno-footnote-item .vno-note-num').allTextContents();
      if (remainingSups.length === 1 && remainingSups[0].trim() === "1" && remainingItems[0].trim() === "1") {
        report("PASS", locale, "Tham chiếu: Xóa Footnote và tự động đánh số lại (renumberFootnotes) chính xác");
      } else {
        report("FAIL", locale, "Tham chiếu: Xóa Footnote và tự động đánh số lại", `Sups: ${JSON.stringify(remainingSups)}, Items: ${JSON.stringify(remainingItems)}`);
      }
    } catch (e) {
      report("FAIL", locale, "Tham chiếu: Xóa Footnote và tự động đánh số lại", e.message);
    }

    // 1.9: Chú thích cuối tài liệu (Endnote) — Chèn bằng click nút thật
    try {
      await page.locator(".vno-writer-body p").first().click();
      const enBtn = page.locator('button[data-command-id="writer.reference.endnoteInsert"]');
      await enBtn.click();
      await page.waitForTimeout(300);

      const enSupCount = await page.locator('sup[data-vno-endnote-ref]').count();
      const enItemCount = await page.locator('.vno-endnote-item').count();
      if (enSupCount === 1 && enItemCount === 1) {
        report("PASS", locale, "Tham chiếu: Chèn Chú thích cuối (Endnote) qua nút Ribbon", "Tạo số mũ i và container chú thích cuối");
      } else {
        report("FAIL", locale, "Tham chiếu: Chèn Chú thích cuối (Endnote) qua nút Ribbon", `enSupCount=${enSupCount}, enItemCount=${enItemCount}`);
      }
    } catch (e) {
      report("FAIL", locale, "Tham chiếu: Chèn Chú thích cuối (Endnote) qua nút Ribbon", e.message);
    }

    // 1.10: Phím tắt thật Ctrl+Alt+D chèn Endnote thứ 2
    try {
      await page.locator(".vno-writer-body p").nth(1).click();
      await page.keyboard.press("Control+Alt+D");
      await page.waitForTimeout(300);

      const enSupCount2 = await page.locator('sup[data-vno-endnote-ref]').count();
      const secondEnNum = await page.locator('sup[data-vno-endnote-ref]').nth(1).textContent();
      if (enSupCount2 === 2 && secondEnNum.trim() === "ii") {
        report("PASS", locale, "Tham chiếu: Phím tắt Ctrl+Alt+D chèn Endnote thứ 2 (ii) hoạt động thật");
      } else {
        report("FAIL", locale, "Tham chiếu: Phím tắt Ctrl+Alt+D chèn Endnote thứ 2", `enSupCount=${enSupCount2}, second=${secondEnNum}`);
      }
    } catch (e) {
      report("FAIL", locale, "Tham chiếu: Phím tắt Ctrl+Alt+D chèn Endnote thứ 2", e.message);
    }

    // 1.11: Xóa Endnote 1, xác nhận Endnote 2 tự động đánh số lại thành 'i'
    try {
      const deleteFirstEn = page.locator('.vno-endnote-item .vno-note-delete-btn').first();
      await deleteFirstEn.click();
      await page.waitForTimeout(200);

      const remainingEnSups = await page.locator('sup[data-vno-endnote-ref]').allTextContents();
      if (remainingEnSups.length === 1 && remainingEnSups[0].trim() === "i") {
        report("PASS", locale, "Tham chiếu: Xóa Endnote và tự động đánh số lại La Mã (renumberEndnotes) chính xác");
      } else {
        report("FAIL", locale, "Tham chiếu: Xóa Endnote và tự động đánh số lại", `Sups: ${JSON.stringify(remainingEnSups)}`);
      }
    } catch (e) {
      report("FAIL", locale, "Tham chiếu: Xóa Endnote và tự động đánh số lại", e.message);
    }

    // --- TEST 2: TAB TRỘN THƯ (MAILINGS) ---
    await clickRibbonTab("mailings");

    // 2.1: Mở dialog Nguồn dữ liệu (writer.mailMerge.open) và TEST PHÍM ESCAPE THẬT
    try {
      const openDataSourceBtn = page.locator('button[data-command-id="writer.mailMerge.open"]');
      await openDataSourceBtn.click();
      await page.waitForSelector('.vno-merge-csv-textarea');

      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);

      const dialogVisible = await page.locator('.vno-merge-csv-textarea').count();
      if (dialogVisible === 0) {
        report("PASS", locale, "Trộn thư: Bấm phím Escape THẬT đóng đúng Hộp thoại Nguồn dữ liệu CSV (Lesson 5)");
      } else {
        report("FAIL", locale, "Trộn thư: Bấm phím Escape THẬT đóng Hộp thoại Nguồn dữ liệu CSV", "Dialog vẫn còn sau khi bấm Esc");
      }
    } catch (e) {
      report("FAIL", locale, "Trộn thư: Bấm phím Escape THẬT đóng Hộp thoại Nguồn dữ liệu CSV", e.message);
    }

    // 2.2: Mở lại dialog Nguồn dữ liệu, bấm 'Dán dữ liệu mẫu' và 'Lưu nguồn dữ liệu'
    try {
      const openDataSourceBtn = page.locator('button[data-command-id="writer.mailMerge.open"]');
      await openDataSourceBtn.click();
      await page.waitForSelector('.vno-merge-sample-btn');

      await page.locator('.vno-merge-sample-btn').click();
      await page.waitForTimeout(200);

      const badgeText = await page.locator('.vno-merge-status-badge').textContent();

      await page.locator('.vno-dialog-save-btn').click();
      await page.waitForTimeout(300);

      const dialogOpen = await page.locator('.vno-merge-csv-textarea').count();
      if (dialogOpen === 0) {
        report("PASS", locale, "Trộn thư: Dán dữ liệu mẫu CSV & Lưu nguồn dữ liệu thành công", `Status: ${badgeText}`);
      } else {
        report("FAIL", locale, "Trộn thư: Lưu nguồn dữ liệu", "Dialog chưa đóng sau khi lưu");
      }
    } catch (e) {
      report("FAIL", locale, "Trộn thư: Lưu nguồn dữ liệu", e.message);
    }

    // 2.3: Chuẩn bị nội dung thư mẫu trong editor
    await page.evaluate(() => {
      const body = document.querySelector(".vno-writer-body");
      body.innerHTML = `
        <p>Kính gửi Ông/Bà: </p>
        <p>Chức vụ: </p>
        <p>Đơn vị công tác: </p>
        <p>Trân trọng kính mời tham dự hội thảo.</p>
      `;
    });

    // 2.4: Chèn trường trộn thư (writer.mailMerge.insertField)
    try {
      await page.locator('.vno-writer-body p').first().click();

      const insertFieldBtn = page.locator('button[data-command-id="writer.mailMerge.insertField"]');
      await insertFieldBtn.click();
      await page.waitForSelector('.vno-merge-field-select');

      await page.keyboard.press("Escape");
      await page.waitForTimeout(200);
      const insertDialogVisible = await page.locator('.vno-merge-field-select').count();
      if (insertDialogVisible === 0) {
        report("PASS", locale, "Trộn thư: Bấm phím Escape THẬT đóng đúng Hộp thoại Chèn trường trộn thư");
      } else {
        report("FAIL", locale, "Trộn thư: Bấm phím Escape đóng Hộp thoại Chèn trường", "Dialog vẫn còn");
      }

      await insertFieldBtn.click();
      await page.waitForSelector('.vno-merge-field-select');
      await page.locator('.vno-merge-field-select').selectOption("HoTen");
      await page.locator('.vno-dialog-insert-btn').click();
      await page.waitForTimeout(300);

      await page.locator('.vno-writer-body p').nth(1).click();
      await insertFieldBtn.click();
      await page.waitForSelector('.vno-merge-field-select');
      await page.locator('.vno-merge-field-select').selectOption("ChucVu");
      await page.locator('.vno-dialog-insert-btn').click();
      await page.waitForTimeout(300);

      const fieldsCount = await page.locator('.vno-merge-field').count();
      if (fieldsCount === 2) {
        report("PASS", locale, "Trộn thư: Chèn 2 trường trộn thư (HoTen, ChucVu) vào tài liệu thành công");
      } else {
        report("FAIL", locale, "Trộn thư: Chèn trường trộn thư", `fieldsCount=${fieldsCount}`);
      }
    } catch (e) {
      report("FAIL", locale, "Trộn thư: Chèn trường trộn thư", e.message);
    }

    // 2.5: Bật Xem trước kết quả (writer.mailMerge.preview)
    try {
      const previewBtn = page.locator('button[data-command-id="writer.mailMerge.preview"]');
      await previewBtn.click();
      await page.waitForTimeout(300);

      const firstFieldValue = await page.locator('.vno-merge-field[data-field="HoTen"]').textContent();
      if (firstFieldValue === "Nguyễn Văn A") {
        report("PASS", locale, "Trộn thư: Bật Xem trước kết quả (Preview) hiển thị đúng bản ghi 1 ('Nguyễn Văn A')");
      } else {
        report("FAIL", locale, "Trộn thư: Bật Xem trước kết quả", `Value=${firstFieldValue}`);
      }
    } catch (e) {
      report("FAIL", locale, "Trộn thư: Bật Xem trước kết quả", e.message);
    }

    // 2.6: Điều hướng: Bấm 'Bản ghi sau' (writer.mailMerge.nextRecord)
    try {
      const nextBtn = page.locator('button[data-command-id="writer.mailMerge.nextRecord"]');
      await nextBtn.click();
      await page.waitForTimeout(300);

      const secondFieldValue = await page.locator('.vno-merge-field[data-field="HoTen"]').textContent();
      if (secondFieldValue === "Trần Thị B") {
        report("PASS", locale, "Trộn thư: Điều hướng 'Bản ghi sau' chuyển tới đúng bản ghi 2 ('Trần Thị B')");
      } else {
        report("FAIL", locale, "Trộn thư: Điều hướng 'Bản ghi sau'", `Value=${secondFieldValue}`);
      }
    } catch (e) {
      report("FAIL", locale, "Trộn thư: Điều hướng 'Bản ghi sau'", e.message);
    }

    // 2.7: Điều hướng: Bấm 'Bản ghi trước' (writer.mailMerge.prevRecord)
    try {
      const prevBtn = page.locator('button[data-command-id="writer.mailMerge.prevRecord"]');
      await prevBtn.click();
      await page.waitForTimeout(300);

      const backFieldValue = await page.locator('.vno-merge-field[data-field="HoTen"]').textContent();
      if (backFieldValue === "Nguyễn Văn A") {
        report("PASS", locale, "Trộn thư: Điều hướng 'Bản ghi trước' quay lại đúng bản ghi 1 ('Nguyễn Văn A')");
      } else {
        report("FAIL", locale, "Trộn thư: Điều hướng 'Bản ghi trước'", `Value=${backFieldValue}`);
      }
    } catch (e) {
      report("FAIL", locale, "Trộn thư: Điều hướng 'Bản ghi trước'", e.message);
    }

    // 2.8: Tắt Xem trước kết quả
    try {
      const previewBtn = page.locator('button[data-command-id="writer.mailMerge.preview"]');
      await previewBtn.click();
      await page.waitForTimeout(300);

      const markerValue = await page.locator('.vno-merge-field[data-field="HoTen"]').textContent();
      if (markerValue === "«HoTen»") {
        report("PASS", locale, "Trộn thư: Tắt Xem trước kết quả khôi phục đúng ký hiệu «HoTen» ban đầu");
      } else {
        report("FAIL", locale, "Trộn thư: Tắt Xem trước kết quả", `Value=${markerValue}`);
      }
    } catch (e) {
      report("FAIL", locale, "Trộn thư: Tắt Xem trước kết quả", e.message);
    }

    // 2.9: Hoàn tất trộn thư (writer.mailMerge.finish)
    try {
      const finishBtn = page.locator('button[data-command-id="writer.mailMerge.finish"]');
      await finishBtn.click();
      await page.waitForTimeout(500);

      const okBtn = page.locator('.vno-dialog-ok-btn');
      if (await okBtn.count() > 0) {
        await okBtn.click();
        await page.waitForTimeout(200);
      }

      const content = await page.locator('.vno-writer-body').innerHTML();
      const hasPersonA = content.includes("Nguyễn Văn A");
      const hasPersonB = content.includes("Trần Thị B");
      const hasPersonC = content.includes("Lê Văn C");
      const pageBreaks = (content.match(/page-break-before/g) || []).length;

      if (hasPersonA && hasPersonB && hasPersonC && pageBreaks === 2) {
        report("PASS", locale, "Trộn thư: 'Hoàn tất & Tạo tài liệu' tạo đủ 3 bản ghi với 2 ngắt trang vật lý");
      } else {
        report("FAIL", locale, "Trộn thư: 'Hoàn tất & Tạo tài liệu'", `hasA=${hasPersonA}, hasB=${hasPersonB}, hasC=${hasPersonC}, breaks=${pageBreaks}`);
      }
    } catch (e) {
      report("FAIL", locale, "Trộn thư: 'Hoàn tất & Tạo tài liệu'", e.message);
    }

    // 2.10: Hoàn tác (Undo Ctrl+Z) phục hồi tài liệu template có marker
    try {
      await page.keyboard.press("Control+Z");
      await page.waitForTimeout(300);

      const contentAfterUndo = await page.locator('.vno-writer-body').innerHTML();
      const hasMarker = contentAfterUndo.includes("vno-merge-field") && contentAfterUndo.includes("«HoTen»");
      const hasMultipleA = (contentAfterUndo.match(/Nguyễn Văn A/g) || []).length > 0;
      if (hasMarker && !hasMultipleA) {
        report("PASS", locale, "Trộn thư: Hoàn tác (Ctrl+Z) khôi phục hoàn hảo bản mẫu template với thẻ marker");
      } else {
        report("FAIL", locale, "Trộn thư: Hoàn tác (Ctrl+Z)", `hasMarker=${hasMarker}, hasMultipleA=${hasMultipleA}`);
      }
    } catch (e) {
      report("FAIL", locale, "Trộn thư: Hoàn tác (Ctrl+Z)", e.message);
    }

    // --- TEST 3: TAB ĐÁNH GIÁ (REVIEW) ---
    await clickRibbonTab("review");

    // 3.1: Thêm ghi chú (writer.comment.insert)
    try {
      await page.evaluate(() => {
        const body = document.querySelector(".vno-writer-body");
        const p = body.querySelector("p");
        const sel = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(p);
        sel.removeAllRanges();
        sel.addRange(range);
      });

      const addCommentBtn = page.locator('button[data-command-id="writer.comment.insert"]');
      await addCommentBtn.click();
      await page.waitForSelector('.vno-dialog-input');

      await page.locator('.vno-dialog-input').fill("Cần rà soát kỹ họ tên đại biểu");
      await page.locator('.vno-dialog-ok-btn').click();
      await page.waitForTimeout(300);

      const markCount = await page.locator('mark[data-comment-id]').count();
      const panelItems = await page.locator('.vno-comment-card').count();
      if (markCount >= 1 && panelItems >= 1) {
        report("PASS", locale, "Đánh giá: Thêm ghi chú (Comments) hiển thị mark trên bài và card ở panel bên phải");
      } else {
        report("FAIL", locale, "Đánh giá: Thêm ghi chú", `markCount=${markCount}, panelItems=${panelItems}`);
      }
    } catch (e) {
      report("FAIL", locale, "Đánh giá: Thêm ghi chú", e.message);
    }

    // 3.2: Theo dõi thay đổi (writer.trackChanges.toggle)
    try {
      const trackBtn = page.locator('button[data-command-id="writer.trackChanges.toggle"]');
      await trackBtn.click();
      await page.waitForTimeout(200);

      const isChecked = await trackBtn.evaluate(el => el.classList.contains("is-checked"));
      if (isChecked) {
        report("PASS", locale, "Đánh giá: Bật 'Theo dõi thay đổi' (Track Changes) cập nhật đúng class is-checked");
      } else {
        report("FAIL", locale, "Đánh giá: Bật 'Theo dõi thay đổi'", `is-checked=${isChecked}`);
      }

      await trackBtn.click();
      await page.waitForTimeout(200);
      const isUnchecked = await trackBtn.evaluate(el => !el.classList.contains("is-checked"));
      if (isUnchecked) {
        report("PASS", locale, "Đánh giá: Tắt 'Theo dõi thay đổi' gỡ bỏ đúng class is-checked");
      } else {
        report("FAIL", locale, "Đánh giá: Tắt 'Theo dõi thay đổi'", `is-checked=${!isUnchecked}`);
      }
    } catch (e) {
      report("FAIL", locale, "Đánh giá: Bật 'Theo dõi thay đổi'", e.message);
    }

    // 3.3: Soát lỗi chính tả (ai.assistant.grammarCheck)
    try {
      const grammarBtn = page.locator('button[data-command-id="ai.assistant.grammarCheck"]');
      await grammarBtn.click();
      await page.waitForTimeout(300);

      const aiSidebar = page.locator('.vno-ai-sidebar');
      const isSidebarOpen = await aiSidebar.count() > 0 && await aiSidebar.isVisible();
      if (isSidebarOpen) {
        report("PASS", locale, "Đánh giá: Nút 'Soát lỗi chính tả' mở bảng trợ lý AI thành công");
      } else {
        report("FAIL", locale, "Đánh giá: Nút 'Soát lỗi chính tả'", "AI sidebar không hiển thị");
      }
    } catch (e) {
      report("FAIL", locale, "Đánh giá: Nút 'Soát lỗi chính tả'", e.message);
    }

    await context.close();
  }

  await browser.close();
} finally {
  serverProcess.kill();
}

console.log("\n========================================");
console.log(`TỔNG KẾT: ${results.filter(r => r.status === "PASS").length} PASS | ${failures} FAIL`);
console.log("========================================");

if (failures > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
