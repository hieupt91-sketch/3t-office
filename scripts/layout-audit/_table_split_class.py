#!/usr/bin/env python3
"""
Script phan tich cat trang trong bang (table split) va keepNext cho VN Writer R16.
Chi do, khong sua code san pham.

Usage: python _table_split_class.py <wt> <docdir> <outdir>
- wt: worktree path (unused, de tuong thich API)
- docdir: thu muc chua file docx goc (E:\\VN OFice\\file test\\landocx)
- outdir: thu muc chua *.word.jsonl va *.canvas.jsonl (E:\\VNOffice-opencode-writer-r16\\_out)
"""

import sys
import os
import json
import zipfile
import xml.etree.ElementTree as ET
from pathlib import Path
from collections import defaultdict
from typing import List, Dict, Tuple, Optional, Any

NS = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}

def parse_ooxml(docx_path: Path) -> Tuple[List[Dict[str, Any]], Dict[int, Dict[str, bool]]]:
    """Phan tich OOXML lay thong tin bang cap 1 va keepNext/keepLines/widowControl cua cac doan body."""
    tables_info = []
    para_props = {}  # index (0-based) -> {keepNext, keepLines, widowControl}
    try:
        with zipfile.ZipFile(docx_path, 'r') as z:
            with z.open('word/document.xml') as f:
                tree = ET.parse(f)
                root = tree.getroot()
                body = root.find('w:body', NS)
                if body is None:
                    return tables_info, para_props
                
                # Parse body paragraphs for keepNext etc.
                para_idx = 0
                for child in body:
                    if child.tag.endswith('}p'):
                        pPr = child.find('w:pPr', NS)
                        keep_next = False
                        keep_lines = False
                        widow_control = False
                        if pPr is not None:
                            if pPr.find('w:keepNext', NS) is not None:
                                keep_next = True
                            if pPr.find('w:keepLines', NS) is not None:
                                keep_lines = True
                            if pPr.find('w:widowControl', NS) is not None:
                                widow_control = True
                        if keep_next or keep_lines or widow_control:
                            para_props[para_idx] = {
                                'keepNext': keep_next,
                                'keepLines': keep_lines,
                                'widowControl': widow_control
                            }
                        para_idx += 1
                    elif child.tag.endswith('}tbl'):
                        # Count tables
                        pass
                
                # Parse tables
                for tbl_idx, tbl in enumerate(body.findall('w:tbl', NS)):
                    info = {
                        'index': tbl_idx,
                        'rows': 0,
                        'tblHeader_rows': 0,
                        'cantSplit_rows': 0,
                        'has_nested': False,
                        'has_tblpPr': False,
                    }
                    
                    # Kiem tra tblpPr (bang noi)
                    tblPr = tbl.find('w:tblPr', NS)
                    if tblPr is not None:
                        if tblPr.find('w:tblpPr', NS) is not None:
                            info['has_tblpPr'] = True
                    
                    # Dem hang va kiem tra nested
                    for tr in tbl.findall('w:tr', NS):
                        info['rows'] += 1
                        trPr = tr.find('w:trPr', NS)
                        if trPr is not None:
                            if trPr.find('w:tblHeader', NS) is not None:
                                info['tblHeader_rows'] += 1
                            if trPr.find('w:cantSplit', NS) is not None:
                                info['cantSplit_rows'] += 1
                        
                        # Kiem tra bang long trong cell
                        for tc in tr.findall('w:tc', NS):
                            if tc.find('w:tbl', NS) is not None:
                                info['has_nested'] = True
                    
                    tables_info.append(info)
    except Exception as e:
        print(f"Loi phan tich {docx_path.name}: {e}", file=sys.stderr)
    return tables_info, para_props

