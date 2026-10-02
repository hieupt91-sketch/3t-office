import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const playwrightRoot = "C:/Users/3T Computer/AppData/Local/Temp/vno-playwright-tools";
const { chromium } = await import(pathToFileURL(path.join(playwrightRoot, "node_modules/playwright-core/index.mjs")));

const repoRoot = "E:/VNOffice-agy-web";
const webDir = path.join(repoRoot, "server/3t-web");
const brandDir = path.join(webDir, "assets/brand");

if (!fs.existsSync(brandDir)) {
  fs.mkdirSync(brandDir, { recursive: true });
}

function buildIco(images) {
  // images: array of { width, height, buffer }
  const headerSize = 6;
  const dirEntrySize = 16;
  const count = images.length;
  let offset = headerSize + dirEntrySize * count;

  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type 1 = icon
  header.writeUInt16LE(count, 4); // count

  const entries = [];
  const bodies = [];

  for (const img of images) {
    const entry = Buffer.alloc(dirEntrySize);
    entry.writeUInt8(img.width >= 256 ? 0 : img.width, 0);
    entry.writeUInt8(img.height >= 256 ? 0 : img.height, 1);
    entry.writeUInt8(0, 2); // color palette count
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(img.buffer.length, 8); // size
    entry.writeUInt32LE(offset, 12); // offset

    entries.push(entry);
    bodies.push(img.buffer);
    offset += img.buffer.length;
  }

  return Buffer.concat([header, ...entries, ...bodies]);
}

