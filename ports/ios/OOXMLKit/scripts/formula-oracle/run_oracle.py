#!/usr/bin/env python3
"""Đối chiếu engine công thức của OOXMLKit với LibreOffice Calc trên cùng một tệp XLSX.

  python3 -I scripts/formula-oracle/run_oracle.py [--bench PATH] [--out DIR] [--cases FILE]

Quy trình: sinh XLSX (sheet D = dữ liệu, sheet Cases = công thức, KHÔNG có giá trị đệm) →
LibreOffice headless mở, tính, lưu lại → đọc giá trị LibreOffice tính được → chạy
`ooxml-bench eval` trên CHÍNH tệp gốc → so từng ô.

LibreOffice chỉ là oracle tham khảo (không chép mã, không phải Microsoft Excel). Hàm mà bản
LibreOffice đang cài không biết (trả #NAME?) được xếp riêng, không tính là engine sai.
Chỉ dùng thư viện chuẩn của Python.
"""
import json, math, os, re, shutil, subprocess, sys, tempfile, zipfile
import xml.etree.ElementTree as ET

HERE = os.path.dirname(os.path.abspath(__file__))
PKG = os.path.abspath(os.path.join(HERE, "..", ".."))
NS = "http://schemas.openxmlformats.org/spreadsheetml/2006/main"
RNS = "http://schemas.openxmlformats.org/officeDocument/2006/relationships"

# Hàm ra đời sau Excel 2007: trong tệp phải mang tiền tố _xlfn. (mảng động: _xlfn._xlws.).
XLFN = ["CONCAT", "TEXTJOIN", "IFS", "SWITCH", "IFNA", "STDEV.S", "STDEV.P", "VAR.S", "VAR.P", "MODE.SNGL",
        "PERCENTILE.INC", "PERCENTILE.EXC", "QUARTILE.INC", "QUARTILE.EXC", "PERCENTRANK.INC", "PERCENTRANK.EXC",
        "RANK.EQ", "RANK.AVG", "COVARIANCE.P", "COVARIANCE.S", "FORECAST.LINEAR", "NORM.DIST", "NORM.S.DIST",
        "NORM.INV", "NORM.S.INV", "SKEW.P", "XLOOKUP", "XMATCH", "SEQUENCE", "UNIQUE", "TAKE", "DROP", "XOR"]
XLWS = ["FILTER", "SORT"]

