import { SlidesAdapter } from "../../adapters/libreoffice/slides/slides-adapter.js";

export async function runSlidesFontDialogTests() {
  const results = [];
  const test = (name, fn) => {
    try { fn(); results.push({ name, pass: true }); }
    catch (error) { results.push({ name, pass: false, error: error.message }); }
  };
  const adapter = new SlidesAdapter(null);
  const toOdf = (html) => {
    const ctx = adapter._newRichTextContext();
    const body = adapter._htmlToOdfXml(html, ctx);
    return { body, styles: adapter._serializeRichTextStyles ? adapter._serializeRichTextStyles(ctx) : "" , ctx };
  };
  const textStyleAttrs = (html) => toOdf(html).ctx.textStyles.map((style) => style.props);

  test("Khoảng cách ký tự (letter-spacing) đi vào kiểu chữ ODF theo pt tài liệu", () => {
    const props = textStyleAttrs('<span style="letter-spacing:3px">AB</span>');
    if (!props.some((p) => /pt$/.test(p.spacing || ""))) throw new Error(JSON.stringify(props));
  });

  test("Chỉ số trên/dưới, chữ hoa, chữ hoa nhỏ được nhận từ HTML", () => {
    const sup = textStyleAttrs("<sup>2</sup>");
    const sub = textStyleAttrs("<sub>2</sub>");
    const caps = textStyleAttrs('<span style="text-transform:uppercase;font-variant:small-caps">a</span>');
    if (!sup.some((p) => p.position === "super")) throw new Error("sup: " + JSON.stringify(sup));
    if (!sub.some((p) => p.position === "sub")) throw new Error("sub: " + JSON.stringify(sub));
    if (!caps.some((p) => p.caps === "uppercase" && p.smallCaps === true)) throw new Error("caps: " + JSON.stringify(caps));
  });

  test("Gạch chân đôi và gạch ngang đôi được nhận từ text-decoration", () => {
    const under = textStyleAttrs('<span style="text-decoration:underline double">a</span>');
    const strike = textStyleAttrs('<span style="text-decoration:line-through double">a</span>');
    if (!under.some((p) => p.underline && p.underlineStyle === "double")) throw new Error("under: " + JSON.stringify(under));
    if (!strike.some((p) => p.strike && p.strikeStyle === "double")) throw new Error("strike: " + JSON.stringify(strike));
  });

  test("ODF text-properties khứ hồi về HTML: giãn ký tự, chỉ số trên, chữ hoa, gạch chân đôi", () => {
    const maps = adapter._parseRichStyleMaps(
      '<style:style style:name="T1" style:family="text"><style:text-properties fo:letter-spacing="3pt" style:text-position="super 58%" fo:text-transform="uppercase" fo:font-variant="small-caps" style:text-underline-style="solid" style:text-underline-type="double"/></style:style>'
    );
    const html = adapter._odfInlineToHtml('<text:span text:style-name="T1">Ab</text:span>', maps);
    for (const part of [/<sup>/, /letter-spacing:/, /text-transform:uppercase/, /font-variant:small-caps/, /underline double/]) {
      if (!part.test(html)) throw new Error(`thiếu ${part}: ${html}`);
    }
  });

  test("LibreOffice ghi text-position phần trăm (33% 58%, -33% 58%) vẫn nhận đúng trên/dưới", () => {
    if (adapter._odfTextPosition("33% 58%") !== "super" || adapter._odfTextPosition("-33% 58%") !== "sub" || adapter._odfTextPosition("0% 100%") !== null) {
      throw new Error("text-position");
    }
  });

  test("Hộp thoại Phông chữ dùng chung nằm ở platform và Writer vẫn xuất lại được", async () => {
    const platform = await import("../../platform/dialogs/font-dialog.js");
    const writer = await import("../../apps/writer/font-dialog.js");
    if (platform.showFontDialog !== writer.showFontDialog) throw new Error("Writer không dùng lại bản platform");
  });

  return results;
}
