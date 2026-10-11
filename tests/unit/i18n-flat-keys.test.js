/**
 * Behavioral tests — i18n: khóa phẳng trong nhóm commands và chuỗi dự phòng.
 */
import { t } from "../../platform/i18n/i18n.js";

export async function runI18nFlatKeyTests() {
  const results = [];
  const test = async (name, fn) => {
    try { await fn(); results.push({ name, pass: true }); } catch (error) { results.push({ name, pass: false, error: error.message }); }
  };
  const assert = (condition, message) => { if (!condition) throw new Error(message); };

  await test("i18n: khóa phẳng trong nhóm commands (hộp thoại Phương trình) tra được, không lộ khóa thô", () => {
    assert(t("writer.equation.dialog.title") === "Phương trình — Doc", "khóa phẳng phải ra tiếng Việt");
    assert(t("writer.equation.dialog.insert") !== "writer.equation.dialog.insert", "không trả về khóa");
  });
  await test("i18n: tham số chuỗi làm dự phòng khi khóa là nhóm lệnh (không phải chuỗi)", () => {
    assert(t("writer.insert.coverPage", "Thư viện trang bìa") === "Thư viện trang bìa", "dùng dự phòng");
    assert(t("writer.insert.equation", "Phương trình") === "Phương trình", "dùng dự phòng");
  });
  return results;
}