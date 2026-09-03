# Architecture

```text
VN OFFICE SUITE
├── Launcher/Home
├── Shared Platform
│   ├── Shell
│   ├── UI Kit
│   ├── Ribbon Framework
│   ├── Command Bus
│   ├── Dialog Framework
│   ├── Theme
│   ├── Settings
│   ├── Recent Files
│   ├── Templates
│   ├── Account/Cloud
│   ├── AI Framework
│   ├── Accessibility
│   └── Diagnostics
├── Apps
│   ├── VN Writer
│   ├── VN Sheet
│   └── VN Slides
├── VN LibreOffice Adapter
└── LibreOffice Core
```

## Core principle
VN Office là một suite, không phải ba project ghép lại.

## Dependency direction
`apps → platform`, `apps → adapter`, `adapter → LibreOffice`.
Platform không phụ thuộc app internals.

## Physical source tree
Không bắt buộc di chuyển LibreOffice source vào layout lý tưởng nếu làm upstream sync khó. Logical module/API boundaries quan trọng hơn việc đổi toàn bộ tree.
