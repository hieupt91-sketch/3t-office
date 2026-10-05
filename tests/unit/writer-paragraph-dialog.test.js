/**
 * Behavioral tests — VN Writer hộp thoại Đoạn văn (chuẩn hóa giá trị, lệnh, menu, ribbon, Hướng dẫn).
 */

import { normalizeParagraphDialogValues, LINE_MODES } from "../../apps/writer/paragraph-dialog.js";
import { WRITER_COMMANDS } from "../../platform/commands/command-definitions.js";
import { WRITER_RIBBON_TABS } from "../../apps/writer/writer-ribbon.js";
import { GAP_HELP_ENTRIES } from "../../platform/help/entries-gaps-0410.js";

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

  return results;
}
