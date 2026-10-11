/**
 * Behavioral tests — VN Writer: Văn bản thành bảng và Trang trắng.
 */
import { splitTextToRows, buildTableHtml, TABLE_DELIMITERS } from "../../apps/writer/text-to-table-dialog.js";
import { WRITER_COMMANDS } from "../../platform/commands/command-definitions.js";
import { WRITER_RIBBON_TABS } from "../../apps/writer/writer-ribbon.js";
import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";

export async function runWriterTextToTableTests() {
  const results = [];
  const test = async (name, fn) => {
    try { await fn(); results.push({ name, pass: true }); } catch (error) { results.push({ name, pass: false, error: error.message }); }
  };
  const assert = (condition, message) => { if (!condition) throw new Error(message); };

  await test("Văn bản thành bảng: tách theo Tab, dấu phẩy, chấm phẩy, khoảng trắng và ký tự khác", () => {
    assert(TABLE_DELIMITERS.map(item => item.id).join() === "tab,comma,semicolon,space,custom", "danh sách dấu phân cách đổi");
    const tab = splitTextToRows(["A\tB\tC", "1\t2\t3"], "tab");
    assert(tab.rows.length === 2 && tab.cols === 3 && tab.rows[1][2] === "3", "tách Tab sai");
    assert(splitTextToRows(["a, b ,c"], "comma").rows[0].join("|") === "a|b|c", "tách dấu phẩy phải cắt khoảng trắng đầu/cuối ô");
    assert(splitTextToRows(["x;y"], "semicolon").cols === 2, "tách chấm phẩy sai");
    assert(splitTextToRows(["một   hai  ba"], "space").cols === 3, "khoảng trắng liên tiếp tính là một dấu");
    assert(splitTextToRows(["a|b|c"], "custom", "|").cols === 3, "ký tự khác sai");
  });

  await test("Văn bản thành bảng: hàng ngắn được bù ô trống, dòng trống ở hai đầu bị bỏ, lỗi báo bằng tiếng Việt", () => {
    const result = splitTextToRows(["", "a;b;c", "d", ""], "semicolon");
    assert(result.rows.length === 2 && result.rows[1].join("|") === "d||", `bù ô sai: ${JSON.stringify(result.rows)}`);
    assert(/ít nhất một đoạn/i.test(splitTextToRows([" ", ""], "tab").error), "không có chữ phải báo lỗi");
    assert(/ký tự phân cách/i.test(splitTextToRows(["a"], "custom", "").error), "thiếu ký tự khác phải báo lỗi");
    assert(/tối đa 63/.test(splitTextToRows([Array.from({ length: 70 }, () => "x").join(",")], "comma").error), "quá nhiều cột phải bị chặn");
  });

  await test("Văn bản thành bảng: HTML bảng thoát ký tự đặc biệt, đủ hàng và ô", () => {
    const html = buildTableHtml([["<b>&", "2"], ["x", ""]]);
    assert(html.includes("&lt;b&gt;&amp;"), `chưa thoát ký tự: ${html}`);
    assert((html.match(/<tr>/g) || []).length === 2 && (html.match(/<td /g) || []).length === 4, "số hàng/ô sai");
  });

  await test("Trang trắng và Văn bản thành bảng: có lệnh, nút trên tab Chèn đúng nhóm", () => {
    assert(WRITER_COMMANDS.some(command => command.id === "writer.page.blank"), "thiếu lệnh Trang trắng");
    assert(WRITER_COMMANDS.some(command => command.id === "writer.table.fromText"), "thiếu lệnh Văn bản thành bảng");
    const insertTab = WRITER_RIBBON_TABS.find(tab => tab.id === "insert");
    const group = id => insertTab.groups.find(item => item.id === id)?.items.map(item => item.commandId) || [];
    assert(group("pages").includes("writer.page.blank"), "Trang trắng phải nằm ở nhóm Trang văn bản");
    assert(group("tables").includes("writer.table.fromText"), "Văn bản thành bảng phải nằm ở nhóm Bảng biểu");
  });

  await test("Trang trắng: chèn hai ngắt trang trong một bước hoàn tác", () => {
    const adapter = new WriterAdapter(null);
    let snapshots = [];
    adapter.flushTyping = () => {};
    adapter._initZones = () => {};
    adapter.recordSnapshot = description => snapshots.push(description);
    const host = { innerHTML: "<p>Đầu</p>" };
    adapter.bodyDom = host;
    adapter.insertBlankPage();
    const breaks = (host.innerHTML.match(/data-vno-page-break="true"/g) || []).length;
    assert(breaks === 2, `Trang trắng phải có 2 ngắt trang, thực tế ${breaks}`);
    assert(snapshots.length === 1 && snapshots[0] === "writer.page.blank", `phải đúng một bước hoàn tác: ${snapshots}`);
  });

  await test("Cỡ chữ: có mức 13 pt (chuẩn văn bản hành chính 13–14) cạnh 12 pt và 14 pt", () => {
    const home = WRITER_RIBBON_TABS.find(tab => tab.id === "home");
    const walk = items => (items || []).flatMap(item => [item, ...walk(item.items)]);
    const select = walk(home.groups).find(item => item.commandId === "writer.font.size");
    const labels = (select?.options || []).map(option => option.label);
    assert(labels.includes("12 pt") && labels.includes("13 pt") && labels.includes("14 pt (NĐ 30)"), `thiếu 13 pt: ${labels.join(", ")}`);
    assert(select.options.find(option => option.label === "13 pt").value === "13", "13 pt phải có giá trị 13");
  });
  await test("Bảng: hàng tiêu đề đổi thành <thead> khi xuất để lặp ở đầu mỗi trang; bảng không có hàng tiêu đề giữ nguyên", () => {
    const adapter = new WriterAdapter(null);
    const withHeader = '<table style="width:100%"><tbody><tr class="vno-table-header-row"><td>A</td></tr><tr><td>B</td></tr></tbody></table>';
    const out = adapter._tableHeaderRowsForExport(withHeader);
    assert(out === '<table style="width:100%"><thead><tr class="vno-table-header-row"><td>A</td></tr></thead><tbody><tr><td>B</td></tr></tbody></table>', `sai: ${out}`);
    const plain = '<table><tbody><tr><td>A</td></tr></tbody></table>';
    assert(adapter._tableHeaderRowsForExport(plain) === plain, "bảng thường không được đổi");
    const notFirst = '<table><tbody><tr><td>A</td></tr><tr class="vno-table-header-row"><td>B</td></tr></tbody></table>';
    assert(adapter._tableHeaderRowsForExport(notFirst) === notFirst, "chỉ hàng tiêu đề ở hàng ĐẦU mới được đổi");
  });
  await test("Tab: đoạn có ký tự Tab được thêm white-space: pre-wrap khi xuất (LibreOffice mới giữ w:tab); đoạn không có Tab giữ nguyên", () => {
    const adapter = new WriterAdapter(null);
    const out = adapter._tabCharactersForExport('<p style="tab-size: 1.27cm;">A<span class="vno-tab-character" data-vno-tab-character="true">\tB</span></p><p>C</p><li>D<span data-vno-tab-character="true">\t</span></li>');
    assert(out.includes('<p style="tab-size: 1.27cm; white-space: pre-wrap">A<span'), `đoạn có Tab chưa được thêm style: ${out}`);
    assert(out.includes("<p>C</p>"), "đoạn không có Tab không được đổi");
    assert(/<li style="white-space: pre-wrap">D/.test(out), `mục danh sách có Tab chưa được thêm style: ${out}`);
    assert(adapter._tabCharactersForExport(out) === out, "chạy lại không được chồng thêm style");
  });
  return results;
}