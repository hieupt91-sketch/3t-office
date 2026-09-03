# VN Office — Architecture Inventory & Baseline Assessment

**Version:** 1.0.0  
**Date:** 2026-09-03  
**Lead Engineering Agent:** Antigravity (AI Lead Architect)

---

## 1. Executive Summary & Product Objective

VN Office là bộ ứng dụng văn phòng thương hiệu Việt thống nhất, bao gồm:
- **VN Writer** (Xử lý văn bản, tương thích DOCX/ODT)
- **VN Sheet** (Bảng tính, tương thích XLSX/ODS)
- **VN Slides** (Trình chiếu, tương thích PPTX/ODP)

### Nguyên tắc cốt lõi:
1. **REUSE BEFORE REWRITE**: Tận dụng tối đa LibreOffice Core engine (layout, tính toán, rendering, OOXML filters). Không viết lại engine.
2. **Dedicated Modern UI**: Xây dựng UI/UX thuần Việt, trực quan, hiện đại, quen thuộc nhưng không sao chép trái phép tài sản/bản quyền sản phẩm khác.
3. **Độc lập với 3T Reader**: 3T Reader là sản phẩm đọc PDF/tài liệu riêng biệt của hệ sinh thái; VN Office không xây dựng PDF Reader trùng chức năng.
4. **Clean Abstraction & Modularity**: UI không bao giờ chạm trực tiếp vào mã nguồn nội bộ của LibreOffice mà luôn thông qua **Command Bus** và **VN LibreOffice Adapter**.

---

## 2. Monorepo Physical & Logical Inventory

Cấu trúc cây thư mục chuẩn Monorepo tại `E:\VN OFice`:

```text
E:\VN OFice/
├── apps/
│   ├── writer/               # VN Writer Application Layer
│   ├── sheet/                # VN Sheet Application Layer
│   └── slides/               # VN Slides Application Layer
├── platform/
│   ├── shell/                # Main Application Frame, Window Shell & Navigation
│   ├── ui-kit/               # Reusable UI Controls (Buttons, Inputs, Pickers, Menus)
│   ├── ribbon/               # Ribbon Tab/Group/Action Control Framework
│   ├── commands/             # Global Command Bus & Command Registry
│   ├── dialogs/              # Unified Dialog Framework
│   ├── theme/                # Theme Engine (Dark/Light/Vietnamese Palette)
│   ├── settings/             # User Preferences & App Configurations
│   ├── recent/               # Recent Documents Management
│   ├── templates/            # Vietnamese Standard Document Templates
│   ├── account/              # User Account Profile Integration
│   ├── cloud/                # Cloud Sync / Remote Document Storage
│   ├── ai/                   # Privacy-first VN AI Assistant Integration
│   ├── accessibility/        # Keyboard Navigation, Focus State, Screen Reader Support
│   └── diagnostics/          # Health Check, Logging, Telemetry (Local)
├── adapters/
│   └── libreoffice/
│       ├── common/           # UNO Bridge, Document Lifecycle, Service Manager
│       ├── writer/           # Writer Dispatch & Model Adapter (sw)
│       ├── sheet/            # Calc Dispatch & Cell Adapter (sc)
│       └── slides/           # Impress Dispatch & Canvas Adapter (sd)
├── core-master/              # Upstream LibreOffice Core Source (C++/UNO)
├── branding/                 # VN Office Icons, Logos, Colors, Typography
├── tests/
│   ├── unit/                 # Unit tests cho Platform & Adapters
│   ├── integration/          # UI-to-Adapter Integration tests
│   ├── compatibility/        # DOCX/XLSX/PPTX Round-trip verification
│   ├── smoke/                # Minimum Viable Feature Smoke tests
│   └── regression/           # Regression corpus
├── docs/                     # Kiến trúc, tài liệu kỹ thuật, ADRs
├── scripts/                  # Automation, worktree management, build helpers
└── AGENTS.md                 # Chỉ dẫn và luật bất biến cho AI Agents
```

---

## 3. LibreOffice Core Inventory & Reuse Mapping

| VN Office App | LibreOffice Core Module | Tái sử dụng (Reuse) | VN Office Layer tương ứng |
|---|---|---|---|
| **VN Writer** | `sw/` (StarWriter engine) | Document model, pagination, formatting, OOXML/ODF filters, text layout | `apps/writer`, `adapters/libreoffice/writer` |
| **VN Sheet** | `sc/` (StarCalc engine) | Formula engine, calculation matrix, cell styles, sorting, filtering, XLSX parser | `apps/sheet`, `adapters/libreoffice/sheet` |
| **VN Slides** | `sd/` (StarDraw/Impress) | Presentation canvas, shapes, slide transitions, animation timers, PPTX parser | `apps/slides`, `adapters/libreoffice/slides` |
| **Shared Platform** | `sfx2/`, `framework/`, `vcl/`, `comphelper/` | Dispatch framework, clipboard, undo/redo manager, font/glyph fallback | `platform/commands`, `platform/ui-kit`, `adapters/libreoffice/common` |
| **File I/O** | `oox/`, `filter/`, `package/` | DOCX/XLSX/PPTX parsing, packaging, zip stream, encryption | `adapters/libreoffice/common` |

---

## 4. Layer Boundary & Communication Rules

```text
[ VN App UI: Writer / Sheet / Slides ]
                 │
                 ▼
[ VN Platform: UI Kit, Ribbon, Dialogs, Theme ]
                 │
                 ▼
[ VN Command Bus (e.g. 'writer.text.bold', 'sheet.cell.merge') ]
                 │
                 ▼
[ VN LibreOffice Adapter (UNO Wrapper & Native IPC Bridge) ]
                 │
                 ▼
[ LibreOffice Core C++ Engine (sw, sc, sd, sfx2) ]
```

### Quy tắc bất biến:
- Không cho phép bất kỳ module UI nào import hoặc gọi header/function nội bộ của LibreOffice.
- Mọi thao tác tương tác văn bản, định dạng, lưu/mở file phải đóng gói qua Command ID chuẩn hóa.
- Trạng thái lệnh (`enabled`, `checked`, `label`, `shortcut`) được điều phối từ Adapter ngược lên Command Bus.