async function generateAssets() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
  });
  const page = await browser.newPage();
  
  const imgPath = "C:/Users/3TCOMP~1/AppData/Local/Temp/claude/E--VN-OFice/a43656e9-bd73-4e02-842c-dd9db15498b4/scratchpad/logo-3t-candidate.png";
  const imgBase64 = fs.readFileSync(imgPath).toString("base64");

  await page.setContent(`<!DOCTYPE html><html><body><img id="raw-logo" src="data:image/png;base64,${imgBase64}"></body></html>`);

  const generated = await page.evaluate(async () => {
    const rawImg = document.getElementById("raw-logo");
    
    // Draw raw image to source canvas
    const rawCanvas = document.createElement("canvas");
    rawCanvas.width = rawImg.naturalWidth;
    rawCanvas.height = rawImg.naturalHeight;
    const rawCtx = rawCanvas.getContext("2d");
    rawCtx.drawImage(rawImg, 0, 0);

    // Cắt sát viền chữ 3T chuẩn xác (loại bỏ đuôi thừa bên dưới và hào quang ngoài viền)
    // Tọa độ đã đo đạc chính xác:
    // Trái: x = 143 (mép trái các ô vuông cam)
    // Phải: x = 902 (mép phải các ô vuông xanh)
    // Đỉnh: y = 290 (đỉnh phẳng của chữ 3 và T)
    // Đáy:  y = 702 (đáy phẳng của chữ T và đáy cong của chữ 3, mũi nhọn chéo chạm đáy tự nhiên)
    const cropX = 143;
    const cropY = 290;
    const cropW = 902 - 143 + 1; // 760
    const cropH = 702 - 290 + 1; // 413

    // Master cropped canvas
    const masterCanvas = document.createElement("canvas");
    masterCanvas.width = cropW;
    masterCanvas.height = cropH;
    const masterCtx = masterCanvas.getContext("2d");
    masterCtx.drawImage(rawCanvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);

    // Làm sạch hoàn toàn hào quang nền mờ (các pixel phát sáng / bụi rác có alpha < 18)
    const imgData = masterCtx.getImageData(0, 0, cropW, cropH);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 18) {
        d[i + 3] = 0; // hoàn toàn trong suốt
      }
    }
    masterCtx.putImageData(imgData, 0, 0);

    const aspect = cropH / cropW; // ~0.5434

    function toResized(targetW, targetH) {
      const c = document.createElement("canvas");
      c.width = targetW;
      c.height = targetH;
      const ctx = c.getContext("2d");
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(masterCanvas, 0, 0, cropW, cropH, 0, 0, targetW, targetH);
      return c;
    }

    function toSquareFavicon(size) {
      const c = document.createElement("canvas");
      c.width = size;
      c.height = size;
      const ctx = c.getContext("2d");
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";

      // Scale vừa vặn theo chiều ngang (full width), căn giữa theo chiều dọc
      const drawW = size;
      const drawH = Math.round(drawW * aspect);
      const drawX = 0;
      const drawY = Math.round((size - drawH) / 2);
      ctx.drawImage(masterCanvas, 0, 0, cropW, cropH, drawX, drawY, drawW, drawH);

      // Tăng cường độ rõ nét cho kích thước cực nhỏ 16x16
      if (size === 16) {
        const pData = ctx.getImageData(0, 0, size, size);
        const px = pData.data;
        for (let i = 0; i < px.length; i += 4) {
          if (px[i + 3] > 30) {
            px[i + 3] = Math.min(255, Math.round(px[i + 3] * 1.3));
          }
        }
        ctx.putImageData(pData, 0, 0);
      }

      return c;
    }

    // Helper for data URLs
    const exportImage = (c) => ({
      png: c.toDataURL("image/png").split(",")[1],
      webp: c.toDataURL("image/webp", 0.95).split(",")[1]
    });

    // 1. Master logo (512px wide cho Retina display cực kỳ sắc nét)
    const master512 = toResized(512, Math.round(512 * aspect));
    const masterExport = exportImage(master512);

    // 2. 256px wide (proportional)
    const c256 = toResized(256, Math.round(256 * aspect));
    const exp256 = exportImage(c256);

    // 3. 128px wide
    const c128 = toResized(128, Math.round(128 * aspect));
    const exp128 = exportImage(c128);

    // 4. 64px wide
    const c64 = toResized(64, Math.round(64 * aspect));
    const exp64 = exportImage(c64);

    // 5. Favicons (Vuông 16, 32, 48)
    const fav16 = toSquareFavicon(16);
    const fav32 = toSquareFavicon(32);
    const fav48 = toSquareFavicon(48);

    return {
      cropInfo: { cropX, cropY, cropW, cropH, aspect },
      master: masterExport,
      size256: exp256,
      size128: exp128,
      size64: exp64,
      fav16: fav16.toDataURL("image/png").split(",")[1],
      fav32: fav32.toDataURL("image/png").split(",")[1],
      fav48: fav48.toDataURL("image/png").split(",")[1]
    };
  });

  console.log("Crop bounds:", generated.cropInfo);

  // Ghi các tệp thương hiệu
  const filesToWrite = [
    { name: "logo-3t.png", dir: brandDir, b64: generated.master.png },
    { name: "logo-3t.webp", dir: brandDir, b64: generated.master.webp },
    { name: "logo-3t-256.png", dir: brandDir, b64: generated.size256.png },
    { name: "logo-3t-256.webp", dir: brandDir, b64: generated.size256.webp },
    { name: "logo-3t-128.png", dir: brandDir, b64: generated.size128.png },
    { name: "logo-3t-128.webp", dir: brandDir, b64: generated.size128.webp },
    { name: "logo-3t-64.png", dir: brandDir, b64: generated.size64.png },
    { name: "logo-3t-64.webp", dir: brandDir, b64: generated.size64.webp },
    // Favicons in webDir
    { name: "favicon-16x16.png", dir: webDir, b64: generated.fav16 },
    { name: "favicon-32x32.png", dir: webDir, b64: generated.fav32 },
    { name: "favicon-48x48.png", dir: webDir, b64: generated.fav48 },
    { name: "favicon.png", dir: webDir, b64: generated.fav32 }
  ];

  for (const f of filesToWrite) {
    const full = path.join(f.dir, f.name);
    fs.writeFileSync(full, Buffer.from(f.b64, "base64"));
    console.log(`Saved: ${full} (${fs.statSync(full).size} bytes)`);
  }

  // Tạo favicon.ico gồm 16, 32, 48
  const icoBuf = buildIco([
    { width: 16, height: 16, buffer: Buffer.from(generated.fav16, "base64") },
    { width: 32, height: 32, buffer: Buffer.from(generated.fav32, "base64") },
    { width: 48, height: 48, buffer: Buffer.from(generated.fav48, "base64") }
  ]);
  const icoPath = path.join(webDir, "favicon.ico");
  fs.writeFileSync(icoPath, icoBuf);
  console.log(`Saved: ${icoPath} (${fs.statSync(icoPath).size} bytes)`);

  await browser.close();
}

generateAssets().catch(console.error);
