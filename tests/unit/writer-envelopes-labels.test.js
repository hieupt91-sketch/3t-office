/**
 * VN Writer — Phong bì (Envelopes) & Nhãn (Labels)
 */

import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";
import {
  ENVELOPE_SIZES,
  LABEL_LAYOUTS,
  buildEnvelopeHtml,
  buildLabelSheetHtml,
  formatRecordAsAddress,
  paginateLabelContents
} from "../../apps/writer/envelopes-labels.js";
import { parseCsv } from "../../apps/writer/mail-merge.js";
import { WRITER_COMMANDS } from "../../platform/commands/command-definitions.js";
import { WRITER_RIBBON_TABS } from "../../apps/writer/writer-ribbon.js";
import { WRITER_HELP_ENTRIES } from "../../platform/help/entries-writer.js";
import { ICONS } from "../../platform/ui-kit/icons.js";
import { viStrings } from "../../platform/i18n/strings-vi.js";
import { enStrings } from "../../platform/i18n/strings-en.js";

function assert(value, message) {
  if (!value) throw new Error(message);
}

function createAdapter(html = "<p>Nội dung công văn mẫu</p>") {
  const body = {
    innerHTML: html,
    innerText: "Nội dung công văn mẫu",
    contains: () => true,
    querySelectorAll: () => [],
    querySelector: () => null,
    classList: { add() {}, remove() {}, toggle() {} },
    style: {}
  };
  const header = { innerHTML: "", innerText: "" };
  const footer = { innerHTML: "", innerText: "" };
  const style = { setProperty() {} };
  const editor = {
    style,
    innerHTML: html,
    querySelector(selector) {
      if (selector === ".vno-writer-body") return body;
      if (selector === ".vno-writer-header") return header;
      if (selector === ".vno-writer-footer") return footer;
      return null;
    },
    closest() { return { style: { setProperty() {} } }; },
    addEventListener() {},
    removeEventListener() {}
  };
  return { adapter: new WriterAdapter(editor), editor, body };
}

function flattenRibbonItems(items = []) {
  return items.flatMap((item) => (item.items ? flattenRibbonItems(item.items) : [item]));
}

