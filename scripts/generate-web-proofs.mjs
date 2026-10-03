import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const edgeExe = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const webDir = path.resolve(__dirname, "../server/3t-web");
const proofDir = path.resolve(__dirname, "../docs/web-proof");

const pages = [
  "index.html",
  "tinh-nang.html",
  "tai-ve.html",
  "co-gi-moi.html",
  "huong-dan.html",
  "ban-quyen.html",
  "lien-he.html",
  "trang-thai.html",
  "404.html"
];

const viewports = [
  { name: "390", width: 390, height: 844 },
  { name: "1280", width: 1280, height: 900 }
];

async function captureHeadless(page, vp) {
  const pagePath = path.join(webDir, page);
  const fileUrl = pathToFileURL(pagePath).href;
  const pageBase = page.replace(".html", "");
  const outPath = path.join(proofDir, `${pageBase}-${vp.name}.png`);

  const args = [
    "--headless",
    "--disable-gpu",
    "--hide-scrollbars",
    `--window-size=${vp.width},${vp.height}`,
    `--screenshot=${outPath}`,
    fileUrl
  ];

  await new Promise((resolve, reject) => {
    const child = spawn(edgeExe, args, { stdio: "ignore" });
    child.once("error", reject);
    child.once("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Edge exited with code ${code}`));
    });
  });

  console.log(`  -> Đã tạo ảnh kiểm chứng: ${path.basename(outPath)}`);
}

async function run() {
  console.log("=== Bắt đầu tạo ảnh chụp kiểm chứng giao diện headless Edge ===");
  for (const page of pages) {
    for (const vp of viewports) {
      await captureHeadless(page, vp);
    }
  }
  console.log("=== Hoàn tất tạo toàn bộ ảnh kiểm chứng ===");
}

run().catch((err) => {
  console.error("Lỗi khi tạo ảnh kiểm chứng:", err);
  process.exit(1);
});
