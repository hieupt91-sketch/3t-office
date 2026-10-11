"""Generate exact payloads from main.VnOfficeApi for the 4 real DOCX files."""
import os
import sys
import json
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT_DIR))

import main

FILES = [
    # Round 1 (Files 1-4)
    r"E:\VN OFice\file test\gói sữa chữa tháng 04-2026\HĐ VÀ NGHIỆM THU, THANH LÝ.docx",
    r"E:\VN OFice\file test\Hồ sơ sữa chữa\hợp đồng sửa chữa 3T- UBXQT.docx",
    r"E:\VN OFice\file test\GÓI THẦU MUA SẮM MÁY BẢO MẬT\MUA SĂM  MAY MÓC QT\MUA SĂM  MAY MÓC BẢO MẬT\8. Biên bản hoàn thiện hợp đồng.docx",
    r"E:\VN OFice\file test\GÓI THẦU MUA SẮM MÁY BẢO MẬT\file mới\to_trinh.docx",

    # Round 2: 11 remaining files (Files 5-15)
    r"E:\VN OFice\file test\gói sữa chữa tháng 04-2026\Biên bản hoàn thiện hợp đồng.docx",
    r"E:\VN OFice\file test\GÓI THẦU MUA SẮM MÁY BẢO MẬT\MUA SĂM  MAY MÓC QT\MUA SĂM  MAY MÓC BẢO MẬT\12. HĐ VÀ NGHIỆM THU, THANH LÝ.docx",
    r"E:\VN OFice\file test\GÓI THẦU MUA SẮM MÁY BẢO MẬT\MUA SĂM  MAY MÓC QT\MUA SĂM  MAY MÓC BẢO MẬT\1. QĐ thành lập TỔ MUA SẮM.docx",
    r"E:\VN OFice\file test\GÓI THẦU MUA SẮM MÁY BẢO MẬT\MUA SĂM  MAY MÓC QT\MUA SĂM  MAY MÓC BẢO MẬT\2. Tờ trìn khlcnt.docx",
    r"E:\VN OFice\file test\gói sữa chữa tháng 8 -2026\HĐ VÀ NGHIỆM THU, THANH LÝ.docx",
    r"E:\VN OFice\file test\gói sữa chữa tháng 8 -2026\hợp đồng sửa chữa 3T- UBXQT.docx",
    r"E:\VN OFice\file test\gói sữa chữa tháng 8 -2026\Biên bản hoàn thiện hợp đồngg.docx",
    r"E:\VN OFice\file test\GÓI THẦU MUA SẮM MÁY BẢO MẬT\MUA SĂM  MAY MÓC QT\MUA SẮM MÁY PHOTO\1. QĐ thành lập TỔ MUA SẮM.docx",
    r"E:\VN OFice\file test\GÓI THẦU MUA SẮM MÁY BẢO MẬT\MUA SĂM  MAY MÓC QT\MUA SẮM MÁY PHOTO\2. Tờ trìn khlcnt.docx",
    r"E:\VN OFice\file test\GÓI THẦU MUA SẮM MÁY BẢO MẬT\MUA SĂM  MAY MÓC QT\MUA SẮM MÁY PHOTO\8. Biên bản hoàn thiện hợp đồng.docx",
    r"E:\VN OFice\file test\GÓI THẦU MUA SẮM MÁY BẢO MẬT\MUA SĂM  MAY MÓC QT\MUA SẮM MÁY PHOTO\12. HĐ VÀ NGHIỆM THU, THANH LÝ (Autosaved).docx",
]

OUT_DIR = ROOT_DIR / "tests" / "fixtures" / "live-open-payloads"
OUT_DIR.mkdir(parents=True, exist_ok=True)

total_files = len(FILES)
for i, filepath in enumerate(FILES, start=1):
    print(f"[{i}/{total_files}] Converting: {filepath}...")
    api = main.VnOfficeApi("writer", filepath)
    payload = api.open_document_dialog("writer")
    out_file = OUT_DIR / f"file{i}_payload.json"
    with open(out_file, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    print(f"  -> Saved {out_file.name}: status={payload.get('status')}, content_len={len(payload.get('content', ''))}")

print(f"All {total_files} payloads generated successfully.")