# Chỗ LibreOffice 24.2 cho kết quả khác hành vi Excel được ghi trong tài liệu của Microsoft. Engine theo Excel.
# CHƯA kiểm bằng Excel thật trong môi trường này — cần xác nhận ở bước đối chiếu Office (issue #11).
LO_ERR = "LibreOffice xuất mã lỗi nội bộ (Err:502/504…) thành #VALUE!; Excel trả #NUM!"
KNOWN_ORACLE_DIFFERENCES = {
    # Lỗi và đối số sai: LibreOffice gom nhiều mã lỗi về #VALUE! khi xuất XLSX.
    "SQRT(-1)": "Excel trả #NUM!; LibreOffice ghi #VALUE! khi xuất XLSX",
    "LN(0)": LO_ERR, "LOG(0)": LO_ERR,
    "LARGE(D!A1:A10,11)": LO_ERR, "SMALL(D!A1:A10,0)": LO_ERR,
    "PERCENTILE(D!A1:A10,1.1)": LO_ERR, "QUARTILE(D!A1:A10,5)": LO_ERR,
    "NORM.INV(0,0,1)": LO_ERR, "NORM.INV(1.5,0,1)": LO_ERR,
    "CORREL(D!A1:A3,D!D1:D2)": "Hai vùng khác kích thước: Excel #N/A; LibreOffice #VALUE!",
    "MODE(D!A1:A3)": "Không có giá trị lặp: Excel #N/A; LibreOffice #VALUE!",
    "IRR(D!N2:N5)": "Dòng tiền toàn dương: Excel #NUM!; LibreOffice #N/A",
    "DATEDIF(D!C3,D!C1,\"D\")": "Ngày đầu sau ngày cuối: Excel #NUM!; LibreOffice #VALUE!",
    "DATEDIF(D!C1,D!C3,\"X\")": "Đơn vị không hợp lệ: Excel #NUM!; LibreOffice #VALUE!",
    "VLOOKUP(7,D!H1:I8,3,FALSE)": "Cột trả về vượt vùng: Excel #REF!; LibreOffice #VALUE!",
    "HLOOKUP(\"b\",D!K1:M2,3,FALSE)": "Hàng trả về vượt vùng: Excel #REF!; LibreOffice #VALUE!",
    "POWER(0,0)": "Excel #NUM!; LibreOffice trả 1",
    "POWER(-8,1/3)": "Cơ số âm, mũ phân số: Excel #NUM!; LibreOffice trả -2",
    "POWER(0,-1)": "Excel #DIV/0!; LibreOffice #NUM!",
    "COUNT(D!A1:E10)": "Excel bỏ qua TRUE/FALSE nằm trong vùng tham chiếu; LibreOffice đếm cả",
    "SUM(D!E1:E2)": "Excel bỏ qua TRUE/FALSE trong vùng tham chiếu (=0); LibreOffice cộng (=1)",
    "AVERAGE(D!E1:E2)": "Excel bỏ qua TRUE/FALSE trong vùng tham chiếu (#DIV/0!); LibreOffice tính",
    "MAX(D!E1:E2)": "Excel bỏ qua TRUE/FALSE trong vùng tham chiếu (=0); LibreOffice trả TRUE",
    # Văn bản viết thẳng làm đối số số: Excel ép sang số, LibreOffice (cấu hình mặc định) báo lỗi.
    'SUM("3",4)': "Đối số chuỗi số viết thẳng: Excel ép thành 3 (=7); LibreOffice #VALUE!",
    'AVERAGE(1,"3",TRUE)': "Excel ép chuỗi số và TRUE khi viết thẳng làm đối số; LibreOffice #VALUE!",
    'MAX(D!A1:A10,"5")': "Excel ép chuỗi số viết thẳng; LibreOffice #VALUE!",
    "TRUE>5": "Excel xếp logic lớn hơn số (TRUE); LibreOffice so TRUE như 1",
    "PERCENTRANK(D!A1:A10,20.5)": "Excel cắt cụt về 3 chữ số; LibreOffice làm tròn",
    "PERCENTRANK.INC(D!A1:A10,15)": "Excel cắt cụt về 3 chữ số; LibreOffice làm tròn",
    'TEXTJOIN("|",FALSE,D!E1:E5)': "Excel nối bool thành TRUE/FALSE; LibreOffice ghi 1/0",
    'FIND("","abc")': "Chuỗi tìm rỗng: Excel trả 1; LibreOffice #VALUE!",
    "LEN(TRUE)": "Excel đếm chữ của \"TRUE\" (=4); LibreOffice đếm 1",
    "CONCATENATE(1,2,TRUE)": "Excel nối bool thành \"TRUE\"; LibreOffice ghi 1",
    "VALUE(TRUE)": "Excel #VALUE!; LibreOffice trả 1",
    "TYPE(TRUE)": "Excel: TYPE(TRUE)=4 (logic); LibreOffice coi logic là số (=1)",
    'TEXT(-0.4,"0")': "Excel trả \"-0\" (hành vi đã biết); LibreOffice trả \"0\"",
    'TEXT(-0.0001,"0.00")': "Excel giữ dấu âm khi làm tròn về 0 (\"-0.00\"); LibreOffice trả \"0.00\"",
    'TEXT(0,"#.##")': "Excel in dấu chấm lẻ loi (\".\") khi mẫu chỉ có # và giá trị 0; LibreOffice trả chuỗi rỗng",
    'TEXT(TRUE,"0")': "Excel: TEXT không ép logic thành số, trả \"TRUE\"; LibreOffice trả \"1\"",
    "DATE(1900,1,1)": "Excel: 1 (gốc 1900-01-00); LibreOffice lệch 1 cho ngày trước 1900-03-01",
    "DATE(1900,2,29)": "Excel giữ ngày 29/2/1900 không có thật (=60); LibreOffice =61",
    "YEAR(1)": "Excel: 1900; LibreOffice: 1899 (khác gốc ngày trước 1900-03-01)",
    "SUM(FILTER(D!A1:A10,D!A1:A10>10))": "LibreOffice 24.2 chưa có FILTER (trả #VALUE! thay vì #NAME?)",
}

# Ca em chưa chắc Excel thật trả gì: KHÔNG gán đúng/sai cho engine, chờ đối chiếu Excel (issue #11).
UNVERIFIED_VS_EXCEL = {
    "LOG(10,1)": "Cơ số 1: engine trả #NUM!; nhiều khả năng Excel trả #DIV/0! (ln 1 = 0) nhưng chưa kiểm được",
}


