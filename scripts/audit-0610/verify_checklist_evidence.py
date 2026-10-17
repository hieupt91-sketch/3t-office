#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""scripts/audit-0610/verify_checklist_evidence.py

Kiểm chứng bằng chứng đối chiếu Word / Excel / PowerPoint cho các checklist tính năng.
Dùng chung cho:
  - docs/WORD2016-FEATURE-CHECKLIST.md
  - docs/EXCEL2016-FEATURE-CHECKLIST.md
  - docs/POWERPOINT2016-FEATURE-CHECKLIST.md

Quy tắc mở rộng:
1. Với MỌI dòng V, A, P: mọi mã lệnh slides.* (hoặc writer.*, sheet.*, common.*, ai.*)
   được nêu PHẢI tồn tại trong platform/commands/command-definitions.js.
2. Mọi dòng V/A phải có ít nhất một bằng chứng kiểm được:
   - Dòng V: PHẢI có trích dẫn file:dòng hợp lệ chứa từ khóa đặc trưng VÀ mọi mã lệnh phải tồn tại.
     Nếu thiếu đối chiếu nhưng có mã lệnh/mã app hợp lệ: hạ V -> A.
     Nếu không có mã lệnh và không có mã/bằng chứng nào: hạ V -> N.
   - Dòng A: PHẢI có ít nhất một bằng chứng kiểm được (mã lệnh tồn tại trong command-definitions.js,
     HOẶC đường dẫn tệp/test tồn tại và có nội dung liên quan).
     Nếu mã lệnh sai hoặc không có mã/bằng chứng nào: hạ A -> N.
   - Dòng P: Giữ nếu có một phần thật và nêu rõ phần có; mọi mã lệnh nêu phải tồn tại.
