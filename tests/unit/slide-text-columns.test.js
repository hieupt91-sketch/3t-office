/**
 * Test Suite: chia cột văn bản trong khung chữ Slides — ghi FODP (style:columns) và đọc lại.
 */
import { SlidesAdapter } from "../../adapters/libreoffice/slides/slides-adapter.js";

export async function runSlideTextColumnsTests() {
  const results = [];
  const test = (name, fn) => {
    try { fn(); results.push({ name, pass: true }); } catch (error) { results.push({ name, pass: false, error: error.message }); }
  };
  const makeAdapter = shapes => new SlidesAdapter({ slides: [{ id: 1, title: "Cot", body: "", layoutType: "blank", shapes }] });
  const text = "Mot hai ba bon nam sau bay tam chin muoi. ".repeat(10);

  test("Khung chữ hai cột: ghi <style:columns fo:column-count=2> với khoảng cách đúng (24 px = 0,635 cm)", () => {
    const fodp = makeAdapter([{ id: "t1", type: "textbox", x: 40, y: 80, w: 600, h: 200, text, textColumns: 2, columnSpacing: 24, color: "transparent" }]).serializeToFodp();
    const match = /<style:columns[^>]*>/.exec(fodp);
    if (!match) throw new Error("không ghi style:columns");
    if (!/fo:column-count="2"/.test(match[0])) throw new Error(`số cột sai: ${match[0]}`);
    const gap = /fo:column-gap="([\d.]+)cm"/.exec(match[0]);
    if (!gap || Math.abs(Number(gap[1]) - 0.635) > 0.01) throw new Error(`khoảng cách sai: ${match[0]}`);
  });

  test("Khung chữ một cột (mặc định) không ghi style:columns và dùng lại kiểu chung grNone", () => {
    const fodp = makeAdapter([{ id: "t2", type: "textbox", x: 40, y: 80, w: 600, h: 200, text, color: "transparent" }]).serializeToFodp();
    if (/style:columns/.test(fodp)) throw new Error("không được ghi cột khi một cột");
    if (!/draw:style-name="grNone"/.test(fodp)) throw new Error("mất kiểu chung grNone");
  });

  test("Hai khung có số cột khác nhau dùng hai kiểu riêng; khung không chia cột giữ kiểu cũ", () => {
    const fodp = makeAdapter([
      { id: "a", type: "textbox", x: 0, y: 0, w: 300, h: 100, text, textColumns: 2, color: "transparent" },
      { id: "b", type: "textbox", x: 0, y: 120, w: 300, h: 100, text, textColumns: 3, color: "transparent" },
      { id: "c", type: "textbox", x: 0, y: 240, w: 300, h: 100, text, color: "transparent" }
    ]).serializeToFodp();
    const counts = [...fodp.matchAll(/fo:column-count="(\d)"/g)].map(m => m[1]).sort();
    if (counts.join() !== "2,3") throw new Error(`các kiểu cột: ${counts}`);
  });

  test("Khứ hồi FODP: số cột và khoảng cách đọc lại đúng", () => {
    const adapter = makeAdapter([{ id: "t3", type: "textbox", x: 40, y: 80, w: 600, h: 200, text, textColumns: 3, columnSpacing: 30, color: "transparent" }]);
    const parsed = adapter.parseFodp(adapter.serializeToFodp())[0].shapes.find(item => String(item.id) === "t3");
    if (!parsed) throw new Error("mất khung chữ");
    if (parsed.textColumns !== 3) throw new Error(`textColumns = ${parsed.textColumns}`);
    if (Math.abs(parsed.columnSpacing - 30) > 1) throw new Error(`columnSpacing = ${parsed.columnSpacing}`);
  });

  test("Tệp từ LibreOffice/PowerPoint: <style:columns> với hàng <style:column> con vẫn đọc được", () => {
    const fodp = `<office:document><office:automatic-styles>
      <style:style style:name="gr4" style:family="graphic" style:parent-style-name="standard"><style:graphic-properties draw:stroke="none" draw:fill="none">
        <style:columns fo:column-count="2" fo:column-gap="0.635cm"><style:column style:rel-width="32767*" fo:start-indent="0cm" fo:end-indent="0.317cm"/><style:column style:rel-width="32768*" fo:start-indent="0.317cm" fo:end-indent="0cm"/></style:columns>
      </style:graphic-properties></style:style></office:automatic-styles><office:body><office:presentation>
      <draw:page draw:name="p1"><draw:custom-shape draw:name="x1" draw:style-name="gr4" svg:width="8cm" svg:height="5cm" svg:x="1cm" svg:y="1cm"><text:p>Xin chao</text:p></draw:custom-shape></draw:page>
      </office:presentation></office:body></office:document>`;
    const shape = new SlidesAdapter({ slides: [] }).parseFodp(fodp)[0].shapes[0];
    if (shape.textColumns !== 2) throw new Error(`textColumns = ${shape.textColumns}`);
  });

  return results;
}