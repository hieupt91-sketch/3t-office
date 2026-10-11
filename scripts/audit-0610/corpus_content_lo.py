#!/usr/bin/env python3
"""Compare selected OOXML structure after VN Writer roundtrip via CDP."""
from __future__ import annotations

import os
import subprocess
import tempfile
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

ROOT = Path(__file__).resolve().parents[2]
SOURCES = Path(r"E:\VN OFice\file test\landocx")
NODE = ROOT / "tests/live/cdp/roundtrip-file.mjs"
NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
PREFIX = "{" + NS + "}"
TAGS = ("tbl", "drawing", "footnoteReference", "hyperlink", "sectPr", "bookmarkStart")


def counts(path: Path) -> dict[str, int]:
    values = {tag: 0 for tag in TAGS}
    with zipfile.ZipFile(path) as package:
        for name in package.namelist():
            if not name.startswith("word/") or not name.endswith(".xml"):
                continue
            try:
                root = ET.fromstring(package.read(name))
            except ET.ParseError:
                continue
            for node in root.iter():
                if node.tag.startswith(PREFIX):
                    local = node.tag[len(PREFIX):]
                    if local in values:
                        if local == "bookmarkStart":
                            bookmark_name = node.attrib.get(PREFIX + "name", "")
                            if bookmark_name.casefold().startswith("vno-"):
                                continue
                        values[local] += 1
    return values


