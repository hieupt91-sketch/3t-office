# HANDOFF: Keyboard Navigation — VN Sheet

**Branch:** `fix/keyboard-navigation-sheet`
**Worktree:** `E:\VNOffice-agy-keyboard-nav-sheet`
**Pham vi:** Chi Sheet (khong Writer/Slides)
**Ngay:** 2026-09-06

---

## Tong ket 3 khu vuc

### Khu vuc 1 — Grid di chuyen bang ban phim

| Phim | Truoc | Sau |
|------|-------|-----|
| ArrowUp/Down/Left/Right | Da co | - |
| Tab / Shift+Tab | Da co | - |
| Enter / Shift+Enter | Da co | - |
| Ctrl+PageUp/Down | Da co (chuyen sheet) | - |
| **PageUp (khong Ctrl)** | **Khong co** | **Da them** — di chuyen len ~1 trang, cuon viewport |
| **PageDown (khong Ctrl)** | **Khong co** | **Da them** — di chuyen xuong ~1 trang, cuon viewport |
| F2 | Da co (vao edit mode) | - |
| Delete/Backspace | Da co (xoa noi dung o) | - |
| Ctrl+Z/Y | Da co (undo/redo) | - |
| Ctrl+A | Da co (chon tat ca) | - |

**File sua:** `apps/sheet/sheet-grid.js`, ham `_bindGridKeyboardNavigation()`, dong 2756-2800

**Chi tiet:** PageUp/PageDown tinh so hang theo `viewport.clientHeight / rowHeight`,
dung dung tai bien (row 1 va rowCount), ho tro Shift+PageUp/Down mo rong vung chon.

---

### Khu vuc 2 — Ribbon keyboard navigation

| Tinh nang | Tinh trang | Ghi chu |
|-----------|-----------|---------|
| ArrowLeft/Right chuyen tab | **Da co san** | `ribbon-host.js` dong 84-108 |
| Enter/Space kich hoat button | **Da co san** | Browser native + `createCommandButton` |
| ArrowDown mo dropdown | **Da co san** | `components.js` dong 670-678 |
| ArrowDown/Up dieu huong item trong dropdown | **Da co san** | `components.js` dong 620-641 |
| Enter chon item dropdown | **Da co san** | `components.js` dong 633-638 |
| Escape dong dropdown | **Da co san** | `components.js` dong 621-624 |

**Khong can sua gi them.** Tat ca chuc nang ribbon keyboard da duoc cai dat dung
trong cac lan phat trien truoc.

---

### Khu vuc 3 — Menu ngu canh (context menu) mo bang ban phim

| Phim | Truoc | Sau |
|------|-------|-----|
| Chuot phai | Da co | - |
| ArrowDown/Up dieu huong trong menu | Da co | - |
| Enter chon item | Da co (focus va Enter) | - |
| Escape dong menu | Da co | - |
| **Shift+F10** | **Khong co** | **Da them** — mo context menu tren o dang chon |
| **ContextMenu key** | **Khong co** | **Da them** — tuong duong Shift+F10 |

**File sua:** `apps/sheet/sheet-grid.js`, ham `_bindGridKeyboardNavigation()`, dong 2780-2800

**Chi tiet:** Lay getBoundingClientRect() cua cell dang chon de dat vi tri menu,
fallback ve toa do (8, 80) neu cell chua duoc render trong virtual scroll.
Context menu mo xong tu dong focus vao item dau tien (da co san tu truoc).

---

## Files thay doi

| File | Loai thay doi |
|------|--------------|
| `apps/sheet/sheet-grid.js` | Them 39 dong trong `_bindGridKeyboardNavigation()` |
| `tests/live/sheet-keyboard-nav-new.playwright.mjs` | Them moi — 7 buoc test |

## Commits

| Hash | Mo ta |
|------|-------|
| `8d65504` | feat(sheet/keyboard): them PageUp/Down + Shift+F10 mo context menu |

## Cach kiem tra thu cong

1. Mo Sheet, click o A1
2. Nhan PageDown — kiem tra o di chuyen xuong nhieu hang, viewport cuon
3. Nhan PageUp — kiem tra o di chuyen len tuong ung
4. Nhan PageUp o A1 — kiem tra dung tai row 1
5. Click o C5, nhan Shift+F10 — menu ngu canh phai xuat hien
6. Nhan ArrowDown trong menu — focus chuyen qua item tiep theo
7. Nhan Escape — menu dong, focus tro ve luoi
8. Nhan ArrowDown — kiem tra o di chuyen binh thuong

## Ranh gioi khong sua

- Khong sua logic tinh toan o, cong thuc, gia tri
- Khong sua serialize/de-serialize
- Chi them handler phim dieu huong focus, goi ham co san (selectCell, showContextMenu)

## Con lai de lam (neu can)

- Home/End khong Ctrl (hien chua co) — nhay ve o dau/cuoi hang
- Ctrl+Home/Ctrl+End: da co (nhay A1 va o cuoi co du lieu)
- Shift+F2: mo ghi chu (shortcut nay da hien thi trong context menu nhung chua bind)