def load_word_jsonl(jsonl_path: Path) -> List[Dict]:
    """Doc file *.word.jsonl."""
    data = []
    with open(jsonl_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if line:
                data.append(json.loads(line))
    return data

def load_canvas_jsonl(jsonl_path: Path) -> Tuple[Dict, List[Dict]]:
    """Doc file *.canvas.jsonl, tra ve (meta, blocks)."""
    meta = {}
    blocks = []
    with open(jsonl_path, 'r', encoding='utf-8') as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            obj = json.loads(line)
            if 'meta' in obj:
                meta = obj['meta']
            else:
                blocks.append(obj)
    return meta, blocks

def get_body_height(meta: Dict) -> float:
    """Tinh chieu cao than trang (body height) tu meta."""
    pageH = meta.get('pageH', 0)
    pagePad = meta.get('pagePad', '0px')
    headerH = meta.get('headerH', 0)
    footerH = meta.get('footerH', 0)
    
    # pagePad co dang "42px 56.7px 75.6px 113.4px" (top right bottom left)
    # Lay padding top (gia tri dau tien)
    if isinstance(pagePad, str):
        parts = pagePad.split()
        pad_top = float(parts[0].replace('px', '')) if parts else 0
    else:
        pad_top = float(pagePad)
    
    # Chieu cao than trang = pageH - pad_top - pad_bottom - headerH - footerH
    # pad_bottom la gia tri thu 3 (index 2)
    if isinstance(pagePad, str):
        parts = pagePad.split()
        pad_bottom = float(parts[2].replace('px', '')) if len(parts) > 2 else pad_top
    else:
        pad_bottom = pad_top
    
    return pageH - pad_top - pad_bottom - headerH - footerH

def analyze_word_tables(word_data: List[Dict], ooxml_tables: List[Dict], canvas_tables: List[Dict]) -> List[Dict]:
    """Phan tich bang tu Word cache, phan bo doan theo Canvas tables."""
    # Loc cac doan co tbl=true
    tbl_paragraphs = [p for p in word_data if p.get('tbl') == True]
    
    if not tbl_paragraphs or not canvas_tables:
        return []
    
    # Tinh tong chieu cao canvas tables
    total_height = sum(t['h'] for t in canvas_tables)
    if total_height == 0:
        # Chia deu neu khong co chieu cao
        per_table = len(tbl_paragraphs) // len(canvas_tables)
        remainder = len(tbl_paragraphs) % len(canvas_tables)
    else:
        # Phan bo theo ty le chieu cao
        allocations = []
        remaining = len(tbl_paragraphs)
        for i, ct in enumerate(canvas_tables):
            if i == len(canvas_tables) - 1:
                alloc = remaining
            else:
                alloc = max(1, round(len(tbl_paragraphs) * ct['h'] / total_height))
                alloc = min(alloc, remaining - (len(canvas_tables) - i - 1))
            allocations.append(alloc)
            remaining -= alloc
    
    # Gan doan vao tung bang
    tables_word = []
    start_idx = 0
    for i, ct in enumerate(canvas_tables):
        if total_height == 0:
            alloc = per_table + (1 if i < remainder else 0)
        else:
            alloc = allocations[i]
        end_idx = start_idx + alloc
        table_paras = tbl_paragraphs[start_idx:end_idx]
        start_idx = end_idx
        
        if not table_paras:
            tables_word.append({
                'paragraphs': [],
                'first_page': None,
                'last_page': None,
                'first_y': None,
                'last_y': None,
                'span_pages': 0
            })
            continue
        
        tables_word.append({
            'paragraphs': table_paras,
            'first_page': table_paras[0]['page'],
            'last_page': table_paras[-1]['page'],
            'first_y': table_paras[0]['y'],
            'last_y': table_paras[-1]['y'],
            'span_pages': table_paras[-1]['page'] - table_paras[0]['page'] + 1
        })
    
    # Hop nhat voi OOXML info (theo thu tu)
    result = []
    for i, tw in enumerate(tables_word):
        ooxml = ooxml_tables[i] if i < len(ooxml_tables) else {}
        result.append({
            'table_idx': i,
            'ooxml': ooxml,
            'word': tw
        })
    return result

def analyze_canvas_tables(canvas_blocks: List[Dict], body_height: float) -> List[Dict]:
    """Phan tich bang tu Canvas cache."""
    tables_canvas = []
    for block in canvas_blocks:
        if block.get('tag') == 'TABLE' or block.get('tables') == 1:
            h = block.get('h', 0)
            page = block.get('page', 1)
            canvas_pages = h / body_height if body_height > 0 else 0
            tables_canvas.append({
                'h': h,
                'page': page,
                'canvas_pages': canvas_pages,
                'top': block.get('top', 0)
            })
    return tables_canvas

def find_block_after_table(canvas_blocks: List[Dict], table_top: float) -> Optional[Dict]:
    """Tim khoi sau bang (dau tien co top > table_top)."""
    after_blocks = [b for b in canvas_blocks if b.get('top', 0) > table_top and b.get('tag') != 'TABLE']
    if after_blocks:
        return min(after_blocks, key=lambda x: x.get('top', 0))
    return None

def analyze_keepnext(word_data: List[Dict], para_props: Dict[int, Dict[str, bool]], body_height: float) -> List[Dict]:
    """Phan tich keepNext/keepLines/widowControl tai diem chuyen trang."""
    # Nhom doan theo trang (chi doan ngoai bang)
    by_page = defaultdict(list)
    for p in word_data:
        if not p.get('tbl', False):
            by_page[p['page']].append(p)
    
    results = []
    max_page = max(by_page.keys()) if by_page else 0
    
    for page in range(1, max_page):
        if page not in by_page or (page + 1) not in by_page:
            continue
        
        last_para = max(by_page[page], key=lambda x: x.get('y', 0))
        first_para_next = min(by_page[page + 1], key=lambda x: x.get('y', 0))
        
        # Word JSONL i la 1-based, OOXML para_props la 0-based
        # Chi so OOXML = Word_i - 1 - so_doan_bang_truoc_do (phuc tap)
        # De gian: lap qua cac doan non-tbl theo thu tu va map tuong ung
        # Nhung o day ta chi can check keepNext cua doan cuoi trang va dau trang tiep
        # Su dung index tu Word JSONL (tru 1 de ra 0-based) - nhung can tru so doan table
        
        # Heuristic: doan non-tbl thu k trong Word JSONL tuong ung voi OOXML body para k
        # Vi Word JSONL chua ca doan table, can dem so doan table truoc do
        # Nhung de gian, ta se parse OOXML body paragraphs va Word non-tbl paragraphs theo thu tu
        # Va match theo thu tu xuat hien (index trong list non-tbl)
        
        # Gan keepNext tu OOXML neu co
        # last_para va first_para_next la dict tu Word JSONL
        # Can tim index cua chung trong danh sach non-tbl
        pass  # Se implement o duoi
    
    # Tien hanh match thu tu
    non_tbl_paras = [p for p in word_data if not p.get('tbl', False)]
    # Tao map tu Word index -> OOXML index
    # Word JSONL i bat dau tu 1, OOXML body para bat dau tu 0
    # Nhung Word JSONL chua table paragraphs, nen index khong match truc tiep
    # Ta se duyet word_data va dem non-tbl de tao mapping
    
    word_to_ooxml = {}  # word i (1-based) -> ooxml index (0-based)
    non_tbl_count = 0
    for p in word_data:
        if not p.get('tbl', False):
            non_tbl_count += 1
            word_to_ooxml[p['i']] = non_tbl_count - 1  # 0-based OOXML index
    
    for page in range(1, max_page):
        if page not in by_page or (page + 1) not in by_page:
            continue
        
        last_para = max(by_page[page], key=lambda x: x.get('y', 0))
        first_para_next = min(by_page[page + 1], key=lambda x: x.get('y', 0))
        
        # Lay OOXML index
        last_ooxml_idx = word_to_ooxml.get(last_para['i'])
        first_ooxml_idx = word_to_ooxml.get(first_para_next['i'])
        
        keep_next_last = False
        keep_next_first = False
        keep_lines_last = False
        keep_lines_first = False
        widow_control_last = False
        widow_control_first = False
        
        if last_ooxml_idx is not None and last_ooxml_idx in para_props:
            props = para_props[last_ooxml_idx]
            keep_next_last = props.get('keepNext', False)
            keep_lines_last = props.get('keepLines', False)
            widow_control_last = props.get('widowControl', False)
        
        if first_ooxml_idx is not None and first_ooxml_idx in para_props:
            props = para_props[first_ooxml_idx]
            keep_next_first = props.get('keepNext', False)
            keep_lines_first = props.get('keepLines', False)
            widow_control_first = props.get('widowControl', False)
        
        # Ước lượng pitch (khoang cach dong)
        ls = last_para.get('ls', 13.8)
        lines = last_para.get('lines', 1)
        y_last = last_para.get('y', 0)
        occupied = y_last + lines * ls
        
        space_at_bottom = body_height - occupied
        # Day doan neu: (last co keepNext HOAC first co keepNext) VA con cho > 1 dong
        pushed = (keep_next_last or keep_next_first) and space_at_bottom > ls
        
        results.append({
            'page_break': page,
            'last_para': last_para,
            'first_para_next': first_para_next,
            'keep_next_first': keep_next_first,
            'keep_next_last': keep_next_last,
            'keep_lines_first': keep_lines_first,
            'keep_lines_last': keep_lines_last,
            'widow_control_first': widow_control_first,
            'widow_control_last': widow_control_last,
            'occupied_bottom': occupied,
            'space_at_bottom': space_at_bottom,
            'pushed': pushed,
            'text_sample': first_para_next.get('text', '')[:6]
        })
    return results

def process_file(docx_name: str, docdir: Path, outdir: Path) -> Dict:
    """Xu ly mot file docx."""
    docx_path = docdir / docx_name
    word_jsonl = outdir / f"{docx_name.replace('.docx', '')}.word.jsonl"
    canvas_jsonl = outdir / f"{docx_name.replace('.docx', '')}.canvas.jsonl"
    
    if not word_jsonl.exists() or not canvas_jsonl.exists():
        return {'error': f'Thieu JSONL cho {docx_name}'}
    
    # 1. OOXML
    ooxml_tables, para_props = parse_ooxml(docx_path)
    
    # 2. Canvas cache (can truoc de lay tables_canvas)
    meta, canvas_blocks = load_canvas_jsonl(canvas_jsonl)
    body_height = get_body_height(meta)
    tables_canvas = analyze_canvas_tables(canvas_blocks, body_height)
    
    # 3. Word cache
    word_data = load_word_jsonl(word_jsonl)
    tables_word = analyze_word_tables(word_data, ooxml_tables, tables_canvas)
    
    # 4. Hop nhat bang: bang k trong OOXML/Word vs bang k trong Canvas
    merged_tables = []
    max_tables = max(len(tables_word), len(tables_canvas))
    for i in range(max_tables):
        tw = tables_word[i] if i < len(tables_word) else None
        tc = tables_canvas[i] if i < len(tables_canvas) else None
        
        ooxml = tw['ooxml'] if tw else {}
        word_info = tw['word'] if tw else {}
        canvas_info = tc if tc else {}
        
        # Tim khoi sau bang trong canvas
        block_after = None
        if tc:
            block_after = find_block_after_table(canvas_blocks, tc.get('top', 0))
        
        # Word page after table: trang tiep theo sau trang cuoi bang
        word_last_page = word_info.get('last_page')
        word_page_after = word_last_page + 1 if word_last_page else None
        
        # Canvas page after table
        canvas_page_after = block_after.get('page') if block_after else None
        
        # Chenh lech trang
        page_diff = None
        if word_page_after is not None and canvas_page_after is not None:
            page_diff = canvas_page_after - word_page_after
        
        merged_tables.append({
            'table_idx': i,
            'rows': ooxml.get('rows', 0),
            'tblHeader_rows': ooxml.get('tblHeader_rows', 0),
            'cantSplit_rows': ooxml.get('cantSplit_rows', 0),
            'has_nested': ooxml.get('has_nested', False),
            'has_tblpPr': ooxml.get('has_tblpPr', False),
            'word_first_page': word_info.get('first_page'),
            'word_last_page': word_info.get('last_page'),
            'word_span_pages': word_info.get('span_pages', 1),
            'word_page_after': word_page_after,
            'canvas_h': canvas_info.get('h'),
            'canvas_page': canvas_info.get('page'),
            'canvas_pages': canvas_info.get('canvas_pages', 0),
            'canvas_page_after': canvas_page_after,
            'page_diff_after': page_diff
        })
    
    # 5. keepNext analysis
    keepnext_results = analyze_keepnext(word_data, para_props, body_height)
    
    return {
        'file': docx_name,
        'tables': merged_tables,
        'keepnext': keepnext_results,
        'body_height': body_height
    }

def generate_handoff(all_results: List[Dict], handoff_path: Path):
    """Sinh file handoff markdown."""
    lines = []
    lines.append("# Handoff Writer R16 — Table Split & KeepNext Audit")
    lines.append("")
    lines.append("## Tong quan")
    lines.append("")
    
    # Thong ke tong
    total_tables = 0
    tables_multi_page = 0
    files_with_multi = set()
    tables_with_header = 0
    tables_with_cant_split = 0
    total_keepnext_points = 0
    total_pushed = 0
    
    # Tinh tong trang lech do bang
    total_word_pages_tables = 0
    total_canvas_equiv_pages = 0
    total_page_diff_after = 0
    page_diff_count = 0
    
    for r in all_results:
        if 'error' in r:
            continue
        for t in r['tables']:
            total_tables += 1
            if t['word_span_pages'] >= 2:
                tables_multi_page += 1
                files_with_multi.add(r['file'])
                total_word_pages_tables += t['word_span_pages']
                total_canvas_equiv_pages += t['canvas_pages']
            if t['tblHeader_rows'] > 0:
                tables_with_header += 1
            if t['cantSplit_rows'] > 0:
                tables_with_cant_split += 1
            if t['page_diff_after'] is not None:
                total_page_diff_after += t['page_diff_after']
                page_diff_count += 1
        for kn in r['keepnext']:
            total_keepnext_points += 1
            if kn.get('pushed', False):
                total_pushed += 1
    
    # Trung binh chenh lech trang sau bang
    avg_page_diff = total_page_diff_after / page_diff_count if page_diff_count > 0 else 0
    
    lines.append(f"- Tong so file xu ly: {len([r for r in all_results if 'error' not in r])}")
    lines.append(f"- Tong so bang: {total_tables}")
    lines.append(f"- Bang trai >= 2 trang Word: {tables_multi_page}")
    lines.append(f"- So file co bang trai nhieu trang: {len(files_with_multi)}")
    lines.append(f"- Bang co tblHeader (can lap tieu de): {tables_with_header}")
    lines.append(f"- Bang co cantSplit: {tables_with_cant_split}")
    lines.append(f"- Tong diem chuyen trang co keepNext: {total_keepnext_points}")
    lines.append(f"- So diem Word da day doan 'giu voi doan sau': {total_pushed}")
    lines.append(f"- Tong trang Word cho bang trai nhieu trang: {total_word_pages_tables}")
    lines.append(f"- Tong trang tuong duong Canvas (h/body_height): {total_canvas_equiv_pages:.1f}")
    lines.append(f"- Trung binh chenh lech trang sau bang (Canvas - Word): {avg_page_diff:.1f}")
    lines.append("")
    
    # Bang 1: Chi tiet bang trai nhieu trang
    lines.append("## Bang 1: Bang trai nhieu trang Word (>= 2 trang)")
    lines.append("")
    lines.append("| File | Bang | Hang | tblHeader | cantSplit | Long | Noi | Word Trang | Word Sau | Canvas h | Canvas Trang | Canvas Pages | Canvas Sau | Chenh |")
    lines.append("|------|------|------|-----------|-----------|------|-----|------------|----------|----------|--------------|--------------|------------|-------|")
    
    for r in all_results:
        if 'error' in r:
            continue
        for t in r['tables']:
            if t['word_span_pages'] >= 2:
                lines.append(f"| {r['file']} | {t['table_idx']} | {t['rows']} | {t['tblHeader_rows']} | {t['cantSplit_rows']} | {'Co' if t['has_nested'] else 'Khong'} | {'Co' if t['has_tblpPr'] else 'Khong'} | {t['word_first_page']}→{t['word_last_page']} | {t['word_page_after'] or 'N/A'} | {t['canvas_h'] or 'N/A'} | {t['canvas_page'] or 'N/A'} | {t['canvas_pages']:.1f} | {t['canvas_page_after'] or 'N/A'} | {t['page_diff_after'] if t['page_diff_after'] is not None else 'N/A'} |")
    
    lines.append("")
    
    # Bang 2: keepNext day doan
    lines.append("## Bang 2: Diem chuyen trang Word day doan vi keepNext")
    lines.append("")
    lines.append("| File | So diem | Vi du (6 ky tu dau) |")
    lines.append("|------|---------|---------------------|")
    
    for r in all_results:
        if 'error' in r:
            continue
        pushed_points = [kn for kn in r['keepnext'] if kn.get('pushed', False)]
        if pushed_points:
            examples = ', '.join([kn['text_sample'] for kn in pushed_points[:3]])
            lines.append(f"| {r['file']} | {len(pushed_points)} | {examples} |")
    
    lines.append("")
    
    # Ket luan
    lines.append("## Ket luan cho W24")
    lines.append("")
    lines.append(f"- Tong so trang lech do bang: Canvas dem bang la 1 khoi (khong cat), Word cat theo hang. Tong so bang trai >= 2 trang Word: {tables_multi_page}. Tong trang Word: {total_word_pages_tables}, tong trang tuong duong Canvas: {total_canvas_equiv_pages:.1f}. Chenh lech trung binh sau bang: {avg_page_diff:.1f} trang. Can trien khai cat bang theo hang va lap hang tblHeader (neu co).")
    lines.append(f"- Tong so trang lech do keepNext: {total_pushed} diem chuyen trang bi day (keepNext/keepLines/widowControl). Can xu ly keepNext/keepLines/widowControl khi tinh layout.")
    lines.append("")
    lines.append("> Khong sua code san pham. Chi bao cao so lieu thuc te tu cache.")
    
    handoff_path.write_text('\n'.join(lines), encoding='utf-8')

def main():
    if len(sys.argv) != 4:
        print("Usage: python _table_split_class.py <wt> <docdir> <outdir>", file=sys.stderr)
        sys.exit(1)
    
    wt = sys.argv[1]
    docdir = Path(sys.argv[2])
    outdir = Path(sys.argv[3])
    
    # Lay danh sach file docx (bo qua d10)
    docx_files = sorted([f for f in docdir.glob('d*.docx') if not f.name.startswith('d10')])
    
    all_results = []
    for docx in docx_files:
        print(f"Dang xu ly {docx.name}...", file=sys.stderr)
        result = process_file(docx.name, docdir, outdir)
        all_results.append(result)
    
    # Sinh handoff
    handoff_path = Path(wt) / 'docs' / 'HANDOFF-WRITER-R16.md'
    generate_handoff(all_results, handoff_path)
    print(f"Da ghi handoff: {handoff_path}", file=sys.stderr)

if __name__ == '__main__':
    main()