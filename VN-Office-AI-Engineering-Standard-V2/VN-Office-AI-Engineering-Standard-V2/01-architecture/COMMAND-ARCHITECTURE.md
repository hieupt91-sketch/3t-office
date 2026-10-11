# Command Architecture

Command IDs phải ổn định, namespaced và UI-independent.

Examples:
- `common.file.open`
- `common.file.save`
- `common.edit.undo`
- `writer.text.bold`
- `writer.paragraph.align.center`
- `sheet.formula.sum`
- `sheet.cell.merge`
- `slides.slide.new`
- `slides.show.start`

Flow:
```text
UI Component
→ Command Registry
→ App/Shared Handler
→ LibreOffice Adapter
→ LibreOffice command/service
```

Command phải định nghĩa enabled/disabled state, checked/selected state nếu cần, error mapping và shortcut metadata.

Không để UI biết raw UNO/internal dispatch details nếu có thể che qua adapter.
