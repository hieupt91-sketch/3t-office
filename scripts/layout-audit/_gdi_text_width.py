"""Do be rong chu bang GDI (cach Word/Excel 2016 do o 100% zoom): CreateFontW(height=-px) + GetTextExtentPoint32W.
Usage: python _gdi_text_width.py "<font>" <px> "<text>" ["<text2>" ...]
       python _gdi_text_width.py --compare  (in ti le GDI/Chromium cho vai chuoi da do bang _eval_textw.js)
"""
import ctypes, sys
from ctypes import wintypes

gdi32 = ctypes.windll.gdi32
user32 = ctypes.windll.user32


class SIZE(ctypes.Structure):
    _fields_ = [("cx", wintypes.LONG), ("cy", wintypes.LONG)]


def gdi_width(font: str, px: float, text: str, bold: bool = False, italic: bool = False, quality: int = 4) -> float:
    """quality: 0 DEFAULT, 3 NONANTIALIASED, 4 ANTIALIASED, 5 CLEARTYPE (Excel dung CLEARTYPE/ANTIALIASED; advance
    theo hinting nen khong doi giua cac quality)."""
    hdc = user32.GetDC(0)
    hfont = gdi32.CreateFontW(int(round(-px)), 0, 0, 0, 700 if bold else 400, 1 if italic else 0, 0, 0, 1, 0, 0, quality, 0, font)
    old = gdi32.SelectObject(hdc, hfont)
    size = SIZE()
    gdi32.GetTextExtentPoint32W(hdc, text, len(text), ctypes.byref(size))
    gdi32.SelectObject(hdc, old)
    gdi32.DeleteObject(hfont)
    user32.ReleaseDC(0, hdc)
    return float(size.cx)


if __name__ == "__main__":
    if sys.argv[1:2] == ["--compare"]:
        chromium = {  # do bang _eval_textw.js (font-kerning: none) trong WebView2 21/9
            ('Times New Roman', 20): (414.11, 576.08), ('Times New Roman', 14.67): (303.75, 422.56),
            ('Arial', 12): (270.17, 351.02), ('Calibri', 14.67): (300.38, 363.5), ('Times New Roman', 18.67): (386.58, 537.77),
        }
        t1 = "Tư vấn máy vi tính và quản trị hệ thống máy vi tính"; t2 = "CHI NHÁNH CÔNG TY TNHH THƯƠNG MẠI VHC QUẢNG BÌNH"
        for (font, px), (c1, c2) in chromium.items():
            g1, g2 = gdi_width(font, px, t1), gdi_width(font, px, t2)
            print(f"{font} {px}px: gdi {g1:.0f}/{g2:.0f}  chromium {c1:.1f}/{c2:.1f}  ratio {g1 / c1:.3f}/{g2 / c2:.3f}")
    else:
        font, px = sys.argv[1], float(sys.argv[2])
        for text in sys.argv[3:]:
            print(f"{gdi_width(font, px, text):.0f}px  {text[:40]!r}")
