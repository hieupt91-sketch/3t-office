# DOCX/XLSX/PPTX Compatibility
Mọi thay đổi ảnh hưởng:
layout, fonts, styles, numbering, formulas, charts, objects, macros, import/export, serialization
phải có compatibility consideration.

Round-trip rule:
Open external file → inspect → save → reopen VN Office → where practical reopen in reference ecosystem/manual verification.

Không “fix UI” bằng cách đổi serialization semantics.
