"""
Python Unittest: Kiem tra website tinh 3T Office (server/3t-web)
Xac minh releases.json, dinh dang HTML, lien ket, tu cam va kich thuoc tep.
"""

import json
import os
import re
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
WEB_ROOT = REPO_ROOT / "server" / "3t-web"

ALLOWED_DOMAINS = {
    "office.3tcomputer.com",
    "3tcomputer.com",
    "reader.3tcomputer.com"
}

HTML_PAGES = [
    "index.html",
    "tinh-nang.html",
    "tai-ve.html",
    "co-gi-moi.html",
    "huong-dan.html",
    "ban-quyen.html",
    "lien-he.html",
    "trang-thai.html",
    "404.html"
]

class Test3TWeb(unittest.TestCase):
    def test_releases_json_and_version(self):
        releases_file = WEB_ROOT / "data" / "releases.json"
        self.assertTrue(releases_file.exists(), "Tep data/releases.json phai ton tai")
        
        data = json.loads(releases_file.read_text(encoding="utf-8"))
        current_ver = data.get("current_version")
        self.assertTrue(current_ver, "releases.json phai co current_version")
        self.assertTrue(current_ver.startswith("0.9."), "Phien ban phai thuoc ho 0.9.x")

        # So sanh voi main.py
        main_py = (REPO_ROOT / "main.py").read_text(encoding="utf-8")
        match = re.search(r'APP_VERSION\s*=\s*["\']([^"\']+)["\']', main_py)
        self.assertIsNotNone(match, "Phai tim thay APP_VERSION trong main.py")
        main_ver = match.group(1)
        self.assertTrue(main_ver.startswith("0.9."), "main.py phai thuoc ho 0.9.x")

        # Kiem tra thong tin tai ve
        dl = data.get("download", {})
        self.assertEqual(dl.get("file_size_bytes"), 401718681)  # bo cai 0.9.11 = 383 MB
        self.assertEqual(
            dl.get("sha256", "").lower(),
            "41cc7db664203d8a15a2e9f030f50a6f28e09f17b6de139c194b9114d7a274be"  # SHA-256 bo cai 0.9.11
        )

    def test_html_pages_structure(self):
        for page in HTML_PAGES:
            page_path = WEB_ROOT / page
            self.assertTrue(page_path.exists(), f"Trang {page} phai ton tai")
            
            content = page_path.read_text(encoding="utf-8")
            self.assertRegex(content, r'<html[^>]*lang=["\']vi["\']', f"{page} phai co lang=vi")
            self.assertRegex(content, r'<title>[^<]+</title>', f"{page} phai co the <title>")
            self.assertRegex(content, r'<meta[^>]*name=["\']description["\']', f"{page} phai co meta description")
            
            h1_count = len(re.findall(r'<h1\b[^>]*>[\s\S]*?</h1>', content, re.IGNORECASE))
            self.assertEqual(h1_count, 1, f"{page} phai co chinh xac mot the <h1>, tim thay {h1_count}")

    def test_no_banned_words(self):
        """Khong chua tu cam Microsoft trong toan bo server/3t-web."""
        for root, _, files in os.walk(WEB_ROOT):
            for file in files:
                if file.endswith((".html", ".css", ".js", ".json", ".xml", ".txt", ".md")):
                    file_path = Path(root) / file
                    content = file_path.read_text(encoding="utf-8", errors="ignore")
                    self.assertNotIn("microsoft", content.lower(), f"Phat hien tu cam trong {file_path}")

    def test_file_sizes(self):
        """Khong co tep nao vuot qua 400 KB."""
        for root, _, files in os.walk(WEB_ROOT):
            for file in files:
                file_path = Path(root) / file
                size = file_path.stat().st_size
                self.assertLessEqual(size, 400 * 1024, f"Tep {file_path} vuot qua 400 KB: {size} byte")

    def test_screenshots_exist_and_optimized(self):
        """Kiem tra anh chup thuc te cua 3 ung dung deu duoi 250 KB."""
        for app in ["doc", "sheet", "slide"]:
            for ext in ["webp", "png"]:
                ss_file = WEB_ROOT / "assets" / "screenshots" / f"{app}-preview.{ext}"
                self.assertTrue(ss_file.exists(), f"Anh {ss_file.name} phai ton tai")
                size = ss_file.stat().st_size
                self.assertLess(size, 250 * 1024, f"Anh {ss_file.name} vuot 250 KB: {size} byte")

    def test_accessibility_and_motion_guard(self):
        """Kiem tra moi trang HTML co skip link, theme toggle va CSS co prefers-reduced-motion guard."""
        for page in HTML_PAGES:
            page_path = WEB_ROOT / page
            content = page_path.read_text(encoding="utf-8")
            self.assertRegex(
                content,
                r'class=["\'][^"\']*skip-link[^"\']*["\']',
                f"{page} phai co skip-link cho kha nang truy cap"
            )
            self.assertRegex(
                content,
                r'class=["\'][^"\']*theme-toggle-btn[^"\']*["\']',
                f"{page} phai co nut chuyen doi theme (theme-toggle-btn)"
            )

        # Kiem tra CSS prefers-reduced-motion
        css_file = WEB_ROOT / "css" / "style.css"
        css_content = css_file.read_text(encoding="utf-8")
        self.assertIn(
            "@media (prefers-reduced-motion: reduce)",
            css_content,
            "style.css phai co bo bao ve @media (prefers-reduced-motion: reduce)"
        )
        self.assertIn("animation-duration:", css_content)
        self.assertIn("scroll-behavior: auto !important", css_content)

if __name__ == "__main__":
    unittest.main()
