# VN Office — Implementation Roadmap by Milestones

**Status:** In Active Execution  
**Lead Engineering Agent:** Antigravity (AI Lead Architect)

---

## Phân công Song song (Parallelism Strategy)

| Trục phát triển | Khu vực phụ trách | Khả năng chạy song song |
|---|---|---|
| **Trục 1: Shared Platform** | `platform/**` (Shell, Ribbon, UI Kit, Command Bus, Theme, i18n) | Độc lập với UI ứng dụng chi tiết |
| **Trục 2: Adapter Layer** | `adapters/libreoffice/**` (Common, Writer, Sheet, Slides) | Kết nối UNO commands / Core services |
| **Trục 3: VN Writer** | `apps/writer/**` | Phát triển song song sau khi có Ribbon & Command Bus |
| **Trục 4: VN Sheet** | `apps/sheet/**` | Phát triển song song sau khi có Grid & Formula Command Bus |
| **Trục 5: VN Slides** | `apps/slides/**` | Phát triển song song sau khi có Canvas & Slide Command Bus |
| **Trục 6: Quality Assurance** | `tests/**` (Unit, Smoke, Round-trip compatibility) | Chạy song hành mọi milestone |

---

## Chi tiết các Milestones

### Milestone 0: Baseline & Infrastructure Setup (HOÀN THÀNH / IN PROGRESS)
- [x] Đọc toàn bộ bộ quy định kỹ thuật Engineering Standard V2.
- [x] Khảo sát toolchain máy trạm (Windows), thiết lập Git engine.
- [x] Thiết lập cấu trúc thư mục Monorepo chuẩn (`apps/`, `platform/`, `adapters/`, `docs/`, `tests/`, `branding/`).
- [x] Tạo `ARCHITECTURE-INVENTORY.md` và `ROADMAP.md`.
- [x] Khởi tạo Git repository và commit baseline ban đầu.

### Milestone 1: VN Shared Platform & Core Command Bus
- [ ] Xây dựng **Command Bus Framework** (`platform/commands/`):
  - Định nghĩa Command Schema, Command Registry, State Manager (`enabled`, `checked`, `shortcut`).
  - Hỗ trợ command namespaces (`common.*`, `writer.*`, `sheet.*`, `slides.*`).
- [ ] Xây dựng **UI Kit & Theme Engine** (`platform/ui-kit/`, `platform/theme/`):
  - Palette màu chuẩn VN Office (Primary, Slate, Accent).
  - Components: Button, IconButton, Dropdown, Menu, Tooltip, Dialog, Splitter.
  - Hỗ trợ Dark Mode / Light Mode.
- [ ] Xây dựng **Ribbon Host Framework** (`platform/ribbon/`):
  - Tabs, Groups, Quick Access Toolbar, Backstage Menu (Tệp / File).
  - Tối ưu phím tắt Alt key-tips, keyboard accessibility.
- [ ] Xây dựng **Shared Shell** (`platform/shell/`):
  - Title bar tích hợp tên tài liệu, chế độ lưu, tìm kiếm trung tâm (Search / Tell me).
  - Status bar chuẩn hóa (Số trang/từ, Tỉ lệ zoom, Chế độ xem, Bộ gõ tiếng Việt).

### Milestone 2: VN LibreOffice Adapter Layer
- [ ] **Common Adapter** (`adapters/libreoffice/common/`):
  - Lifecycle Manager (Khởi tạo UNO bridge, mở, đóng, lưu tài liệu, export PDF).
  - Event Bus Adapter kết nối Dispatch Status Listener với VN Command Bus.
- [ ] **Writer Adapter** (`adapters/libreoffice/writer/`):
  - Text formatting dispatches (`.uno:Bold`, `.uno:Italic`, `.uno:Underline`, Font, Size, Color).
  - Paragraph formatting (`.uno:LeftPara`, `.uno:CenterPara`, `.uno:JustifyPara`, Line spacing).
  - Table, Image, Header/Footer wrappers.
- [ ] **Sheet Adapter** (`adapters/libreoffice/sheet/`):
  - Cell formatting, Number format dispatches, Formula evaluation bridge.
  - Range selection, Column/Row operations, Sheet tab navigation.
- [ ] **Slides Adapter** (`adapters/libreoffice/slides/`):
  - Slide insert/delete/reorder, Master slide selection, Shapes/Text boxes dispatches.
  - Slide show presentation controller bridge.

### Milestone 3: VN Writer Implementation (MVP)
- [ ] Triển khai App UI Writer với Ribbon tabs chuẩn:
  - `Trang đầu (Home) | Chèn (Insert) | Bố trí (Layout) | Tham chiếu (References) | Đánh giá (Review) | Hiển thị (View) | Trợ lý AI`
- [ ] Tích hợp bộ gõ tiếng Việt mượt mà (hỗ trợ đầy đủ bảng mã Unicode dựng sẵn & tổ hợp).
- [ ] Kiểm thử smoke: Nhập văn bản, định dạng, bảng, chèn ảnh, lưu & mở lại DOCX/ODT.

### Milestone 4: VN Sheet Implementation (MVP)
- [ ] Triển khai App UI Sheet với Ribbon tabs chuẩn:
  - `Trang đầu (Home) | Chèn (Insert) | Công thức (Formulas) | Dữ liệu (Data) | Đánh giá (Review) | Hiển thị (View) | Trợ lý AI`
- [ ] Thanh công thức (Formula Bar) thông minh, hiển thị tên ô và hàm.
- [ ] Kiểm thử smoke: Nhập số liệu, tính toán hàm SUM/AVERAGE/IF, định dạng tiền tệ (VND/USD), lưu & mở lại XLSX/ODS.

### Milestone 5: VN Slides Implementation (MVP)
- [ ] Triển khai App UI Slides với Ribbon tabs chuẩn:
  - `Trang đầu (Home) | Chèn (Insert) | Thiết kế (Design) | Chuyển tiếp (Transitions) | Hoạt ảnh (Animations) | Trình chiếu (Slide Show) | Hiển thị (View) | Trợ lý AI`
- [ ] Bảng điều khiển danh sách slide (Slide Navigator) bên trái và khung vẽ chính giữa.
- [ ] Kiểm thử smoke: Thêm slide, nhập nội dung, chèn hình khối, chạy trình chiếu F5, lưu & mở lại PPTX/ODP.

### Milestone 6: Privacy-First VN AI Assistant
- [ ] Tích hợp `platform/ai/` tuân thủ nghiêm ngặt `07-security-ai/AI-ARCHITECTURE.md`:
  - Provider Abstraction (Local Ollama / OpenAI-compatible / Google Gemini).
  - Không bao giờ tự động ghi đè tài liệu người dùng một cách destructive.
  - Phân vùng dữ liệu tài liệu gửi đi cần có xác nhận minh bạch từ người dùng.

### Milestone 7: Integration, Regression & Delivery
- [ ] Bộ kiểm thử tương thích OOXML round-trip (`tests/compatibility/`).
- [ ] Kiểm tra tính toàn vẹn bản quyền, giấy phép (MPL/LGPL) và nhận diện thương hiệu độc lập (`07-security-ai/LICENSE-AND-BRANDING.md`).
- [ ] Handoff và đóng gói sản phẩm hoàn thiện.