def esc(s):
    return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")


def file_formula(f):
    """Dạng công thức ghi vào tệp: thêm tiền tố cho hàm mới, như Excel ghi."""
    for name in XLWS:
        f = re.sub(r"(?<![A-Za-z0-9_.])" + re.escape(name) + r"\(", "_xlfn._xlws." + name + "(", f)
    for name in XLFN:
        f = re.sub(r"(?<![A-Za-z0-9_.])" + re.escape(name) + r"\(", "_xlfn." + name + "(", f)
    return f


def col(n):
    s = ""
    while n:
        n, r = divmod(n - 1, 26)
        s = chr(65 + r) + s
    return s


def data_cells():
    """Dữ liệu sheet D: {(cột, hàng): giá trị}. Số, chuỗi, bool."""
    d = {}
    A = [10, 20.5, -3, 0, 7, 15, 42, 8, 100, 3.25]
    B = ["apple", "Banana", "cherry", "date", "Elderberry", "fig", "grape", "Honey", "  pad  ", "Việt Nam"]
    C = [44927, 45292, 45350]  # 2023-01-01, 2024-01-01, 2024-02-28
    Dv = [2.1, 3.9, 6.2, 7.8, 10.1, 12.2, 13.8, 16.1, 18.0, 20.2]
    for i in range(10):
        d[(1, i + 1)] = A[i]
        d[(2, i + 1)] = B[i]
        d[(4, i + 1)] = Dv[i]
    for i, v in enumerate(C):
        d[(3, i + 1)] = v
    d[(5, 1)] = True
    d[(5, 2)] = False
    d[(5, 4)] = "text"
    d[(5, 5)] = 0
    for i, k in enumerate(["k1", "k2", "k3", "k4", "k5"]):
        d[(6, i + 1)] = k
        d[(7, i + 1)] = (i + 1) * 100
    for i, v in enumerate([1, 3, 5, 7, 7, 9, 11, 13]):
        d[(8, i + 1)] = v
    for i, v in enumerate([0.1, 0.2, 0.3, 0.4, 50, 60, 70, 80]):
        d[(9, i + 1)] = v
    for i, (k, v) in enumerate([("a", 10), ("b", 20), ("c", 30)]):
        d[(11 + i, 1)] = k
        d[(11 + i, 2)] = v
    for i, v in enumerate([-1000, 300, 400, 400, 300]):
        d[(14, i + 1)] = v
    return d


def cell_xml(c, r, v):
    ref = f"{col(c)}{r}"
    if isinstance(v, bool):
        return f'<c r="{ref}" t="b"><v>{int(v)}</v></c>'
    if isinstance(v, (int, float)):
        return f'<c r="{ref}"><v>{v!r}</v></c>'
    return f'<c r="{ref}" t="inlineStr"><is><t xml:space="preserve">{esc(v)}</t></is></c>'


