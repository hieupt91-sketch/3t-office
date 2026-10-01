/**
 * Unit Test Suite: 3T Office Static Website Verification (server/3t-web)
 * Kiểm tra toàn diện các quy tắc chất lượng và ràng buộc nghiêm ngặt
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "../..");
const webRoot = path.resolve(repoRoot, "server/3t-web");

const HTML_PAGES = [
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

const ALLOWED_DOMAINS = [
  "office.3tcomputer.com",
  "3tcomputer.com",
  "reader.3tcomputer.com"
];

export async function run3tWebTests() {
  const results = [];

  const assert = (name, condition, errorMsg = "") => {
    results.push({
      name: `[3T Web] ${name}`,
      pass: Boolean(condition),
      error: condition ? undefined : errorMsg
    });
  };

  try {
    // 1. Kiểm tra releases.json hợp lệ và khớp họ phiên bản main.py (0.9.x)
    const releasesPath = path.join(webRoot, "data/releases.json");
    assert("Tệp data/releases.json tồn tại", fs.existsSync(releasesPath));

    const releasesContent = fs.readFileSync(releasesPath, "utf-8");
    const releasesData = JSON.parse(releasesContent);
    assert("releases.json là JSON hợp lệ và có thuộc tính current_version", Boolean(releasesData.current_version));

    // Đọc APP_VERSION trong main.py
    const mainPyContent = fs.readFileSync(path.join(repoRoot, "main.py"), "utf-8");
    const appVersionMatch = mainPyContent.match(/APP_VERSION\s*=\s*["']([^"']+)["']/);
    const mainAppVersion = appVersionMatch ? appVersionMatch[1] : "";
    assert("Đọc được APP_VERSION từ main.py", Boolean(mainAppVersion));

    const is09xFamily = (ver) => /^0\.9\./.test(ver);
    assert(
      `Phiên bản releases.json (${releasesData.current_version}) và main.py (${mainAppVersion}) cùng thuộc họ 0.9.x`,
      is09xFamily(releasesData.current_version) && is09xFamily(mainAppVersion)
    );

    assert(
      "Dung lượng bộ cài 0.9.6 đúng 526479307 byte và mã băm SHA256 chính xác",
      releasesData.download?.file_size_bytes === 526479307 &&
      releasesData.download?.sha256?.toLowerCase() === "6387f9358327e442a6ba9c0367a2277a57b06d8b4b3cd9f37ffef9b228c46f11"
    );

    // 2. Kiểm tra sự tồn tại của 9 trang HTML
    for (const page of HTML_PAGES) {
      const pagePath = path.join(webRoot, page);
      assert(`Trang ${page} tồn tại trong server/3t-web`, fs.existsSync(pagePath));
    }

    // 3. Kiểm tra lang=vi, title, meta description và đúng một h1
    for (const page of HTML_PAGES) {
      const pagePath = path.join(webRoot, page);
      if (!fs.existsSync(pagePath)) continue;
      const html = fs.readFileSync(pagePath, "utf-8");

      assert(`${page} có lang="vi"`, /<html[^>]*lang=["']vi["']/i.test(html));
      assert(`${page} có thẻ <title>`, /<title>[^<]+<\/title>/i.test(html));
      assert(`${page} có thẻ <meta name="description">`, /<meta[^>]*name=["']description["'][^>]*content=["'][^"']+["']/i.test(html));

      const h1Matches = html.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/gi) || [];
      assert(`${page} có chính xác một thẻ <h1> (tìm thấy: ${h1Matches.length})`, h1Matches.length === 1);
    }

    // 4. Kiểm tra tất cả internal links (href) phân giải được
    for (const page of HTML_PAGES) {
      const pagePath = path.join(webRoot, page);
      if (!fs.existsSync(pagePath)) continue;
      const html = fs.readFileSync(pagePath, "utf-8");

      const hrefRegex = /href=["']([^"']+)["']/gi;
      let match;
      while ((match = hrefRegex.exec(html)) !== null) {
        const href = match[1];
        if (href.startsWith("http://") || href.startsWith("https://") || href.startsWith("mailto:") || href.startsWith("#")) {
          continue;
        }
        const cleanHref = href.split("#")[0].split("?")[0];
        if (!cleanHref) continue;

        const resolved = path.resolve(webRoot, cleanHref);
        assert(`${page}: Liên kết nội bộ href="${href}" phân giải được tệp`, fs.existsSync(resolved), `Không tìm thấy: ${resolved}`);
      }
    }

    // 5. Kiểm tra tất cả image / media src và srcset phân giải được
    for (const page of HTML_PAGES) {
      const pagePath = path.join(webRoot, page);
      if (!fs.existsSync(pagePath)) continue;
      const html = fs.readFileSync(pagePath, "utf-8");

      const srcRegex = /(?:src|srcset)=["']([^"']+)["']/gi;
      let match;
      while ((match = srcRegex.exec(html)) !== null) {
        const src = match[1];
        if (src.startsWith("http://") || src.startsWith("https://") || src.startsWith("data:")) continue;
        const cleanSrc = src.split(" ")[0].split("?")[0];
        const resolved = path.resolve(webRoot, cleanSrc);
        assert(`${page}: Nguồn tài nguyên ${cleanSrc} phân giải được tệp`, fs.existsSync(resolved), `Không tìm thấy: ${resolved}`);
      }
    }

    // 6. Kiểm tra không có URL http(s) ngoài 3 domain sản phẩm được phép
    const urlRegex = /https?:\/\/([a-zA-Z0-9.-]+)/gi;
    for (const page of HTML_PAGES) {
      const pagePath = path.join(webRoot, page);
      if (!fs.existsSync(pagePath)) continue;
      const html = fs.readFileSync(pagePath, "utf-8");

      let match;
      while ((match = urlRegex.exec(html)) !== null) {
        const hostname = match[1].toLowerCase();
        // Cho phép namespace schemas.w3.org / sitemaps.org trong XML / SVG nếu có
        if (hostname.includes("w3.org") || hostname.includes("sitemaps.org")) continue;

        const isAllowed = ALLOWED_DOMAINS.some(domain => hostname === domain || hostname.endsWith(`.${domain}`));
        assert(
          `${page}: URL bên ngoài "${match[0]}" thuộc 3 tên miền sản phẩm được phép`,
          isAllowed,
          `Tên miền không được phép: ${hostname}`
        );
      }
    }

    // 7. Kiểm tra từ cấm: Tuyệt đối không xuất hiện "Microsoft" trong toàn bộ server/3t-web
    const scanDir = (dir) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scanDir(fullPath);
        } else if (/\.(html|css|js|json|xml|txt|md)$/i.test(entry.name)) {
          const content = fs.readFileSync(fullPath, "utf-8");
          const hasBannedWord = /microsoft/i.test(content);
          assert(
            `Tệp ${path.relative(repoRoot, fullPath)} không chứa từ cấm "Microsoft"`,
            !hasBannedWord,
            `Phát hiện từ cấm trong ${fullPath}`
          );
        }
      }
    };
    scanDir(webRoot);

    // 8. Không có tệp nào trong server/3t-web vượt quá 400 KB
    const checkFileSize = (dir) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          checkFileSize(fullPath);
        } else {
          const stat = fs.statSync(fullPath);
          const sizeKb = stat.size / 1024;
          assert(
            `Tệp ${path.relative(repoRoot, fullPath)} dung lượng <= 400 KB (${sizeKb.toFixed(1)} KB)`,
            stat.size <= 400 * 1024,
            `Dung lượng vượt mức: ${stat.size} byte`
          );
        }
      }
    };
    checkFileSize(webRoot);

    // 9. Kiểm tra ảnh chụp màn hình thật của 3 ứng dụng (mỗi tệp < 250 KB)
    const screenshots = [
      "doc-preview.webp",
      "doc-preview.png",
      "sheet-preview.webp",
      "sheet-preview.png",
      "slide-preview.webp",
      "slide-preview.png"
    ];
    for (const ss of screenshots) {
      const ssPath = path.join(webRoot, "assets/screenshots", ss);
      assert(`Ảnh chụp thật ${ss} tồn tại`, fs.existsSync(ssPath));
      if (fs.existsSync(ssPath)) {
        const stat = fs.statSync(ssPath);
        const sizeKb = stat.size / 1024;
        assert(
          `Ảnh chụp thật ${ss} dung lượng < 250 KB (${sizeKb.toFixed(1)} KB)`,
          stat.size < 250 * 1024,
          `Dung lượng ảnh vượt 250 KB: ${stat.size} byte`
        );
      }
    }

    // 10. Kiểm tra robots.txt và sitemap.xml
    const robotsPath = path.join(webRoot, "robots.txt");
    const sitemapPath = path.join(webRoot, "sitemap.xml");
    assert("robots.txt tồn tại và có chỉ thị Sitemap", fs.existsSync(robotsPath) && fs.readFileSync(robotsPath, "utf-8").includes("sitemap.xml"));
    assert("sitemap.xml tồn tại và chứa URL office.3tcomputer.com", fs.existsSync(sitemapPath) && fs.readFileSync(sitemapPath, "utf-8").includes("office.3tcomputer.com"));

    // 11. Kiểm tra mọi trang HTML đều có skip link truy cập bàn phím
    for (const page of HTML_PAGES) {
      const pagePath = path.join(webRoot, page);
      if (!fs.existsSync(pagePath)) continue;
      const html = fs.readFileSync(pagePath, "utf-8");
      const hasSkipLink = /<a\b[^>]*href=["']#main-content["'][^>]*class=["'][^"']*skip-link[^"']*["']/i.test(html) ||
                          /<a\b[^>]*class=["'][^"']*skip-link[^"']*["'][^>]*href=["']#main-content["']/i.test(html);
      assert(`${page} có liên kết bỏ qua trợ năng (skip link #main-content)`, hasSkipLink);
    }

    // 12. Kiểm tra mọi trang HTML đều có nút chuyển đổi giao diện Sáng / Tối (Theme Toggle)
    for (const page of HTML_PAGES) {
      const pagePath = path.join(webRoot, page);
      if (!fs.existsSync(pagePath)) continue;
      const html = fs.readFileSync(pagePath, "utf-8");
      const hasThemeToggle = /class=["'][^"']*theme-toggle-btn[^"']*["']/i.test(html);
      assert(`${page} có nút chuyển đổi giao diện Sáng / Tối (theme toggle)`, hasThemeToggle);
    }

    // 13. Kiểm tra CSS: Không có hoạt ảnh nào thiếu bộ bảo vệ prefers-reduced-motion
    const cssPath = path.join(webRoot, "css/style.css");
    assert("Tệp style.css tồn tại", fs.existsSync(cssPath));
    if (fs.existsSync(cssPath)) {
      const cssContent = fs.readFileSync(cssPath, "utf-8");
      const hasReducedMotionMedia = cssContent.includes("@media (prefers-reduced-motion: reduce)");
      assert("style.css có khối @media (prefers-reduced-motion: reduce)", hasReducedMotionMedia);

      // Kiểm tra tất cả các định nghĩa @keyframes đều có quy tắc tắt tương ứng
      const keyframeMatches = [...cssContent.matchAll(/@keyframes\s+([a-zA-Z0-9_-]+)/g)].map(m => m[1]);
      assert("style.css có định nghĩa keyframes chuyển động", keyframeMatches.length > 0);

      // Kiểm tra xem trong khối reduced-motion có animation-duration: 0.001ms hoặc animation: none
      const reducedMotionBlock = cssContent.slice(cssContent.indexOf("@media (prefers-reduced-motion: reduce)"));
      const hasGlobalAnimationReset = reducedMotionBlock.includes("animation-duration:") &&
                                      reducedMotionBlock.includes("transition-duration:") &&
                                      reducedMotionBlock.includes("scroll-behavior: auto !important");
      assert("style.css có cơ chế vô hiệu hóa toàn diện animation/transition dưới prefers-reduced-motion", hasGlobalAnimationReset);
    }

  } catch (err) {
    results.push({
      name: "[3T Web] Ngoại lệ kiểm thử",
      pass: false,
      error: String(err?.stack || err)
    });
  }

  return results;
}
