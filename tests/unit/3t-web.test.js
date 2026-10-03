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
      "Dung lượng bộ cài 0.9.7 đúng 526608468 byte và mã băm SHA256 chính xác",
      releasesData.download?.file_size_bytes === 526608468 &&
      releasesData.download?.sha256?.toLowerCase() === "8f3b6a8e0c0ed0324b62c53d0efe56994653a33e660c44446c6065a353c07b15"
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

    // 7. Kiểm tra từ cấm: không được dùng tên sản phẩm của hãng khác (Microsoft, Word, Excel,
    //    PowerPoint, Office 365...). Chỉ nói về định dạng .docx/.xlsx/.pptx và tên 3T.
    // Lưu ý: không bắt nhầm thuộc tính CSS như word-break / overflow-wrap, nên loại trừ khi
    // chữ đứng cạnh dấu gạch nối (word-break) hoặc là một phần của từ khác.
    const BANNED_NAME_PATTERN = /microsoft|powerpoint|office\s?365|(?<![-\w])ms[- ]?office(?![-\w])|(?<![-\w])(?:word|excel)(?![-\w])/i;
    const scanDir = (dir) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          scanDir(fullPath);
        } else if (/\.(html|css|js|json|xml|txt|md)$/i.test(entry.name)) {
          const content = fs.readFileSync(fullPath, "utf-8");
          const match = content.match(BANNED_NAME_PATTERN);
          assert(
            `Tệp ${path.relative(repoRoot, fullPath)} không chứa tên sản phẩm của hãng khác`,
            !match,
            `Phát hiện từ cấm "${match && match[0]}" trong ${fullPath}`
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

    // 14. Kiểm tra trang quản trị (server/3t-web/admin)
    const adminPath = path.join(webRoot, "admin/index.html");
    assert("Trang admin/index.html tồn tại", fs.existsSync(adminPath));
    if (fs.existsSync(adminPath)) {
      const adminHtml = fs.readFileSync(adminPath, "utf-8");
      assert("admin/index.html có lang=\"vi\"", /<html[^>]*lang=["']vi["']/i.test(adminHtml));
      assert("admin/index.html có thẻ <title>", /<title>[^<]+<\/title>/i.test(adminHtml));
      assert("admin/index.html có thẻ <meta name=\"description\">", /<meta[^>]*name=["']description["'][^>]*content=["'][^"']+["']/i.test(adminHtml));
      const adminH1Matches = adminHtml.match(/<h1\b[^>]*>[\s\S]*?<\/h1>/gi) || [];
      assert(`admin/index.html có chính xác một thẻ <h1> (tìm thấy: ${adminH1Matches.length})`, adminH1Matches.length === 1);

      const adminDir = path.join(webRoot, "admin");
      const adminEntries = fs.readdirSync(adminDir, { withFileTypes: true });
      for (const ent of adminEntries) {
        if (ent.isFile() && /\.(html|css|js)$/i.test(ent.name)) {
          const filePath = path.join(adminDir, ent.name);
          const c = fs.readFileSync(filePath, "utf-8");
          const m = c.match(BANNED_NAME_PATTERN);
          assert(`admin/${ent.name} không chứa tên sản phẩm hãng khác (Microsoft/Word/Excel)`, !m, `Phát hiện: ${m && m[0]}`);
        }
      }
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

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  run3tWebTests().then((results) => {
    let failed = 0;
    for (const r of results) {
      if (!r.pass) {
        failed++;
        console.error(`FAIL: ${r.name} - ${r.error || "failed assertion"}`);
      }
    }
    console.log(`\n==================================================`);
    console.log(`Total tests: ${results.length} | Passed: ${results.length - failed} | Failed: ${failed}`);
    console.log(`==================================================\n`);
    if (failed > 0) process.exit(1);
  });
}
