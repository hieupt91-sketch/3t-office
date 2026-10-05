/**
 * Behavioral tests — VN Writer hộp thoại Đoạn văn (chuẩn hóa giá trị, lệnh, menu, ribbon, Hướng dẫn).
 */

import { normalizeParagraphDialogValues, LINE_MODES } from "../../apps/writer/paragraph-dialog.js";
import { WRITER_COMMANDS } from "../../platform/commands/command-definitions.js";
import { WRITER_RIBBON_TABS } from "../../apps/writer/writer-ribbon.js";
import { GAP_HELP_ENTRIES } from "../../platform/help/entries-gaps-0410.js";
import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";

export async function runWriterParagraphDialogTests() {
  const results = [];
  const test = async (name, fn) => {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.message });
    }
  };
  const assert = (condition, message) => { if (!condition) throw new Error(message); };

  await test("Đoạn văn: đổi cm sang mm, dòng đầu dương và thụt treo âm", () => {
    const first = normalizeParagraphDialogValues({ leftCm: "1", rightCm: "0,5", special: "firstLine", specialCm: "1.27" }).values;
    assert(first.leftMm === 10 && first.rightMm === 5, `thụt lề sai: ${first.leftMm}/${first.rightMm}`);
    assert(first.firstLineMm === 12.7, `dòng đầu phải 12.7mm, thực tế ${first.firstLineMm}`);
    const hang = normalizeParagraphDialogValues({ leftCm: "2", special: "hanging", specialCm: "1" }).values;
    assert(hang.firstLineMm === -10, `thụt treo phải -10mm, thực tế ${hang.firstLineMm}`);
  });

  await test("Đoạn văn: thụt treo lớn hơn thụt trái và thụt quá bề rộng đều bị từ chối bằng tiếng Việt", () => {
    const hanging = normalizeParagraphDialogValues({ leftCm: "0.5", special: "hanging", specialCm: "2" });
    assert(!hanging.values && /treo/i.test(hanging.error), "phải từ chối thụt treo lớn hơn thụt trái");
    const wide = normalizeParagraphDialogValues({ leftCm: "10", rightCm: "10" }, 160);
    assert(!wide.values && /thụt lề/i.test(wide.error), "phải từ chối tổng thụt lề vượt bề rộng trang");
  });

  await test("Đoạn văn: giãn dòng Đơn/1,5/Kép dùng hệ số cố định; Nhiều dòng và Chính xác bị kẹp trong giới hạn", () => {
    assert(LINE_MODES.map(item => item.id).join() === "single,onehalf,double,multiple,exact", "danh sách chế độ giãn dòng đổi");
    assert(normalizeParagraphDialogValues({ lineMode: "multiple", lineValue: "99" }).values.lineValue === 10, "Nhiều dòng tối đa 10");
    assert(normalizeParagraphDialogValues({ lineMode: "multiple", lineValue: "0" }).values.lineValue === 0.5, "Nhiều dòng tối thiểu 0,5");
    assert(normalizeParagraphDialogValues({ lineMode: "exact", lineValue: "18" }).values.lineValue === 18, "Chính xác giữ 18pt");
    assert(normalizeParagraphDialogValues({ lineMode: "abc" }).values.lineMode === "single", "chế độ lạ về Đơn");
  });

  await test("Đoạn văn: giá trị rác (chữ, âm) được kẹp về mặc định an toàn", () => {
    const values = normalizeParagraphDialogValues({ align: "x", leftCm: "abc", beforePt: "-5", afterPt: "999" }).values;
    assert(values.align === "left" && values.leftMm === 0, "căn lề và thụt lề rác phải về mặc định");
    assert(values.beforePt === 0 && values.afterPt === 240, `khoảng cách phải kẹp 0..240, thực tế ${values.beforePt}/${values.afterPt}`);
  });

  await test("Đoạn văn: lệnh có định nghĩa, nút góc nhóm ở cả tab Trang đầu và Bố cục, bài Hướng dẫn có đủ bước", () => {
    assert(WRITER_COMMANDS.some(command => command.id === "writer.format.paragraphDialog"), "thiếu command definition");
    const groups = WRITER_RIBBON_TABS.flatMap(tab => tab.groups || []).filter(group => group.id === "paragraph");
    assert(groups.length >= 2 && groups.every(group => group.launcherCommandId === "writer.format.paragraphDialog"), "mỗi nhóm Đoạn văn phải có nút góc nhóm");
    const help = GAP_HELP_ENTRIES.find(entry => entry.id === "writer.format.paragraphDialog");
    assert(help && help.steps.length >= 5 && /chuột phải/i.test(help.steps.join(" ")), "bài Hướng dẫn thiếu bước truy cập menu chuột phải");
  });

  await test("Đoạn văn: tab Ngắt dòng và ngắt trang có mặc định như Word và nhận giá trị người dùng", () => {
    const defaults = normalizeParagraphDialogValues({}).values;
    assert(defaults.widowControl === true && defaults.keepNext === false && defaults.keepLines === false && defaults.pageBreakBefore === false, "mặc định phải: mồ côi/góa bật, ba tùy chọn còn lại tắt");
    const custom = normalizeParagraphDialogValues({ widowControl: false, keepNext: true, keepLines: true, pageBreakBefore: true }).values;
    assert(custom.widowControl === false && custom.keepNext && custom.keepLines && custom.pageBreakBefore, "giá trị người dùng chọn phải được giữ");
  });

  await test("Đoạn văn: xuất HTML đổi thuộc tính vno sang CSS cũ mà LibreOffice hiểu (đo thật), giữ style có sẵn", () => {
    const adapter = new WriterAdapter(null);
    const out = adapter._paragraphFlowForExport('<p data-vno-flow-next="1" data-vno-flow-lines="1" data-vno-flow-page-before="1" data-vno-flow-widow="off" style="text-align: left;">A</p><p>B</p><h2 data-vno-flow-next="1">C</h2>');
    assert(/<p[^>]*style="text-align: left; page-break-after: avoid; page-break-inside: avoid; page-break-before: always; orphans: 0; widows: 0"/.test(out), `thiếu CSS cũ: ${out}`);
    assert(out.includes("<p>B</p>"), "đoạn không có thuộc tính vno phải giữ nguyên");
    assert(/<h2[^>]*style="page-break-after: avoid"/.test(out), `tiêu đề chưa có style phải được thêm: ${out}`);
  });

  await test("Đoạn văn: applyParagraphDialogValues ghi dataset cùng một bước hoàn tác; lệnh cũ không có trường ngắt dòng thì không đụng tới", () => {
    const adapter = new WriterAdapter(null);
    const block = { style: {}, dataset: {} };
    let snapshots = 0;
    adapter._getRulerParagraphBlocks = () => [block];
    adapter.getRulerState = () => ({ pageWidthMm: 210, margins: { left: 20, right: 20 }, paragraph: { leftMm: 0, rightMm: 0, firstLineMm: 0 } });
    adapter.flushTyping = () => {};
    adapter.recordSnapshot = () => { snapshots += 1; };
    const base = { align: "left", leftMm: 0, rightMm: 0, firstLineMm: 0, beforePt: 0, afterPt: 0, lineMode: "single", lineValue: 1 };
    assert(adapter.applyParagraphDialogValues({ ...base, keepNext: true, keepLines: false, pageBreakBefore: true, widowControl: false }) === true, "áp dụng phải thành công");
    assert(block.dataset.vnoFlowNext === "1" && block.dataset.vnoFlowPageBefore === "1" && block.dataset.vnoFlowWidow === "off" && !("vnoFlowLines" in block.dataset), `dataset sai: ${JSON.stringify(block.dataset)}`);
    assert(snapshots === 1, "một lần áp dụng phải đúng một bước hoàn tác");
    adapter.applyParagraphDialogValues({ ...base });
    assert(block.dataset.vnoFlowNext === "1" && block.dataset.vnoFlowPageBefore === "1", "lệnh không truyền trường ngắt dòng không được xóa thiết lập cũ");
    adapter.applyParagraphDialogValues({ ...base, keepNext: false, keepLines: false, pageBreakBefore: false, widowControl: true });
    assert(Object.keys(block.dataset).length === 0, `bỏ tích phải gỡ hết thuộc tính: ${JSON.stringify(block.dataset)}`);
  });
  return results;
}