export async function runWriterEnvelopesLabelsTests() {
  const results = [];
  const test = async (name, fn) => {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.message });
    }
  };

  await test("Writer Envelopes/Labels: command, ribbon nhóm Tạo, icon, i18n, Help", () => {
    for (const id of ["writer.mailings.envelopes", "writer.mailings.labels"]) {
      assert(WRITER_COMMANDS.some((item) => item.id === id), `Thiếu command ${id}`);
      assert(viStrings.commands[id]?.label, `Thiếu i18n VI ${id}`);
      assert(enStrings.commands[id]?.label, `Thiếu i18n EN ${id}`);
    }
    const mailings = WRITER_RIBBON_TABS.find((tab) => tab.id === "mailings");
    const createGroup = mailings?.groups.find((group) => group.labelKey === "writerRibbon.group.createMailings");
    const ids = flattenRibbonItems(createGroup?.items || []).map((item) => item.commandId);
    assert(ids.includes("writer.mailings.envelopes"), "Ribbon thiếu Phong bì trong nhóm Tạo");
    assert(ids.includes("writer.mailings.labels"), "Ribbon thiếu Nhãn trong nhóm Tạo");
    assert(createGroup?.label === "Tạo", "Nhóm ribbon phải tên Tạo");
    assert(ICONS.envelope?.includes("<svg") && !ICONS.envelope.includes("circle generic"), "Thiếu icon envelope");
    assert(ICONS.labels?.includes("<svg"), "Thiếu icon labels");
    const envHelp = WRITER_HELP_ENTRIES.find((entry) => entry.id === "writer.mailings.envelopes");
    const labelHelp = WRITER_HELP_ENTRIES.find((entry) => entry.id === "writer.mailings.labels");
    assert(envHelp?.steps?.length >= 4 && envHelp.ribbon.group === "Tạo", "Help Phong bì thiếu bước/vị trí");
    assert(labelHelp?.steps?.length >= 4 && labelHelp.ribbon.group === "Tạo", "Help Nhãn thiếu bước/vị trí");
    assert(viStrings.writerRibbon.group.createMailings === "Tạo", "Thiếu i18n nhóm Tạo");
    assert(enStrings.writerRibbon.group.createMailings === "Create", "Thiếu i18n EN Create");
  });

  await test("Writer Envelopes: HTML phong bì đặt người gửi trên-trái và người nhận giữa-dưới", () => {
    const html = buildEnvelopeHtml({
      sizeId: "dl",
      deliveryAddress: "Nguyễn Văn An\nSố 18, ngõ 12 Phố Huế\nHoàn Kiếm, Hà Nội",
      returnAddress: "Sở Thông tin và Truyền thông\n25 Láng Hạ\nĐống Đa, Hà Nội"
    });
    assert(html.includes('data-vno-envelope-size="dl"'), "Thiếu data size DL");
    assert(html.includes("width:220mm") && html.includes("height:110mm"), "Khổ DL không đúng mm");
    assert(/data-vno-envelope-role="return"[^>]*top:10mm/.test(html) && html.includes("left:12mm"), "Người gửi không ở góc trên-trái");
    assert(/data-vno-envelope-role="delivery"[^>]*top:52%/.test(html) && html.includes("left:42%"), "Người nhận không ở giữa-dưới");
    assert(html.includes("Nguyễn Văn An") && html.includes("Sở Thông tin và Truyền thông"), "Thiếu địa chỉ thật");
  });

  await test("Writer Envelopes: thêm phong bì DL vào cuối — khổ trang mm, vị trí địa chỉ, canvas", () => {
    const { adapter, editor, body } = createAdapter("<p>Công văn gốc</p>");
    const ok = adapter.insertEnvelope({
      size: "dl",
      deliveryAddress: "Nguyễn Văn An\nSố 18, ngõ 12 Phố Huế\nHoàn Kiếm, Hà Nội",
      returnAddress: "Sở Thông tin và Truyền thông\n25 Láng Hạ\nĐống Đa, Hà Nội",
      position: "end"
    });
    assert(ok, "insertEnvelope thất bại");
    assert(adapter.pageSetup.size === "dl", `size=${adapter.pageSetup.size}`);
    assert(adapter.pageSetup.orientation === "portrait", "orientation phải portrait (không hoán w/h)");
    const widthPx = parseFloat(editor.style.width);
    const expectedPx = Number((220 * 3.7795275591).toFixed(1));
    assert(Math.abs(widthPx - expectedPx) < 0.2, `Canvas width ${widthPx} ≠ ${expectedPx}px (220mm)`);
    assert(body.innerHTML.includes("width:220mm") && body.innerHTML.includes("height:110mm"), "Trang phong bì thiếu kích thước mm");
    assert(body.innerHTML.includes('data-vno-envelope-role="delivery"') && body.innerHTML.includes("Nguyễn Văn An"), "Thiếu địa chỉ người nhận");
    assert(body.innerHTML.includes("top:52%") && body.innerHTML.includes("left:42%"), "Người nhận lệch vị trí giữa-dưới");
    assert(body.innerHTML.includes("Sở Thông tin và Truyền thông") && body.innerHTML.includes("top:10mm") && body.innerHTML.includes("left:12mm"), "Người gửi lệch góc trên-trái");
    assert(body.innerHTML.includes("Công văn gốc"), "Mất nội dung gốc");
    const exported = adapter._contentForExport();
    assert(exported.includes("size:220mm 110mm") || exported.includes("size: 220mm 110mm"), `Export thiếu khổ DL: ${exported.slice(0, 180)}`);
  });

  await test("Writer Envelopes: C5 và Number 10 có đúng mm; ẩn người gửi khi omitReturn", () => {
    const { adapter, body } = createAdapter();
    adapter.insertEnvelope({
      size: "c5",
      deliveryAddress: "Trần Thị Bình\n12 Lê Lợi, Huế",
      omitReturn: true,
      returnAddress: "Không được hiện",
      position: "end"
    });
    assert(adapter.pageSetup.size === "c5", "Không đổi sang C5");
    assert(body.innerHTML.includes("width:229mm") && body.innerHTML.includes("height:162mm"), "C5 sai mm");
    assert(!body.innerHTML.includes("Không được hiện"), "Vẫn hiện địa chỉ người gửi khi đã ẩn");
    assert(ENVELOPE_SIZES.number10.w === 241.3 && ENVELOPE_SIZES.number10.h === 104.8, "Number 10 sai kích thước");
  });

  await test("Writer Envelopes: chèn đầu tài liệu rồi Undo/Redo khôi phục khổ và nội dung", () => {
    const { adapter, body } = createAdapter("<p>Đoạn gốc A4</p>");
    assert(adapter.pageSetup.size === "a4", "Mặc định phải A4");
    adapter.insertEnvelope({
      size: "dl",
      deliveryAddress: "Lê Văn Cường\n45 Nguyễn Huệ, Đà Nẵng",
      returnAddress: "UBND phường",
      position: "start"
    });
    assert(body.innerHTML.indexOf("Lê Văn Cường") < body.innerHTML.indexOf("Đoạn gốc A4"), "Phong bì không nằm trước nội dung gốc");
    assert(adapter.pageSetup.size === "dl", "Canvas phải chuyển khổ phong bì");
    assert(adapter.undo(), "Undo envelope thất bại");
    assert(adapter.pageSetup.size === "a4", "Undo không trả khổ A4");
    assert(!body.innerHTML.includes("data-vno-envelope="), "Undo còn trang phong bì");
    assert(body.innerHTML.includes("Đoạn gốc A4"), "Undo mất nội dung gốc");
    assert(adapter.redo(), "Redo envelope thất bại");
    assert(adapter.pageSetup.size === "dl", "Redo không trả khổ DL");
    assert(body.innerHTML.includes("Lê Văn Cường"), "Redo mất địa chỉ");
  });

  await test("Writer Envelopes: Mail Merge hàng loạt — mỗi trang một bản ghi khác nhau", () => {
    const { adapter, body } = createAdapter("<p>Thư gốc</p>");
    const parsed = parseCsv("HoTen,ChucVu,DonVi\nNguyễn Văn A,Trưởng phòng,Sở TTTT\nTrần Thị B,Phó Giám đốc,Sở KHĐT");
    adapter.mailMergeData = { rawCsv: "", fields: parsed.fields, records: parsed.records };
    const ok = adapter.insertEnvelope({ size: "dl", useMailMerge: true, returnAddress: "Cơ quan gửi", position: "end" });
    assert(ok, "Mail merge envelope thất bại");
    const pages = body.innerHTML.split('data-vno-envelope="true"');
    assert(pages.length - 1 === 2, `Phải có 2 trang phong bì, được ${pages.length - 1}`);
    assert(body.innerHTML.includes("Nguyễn Văn A") && body.innerHTML.includes("Trần Thị B"), "Thiếu địa chỉ từ bản ghi");
    assert(body.innerHTML.includes("Sở TTTT") && body.innerHTML.includes("Sở KHĐT"), "Thiếu đơn vị từ CSV");
    const first = body.innerHTML.indexOf("Nguyễn Văn A");
    const second = body.innerHTML.indexOf("Trần Thị B");
    assert(first >= 0 && second > first, "Thứ tự bản ghi sai");
  });

  await test("Writer Labels: một nội dung — mọi ô giống nhau, lưới 3×8 đúng mm", () => {
    const { adapter, body } = createAdapter("<p>Tài liệu</p>");
    const content = "Công ty TNHH Sao Việt\nTầng 5, 25 Láng Hạ\nĐống Đa, Hà Nội";
    const ok = adapter.insertLabels({ layout: "avery-3x8", content });
    assert(ok, "insertLabels thất bại");
    assert(adapter.pageSetup.size === "a4", "Tờ nhãn phải khổ A4");
    assert(body.innerHTML.includes('data-vno-label-layout="avery-3x8"'), "Thiếu layout 3x8");
    assert(body.innerHTML.includes("width:66mm") && body.innerHTML.includes("height:34mm"), "Ô 3×8 sai mm");
    const cellMatches = body.innerHTML.match(/data-vno-label-index="/g) || [];
    assert(cellMatches.length === 24, `3×8 phải 24 ô, được ${cellMatches.length}`);
    const contentCount = body.innerHTML.split("Công ty TNHH Sao Việt").length - 1;
    assert(contentCount === 24, `Mọi ô phải cùng nội dung, được ${contentCount}`);
    assert(LABEL_LAYOUTS["avery-l7160"].cellW === 63.5 && LABEL_LAYOUTS["avery-l7160"].cellH === 38.1, "Avery L7160 sai 63.5×38.1");
    assert(LABEL_LAYOUTS["avery-l7160"].cols === 3 && LABEL_LAYOUTS["avery-l7160"].rows === 7, "Avery L7160 phải 3×7");
  });

  await test("Writer Labels: Mail Merge 2 bản ghi — mỗi ô một bản ghi, không copy giống nhau", () => {
    const { adapter, body } = createAdapter("<p>Danh sách</p>");
    const parsed = parseCsv([
      "HoTen,ChucVu,DonVi",
      "Nguyễn Văn A,Trưởng phòng,Sở Thông tin và Truyền thông",
      "Trần Thị B,Phó Giám đốc,Sở Kế hoạch và Đầu tư"
    ].join("\n"));
    adapter.mailMergeData = { rawCsv: "", fields: parsed.fields, records: parsed.records };
    const ok = adapter.insertLabels({ layout: "avery-l7160", useMailMerge: true });
    assert(ok, "insertLabels mail merge thất bại");
    assert(body.innerHTML.includes("Nguyễn Văn A") && body.innerHTML.includes("Trần Thị B"), "Thiếu 2 bản ghi");
    const html = buildLabelSheetHtml({
      layout: "avery-l7160",
      contents: parsed.records.map((record) => formatRecordAsAddress(record, parsed.fields))
    });
    const cell0 = html.match(/data-vno-label-index="0"[^>]*>([\s\S]*?)<\/td>/);
    const cell1 = html.match(/data-vno-label-index="1"[^>]*>([\s\S]*?)<\/td>/);
    const cell2 = html.match(/data-vno-label-index="2"[^>]*>([\s\S]*?)<\/td>/);
    assert(cell0 && cell0[1].includes("Nguyễn Văn A"), `Ô 0 sai: ${cell0 && cell0[1]}`);
    assert(cell1 && cell1[1].includes("Trần Thị B"), `Ô 1 sai: ${cell1 && cell1[1]}`);
    assert(cell0[1] !== cell1[1], "Hai bản ghi khác nhau nhưng hai ô giống nhau");
    assert(cell2 && cell2[1].trim() === "", "Ô còn lại phải trống khi chỉ có 2 bản ghi");
    assert(body.innerHTML.includes("Sở Thông tin và Truyền thông"), "Ô 0 thiếu đơn vị bản ghi 1");
    assert(body.innerHTML.includes("Sở Kế hoạch và Đầu tư"), "Ô 1 thiếu đơn vị bản ghi 2");
    const countA = (body.innerHTML.match(/Nguyễn Văn A/g) || []).length;
    const countB = (body.innerHTML.match(/Trần Thị B/g) || []).length;
    assert(countA === 1, `Bản ghi 1 bị lặp ${countA} lần`);
    assert(countB === 1, `Bản ghi 2 bị lặp ${countB} lần`);
  });

  await test("Writer Labels: hơn một tờ khi dữ liệu vượt số ô; Undo/Redo", () => {
    const { adapter, body } = createAdapter("<p>Gốc</p>");
    const records = [];
    for (let i = 1; i <= 22; i++) records.push({ Ten: `Người ${i}`, DiaChi: `Địa chỉ ${i}` });
    adapter.mailMergeData = { rawCsv: "", fields: ["Ten", "DiaChi"], records };
    adapter.insertLabels({ layout: "avery-l7160", useMailMerge: true });
    const sheets = body.innerHTML.split('data-vno-labels="true"');
    assert(sheets.length - 1 === 2, `22 bản ghi / 21 ô phải 2 tờ, được ${sheets.length - 1}`);
    assert(body.innerHTML.includes("Người 1") && body.innerHTML.includes("Người 22"), "Thiếu bản ghi đầu/cuối");
    const pages = paginateLabelContents(records.map((r) => r.Ten), LABEL_LAYOUTS["avery-l7160"]);
    assert(pages.length === 2 && pages[0].length === 21 && pages[1].length === 1, "paginateLabelContents sai");
    assert(adapter.undo(), "Undo labels thất bại");
    assert(!body.innerHTML.includes("data-vno-labels="), "Undo còn tờ nhãn");
    assert(body.innerHTML.includes("Gốc"), "Undo mất nội dung gốc");
    assert(adapter.redo(), "Redo labels thất bại");
    assert(body.innerHTML.includes("Người 22"), "Redo mất bản ghi cuối");
  });

  await test("Writer Envelopes/Labels: handleDispatch an toàn khi args = null; từ chối dữ liệu trống", async () => {
    const { adapter } = createAdapter();
    const originalDocument = globalThis.document;
    try {
      globalThis.document = undefined;
      adapter.attach();
      const env = await adapter.handleDispatch(null, null, "writer.mailings.envelopes");
      const labels = await adapter.handleDispatch(null, null, "writer.mailings.labels");
      assert(env === false || env == null, "Không DOM phải trả false/null, không ném");
      assert(labels === false || labels == null, "Labels không DOM phải an toàn");
    } finally {
      globalThis.document = originalDocument;
    }
    assert(adapter.insertEnvelope({}) === false, "Envelope trống phải từ chối");
    assert(adapter.insertLabels({}) === false, "Labels trống phải từ chối");
    assert(adapter.insertEnvelope({ useMailMerge: true }) === false, "Mail merge rỗng phải từ chối");
    assert(adapter.insertEnvelope(null) === false, "insertEnvelope(null) không được ném");
    assert(adapter.insertLabels(null) === false, "insertLabels(null) không được ném");
  });

  return results;
}
