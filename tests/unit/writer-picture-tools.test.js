/**
 * Behavioral tests — VN Writer: Picture Tools (Crop, Corrections, Compress, Reset)
 */
import {
  parseImageCrop,
  applyImageCrop,
  parseImageCorrections,
  applyImageCorrections,
  resetImageProperties,
  compressImageElement
} from "../../apps/writer/picture-tools-dialog.js";
import { WRITER_COMMANDS } from "../../platform/commands/command-definitions.js";
import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";

export async function runWriterPictureToolsTests() {
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

  await test("Picture Tools: Lệnh writer.image.* đã đăng ký đầy đủ", () => {
    const requiredCommands = [
      "writer.image.crop",
      "writer.image.corrections",
      "writer.image.changePicture",
      "writer.image.resetPicture",
      "writer.image.compress"
    ];
    for (const cmdId of requiredCommands) {
      const found = WRITER_COMMANDS.some(cmd => cmd.id === cmdId);
      assert(found, `Thiếu lệnh ${cmdId} trong WRITER_COMMANDS`);
    }
  });

  await test("Picture Tools: Cắt ảnh (Crop) theo 4 cạnh ghi nhận dataset và clipPath", () => {
    const img = {
      dataset: {},
      style: {}
    };

    // Áp dụng cắt: top 15%, right 10%, bottom 15%, left 10%
    applyImageCrop(img, { left: 10, top: 15, right: 10, bottom: 15 });
    assert(img.dataset.vnoCropL === "10", `vnoCropL sai: ${img.dataset.vnoCropL}`);
    assert(img.dataset.vnoCropT === "15", `vnoCropT sai: ${img.dataset.vnoCropT}`);
    assert(img.dataset.vnoCropR === "10", `vnoCropR sai: ${img.dataset.vnoCropR}`);
    assert(img.dataset.vnoCropB === "15", `vnoCropB sai: ${img.dataset.vnoCropB}`);
    assert(img.style.clipPath === "inset(15% 10% 15% 10%)", `clipPath sai: ${img.style.clipPath}`);

    // Đọc lại từ hàm parseImageCrop
    const parsed = parseImageCrop(img);
    assert(parsed.left === 10 && parsed.top === 15 && parsed.right === 10 && parsed.bottom === 15, "parseImageCrop không khớp");

    // Xóa cắt (về 0)
    applyImageCrop(img, { left: 0, top: 0, right: 0, bottom: 0 });
    assert(!img.dataset.vnoCropL, "dataset vnoCropL chưa được xóa khi về 0");
    assert(img.style.clipPath === "", "clipPath chưa được xóa");
  });

  await test("Picture Tools: Độ sáng và Độ tương phản (Corrections) ghi nhận dataset và filter", () => {
    const img = {
      dataset: {},
      style: {}
    };

    applyImageCorrections(img, { brightness: 20, contrast: -10 });
    assert(img.dataset.vnoBrightness === "20", `vnoBrightness sai: ${img.dataset.vnoBrightness}`);
    assert(img.dataset.vnoContrast === "-10", `vnoContrast sai: ${img.dataset.vnoContrast}`);
    assert(img.style.filter.includes("brightness(1.20)") && img.style.filter.includes("contrast(0.90)"), `filter sai: ${img.style.filter}`);

    const parsed = parseImageCorrections(img);
    assert(parsed.brightness === 20 && parsed.contrast === -10, "parseImageCorrections không khớp");

    // Đưa về 0
    applyImageCorrections(img, { brightness: 0, contrast: 0 });
    assert(!img.dataset.vnoBrightness && !img.dataset.vnoContrast, "dataset chưa xóa khi về 0");
    assert(img.style.filter === "", "filter chưa xóa");
  });

  await test("Picture Tools: Reset Picture xóa toàn bộ crop, corrections và đặt vnoPicReset", () => {
    const img = {
      dataset: { vnoCropL: "10", vnoBrightness: "25" },
      style: { clipPath: "inset(10% 10% 10% 10%)", filter: "brightness(1.25)", width: "300px", height: "200px" },
      naturalWidth: 640,
      naturalHeight: 480
    };

    resetImageProperties(img);
    assert(!img.dataset.vnoCropL, "crop chưa được xóa khi reset");
    assert(!img.dataset.vnoBrightness, "brightness chưa được xóa khi reset");
    assert(img.dataset.vnoPicReset === "1", "thiếu vnoPicReset = 1 để backend nhận biết");
    assert(img.style.clipPath === "", "clipPath chưa rỗng");
    assert(img.style.filter === "", "filter chưa rỗng");
    assert(img.style.width === "640px" && img.style.height === "480px", "kích thước chưa trả về kích thước gốc");
  });

  await test("Picture Tools: Nén ảnh (Compress) xử lý an toàn khi không có canvas/DOM", async () => {
    const res = await compressImageElement({ src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAAAAAA6fptVAAAACklEQVR4nGNiAAAABgADNjd8qAAAAABJRU5ErkJggg==" });
    assert(res.success === true, "compressImageElement phải trả về success");
  });

  await test("Picture Tools: Adapter _applyOoxmlImageProperties đọc srcRect và lum từ OOXML vào HTML", () => {
    const adapter = new WriterAdapter(null);
    const mockHtml = '<p>Đoạn có ảnh: <img src="test.png" width="100"></p>';
    const mockOoxml = `
      <w:p>
        <w:r>
          <w:drawing>
            <wp:inline>
              <a:graphic>
                <a:graphicData>
                  <pic:pic>
                    <pic:blipFill>
                      <a:blip r:embed="rId1">
                        <a:lum bright="20000" contrast="20000"/>
                      </a:blip>
                      <a:srcRect l="10000" t="15000" r="10000" b="15000"/>
                      <a:stretch><a:fillRect/></a:stretch>
                    </pic:blipFill>
                  </pic:pic>
                </a:graphicData>
              </a:graphic>
            </wp:inline>
          </w:drawing>
        </w:r>
      </w:p>
    `;

    const resultHtml = adapter._applyOoxmlImageProperties(mockHtml, mockOoxml);
    assert(resultHtml.includes('data-vno-crop-l="10"'), "chưa khôi phục crop left");
    assert(resultHtml.includes('data-vno-crop-t="15"'), "chưa khôi phục crop top");
    assert(resultHtml.includes('data-vno-brightness="20"'), "chưa khôi phục brightness");
    assert(resultHtml.includes('data-vno-contrast="20"'), "chưa khôi phục contrast");
    assert(resultHtml.includes("clip-path: inset(15% 10% 15% 10%)"), "chưa có style clip-path");
    assert(resultHtml.includes("filter: brightness(1.20) contrast(1.20)"), "chưa có style filter");
  });

  return results;
}
