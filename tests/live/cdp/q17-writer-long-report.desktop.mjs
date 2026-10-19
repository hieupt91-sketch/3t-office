import { launchApp } from "./session.mjs";
import { click, insertText, press, sleep } from "./actions.mjs";
import fs from "node:fs";
import path from "node:path";

const profile = process.env.VNO_CDP_LOCALAPPDATA;
if (!profile) throw new Error("Set VNO_CDP_LOCALAPPDATA to a fresh profile directory.");
fs.mkdirSync(profile, { recursive: true });
const out = path.join(profile, "q17-bao-cao-6-trang.docx");
const shots = path.join(profile, "screenshots");
fs.mkdirSync(shots, { recursive: true });
const checks = [];
const check = (name, ok, detail = "") => { checks.push(Boolean(ok)); console.log(`${ok ? "PASS" : "FAIL"} | ${name}${detail ? ` | ${detail}` : ""}`); };
const session = await launchApp("writer", { localAppData: path.join(profile, "author"), startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
try {
  const { cdp } = session;
  const snap = async name => {
    const r = await cdp.send("Page.captureScreenshot", { format: "png" }, 30000);
    fs.writeFileSync(path.join(shots, `${name}.png`), Buffer.from((r.result || r).data, "base64"));
  };
  const state = expr => cdp.evaluate(expr);
  await click(cdp, ".vno-writer-body p");
  await insertText(cdp, "BÁO CÁO TỔNG KẾT CHƯƠNG TRÌNH 2026");
  await press(cdp, "Enter");
  await insertText(cdp, "Hà Nội — 20 tháng 10 năm 2026");
  await press(cdp, "Enter");
  await insertText(cdp, "Mục tiêu và phạm vi: tổng hợp kết quả, nguồn lực, chỉ số đo lường, rủi ro và kiến nghị từ ba đơn vị tham gia trong quý III.");
  await click(cdp, "#vno-ribbon-tab-references");
  await click(cdp, '[data-command-id="writer.reference.tocInsert"]');
  await sleep(700);
  await snap("01-muc-luc");
  check("Lệnh Mục lục tự động mở/đưa nội dung vào tài liệu", Boolean(await state('document.querySelector(".vno-writer-body [data-vno-toc]")')));
  const chapters = [
    ["1. KẾT QUẢ THỰC HIỆN", "Ba đơn vị hoàn thành 92% mốc công việc trong kỳ. Các hạng mục nghiệm thu còn lại có chủ sở hữu, thời hạn và tiêu chí bàn giao cụ thể. Tỷ lệ hoàn thành được tính theo trọng số đầu việc đã thống nhất.", "1.1 Tiến độ theo đơn vị", "Đơn vị A đạt 96%, đơn vị B đạt 89% và đơn vị C đạt 91%. Sai khác chủ yếu do lịch bàn giao thiết bị; nhóm điều phối đã cập nhật đường găng và phân bổ nhân lực hỗ trợ."],
    ["2. NGUỒN LỰC VÀ CHI PHÍ", "Ngân sách được sử dụng theo kế hoạch đã phê duyệt. Chi phí vận hành tăng nhẹ vì bổ sung thiết bị dự phòng; khoản phát sinh nằm trong dự trù và đã có hồ sơ nghiệm thu.", "2.1 Phân bổ nhân lực", "Nhóm triển khai gồm 18 thành viên. Bình quân mỗi đơn vị bố trí một đầu mối nghiệp vụ và một đầu mối kỹ thuật; lịch trực được lập theo tuần để tránh phụ thuộc một cá nhân."],
    ["3. CHẤT LƯỢNG VÀ RỦI RO", "Kiểm tra lấy mẫu ghi nhận độ chính xác 98,4%. Hai rủi ro mức trung bình đã có kế hoạch giảm thiểu; cần tiếp tục theo dõi phụ thuộc nhà cung cấp và thời gian nghiệm thu.", "3.1 Biện pháp kiểm soát", "Mỗi lỗi được ghi nhận với mức độ, người xử lý, hạn hoàn tất và bằng chứng kiểm tra lại. Các lỗi ảnh hưởng dữ liệu phải được ưu tiên xử lý trước khi chuyển sang giai đoạn tiếp theo."],
    ["4. KẾ HOẠCH GIAI ĐOẠN TIẾP", "Ưu tiên hoàn tất nghiệm thu, chuẩn hóa tài liệu hướng dẫn và tổ chức đào tạo cho đầu mối tại từng đơn vị. Mốc đánh giá tiếp theo dự kiến vào cuối tháng 11.", "4.1 Lịch công việc", "Tuần một chốt hồ sơ; tuần hai đào tạo; tuần ba chạy kiểm tra chấp nhận; tuần bốn tổng hợp kết quả. Mỗi mốc có biên bản xác nhận và người chịu trách nhiệm."],
    ["5. KIẾN NGHỊ", "Duy trì nhịp báo cáo hai tuần một lần, ưu tiên xử lý điểm nghẽn nghiệm thu, và phân công một đầu mối cập nhật sổ theo dõi. Các thay đổi phạm vi cần được phê duyệt trước khi triển khai.", "5.1 Quyết nghị cần thông qua", "Đề nghị phê duyệt lịch đào tạo, xác nhận nguồn lực cho giai đoạn tiếp theo và duy trì cuộc họp rà soát rủi ro định kỳ. Báo cáo sau sẽ so sánh kết quả thực tế với các chỉ tiêu trong phụ lục."],
    ["6. KẾT LUẬN VÀ PHỤ LỤC", "Kết quả cho thấy chương trình có thể chuyển sang giai đoạn tiếp theo sau khi hoàn tất nghiệm thu. Các chỉ số và đề xuất trong báo cáo cần được xác nhận tại cuộc họp điều phối chính thức.", "6.1 Hồ sơ kèm theo", "Danh mục hồ sơ gồm biên bản kiểm tra, bảng theo dõi công việc, lịch đào tạo và danh sách đầu mối. Từng đơn vị lưu bản đã ký tại kho hồ sơ nội bộ để phục vụ rà soát sau này."]
  ];
  for (const [h1, p1, h2, p2] of chapters) {
    await press(cdp, "End", { ctrl: true });
    await press(cdp, "Enter");
    await press(cdp, "1", { ctrl: true, alt: true });
    await insertText(cdp, h1);
    await press(cdp, "Enter");
    await insertText(cdp, p1);
    await press(cdp, "Enter");
    await press(cdp, "2", { ctrl: true, alt: true });
    await insertText(cdp, h2);
    await press(cdp, "Enter");
    await insertText(cdp, p2);
    if (h1 !== chapters.at(-1)[0]) await press(cdp, "Enter", { ctrl: true });
    await snap(`chuong-${chapters.indexOf(chapters.find(item => item[0] === h1)) + 1}`);
  }
  await click(cdp, "#vno-ribbon-tab-references");
  await click(cdp, '[data-command-id="writer.reference.tocUpdate"]');
  await sleep(500);
  const headingCount = await state('document.querySelectorAll(".vno-writer-body h1,.vno-writer-body h2,.vno-writer-body h3").length');
  check("Áp dụng Heading 1/2 bằng bàn phím cho sáu chương", headingCount >= 12, `headings=${headingCount}`);
  check("Mục lục được cập nhật sau khi thêm chương", await state('document.querySelector(".vno-writer-body [data-vno-toc]")?.innerText.includes("KẾT QUẢ THỰC HIỆN")'));
  const bodyText = await state('document.querySelector(".vno-writer-body").innerText');
  const rendered = await state('document.querySelector(".vno-writer-body").innerText');
  check("Văn bản tiếng Việt nhập bằng CDP giữ dấu", bodyText.includes("BÁO CÁO TỔNG KẾT") && rendered.includes("Hà Nội"), JSON.stringify({ bodyText: bodyText.slice(0, 120) }));
  check("Mục lục có nguồn tiêu đề sau khi chèn", await state('!!document.querySelector(".vno-writer-body [data-vno-toc]")'));
  const content = await state("window.__vnoAppInstance.adapter._contentForExport()");
  const saved = await cdp.evaluate(`window.pywebview.api.save_document_in_place(${JSON.stringify(content)}, 'writer', ${JSON.stringify(out)}, null)`, { awaitPromise: true, timeoutMilliseconds: 240000 });
  check("Lưu báo cáo DOCX bằng đường dẫn thật", saved?.status === "ok", JSON.stringify(saved));
  check("Tệp DOCX được tạo", fs.existsSync(out), out);
} catch (error) {
  check("Không phát sinh lỗi CDP", false, error.stack || error.message);
} finally {
  console.log(`PROFILE ${profile}`);
  await session.close().catch(() => {});
}
if (fs.existsSync(out)) {
  const reopened = await launchApp("writer", { filePath: out, localAppData: path.join(profile, "reopen"), startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
  try {
    await reopened.cdp.waitFor(`(() => { const a=window.__vnoAppInstance?.adapter; return !!a && String(a._sourcePath||a.sourceFilePath||'').toLowerCase().endsWith('q17-bao-cao-6-trang.docx'); })()`, { timeoutMilliseconds: 180000, intervalMilliseconds: 500 });
    const reopenedState = await reopened.cdp.evaluate(`(() => { const b=document.querySelector('.vno-writer-body'); const text=b?.innerText||''; return {text, headings:b?.querySelectorAll('h1,h2,h3').length||0, toc:text.includes('MỤC LỤC') && text.includes('6. KẾT LUẬN VÀ PHỤ LỤC'), tables:b?.querySelectorAll('table').length||0}; })()`);
    check("Mở lại DOCX trong phiên CDP mới: sáu chương, tiêu đề và mục lục còn nguyên", reopenedState.headings >= 12 && reopenedState.toc && reopenedState.text.includes("KẾT QUẢ THỰC HIỆN"), JSON.stringify({ headings: reopenedState.headings, toc: reopenedState.toc, tables: reopenedState.tables }));
  } catch (error) {
    check("Mở lại phiên mới và đọc DOCX", false, error.stack || error.message);
  } finally { await reopened.close().catch(() => {}); }
}
if (checks.some(ok => !ok)) process.exitCode = 1;
