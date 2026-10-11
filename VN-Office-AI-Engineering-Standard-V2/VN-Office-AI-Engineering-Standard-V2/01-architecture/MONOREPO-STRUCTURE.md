# Monorepo Structure Target
```text
VN-Office/
├── apps/{writer,sheet,slides}/
├── platform/{shell,ui-kit,ribbon,commands,dialogs,theme,settings,recent,templates,account,cloud,ai,accessibility,diagnostics}/
├── adapters/libreoffice/{common,writer,sheet,slides}/
├── branding/
├── upstream/libreoffice/   # logical location; adapt to actual fork layout
├── tests/{unit,integration,compatibility,smoke,regression}/
├── docs/
├── scripts/
├── AGENTS.md
└── ...
```
Không tạo shared code trong app chỉ vì nhanh.
