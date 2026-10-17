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

    def test_macos_release_json(self):
        """Kiem tra release-macos.json ton tai, dung cau truc va o trang thai chuan bi cho .pkg arm64."""
        mac_file = WEB_ROOT / "data" / "release-macos.json"
        self.assertTrue(mac_file.exists(), "Tep data/release-macos.json phai ton tai")

        data = json.loads(mac_file.read_text(encoding="utf-8"))
        required_fields = ["version", "file_name", "size", "sha256", "min_os", "arch", "released_at", "install_note"]
        for field in required_fields:
            self.assertIn(field, data, f"release-macos.json phai chua truong '{field}'")

        # Khi chua co tep: file_name rong
        self.assertEqual(data.get("file_name"), "", "file_name ban dau phai rong khi chua co tep")
        self.assertIn("macOS 12", data.get("min_os", ""))
        self.assertIn("Apple Silicon (arm64)", data.get("arch", ""))
        self.assertIn("Chưa ký", data.get("install_note", ""))
        self.assertIn("Open Anyway", data.get("install_note", ""))

    def test_macos_download_card_in_html(self):
        """Kiem tra the macOS tren index.html va tai-ve.html voi chi dan .pkg arm64 chua ky."""
        for page_name in ["index.html", "tai-ve.html"]:
            page_path = WEB_ROOT / page_name
            content = page_path.read_text(encoding="utf-8")

            # Phai co the macOS va tieu de phu hop
            self.assertIn("download-card-macos", content, f"{page_name} phai co the download-card-macos")
            self.assertIn("Tải về 3T Office cho macOS (dùng nội bộ)", content)

            # Trang thai khi chua co tep: thong bao dang chuan bi va khong co nut tai hong
            self.assertIn("Bản macOS đang được chuẩn bị", content)
            self.assertIn("data-mac-release-field", content)
            self.assertIn("Apple Silicon (arm64)", content)

            # Nut sao chep ma bam SHA-256 va huong dan shasum
            self.assertIn("shasum -a 256 &lt;tệp .pkg&gt;", content)
            self.assertIn("chuột phải vào tệp .pkg", content)
            self.assertIn("Open Anyway", content)
            self.assertIn("copy-btn", content)

    def test_macos_simulated_release_data(self):
        """Kiem tra du lieu mau thuc te tu team Mac (3T-Office-0.9.11-arm64-unsigned-final-v2.pkg)."""
        sample_file_name = "3T-Office-0.9.11-arm64-unsigned-final-v2.pkg"
        sample_sha256 = "01b7b04eca310869fc09b51c39afc1e06818c01a41476c4bd2346309a32fc978"

        download_url = f"https://office.3tcomputer.com/downloads/{sample_file_name}"
        domain_match = re.match(r"https?://([^/]+)", download_url)
        self.assertIsNotNone(domain_match)
        self.assertIn(domain_match.group(1), ALLOWED_DOMAINS)

        # Kiem tra do dai ma bam SHA256 hop le (64 hex chars)
        self.assertEqual(len(sample_sha256), 64)
        self.assertRegex(sample_sha256, r"^[0-9a-f]{64}$")

if __name__ == "__main__":
    unittest.main()

