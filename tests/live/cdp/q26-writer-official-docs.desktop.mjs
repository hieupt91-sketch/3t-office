import { launchApp } from "./session.mjs";
import path from "node:path";
import fs from "node:fs";

const profile = process.env.VNO_CDP_LOCALAPPDATA;
if (!profile) throw new Error("Set VNO_CDP_LOCALAPPDATA to a fresh profile directory.");
fs.mkdirSync(profile, { recursive: true });
const outputDir = process.env.Q26_OUTPUT_DIR || path.resolve("docs/assets/q26-writer-2026-10-20");
fs.mkdirSync(outputDir, { recursive: true });

const esc = value => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const para = text => `<p style="font-family:'Times New Roman';font-size:13pt">${esc(text)}</p>`;
const table = (rows, style = "", cellFont = "13pt") => `<table style="border-collapse:collapse;width:100%;${style}"><tbody>${rows.map((row, ri) => `<tr${ri === 0 ? ' class="vno-table-header-row"' : ""}>${row.map((cell, ci) => `<td style="font-family:'Times New Roman';font-size:${cellFont};border:1px solid #000;padding:5px;${ri === 0 ? "background:#d9eaf7;font-weight:bold;" : ""}${ci > 0 ? "text-align:right;" : ""}"><p style="font-family:'Times New Roman';font-size:${cellFont}">${cell}</p></td>`).join("")}</tr>`).join("")}</tbody></table>`;
const digits = Array.from({ length: 14 }, (_, i) => i + 1);
const formRows = [["STT","Mã hồ sơ","Ngày nhận","Người nộp","Thủ tục","Đơn vị xử lý","Hạn trả","Trạng thái"], ...digits.map(i => [String(i), `HS-2026-${String(i).padStart(3,"0")}`, `${String((i%28)+1).padStart(2,"0")}/10/2026`, `Công dân ${i}`, `Thủ tục hành chính ${i}`, `Phòng ${["Tư pháp","Đô thị","Tài chính"][i%3]}`, `${String((i%28)+5).padStart(2,"0")}/11/2026`, i%4===0 ? "Đã trả kết quả" : "Đang xử lý"])];
const outputs = ["A-cong-van.docx", "B-bien-ban.docx", "C-mau-bieu.docx"].map(name => path.join(outputDir, name));
const docs = [
  {
    filename: outputs[0],
    margin: { left: 30, right: 20, top: 20, bottom: 20 },
    body: `<div style="font-family:'Times New Roman';font-size:13pt">
      <table style="width:100%;border-collapse:collapse"><tbody><tr><td style="width:50%;text-align:center"><p style="font-family:'Times New Roman';font-size:13pt"><b>ỦY BAN NHÂN DÂN<br>QUẬN MINH AN</b><br>Số: 42/UBND-VP</p></td><td style="width:50%;text-align:center"><p style="font-family:'Times New Roman';font-size:13pt"><b>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM<br>Độc lập - Tự do - Hạnh phúc</b><br><u>Minh An, ngày 20 tháng 10 năm 2026</u></p></td></tr></tbody></table>
      <p style="font-family:'Times New Roman';text-align:center;font-size:14pt"><b>CÔNG VĂN</b></p><p style="font-family:'Times New Roman';font-size:13pt;text-align:center"><b>V/v triển khai rà soát hồ sơ hành chính quý IV năm 2026</b></p>
      ${para("Kính gửi: Trưởng các phòng chuyên môn thuộc Ủy ban nhân dân quận Minh An.")}
      ${para("Căn cứ kế hoạch công tác năm 2026 và yêu cầu nâng cao chất lượng giải quyết thủ tục hành chính, Ủy ban nhân dân quận đề nghị các đơn vị tổ chức rà soát hồ sơ theo nội dung sau:")}
      ${para("1. Phạm vi và nguyên tắc thực hiện")}${para("1.1. Rà soát hồ sơ đã tiếp nhận, đang xử lý và đã trả kết quả trong thời gian từ ngày 01 tháng 7 đến ngày 30 tháng 9 năm 2026.")}${para("1.2. Đối chiếu thành phần hồ sơ với quy định hiện hành; ghi rõ trường hợp thiếu tài liệu, quá hạn hoặc cần bổ sung thông tin.")}
      ${para("2. Nội dung báo cáo")}${para("2.1. Mỗi phòng lập bảng tổng hợp số lượng hồ sơ, tỷ lệ đúng hạn, hồ sơ cần bổ sung và nguyên nhân chậm xử lý.")}${para("2.2. Đối với trường hợp có vướng mắc liên ngành, nêu rõ đơn vị phối hợp, đề xuất hướng giải quyết và thời hạn hoàn thành.")}${para("2.3. Báo cáo sử dụng biểu mẫu thống nhất, có xác nhận của trưởng đơn vị và lưu kèm tài liệu đối chiếu để phục vụ kiểm tra.")}
      <p style="page-break-before:always;break-before:page"><b>3. Thời hạn và tổ chức thực hiện</b></p>${para("3.1. Gửi báo cáo điện tử và bản ký xác nhận về Văn phòng Ủy ban nhân dân quận trước 16 giờ ngày 05 tháng 11 năm 2026.")}${para("3.2. Trưởng phòng chịu trách nhiệm về tính đầy đủ, chính xác của số liệu và phân công đầu mối giải trình khi được yêu cầu.")}
      ${para("Đề nghị các đơn vị nghiêm túc triển khai. Trong quá trình thực hiện, phản ánh khó khăn về Văn phòng Ủy ban nhân dân quận để tổng hợp, báo cáo lãnh đạo xem xét.")}
      <table style="width:100%;border-collapse:collapse;margin-top:16px"><tbody><tr><td style="width:50%;border:0;vertical-align:top"><p style="font-family:'Times New Roman';font-size:13pt"><b>Nơi nhận:</b><br>- Như trên;<br>- Chủ tịch UBND quận (b/c);<br>- Lưu: VT, VP.</p></td><td style="width:50%;border:0;text-align:center;vertical-align:top"><p style="font-family:'Times New Roman';font-size:13pt"><b>KT. CHỦ TỊCH<br>PHÓ CHỦ TỊCH</b><br><br><br><br><b>Nguyễn Minh An</b></p></td></tr></tbody></table>
    </div>`
  },
  {
    filename: outputs[1], margin: { left: 25, right: 20, top: 20, bottom: 20 },
    body: `<div style="font-family:'Times New Roman';font-size:13pt"><p style="text-align:center"><b>BIÊN BẢN HỌP</b></p><p style="text-align:center"><b>Rà soát tiến độ giải quyết hồ sơ quý IV năm 2026</b></p>${para("Thời gian: 09 giờ 00 phút, ngày 20 tháng 10 năm 2026.")}${para("Địa điểm: Phòng họp số 2, trụ sở Ủy ban nhân dân quận Minh An.")}${para("Chủ trì: Bà Nguyễn Minh An, Phó Chủ tịch Ủy ban nhân dân quận.")}${para("Thư ký: Ông Trần Quốc Bình, chuyên viên Văn phòng.")}${para("I. Thành phần tham dự")}${table([["STT","Họ và tên","Đơn vị","Chức vụ","Ký tên"],...["Nguyễn Minh An","Trần Quốc Bình","Lê Thu Hà","Phạm Văn Nam","Vũ Hải Yến","Đỗ Quang Huy"].map((n,i)=>[String(i+1),n,["Lãnh đạo quận","Văn phòng","Tư pháp","Đô thị","Tài chính","Một cửa"][i],["Chủ trì","Thư ký","Trưởng phòng","Trưởng phòng","Trưởng phòng","Tổ trưởng"][i],""])])}${para("II. Nội dung và kết luận")}${para("Các đơn vị thống nhất số liệu rà soát, tập trung xử lý hồ sơ quá hạn và bổ sung thông tin công khai cho người dân. Mọi thay đổi tiến độ phải được cập nhật vào sổ theo dõi chung.")}${table([["STT","Công việc","Đơn vị phụ trách","Thời hạn","Ghi chú"],["1","Đối chiếu hồ sơ quá hạn","Bộ phận Một cửa","25/10/2026","Báo cáo số liệu"],["2","Hoàn thiện quy trình phối hợp","Phòng Tư pháp","28/10/2026","Lấy ý kiến đơn vị"],["3","Tổng hợp báo cáo quý","Văn phòng","05/11/2026","Trình lãnh đạo"]])}${para("Chú thích: Các thời hạn trong biên bản được tính theo ngày làm việc, trừ khi có ghi rõ khác.")}${para("Cuộc họp kết thúc lúc 10 giờ 30 phút cùng ngày. Biên bản được đọc lại, các thành viên dự họp thống nhất nội dung và ký xác nhận.")}
      <table style="width:100%;border-collapse:collapse;margin-top:16px"><tbody><tr><td style="border:0;text-align:center"><b>CHỦ TRÌ</b><br><br><br><br>Nguyễn Minh An</td><td style="border:0;text-align:center"><b>THƯ KÝ</b><br><br><br><br>Trần Quốc Bình</td></tr></tbody></table></div>`
  },
  {
    filename: outputs[2], margin: { left: 20, right: 20, top: 18, bottom: 18 }, orientation: "landscape",
    body: `<div style="font-family:'Times New Roman';font-size:10pt"><p style="text-align:center;font-size:14pt"><b>BẢNG THEO DÕI TIẾP NHẬN VÀ GIẢI QUYẾT HỒ SƠ</b></p>${para("Kỳ báo cáo: tháng 10 năm 2026 | Đơn vị: Bộ phận Tiếp nhận và Trả kết quả")}${table(formRows,"","10pt")}<p><b>Tổng cộng: 14 hồ sơ.</b></p><p>Ghi chú: Cập nhật tình trạng hồ sơ vào cuối mỗi ngày làm việc; trường hợp quá hạn phải ghi rõ nguyên nhân và ngày dự kiến hoàn thành.</p></div>`
  }
];