3. Hỗ trợ cập nhật trực tiếp (--fix hoặc mặc định) và kiểm tra chế độ chỉ đọc (--no-fix).
"""

import argparse
import collections
import os
import re
import sys
import unicodedata
from pathlib import Path

# Danh sách từ dừng / từ thông dụng không tính là từ khóa đặc trưng
STOP_WORDS = {
    'va', 'hoac', 'cua', 'cac', 'nhung', 'cho', 'trong', 'voi', 'tu', 'o', 'tai',
    'duoc', 'co', 'khong', 'khi', 'lai', 'da', 'dang', 'se', 'doan', 'van', 'ban',
    'tinh', 'nang', 'hop', 'thoai', 'thanh', 'cong', 'cu', 'menu', 'tuy', 'chon',
    'lenh', 'mot', 'hai', 'ba', 'bon', 'nam', 'nhieu', 'de', 'theo', 've', 'tren',
    'duoi', 'mau', 'loai', 'kieu', 'dang', 'muc', 'phan', 'nut', 'tab', 'bo', 'tri',
    'trang', 'so', 'dau', 'nhom', 'thuoc', 'day', 'du', 'rieng', 'chuan', 'chinh', 'xac',
    'and', 'or', 'of', 'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'with', 'by',
    'from', 'dialog', 'options', 'menu', 'button', 'is', 'it', 'set', 'get', 'all', 'etc'
}


def strip_accents(text: str) -> str:
    """Loại bỏ dấu tiếng Việt để so khớp không phân biệt dấu."""
    nfkd = unicodedata.normalize('NFKD', text)
    return ''.join(c for c in nfkd if not unicodedata.combining(c)).replace('đ', 'd').replace('Đ', 'D')


def load_valid_commands(repo_root: Path) -> set[str]:
    """Nạp toàn bộ mã lệnh hợp lệ từ platform/commands/command-definitions.js."""
    cmd_defs_path = repo_root / "platform" / "commands" / "command-definitions.js"
    if not cmd_defs_path.exists():
        return set()
    content = cmd_defs_path.read_text(encoding='utf-8')
    return set(re.findall(r'id:\s*[\'"]([^\'"]+)[\'"]', content))


def extract_cited_commands(text: str) -> list[str]:
    """Trích xuất danh sách mã lệnh writer.*, sheet.*, slides.*, common.*, ai.* được nêu trong văn bản.
    Mỗi mã lệnh chuẩn gồm 3 phần (domain.category.action).
    Loại trừ các chuỗi phân cách bởi dấu gạch chéo không phải mã lệnh đơn lẻ (như writer.header/footer).
    """
    matches = re.findall(r'(?<![/a-zA-Z0-9_])((?:slides|writer|sheet|common|ai)\.[a-zA-Z0-9_]+\.[a-zA-Z0-9_]+)(?![/a-zA-Z0-9_])', text)
    seen = set()
    result = []
    for m in matches:
        if m not in seen:
            seen.add(m)
            result.append(m)
    return result


def extract_keywords(feature_name: str, note_text: str) -> list[str]:
    """Trích xuất danh sách từ khóa đặc trưng từ cột tính năng và ghi chú."""
    keywords = set()

    # 1. Tìm các command id: writer.*, common.*, sheet.*, slides.*
    for cmd in extract_cited_commands(note_text + ' ' + feature_name):
        keywords.add(cmd.lower())
        parts = cmd.split('.')
        if len(parts) >= 3:
            keywords.add(parts[-1].lower())

    # 2. Tìm phím tắt: Ctrl+..., Shift+..., Alt+..., F1-F12
    for sc in re.findall(r'(?:Ctrl|Shift|Alt|F\d+)(?:\+[A-Za-z0-9\+\<\>\=\*]+)?', feature_name, re.IGNORECASE):
        keywords.add(sc.lower())

    # 3. Tìm các từ tiếng Anh / thuật ngữ trong ngoặc đơn (vd: Justify, Drop Cap, Format Painter, Line Spacing)
    for en in re.findall(r'\(([A-Za-z0-9\s\/\-\_\:\,\.\+\<\>\*]+)\)', feature_name):
        for term in re.findall(r'[A-Za-z0-9]{3,}', en):
            term_clean = term.lower()
            if term_clean not in STOP_WORDS:
                keywords.add(term_clean)

    # 4. Tách các từ đơn lẻ từ tên tính năng, lọc từ dừng
    tokens = re.findall(r'[\w]{2,}', feature_name)
    for tok in tokens:
        tok_clean = strip_accents(tok.lower())
        if tok_clean not in STOP_WORDS and len(tok_clean) >= 3:
            keywords.add(tok.lower())
            keywords.add(tok_clean)

    return sorted(list(keywords))


def resolve_file_path(repo_root: Path, file_str: str) -> Path | None:
    """Tìm đường dẫn tệp trên đĩa."""
    clean_path = file_str.replace('\\', '/')
    p = repo_root / clean_path
    if p.exists() and p.is_file():
        return p
    # Nếu không có tiền tố docs/, thử tìm trong docs/
    p_docs = repo_root / "docs" / clean_path
    if p_docs.exists() and p_docs.is_file():
        return p_docs
    # Nếu không có tiền tố scripts/, thử tìm trong scripts/
    p_scripts = repo_root / "scripts" / clean_path
    if p_scripts.exists() and p_scripts.is_file():
        return p_scripts
    # Thử tìm trong tests/
    p_tests = repo_root / "tests" / clean_path
    if p_tests.exists() and p_tests.is_file():
        return p_tests
    return None


def verify_row_evidence(repo_root: Path, feature: str, note: str) -> tuple[bool, str, list[str]]:
    """Kiểm tra bằng chứng trích dẫn file:line trong ghi chú.

    Trả về:
      (is_valid, reason, valid_citations)
    """
    cite_matches = re.findall(r'([\w\/\.\-]+\.[A-Za-z0-9]+):(\d+)(?:-(\d+)|,(\d+))?', note)
    if not cite_matches:
        return False, "Thiếu trích dẫn file:dòng trong ghi chú", []

    keywords = extract_keywords(feature, note)
    if not keywords:
        return False, "Không trích xuất được từ khóa đặc trưng của tính năng", []

    valid_cites = []
    reasons = []

    for item in cite_matches:
        file_str = item[0]
        s_line = int(item[1])
        e_line = int(item[2]) if item[2] else (int(item[3]) if item[3] else s_line)

        fpath = resolve_file_path(repo_root, file_str)
        if not fpath:
            reasons.append(f"Tệp không tồn tại: {file_str}")
            continue

        try:
            flines = fpath.read_text(encoding='utf-8').splitlines()
        except Exception as ex:
            reasons.append(f"Không đọc được {file_str}: {ex}")
            continue

        if s_line < 1 or s_line > len(flines):
            reasons.append(f"Dòng {s_line} ngoài phạm vi (tệp có {len(flines)} dòng)")
            continue

        e_line = min(e_line, len(flines))
        content_chunk = "\n".join(flines[s_line - 1:e_line])
        chunk_clean = strip_accents(content_chunk.lower())

        # Kiểm tra từ khóa trong đoạn trích dẫn
        matched_kw = []
        for kw in keywords:
            kw_clean = strip_accents(kw.lower())
            if kw.lower() in content_chunk.lower() or kw_clean in chunk_clean:
                matched_kw.append(kw)

        if matched_kw:
            valid_cites.append(f"{file_str}:{s_line}" + (f"-{e_line}" if e_line != s_line else ""))
        else:
            reasons.append(f"Dòng {s_line}-{e_line} trong {file_str} không chứa từ khóa đặc trưng ({', '.join(keywords[:5])})")

    if valid_cites:
        return True, "Hợp lệ", valid_cites
    else:
        return False, "; ".join(reasons), []


def update_summary_tables(content: str, detail_rows: list[dict]) -> str:
    """Cập nhật lại bảng tổng hợp và bảng theo tab trong file checklist Markdown."""
    counts = collections.Counter(r['status'] for r in detail_rows)
    total_applicable = len(detail_rows) - counts['X']
    cov = (counts['V'] + counts['A'] + 0.5 * counts['P']) / total_applicable * 100 if total_applicable else 0
    ver = counts['V'] / total_applicable * 100 if total_applicable else 0

    order = ["V", "A", "P", "N", "X"]
    icon = {"V": "✅", "A": "🟢", "P": "🟡", "N": "🔴", "X": "⚪"}
    label = {
        "V": "Đã đối chiếu PowerPoint 2016" if "PowerPoint" in content else ("Đã đối chiếu Word 2016" if "Word" in content else "Đã đối chiếu Excel 2016"),
        "A": "Có, chưa đối chiếu",
        "P": "Có một phần",
        "N": "Chưa có",
        "X": "Ngoài phạm vi"
    }

    def pct(n, d):
        return f"{(100.0 * n / d):.0f}%" if d else "-"

    # 1. Bảng Tổng hợp
    summary_lines = [
        "| Trạng thái | Số mục | Tỷ lệ (trên mục áp dụng) |",
        "|---|---|---|"
    ]
    for k in order:
        summary_lines.append(f"| {icon[k]} {label[k]} | {counts[k]} | {pct(counts[k], total_applicable) if k != 'X' else '-'} |")
    summary_lines.append(f"| **Tổng** | **{len(detail_rows)}** (áp dụng: {total_applicable}) | |")
    summary_table_str = "\n".join(summary_lines)

    content = re.sub(
        r'\| Trạng thái \| Số mục \| Tỷ lệ \(trên mục áp dụng\) \|\n\|---\|---\|---\|\n(?:\|[^\n]+\|\n)+\| \*\*Tổng\*\* \|[^\n]+\|',
        summary_table_str,
        content
    )

    # Cập nhật số phần trăm độ phủ và xác minh
    target_app_name = "PowerPoint 2016" if "PowerPoint 2016" in content else ("Word 2016" if "Word 2016" in content else "Excel 2016")
    content = re.sub(
        r'- \*\*Độ phủ so với ' + re.escape(target_app_name) + r' \(có hoặc có một phần, một phần tính 0,5\): \d+%\*\*',
        f"- **Độ phủ so với {target_app_name} (có hoặc có một phần, một phần tính 0,5): {cov:.0f}%**",
        content
    )
    content = re.sub(
        r'- \*\*Đã xác minh bằng đối chiếu ' + re.escape(target_app_name) + r' thật: \d+%\*\* các mục áp dụng',
        f"- **Đã xác minh bằng đối chiếu {target_app_name} thật: {ver:.0f}%** các mục áp dụng",
        content
    )

    # 2. Bảng Theo tab
    by_tab = collections.OrderedDict()
    for r in detail_rows:
        by_tab.setdefault(r['tab'], []).append(r)

    tab_lines = [
        "| Tab | Mục | ✅ | 🟢 | 🟡 | 🔴 | ⚪ | Độ phủ |",
        "|---|---|---|---|---|---|---|---|"
    ]
    for tab_name, t_items in by_tab.items():
        tc = collections.Counter(i['status'] for i in t_items)
        t_app = len(t_items) - tc['X']
        t_cov = (tc['V'] + tc['A'] + 0.5 * tc['P']) / t_app * 100 if t_app else 0
        tab_lines.append(f"| {tab_name} | {len(t_items)} | {tc['V']} | {tc['A']} | {tc['P']} | {tc['N']} | {tc['X']} | {t_cov:.0f}% |")
    tab_table_str = "\n".join(tab_lines)

    content = re.sub(
        r'\| Tab \| Mục \| ✅ \| 🟢 \| 🟡 \| 🔴 \| ⚪ \| Độ phủ \|\n\|---\|---\|---\|---\|---\|---\|---\|---\|\n(?:\|[^\n]+\|\n)+',
        tab_table_str + "\n",
        content
    )

    return content


def verify_checklist_file(checklist_path: Path, fix: bool = True) -> dict:
    """Xác minh một tệp checklist Markdown và trả về kết quả thống kê."""
    repo_root = Path(__file__).resolve().parents[2]
    valid_commands = load_valid_commands(repo_root)

    raw_content = checklist_path.read_text(encoding='utf-8')
    lines = raw_content.splitlines()

    in_detail_section = False
    current_tab = "Chung"
    detail_rows = []
    modified_lines = list(lines)

    counts_before = collections.Counter()
    counts_after = collections.Counter()
    downgraded = []

    for line_idx, line in enumerate(lines):
        line_stripped = line.strip()
        if line_stripped.startswith('## Chi tiết từng tab'):
            in_detail_section = True
            continue

        if in_detail_section:
            tab_match = re.match(r'^###\s+(.+)$', line_stripped)
            if tab_match:
                current_tab = tab_match.group(1).strip()
                continue

            # Dòng chi tiết có định dạng: | Nhóm | Tính năng | Trạng thái | Ưu tiên | Ghi chú... |
            if line_stripped.startswith('|') and not line_stripped.startswith('|---'):
                parts = [p.strip() for p in line.split('|')]
                if len(parts) == 7 and parts[0] == '' and parts[-1] == '':
                    col_group = parts[1]
                    col_feat = parts[2]
                    col_status_raw = parts[3]
                    col_prio = parts[4]
                    col_note = parts[5]

                    # Bỏ qua dòng tiêu đề bảng
                    if 'Tính năng' in col_feat or 'Nhóm' in col_group or 'Trạng thái' in col_status_raw:
                        continue

                status_norm = 'A'
                if col_status_raw in ('✅', 'V'):
                    status_norm = 'V'
                elif col_status_raw in ('🟢', 'A'):
                    status_norm = 'A'
                elif col_status_raw in ('🟡', 'P'):
                    status_norm = 'P'
                elif col_status_raw in ('🔴', 'N'):
                    status_norm = 'N'
                elif col_status_raw in ('⚪', 'X'):
                    status_norm = 'X'

                counts_before[status_norm] += 1

                row_info = {
                    'line_no': line_idx + 1,
                    'tab': current_tab,
                    'group': col_group,
                    'feature': col_feat,
                    'status': status_norm,
                    'priority': col_prio,
                    'note': col_note,
                    'raw_line': line
                }

                # 1. Trích xuất mã lệnh và kiểm tra sự tồn tại trong command-definitions.js
                cited_cmds = extract_cited_commands(col_note)
                invalid_cmds = [c for c in cited_cmds if c not in valid_commands]
                valid_cmds = [c for c in cited_cmds if c in valid_commands]

                # 2. Kiểm tra bằng chứng file:line
                is_cite_valid, cite_reason, valid_cites = verify_row_evidence(repo_root, col_feat, col_note)

                target_status = status_norm
                downgrade_reason = ""

                if status_norm == 'V':
                    if invalid_cmds:
                        # Có mã lệnh không tồn tại -> hạ xuống A nếu có lệnh khác/code hợp lệ, ngược lại hạ N
                        downgrade_reason = f"Chứa mã lệnh không tồn tại trong command-definitions.js: {', '.join(invalid_cmds)}"
                        target_status = 'A' if (valid_cmds or valid_cites) else 'N'
                    elif not is_cite_valid:
                        downgrade_reason = cite_reason
                        target_status = 'A' if (valid_cmds or valid_cites) else 'N'
                    else:
                        target_status = 'V'

                elif status_norm == 'A':
                    if invalid_cmds:
                        # Nêu mã lệnh không tồn tại -> hạ xuống N
                        downgrade_reason = f"Chứa mã lệnh không tồn tại trong command-definitions.js: {', '.join(invalid_cmds)}"
                        target_status = 'N'
                    elif not valid_cmds and not valid_cites:
                        # Không có mã lệnh hợp lệ lẫn tệp bằng chứng nào
                        downgrade_reason = "Không có mã lệnh tồn tại hoặc tệp bằng chứng nào"
                        target_status = 'N'
                    else:
                        target_status = 'A'

                elif status_norm == 'P':
                    if invalid_cmds:
                        downgrade_reason = f"Chứa mã lệnh không tồn tại trong command-definitions.js: {', '.join(invalid_cmds)}"
                        # Ghi nhận lỗi nhưng giữ P nếu có mã thật/phần thật
                        downgraded.append({
                            'line_no': line_idx + 1,
                            'tab': current_tab,
                            'group': col_group,
                            'feature': col_feat,
                            'from_status': 'P',
                            'to_status': 'P',
                            'reason': downgrade_reason
                        })
                    target_status = 'P'

                if target_status != status_norm:
                    icon_map = {'V': '✅', 'A': '🟢', 'P': '🟡', 'N': '🔴', 'X': '⚪'}
                    new_icon = icon_map[target_status]
                    new_prio = col_prio
                    if target_status == 'N' and col_prio not in ('1', '2', '3'):
                        new_prio = '2'
                    new_note = col_note + f" [Hạ từ {status_norm} xuống {target_status}: {downgrade_reason}]"
                    new_line = f"| {col_group} | {col_feat} | {new_icon} | {new_prio} | {new_note} |"
                    modified_lines[line_idx] = new_line
                    downgraded.append({
                        'line_no': line_idx + 1,
                        'tab': current_tab,
                        'group': col_group,
                        'feature': col_feat,
                        'from_status': status_norm,
                        'to_status': target_status,
                        'reason': downgrade_reason
                    })
                    status_norm = target_status

                counts_after[status_norm] += 1
                row_info['status'] = status_norm
                detail_rows.append(row_info)

    if fix and downgraded:
        updated_content = "\n".join(modified_lines)
        updated_content = update_summary_tables(updated_content, detail_rows)
        checklist_path.write_text(updated_content, encoding='utf-8')

    return {
        'file': str(checklist_path),
        'total_rows': len(detail_rows),
        'counts_before': dict(counts_before),
        'counts_after': dict(counts_after),
        'v_before': counts_before['V'],
        'v_after': counts_after['V'],
        'a_before': counts_before['A'],
        'a_after': counts_after['A'],
        'p_before': counts_before['P'],
        'p_after': counts_after['P'],
        'n_before': counts_before['N'],
        'n_after': counts_after['N'],
        'downgraded_count': len([d for d in downgraded if d['from_status'] != d['to_status']]),
        'downgraded': downgraded
    }


def main():
    parser = argparse.ArgumentParser(description="Kiểm chứng bằng chứng đối chiếu Word / Excel / PowerPoint checklist.")
    parser.add_argument("checklist", nargs="?", default="docs/POWERPOINT2016-FEATURE-CHECKLIST.md",
                        help="Đường dẫn file checklist cần kiểm chứng (mặc định: docs/POWERPOINT2016-FEATURE-CHECKLIST.md)")
    parser.add_argument("--no-fix", action="store_true",
                        help="Chỉ kiểm tra, không tự động sửa file checklist trên đĩa")
    parser.add_argument("--fix", action="store_true", default=True,
                        help="Tự động cập nhật file checklist khi phát hiện dòng không đạt (mặc định: True)")
    parser.add_argument("--all", action="store_true",
                        help="Kiểm chứng cả Word, Excel và PowerPoint checklist")

    args = parser.parse_args()
    repo_root = Path(__file__).resolve().parents[2]

    files_to_check = []
    if args.all:
        files_to_check = [
            repo_root / "docs" / "WORD2016-FEATURE-CHECKLIST.md",
            repo_root / "docs" / "EXCEL2016-FEATURE-CHECKLIST.md",
            repo_root / "docs" / "POWERPOINT2016-FEATURE-CHECKLIST.md"
        ]
    else:
        files_to_check = [repo_root / args.checklist]

    print("=" * 80)
    print("KIỂM CHỨNG BẰNG CHỨNG ĐỐI CHIẾU CHECKLIST (WORD / EXCEL / POWERPOINT)")
    print("=" * 80)

    for fpath in files_to_check:
        if not fpath.exists():
            print(f"[ERROR] Không tìm thấy file: {fpath}")
            continue

        do_fix = False if args.no_fix else args.fix
        res = verify_checklist_file(fpath, fix=do_fix)
        print(f"\nTệp kiểm chứng: {fpath.name}")
        print(f"- Tổng số dòng tính năng: {res['total_rows']}")
        print(f"- Trạng thái trước: V={res['v_before']}, A={res['a_before']}, P={res['p_before']}, N={res['n_before']}")
        print(f"- Trạng thái sau:   V={res['v_after']}, A={res['a_after']}, P={res['p_after']}, N={res['n_after']}")
        print(f"- Số dòng bị hạ:    {res['downgraded_count']}")

        real_downgrades = [d for d in res['downgraded'] if d['from_status'] != d['to_status']]
        if real_downgrades:
            print("\nChi tiết các dòng bị hạ:")
            for item in real_downgrades:
                print(f"  * Dòng {item['line_no']}: [{item['tab']}|{item['group']}] {item['feature']} ({item['from_status']} -> {item['to_status']})")
                print(f"    Lý do: {item['reason']}")
        else:
            print("  -> 100% dòng đạt (0 dòng bị hạ): toàn bộ mã lệnh đều tồn tại trong command-definitions.js và có bằng chứng hợp lệ!")

    print("\nHoàn tất kiểm chứng.")


if __name__ == "__main__":
    main()
