/**
 * Behavioral tests — Dán từ Word: danh sách đánh số gộp một <ol>, font có dấu nháy kép không phá style, mã chủ động bị loại.
 */
import { cleanWordHtml, cleanCssStyleString } from "../../platform/clipboard/office-clipboard.js";

export async function runOfficeClipboardWordPasteTests() {
  const results = [];
  const test = async (name, fn) => {
    try { await fn(); results.push({ name, pass: true }); } catch (error) { results.push({ name, pass: false, error: error.message }); }
  };
  const assert = (condition, message) => { if (!condition) throw new Error(message); };

  const WORD_LIST = `<p class=MsoListParagraph style='mso-list:l0 level1 lfo1'><![if !supportLists]><span style='mso-list:Ignore'>1.<span style='font:7.0pt "Times New Roman"'>&nbsp;&nbsp;&nbsp;&nbsp; </span></span><![endif]><span lang=VI>Muc mot</span></p>
<p class=MsoListParagraph style='mso-list:l0 level1 lfo1'><![if !supportLists]><span style='mso-list:Ignore'>2.</span><![endif]><span>Muc hai</span></p>`;

  await test("Dán danh sách đánh số của Word: một <ol> hai mục, không sót dấu số cũ hay thẻ span thừa", () => {
    const out = cleanWordHtml(WORD_LIST);
    assert((out.match(/<ol\b/g) || []).length === 1, `phải đúng một <ol>: ${out}`);
    assert((out.match(/<li>/g) || []).length === 2, "hai mục");
    assert(!/<ul\b/.test(out), "không phải danh sách chấm");
    assert(!/<!\[/.test(out), "không còn thẻ downlevel");
    assert(!/>\s*1\.\s*</.test(out) && !out.includes("Times New Roman"), "bỏ dấu số và span font 7pt của Word");
    assert((out.match(/<\/span>/g) || []).length === (out.match(/<span\b/g) || []).length, "thẻ span cân bằng");
  });

  await test("Danh sách chấm của Word vẫn là <ul>", () => {
    const out = cleanWordHtml(`<p class=MsoListParagraph style='mso-list:l1 level1 lfo2'><![if !supportLists]><span style='font-family:Symbol;mso-list:Ignore'>·<span style='font:7.0pt "Times New Roman"'>&nbsp;&nbsp;</span></span><![endif]>Cham mot</p>`);
    assert(/<ul\b/.test(out) && !/<ol\b/.test(out), out);
    assert(out.includes("Cham mot") && !out.includes("·"), out);
  });

  await test("Font có dấu nháy kép (Times New Roman) không phá thuộc tính style", () => {
    const css = cleanCssStyleString(`font-size:14.0pt;font-family:"Times New Roman",serif;mso-fareast-font-family:"Times New Roman";color:#112233`);
    assert(!css.includes('"'), css);
    assert(css.includes("font-family:'Times New Roman',serif") && css.includes("color:#112233"), css);
    const out = cleanWordHtml(`<p style='font-family:"Times New Roman",serif;text-align:justify'>Xin chào</p>`);
    assert(out === `<p style="font-family:'Times New Roman',serif;text-align:justify">Xin chào</p>`, out);
  });

  await test("An toàn: loại script, iframe, onerror, javascript: khi dán", () => {
    const out = cleanWordHtml(`<p>Chu</p><script>window.__x=1</script><iframe src="http://x"></iframe><img src="a.png" onerror="alert(1)"><a href="javascript:alert(1)">l</a><a href='JavaScript:evil()'>m</a>`);
    assert(!/<script|<iframe|onerror|javascript:/i.test(out), out);
    assert(out.includes("<p>Chu</p>") && out.includes('src="a.png"'), "nội dung hợp lệ được giữ");
  });

  return results;
}