for (let index = 0; index < docs.length; index++) {
  const item = docs[index];
  const session = await launchApp("writer", { localAppData: path.join(profile, `author-${index+1}`), startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
  try {
    const result = await session.cdp.evaluate(`(async () => {
      const a=window.__vnoAppInstance.adapter;
      a.bodyDom.innerHTML=${JSON.stringify(item.body)};
      a._initZones();
      a.setPageSetup({size:'a4',orientation:${JSON.stringify(item.orientation || "portrait")},margins:${JSON.stringify(item.margin)}},'whole');
      a.setDifferentFirstPage(true);
      a.setDifferentOddEven(true);
      a.setPageNumberFormat({restart:true,startAt:1});
      a.footerDom.innerHTML='<p style="text-align:center">Trang <span data-vno-field="PAGE">1</span></p>';
      a.sectionHeadersFooters[a.getActiveSectionId()].footer=a.footerDom.innerHTML;
      const content=a._contentForExport();
      const saved=await window.pywebview.api.save_document_in_place(content,'writer',${JSON.stringify(item.filename)},null);
      return {saved, sections:a.sections, pageSetup:a.pageSetup, headerFooter:a.sectionHeadersFooters, html:a.bodyDom.innerHTML};
    })()`, { awaitPromise: true, timeoutMilliseconds: 240000 });
    console.log(`DOCUMENT ${index+1} ${JSON.stringify({filename:item.filename,saved:result?.saved,pageSetup:result?.pageSetup,sections:result?.sections})}`);
    if (result?.saved?.status !== "ok" || !fs.existsSync(item.filename)) throw new Error(`Failed to save ${item.filename}`);
  } finally { await session.close().catch(() => {}); }
  const reopened = await launchApp("writer", { filePath: item.filename, localAppData: path.join(profile, `reopen-${index+1}`), startTimeoutMilliseconds: 180000, readyTimeoutMilliseconds: 180000 });
  try {
    const expectedName = path.basename(item.filename).toLowerCase();
    await reopened.cdp.waitFor(`(() => { const a=window.__vnoAppInstance?.adapter; return String(a?._sourcePath||a?.sourceFilePath||'').toLowerCase().endsWith(${JSON.stringify(expectedName)}) && !!a?.bodyDom?.innerText?.trim(); })()`, { timeoutMilliseconds: 180000, intervalMilliseconds: 500 });
    const state = await reopened.cdp.evaluate(`(() => { const a=window.__vnoAppInstance.adapter; a._initZones(); const b=a.bodyDom; return {path:a._sourcePath||a.sourceFilePath, text:b.innerText, tables:[...b.querySelectorAll('table')].map(t=>({rows:t.rows.length,cols:Math.max(...[...t.rows].map(r=>r.cells.length)),header:t.rows[0]?.className||''})), sections:a.sections, pageSetup:a.pageSetup, hf:a.sectionHeadersFooters}; })()`);
    console.log(`REOPEN ${index+1} ${JSON.stringify(state)}`);
  } finally { await reopened.close().catch(() => {}); }
}

console.log(`OUTPUTS ${JSON.stringify(outputs)}`);
