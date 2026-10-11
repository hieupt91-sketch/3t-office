import ctypes, sys
from ctypes import wintypes
gdi32 = ctypes.windll.gdi32; user32 = ctypes.windll.user32
class TEXTMETRICW(ctypes.Structure):
    _fields_ = [("tmHeight", wintypes.LONG), ("tmAscent", wintypes.LONG), ("tmDescent", wintypes.LONG), ("tmInternalLeading", wintypes.LONG), ("tmExternalLeading", wintypes.LONG), ("tmAveCharWidth", wintypes.LONG), ("tmMaxCharWidth", wintypes.LONG), ("tmWeight", wintypes.LONG), ("tmOverhang", wintypes.LONG), ("tmDigitizedAspectX", wintypes.LONG), ("tmDigitizedAspectY", wintypes.LONG), ("tmFirstChar", wintypes.WCHAR), ("tmLastChar", wintypes.WCHAR), ("tmDefaultChar", wintypes.WCHAR), ("tmBreakChar", wintypes.WCHAR), ("tmItalic", ctypes.c_byte), ("tmUnderlined", ctypes.c_byte), ("tmStruckOut", ctypes.c_byte), ("tmPitchAndFamily", ctypes.c_byte), ("tmCharSet", ctypes.c_byte)]
def tm(font, pt, bold=False):
    px = pt * 96 / 72
    hdc = user32.GetDC(0)
    hfont = gdi32.CreateFontW(int(round(-px)), 0, 0, 0, 700 if bold else 400, 0, 0, 0, 1, 0, 0, 4, 0, font)
    old = gdi32.SelectObject(hdc, hfont); t = TEXTMETRICW(); gdi32.GetTextMetricsW(hdc, ctypes.byref(t))
    gdi32.SelectObject(hdc, old); gdi32.DeleteObject(hfont); user32.ReleaseDC(0, hdc)
    return t.tmHeight, t.tmAscent, t.tmDescent, t.tmInternalLeading, t.tmExternalLeading
# pad do duoc (Normal Calibri 11 | Arial 10 | TNR 12 | TNR 13) va L
data = {("Times New Roman", 6): (11, 2, 1, 2, 2), ("Times New Roman", 8): (15, 1, 0, 1, 1), ("Times New Roman", 9): (16, 1, 0, 1, 1), ("Times New Roman", 10): (17, 1, 0, 1, 1),
        ("Times New Roman", 11): (20, 0, 0, 0, 0), ("Times New Roman", 12): (21, 0, 0, 0, 0), ("Times New Roman", 13): (22, 0, 0, 0, 0), ("Times New Roman", 14): (25, 0, 0, 0, 0), ("Times New Roman", 16): (27, 0, 0, 0, 0), ("Times New Roman", 18): (31, 0, 0, 0, 0),
        ("Arial", 6): (11, 2, 1, 2, 2), ("Arial", 8): (15, 1, 0, 1, 1), ("Arial", 9): (16, 1, 0, 1, 1), ("Arial", 10): (17, 1, 0, 1, 1), ("Arial", 11): (19, 1, 0, 1, 1), ("Arial", 12): (20, 1, 0, 1, 1), ("Arial", 13): (22, 0, 0, 0, 0), ("Arial", 14): (24, 0, 0, 0, 0), ("Arial", 16): (27, 0, 0, 0, 0), ("Arial", 18): (31, 0, 0, 0, 0),
        ("Calibri", 6): (11, 2, 1, 2, 2), ("Calibri", 8): (15, 1, 0, 1, 1), ("Calibri", 9): (16, 1, 0, 1, 1), ("Calibri", 10): (17, 1, 0, 1, 1), ("Calibri", 11): (20, 0, 0, 0, 0), ("Calibri", 12): (21, 0, 0, 0, 0), ("Calibri", 13): (23, 0, 0, 0, 0), ("Calibri", 14): (25, 0, 0, 0, 0), ("Calibri", 16): (28, 0, 0, 0, 0), ("Calibri", 18): (31, 0, 0, 0, 0)}
print("Normal metrics:", {n: tm(*n) for n in [("Calibri", 11), ("Arial", 10), ("Times New Roman", 12), ("Times New Roman", 13)]})
for (font, pt), (L, p1, p2, p3, p4) in data.items():
    h, a, d, il, el = tm(font, pt)
    print(f"{font:16}{pt:>3}: L={L:2} tmH={h:2} asc={a:2} desc={d:2} il={il} el={el} | L-tmH={L - h:2} pads C11={p1} A10={p2} T12={p3} T13={p4}")
