# HANDOFF: Keyboard Navigation — VN Writer

**Branch:** `fix/keyboard-navigation-writer`
**Pham vi:** Chi Writer (khong Sheet/Slides)
**Ngay:** 2026-09-06

Note: agy (chay tren model Claude Sonnet sau khi quota Gemini mac dinh
het) hoan thanh 3 khu vuc dau va commit day du, nhung bi cat ngang giua
chung khu vuc 4 (Comments Panel) do het thoi gian phien lam viec truoc
khi kip viet handoff hoac commit. Thay doi do dang cho khu vuc 4 duoc
doc lai, xac nhan la mot doan code hoan chinh (khong phai code vo
nghia do dang), va duoc hoan tat/commit truc tiep boi nguoi phu trach
(Claude) sau khi kiem tra ky. File nay duoc viet thay cho agy de tong
hop day du 4 khu vuc.

---

## Khu vuc 1 — Spellcheck context menu (bug that, giong bug da sua o Sheet)

**File sua:** `platform/text/spellcheck-dom-controller.js`

Truoc khi sua: menu chuot phai spellcheck mo duoc, dong bang Escape
duoc, nhung KHONG tra focus ve vung soan thao sau khi dong — dung bug
class y het bug context menu cua Sheet da phat hien va sua truoc do
(`_closeContextMenu` khong tra focus). Menu cung chua co ArrowUp/Down
de di chuyen giua cac muc, va chua mo duoc bang ban phim (chi mo bang
chuot phai that).

Da sua:
- Luu `document.activeElement` vao `_focusBeforeMenu` truoc khi mo menu
  (ca hai duong: chuot phai va Shift+F10 moi them).
- `closeMenu()` tra focus ve `_focusBeforeMenu` sau khi dong.
- Them ArrowUp/ArrowDown/Home/End dieu huong giua cac menu item.
- Them Shift+F10: neu con tro dang trong mot tu duoc danh dau loi
  chinh ta, mo menu tai vi tri tu do bang ban phim (khong can chuot).

## Khu vuc 2 — Style Gallery (dropdown + strip tren ribbon)

**File sua:** `apps/writer/style-gallery.js`

- Dropdown: them auto-focus vao card dang active (hoac card dau) khi
  mo; them ArrowLeft/Right/Up/Down/Home/End di chuyen giua cac style
  card; Escape dong va tra focus ve nut da mo dropdown (`targetEl`).
- Strip tren ribbon: ap dung dung pattern WAI-ARIA "roving tabindex"
  cho toolbar — chi 1 button nhan duoc Tab focus tai mot thoi diem
  (`tabIndex=0`), cac button con lai `tabIndex=-1`; ArrowLeft/Right/
  Home/End di chuyen focus va cap nhat lai roving tabindex.

## Khu vuc 3 — Theme Gallery

**File sua:** `apps/writer/theme-gallery.js`

Cung pattern nhu Style Gallery: roving tabindex + ArrowKey navigation
giua cac theme card, theo dung WAI-ARIA radiogroup pattern (gallery
chon 1 theme tai mot thoi diem).

## Khu vuc 4 — Comments Panel

**File sua:** `adapters/libreoffice/writer/writer-adapter.js`,
`_commentPanelKeyHandler` (dong ~1102)

Truoc: handler chi xu ly Enter/Space de focus vao 1 comment. Da them
ArrowDown/ArrowUp de di chuyen tuan hoan (wrap-around) giua cac comment
card trong panel, tai su dung lai `commentsPanel.querySelectorAll(
"[data-comment-card]")` va goi `.focus()` truc tiep tren card (cac
card da co san `tabIndex=0` tu truoc). Fallback dung
`document.activeElement.closest(...)` khi phim mui ten duoc nhan tren
chinh panel container thay vi tren mot card cu the.

---

## Khu vuc chua kiem tra / ngoai pham vi lan nay

- Non-text elements (image/table/textbox) trong vung soan thao chinh:
  agy ghi nhan hinh anh da co `tabindex="0"` khi duoc chon, nhung CHUA
  co co che Tab de "nhay vao" chon cac phan tu nay tu ban phim thuan
  tuy khi con tro dang o giua van ban — chua sua trong dot nay, can do
  sau ve rui ro/do phuc tap truoc khi lam (contenteditable phuc tap).
- Vung soan thao chinh (contenteditable): ArrowKeys/Ctrl+Home/End/
  PageUp/Down deu la hanh vi browser native, khong can sua.
- Ribbon tab Writer: da co san ArrowLeft/Right/Home/End tu truoc
  (`ribbon-host.js`, dung chung cho ca 3 app) — khong can sua them.

## Kiem tra da chay

- `node scripts/check-syntax.js`: 87/87 PASS (chay lai boi Claude sau
  khi hoan tat khu vuc 4, tren nhanh da rebase len main moi nhat).
- `node tests/run-tests.js`: 1198/1198 PASS (tren main da rebase,
  gom ca Phase C Writer FODT vua merge).
- `node tests/live/writer-spellcheck-vi.playwright.mjs`: PASS (xac
  nhan khu vuc 1 khong lam hong luong spellcheck hien co).
- `node tests/live/writer-comment-navigation-behavior.playwright.mjs`:
  PASS (xac nhan khu vuc 4 khong lam hong Next/Previous/Resolve/Delete/
  Undo qua ribbon).

## Ranh gioi khong sua

- Khong sua logic tinh toan vi tri con tro, DOM range, hay serialize.
- Chi them/sua thuoc tinh focus/tabindex va handler dieu huong ban
  phim, goi lai ham/thuoc tinh DOM co san.
