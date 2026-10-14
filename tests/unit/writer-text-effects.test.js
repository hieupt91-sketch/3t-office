/**
 * Behavioral tests — VN Writer: Text Effects (Text Outline, Shadow, Glow)
 */
import {
  OUTLINE_WIDTHS,
  SHADOW_PRESETS,
  GLOW_PRESETS,
  parseTextEffects,
  buildTextEffectsCss,
  applyTextEffectsToSpan
} from "../../apps/writer/text-effects-dialog.js";
import { WRITER_COMMANDS } from "../../platform/commands/command-definitions.js";
import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";
import { WRITER_HELP_ENTRIES } from "../../platform/help/entries-writer.js";

export async function runWriterTextEffectsTests() {
  const results = [];
  const test = async (name, fn) => {
    try {
      await fn();
      results.push({ name, pass: true });
    } catch (error) {
      results.push({ name, pass: false, error: error.message });
    }
  };
  const assert = (condition, message) => {
    if (!condition) throw new Error(message);
  };

  await test("Text Effects: Đăng ký đầy đủ 5 lệnh format trong command-definitions", () => {
    const required = [
      "writer.format.textEffects",
      "writer.format.textOutline",
      "writer.format.textShadow",
      "writer.format.textGlow",
      "writer.format.clearTextEffects"
    ];
    for (const cmdId of required) {
      assert(WRITER_COMMANDS.some(cmd => cmd.id === cmdId), `Thiếu lệnh ${cmdId}`);
    }
  });

  await test("Text Effects: Outline width, Shadow presets và Glow presets đầy đủ chuẩn", () => {
    assert(OUTLINE_WIDTHS.length >= 8, "Cần tối thiểu 8 mức độ dày viền chữ");
    assert(OUTLINE_WIDTHS.some(w => w.emu === 12700 && w.label === "1 pt"), "Mức 1 pt phải có emu = 12700");
    assert(SHADOW_PRESETS.some(s => s.id === "bottom-right"), "Thiếu preset shadow bottom-right");
    assert(GLOW_PRESETS.some(g => g.rad === 101600 && g.label.includes("8 pt")), "Thiếu preset glow 8 pt (101600 emu)");
  });

  await test("Text Effects: applyTextEffectsToSpan và parseTextEffects ghi/đọc chính xác dataset và CSS", () => {
    const span = {
      dataset: {},
      style: {},
      classList: {
        add: (cls) => { span.className = cls; },
        remove: () => { span.className = ""; }
      }
    };

    applyTextEffectsToSpan(span, {
      outline: { enabled: true, color: "#EF4444", widthEmu: 12700 },
      shadow: { enabled: true, preset: "bottom-right", color: "#000000" },
      glow: { enabled: true, radEmu: 101600, color: "#3B82F6" }
    });

    assert(span.dataset.vnoOutlineColor === "#EF4444", "vnoOutlineColor sai");
    assert(span.dataset.vnoOutlineWidth === "12700", "vnoOutlineWidth sai");
    assert(span.dataset.vnoShadow === "1", "vnoShadow sai");
    assert(span.dataset.vnoGlowRad === "101600", "vnoGlowRad sai");
    assert(span.dataset.vnoGlowColor === "#3B82F6", "vnoGlowColor sai");
    assert(span.className === "vno-text-effect", "chưa gắn class vno-text-effect");

    const parsed = parseTextEffects(span);
    assert(parsed.outline && parsed.outline.color === "#EF4444" && parsed.outline.widthEmu === 12700, "parse outline sai");
    assert(parsed.shadow && parsed.shadow.preset === "bottom-right", "parse shadow sai");
    assert(parsed.glow && parsed.glow.radEmu === 101600, "parse glow sai");

    // Xóa hiệu ứng
    applyTextEffectsToSpan(span, { outline: null, shadow: null, glow: null });
    assert(!span.dataset.vnoOutlineColor, "chưa xóa vnoOutlineColor");
    assert(!span.dataset.vnoShadow, "chưa xóa vnoShadow");
    assert(!span.dataset.vnoGlowColor, "chưa xóa vnoGlowColor");
    assert(span.className === "", "chưa bỏ class vno-text-effect");
  });

  await test("Text Effects: buildTextEffectsCss tạo cú pháp webkitTextStroke và textShadow hợp lệ", () => {
    const css = buildTextEffectsCss({
      outline: { enabled: true, color: "#10B981", widthEmu: 25400 },
      shadow: { enabled: true, preset: "bottom-right" },
      glow: { enabled: true, radEmu: 101600, color: "#F59E0B" }
    });
    assert(css["-webkit-text-stroke"].includes("#10B981"), "css text stroke thiếu mã màu");
    assert(css["text-shadow"].includes("2px 2px 3px"), "css text shadow thiếu preset bóng");
    assert(css["text-shadow"].includes("8px #F59E0B"), "css text shadow thiếu quầng sáng");
  });

  await test("Text Effects: Adapter _applyOoxmlTextEffects phục hồi thẻ span từ WordML 2010 khi mở DOCX", () => {
    const adapter = new WriterAdapter(null);
    const mockHtml = "<p>Văn bản mẫu có chữ nghệ thuật tại đây.</p>";
    const mockOoxml = `
      <w:p>
        <w:r>
          <w:rPr>
            <w:rFonts w:ascii="Times New Roman"/>
            <w14:textOutline w14:w="12700">
              <w14:solidFill><w14:srgbClr w14:val="FF0000"/></w14:solidFill>
            </w14:textOutline>
            <w14:shadow w14:blurRad="50800" w14:dist="38100" w14:dir="5400000">
              <w14:srgbClr w14:val="000000"><w14:alpha w14:val="50000"/></w14:srgbClr>
            </w14:shadow>
            <w14:glow w14:rad="101600">
              <w14:srgbClr w14:val="0000FF"><w14:alpha w14:val="60000"/></w14:srgbClr>
            </w14:glow>
          </w:rPr>
          <w:t>chữ nghệ thuật</w:t>
        </w:r>
      </w:p>
    `;

    const resultHtml = adapter._applyOoxmlTextEffects(mockHtml, mockOoxml);
    assert(resultHtml.includes("vno-text-effect"), "chưa gắn class vno-text-effect");
    assert(resultHtml.includes('data-vno-outline-color="#FF0000"'), "chưa phục hồi màu outline");
    assert(resultHtml.includes('data-vno-outline-width="12700"'), "chưa phục hồi độ dày outline");
    assert(resultHtml.includes('data-vno-shadow="1"'), "chưa phục hồi bóng shadow");
    assert(resultHtml.includes('data-vno-glow-color="#0000FF"'), "chưa phục hồi màu glow");
  });

  await test("Text Effects: Trợ giúp tiếng Việt đầy đủ và không chứa nhãn hiệu thương mại cấm", () => {
    const entry = WRITER_HELP_ENTRIES.find(h => h.id === "writer.format.textEffects");
    assert(entry, "Thiếu bài Trợ giúp cho writer.format.textEffects");
    assert(entry.steps && entry.steps.length >= 4, "Các bước hướng dẫn phải đầy đủ chi tiết");
    const fullText = JSON.stringify(entry);
    const banned = ["Word", "Excel", "PowerPoint"];
    for (const b of banned) {
      const re = new RegExp(`\\b${b}\\b`, "i");
      // Cho phép cụm từ kỹ thuật 'WordML 2010' nếu có, nhưng không cho phép 'Microsoft Word' hay 'Word' đơn độc
      const stripped = fullText.replace(/WordML\s*2010/gi, "");
      assert(!re.test(stripped), `Bài Trợ giúp chứa tên thương mại cấm: ${b}`);
    }
  });

  return results;
}