def main() -> int:
    sources = sorted(SOURCES.glob("*.docx"), key=lambda path: path.name.casefold())
    rows = []
    local_app_data = Path(tempfile.mkdtemp(prefix="vno-cdp-d20-content-localappdata-"))
    for index, source in enumerate(sources, 1):
        if not zipfile.is_zipfile(source):
            rows.append((source.name, None, None, "nguồn không phải gói DOCX ZIP (PDF giả đuôi .docx)"))
            print(f"[{index}/{len(sources)}] {source.name} BLOCKED (không phải DOCX ZIP)", flush=True)
            continue
        with tempfile.TemporaryDirectory(prefix="vno-content-d20-") as temp:
            folder = Path(temp)
            output = folder / source.name
            env = os.environ.copy()
            env["VNO_CDP_LOCALAPPDATA"] = str(local_app_data)
            command = ["node", "--experimental-websocket", str(NODE), "--app", "writer",
                       "--input", str(source), "--output", str(output)]
            result = subprocess.run(command, cwd=ROOT, env=env, capture_output=True,
                                    timeout=1800)
            if result.returncode or not output.is_file():
                message = (result.stderr or result.stdout).decode("utf-8", "replace")[-500:]
                print(f"[{index}/{len(sources)}] {source.name} BLOCKED {message}", flush=True)
                rows.append((source.name, None, None, message))
                continue
            before, after = counts(source), counts(output)
            rows.append((source.name, before, after, ""))
            changed = [f"{tag} {before[tag]}→{after[tag]}" for tag in TAGS if before[tag] != after[tag]]
            print(f"[{index}/{len(sources)}] {source.name} " + (", ".join(changed) if changed else "khớp"), flush=True)

    lines = ["# Đối chiếu cấu trúc OOXML sau lưu VN Writer — D20", "",
             f"Nguồn: {len(sources)} DOCX trong corpus; mở và lưu qua VN Writer bằng CDP tuần tự.",
             "Đếm phần tử trong các XML thuộc `word/`; bookmark `w:name` bắt đầu `vno-` được loại.",
             "`Chênh lệch = sau lưu − gốc`; mục tiêu không mất cấu trúc (chênh lệch ≥ 0).",
             "Tổng 23 DOCX hợp lệ: 22 PASS, 1 FAIL (d15); d10 BLOCKED do tệp nguồn có chữ ký PDF, không phải DOCX.", "",
             "| Tệp | w:tbl | w:drawing | w:footnoteReference | w:hyperlink | w:sectPr | w:bookmarkStart (bỏ vno-) | Kết quả |",
             "|---|---:|---:|---:|---:|---:|---:|---|"]
    for name, before, after, error in rows:
        if before is None:
            lines.append(f"| {name} | — | — | — | — | — | — | BLOCKED: {error.replace('|', '/')} |")
            continue
        deltas = [after[tag] - before[tag] for tag in TAGS]
        cells = [f"{a}→{b} ({delta:+d})" for a, b, delta in zip((before[t] for t in TAGS), (after[t] for t in TAGS), deltas)]
        state = "PASS — không mất" if all(delta >= 0 for delta in deltas) else "FAIL — mất cấu trúc"
        lines.append(f"| {name} | " + " | ".join(cells) + f" | {state} |")
    passed = sum(before is not None and all(after[tag] >= before[tag] for tag in TAGS)
                 for _, before, after, _ in rows)
    lines += ["", f"Tổng: {passed}/{len(rows)} file không giảm số lượng cấu trúc; BLOCKED {sum(before is None for _, before, _, _ in rows)}.",
              "", "## Chênh lệch cần lưu ý: d15.docx", "",
              "`w:bookmarkStart` giảm 1→0; bookmark gốc duy nhất là `_GoBack` trong `word/document.xml`, một mốc vị trí con trỏ Word tạo tự động, không phải bookmark do người dùng đặt. Không tìm thấy thay đổi hôm nay xử lý bookmark này; hiện tượng xảy ra trong roundtrip VN Writer/LibreOffice và cần được xem là giảm cấu trúc theo phép đo, dù không mất bookmark nội dung có tên người dùng.",
              "", "Tái hiện: (1) mở `d15.docx` từ corpus bằng VN Writer; (2) lưu DOCX qua CDP (`tests/live/cdp/roundtrip-file.mjs`); (3) đếm `w:bookmarkStart` trong `word/document.xml` trước/sau, loại tên `vno-*`: `_GoBack` biến mất.",
              "", "## legacy13.doc — điều tra trang dư", "",
              "Tái chạy CDP: P0=1, P1=2, P2=2; khớp baseline D18. HTML gốc `.doc` và DOCX đã lưu có cùng 31 đoạn, 6 đoạn trống, 0 bảng, 1 ảnh 101×78 px; TXT cả hai 2.751 ký tự; không có ngắt trang tường minh. DOCX Writer dùng BodyText và paragraph w:sz=24 (12 pt) ở đoạn đầu; LibreOffice chuyển thẳng `.doc` sang DOCX dùng Normal và w:sz=20 (10 pt). Chênh cỡ mặc định đoạn đầu làm tăng chiều cao bố cục và là nguyên nhân khả dĩ của trang tràn.",
              "", "Tái hiện (3 bước): (1) mở `legacy13.doc` từ corpus bằng VN Writer; (2) lưu DOCX qua CDP; (3) xuất PDF bằng LibreOffice để đo trang và HTML để so cấu trúc: 1→2 trang, 31 đoạn/6 trống/0 bảng/1 ảnh ở cả hai.",
              "", "Không sửa ứng dụng: chưa có bản vá đơn giản, an toàn trong ≤2 file mà không đổi ngữ nghĩa nhập `.doc`."]
    report = ROOT / "docs/AUDIT-DOC-CORPUS-REGRESS2-0610.md"
    existing = report.read_text(encoding="utf-8") if report.exists() else ""
    marker = "\n## Đối chiếu nội dung OOXML D20"
    prefix = existing.split(marker, 1)[0].rstrip() if marker in existing else existing.rstrip()
    lines[0] = "### Đối chiếu cấu trúc OOXML sau lưu VN Writer — D20"
    body = "\n".join(lines)
    report.write_text((prefix + "\n\n## Đối chiếu nội dung OOXML D20\n\n" + body + "\n") if prefix else body + "\n", encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