def build_xlsx(path, cases):
    d = data_cells()
    rows = {}
    for (c, r), v in d.items():
        rows.setdefault(r, []).append((c, v))
    sheet_d = "".join(f'<row r="{r}">' + "".join(cell_xml(c, r, v) for c, v in sorted(cs)) + "</row>"
                      for r, cs in sorted(rows.items()))
    sheet_c = "".join(
        f'<row r="{i}"><c r="A{i}" t="inlineStr"><is><t xml:space="preserve">{esc(f)}</t></is></c>'
        f'<c r="B{i}"><f>{esc(file_formula(f))}</f></c></row>' for i, f in enumerate(cases, 1))
    head = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    ct = ("application/vnd.openxmlformats-officedocument.spreadsheetml.")
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as z:
        z.writestr("[Content_Types].xml", head +
                   '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
                   '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
                   '<Default Extension="xml" ContentType="application/xml"/>'
                   f'<Override PartName="/xl/workbook.xml" ContentType="{ct}sheet.main+xml"/>'
                   f'<Override PartName="/xl/worksheets/sheet1.xml" ContentType="{ct}worksheet+xml"/>'
                   f'<Override PartName="/xl/worksheets/sheet2.xml" ContentType="{ct}worksheet+xml"/></Types>')
        z.writestr("_rels/.rels", head +
                   '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                   f'<Relationship Id="rId1" Type="{RNS}/officeDocument" Target="xl/workbook.xml"/></Relationships>')
        z.writestr("xl/workbook.xml", head +
                   f'<workbook xmlns="{NS}" xmlns:r="{RNS}"><sheets><sheet name="D" sheetId="1" r:id="rId1"/>'
                   '<sheet name="Cases" sheetId="2" r:id="rId2"/></sheets><calcPr fullCalcOnLoad="1"/></workbook>')
        z.writestr("xl/_rels/workbook.xml.rels", head +
                   '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                   f'<Relationship Id="rId1" Type="{RNS}/worksheet" Target="worksheets/sheet1.xml"/>'
                   f'<Relationship Id="rId2" Type="{RNS}/worksheet" Target="worksheets/sheet2.xml"/></Relationships>')
        z.writestr("xl/worksheets/sheet1.xml", head + f'<worksheet xmlns="{NS}"><sheetData>{sheet_d}</sheetData></worksheet>')
        z.writestr("xl/worksheets/sheet2.xml", head + f'<worksheet xmlns="{NS}"><sheetData>{sheet_c}</sheetData></worksheet>')


def run_libreoffice(src, outdir):
    soffice = shutil.which("soffice") or shutil.which("libreoffice")
    if not soffice:
        return None, "không tìm thấy soffice"
    profile = tempfile.mkdtemp(prefix="lo-profile-")
    try:
        r = subprocess.run([soffice, f"-env:UserInstallation=file://{profile}", "--headless", "--norestore",
                            "--convert-to", "xlsx:Calc MS Excel 2007 XML", "--outdir", outdir, src],
                           capture_output=True, text=True, timeout=300)
    finally:
        shutil.rmtree(profile, ignore_errors=True)
    out = os.path.join(outdir, os.path.basename(src))
    if not os.path.exists(out):
        return None, f"LibreOffice không tạo được tệp: {r.stderr.strip()[:300]}"
    ver = subprocess.run([soffice, "--version"], capture_output=True, text=True).stdout.strip()
    return out, ver


def read_cases_sheet(path):
    """Giá trị cột B của sheet Cases trong tệp LibreOffice lưu: {hàng: (loại, giá trị)}."""
    with zipfile.ZipFile(path) as z:
        wb = ET.fromstring(z.read("xl/workbook.xml"))
        rels = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
        rid = next(s.get(f"{{{RNS}}}id") for s in wb.iter(f"{{{NS}}}sheet") if s.get("name") == "Cases")
        target = next(r.get("Target") for r in rels if r.get("Id") == rid)
        target = target.lstrip("/") if target.startswith("/") else "xl/" + target
        shared = []
        if "xl/sharedStrings.xml" in z.namelist():
            for si in ET.fromstring(z.read("xl/sharedStrings.xml")).iter(f"{{{NS}}}si"):
                shared.append("".join(t.text or "" for t in si.iter(f"{{{NS}}}t")))
        out = {}
        for c in ET.fromstring(z.read(target)).iter(f"{{{NS}}}c"):
            ref = c.get("r", "")
            if not ref.startswith("B"):
                continue
            row = int(ref[1:])
            t = c.get("t")
            v = c.find(f"{{{NS}}}v")
            text = v.text if v is not None and v.text is not None else None
            if t == "e":
                out[row] = ("e", text or "")
            elif t == "b":
                out[row] = ("b", "1" if text == "1" else "0")
            elif t == "s":
                out[row] = ("s", shared[int(text)] if text is not None else "")
            elif t in ("str", "inlineStr"):
                if t == "inlineStr":
                    text = "".join(x.text or "" for x in c.iter(f"{{{NS}}}t"))
                out[row] = ("s", text or "")
            elif text is None:
                out[row] = ("empty", "")
            else:
                out[row] = ("n", text)
        return out


def run_engine(bench, src):
    r = subprocess.run([bench, "eval", src, "Cases"], capture_output=True, text=True, timeout=300)
    if r.returncode != 0:
        raise SystemExit(f"ooxml-bench eval lỗi: {r.stdout}{r.stderr}")
    out = {}
    for line in r.stdout.splitlines():
        ref, kind, value = (line.split("\t") + ["", ""])[:3]
        value = value.replace("\\n", "\n").replace("\\t", "\t").replace("\\\\", "\\")
        out[int(ref[1:])] = (kind, value)
    return out


def compare(lo, en):
    """Trả (nhóm, ghi chú). Nhóm: match | oracle-unsupported | error-code | mismatch."""
    lk, lv = lo
    ek, ev = en
    if lk == "e" and lv == "#NAME?":
        return "oracle-unsupported", "LibreOffice không biết hàm này"
    if lk == "e" or ek == "e":
        if lk == ek:
            return ("match", "") if lv == ev else ("error-code", f"mã lỗi khác: LO {lv} / engine {ev}")
        return "mismatch", "một bên lỗi, một bên có giá trị"
    if lk == "n" and ek == "n":
        a, b = float(lv), float(ev)
        ok = a == b or abs(a - b) <= 1e-9 * max(abs(a), abs(b)) or abs(a - b) <= 1e-12
        return ("match", "") if ok else ("mismatch", f"lệch {abs(a - b):.3g}")
    # bool của LibreOffice đôi khi được ghi thành số 0/1
    if {lk, ek} == {"n", "b"}:
        return ("match", "") if float(lv) == float(ev) else ("mismatch", "bool khác")
    if lk == ek:
        return ("match", "") if lv == ev else ("mismatch", "giá trị khác")
    return "mismatch", f"khác loại ({lk} / {ek})"


def main(argv):
    def opt(k, default=None):
        return argv[argv.index(k) + 1] if k in argv else default
    bench = opt("--bench", os.path.join(PKG, ".build", "release", "ooxml-bench"))
    outdir = opt("--out", os.path.join(PKG, ".build", "formula-oracle"))
    cases_path = opt("--cases", os.path.join(HERE, "cases.txt"))
    os.makedirs(outdir, exist_ok=True)
    cases = [l.strip() for l in open(cases_path, encoding="utf-8") if l.strip() and not l.lstrip().startswith("#")]
    src = os.path.join(outdir, "oracle-cases.xlsx")
    build_xlsx(src, cases)
    if not os.path.exists(bench):
        raise SystemExit(f"chưa có {bench}: chạy `swift build -c release --product ooxml-bench`")
    engine = run_engine(bench, src)
    lodir = os.path.join(outdir, "lo")
    os.makedirs(lodir, exist_ok=True)
    lofile, lover = run_libreoffice(src, lodir)
    if lofile is None:
        print(f"BLOCKED: {lover}")
        return 2
    lo = read_cases_sheet(lofile)
    rows, counts = [], {}
    for i, f in enumerate(cases, 1):
        l, e = lo.get(i, ("empty", "")), engine.get(i, ("empty", ""))
        group, note = compare(l, e)
        if group in ("mismatch", "error-code") and f in KNOWN_ORACLE_DIFFERENCES:
            group, note = "known-oracle-difference", KNOWN_ORACLE_DIFFERENCES[f]
        elif group in ("mismatch", "error-code") and f in UNVERIFIED_VS_EXCEL:
            group, note = "unverified-vs-excel", UNVERIFIED_VS_EXCEL[f]
        counts[group] = counts.get(group, 0) + 1
        rows.append({"row": i, "formula": f, "libreoffice": l, "engine": e, "group": group, "note": note})
    result = {"oracle": lover, "cases": len(cases), "counts": counts, "rows": rows}
    json.dump(result, open(os.path.join(outdir, "oracle-result.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    compared = (len(cases) - counts.get("oracle-unsupported", 0) - counts.get("known-oracle-difference", 0)
                - counts.get("unverified-vs-excel", 0))
    print(f"Oracle: {lover}")
    print(f"Tổng {len(cases)} công thức; so được {compared}; khớp {counts.get('match', 0)}; "
          f"khác mã lỗi {counts.get('error-code', 0)}; LỆCH {counts.get('mismatch', 0)}; "
          f"oracle không hỗ trợ {counts.get('oracle-unsupported', 0)}; "
          f"khác biệt đã biết của oracle {counts.get('known-oracle-difference', 0)}; "
          f"chưa kiểm được với Excel {counts.get('unverified-vs-excel', 0)}")
    for r in rows:
        if r["group"] in ("mismatch", "error-code"):
            print(f"  [{r['group']}] {r['formula']}\n      LO={r['libreoffice']}  engine={r['engine']}  ({r['note']})")
    for r in rows:
        if r["group"] == "known-oracle-difference":
            print(f"  [đã biết] {r['formula']}: {r['note']}")
    for r in rows:
        if r["group"] == "unverified-vs-excel":
            print(f"  [chưa kiểm] {r['formula']}: {r['note']}")
    bad = counts.get("mismatch", 0) + counts.get("error-code", 0)
    return 1 if bad and "--strict" in argv else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
