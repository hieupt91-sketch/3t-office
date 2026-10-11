import sys
sys.path.insert(0, r"E:\VN OFice\scripts\layout-audit")
from _gdi_text_width import gdi_width
import ctypes
from ctypes import wintypes
gdi32 = ctypes.windll.gdi32; user32 = ctypes.windll.user32

def per_char(font, px, text, bold=False):
    hdc = user32.GetDC(0)
    hfont = gdi32.CreateFontW(int(round(-px)), 0, 0, 0, 700 if bold else 400, 0, 0, 0, 1, 0, 0, 4, 0, font)
    old = gdi32.SelectObject(hdc, hfont)
    arr = (wintypes.INT * 1)()
    total = 0; abc_total = 0.0
    class ABCFLOAT(ctypes.Structure):
        _fields_ = [("a", ctypes.c_float), ("b", ctypes.c_float), ("c", ctypes.c_float)]
    abcf = ABCFLOAT()
    for ch in text:
        gdi32.GetCharWidth32W(hdc, ord(ch), ord(ch), arr); total += arr[0]
        gdi32.GetCharABCWidthsFloatW(hdc, ord(ch), ord(ch), ctypes.byref(abcf)); abc_total += abcf.a + abcf.b + abcf.c
    # text metrics
    class TEXTMETRICW(ctypes.Structure):
        _fields_ = [("tmHeight", wintypes.LONG), ("tmAscent", wintypes.LONG), ("tmDescent", wintypes.LONG), ("tmInternalLeading", wintypes.LONG), ("tmExternalLeading", wintypes.LONG), ("tmAveCharWidth", wintypes.LONG), ("tmMaxCharWidth", wintypes.LONG), ("tmWeight", wintypes.LONG), ("tmOverhang", wintypes.LONG), ("tmDigitizedAspectX", wintypes.LONG), ("tmDigitizedAspectY", wintypes.LONG), ("tmFirstChar", wintypes.WCHAR), ("tmLastChar", wintypes.WCHAR), ("tmDefaultChar", wintypes.WCHAR), ("tmBreakChar", wintypes.WCHAR), ("tmItalic", ctypes.c_byte), ("tmUnderlined", ctypes.c_byte), ("tmStruckOut", ctypes.c_byte), ("tmPitchAndFamily", ctypes.c_byte), ("tmCharSet", ctypes.c_byte)]
    tm = TEXTMETRICW(); gdi32.GetTextMetricsW(hdc, ctypes.byref(tm))
    gdi32.SelectObject(hdc, old); gdi32.DeleteObject(hfont); user32.ReleaseDC(0, hdc)
    return total, abc_total, tm.tmHeight, tm.tmAveCharWidth, tm.tmMaxCharWidth

font, px = sys.argv[1], float(sys.argv[2])
for text in sys.argv[3:]:
    w = gdi_width(font, px, text)
    s, abc, h, ave, mx = per_char(font, px, text)
    print(f"whole {w:.0f} sumChar {s} sumABC {abc:.1f} tmH {h} ave {ave} max {mx}  {text[:30]!r}")
