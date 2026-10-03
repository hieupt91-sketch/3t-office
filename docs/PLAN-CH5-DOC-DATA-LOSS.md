# CH-5.6 continuation plan — 02/10/2026

Objective: finish DOCX persistence of section headers/footers, tracked changes and comments, including unchanged and body-only edited Word documents.

Current capability: committed adapter/OOXML implementation and synthetic pipeline/CDP tests; main merged with equation serialization retained alongside review serialization. Reuse LibreOffice conversion, source package preservation and existing section overlay; no Core patch.

Modules: adapters/libreoffice/common/ooxml_zip_patch.py, adapters/libreoffice/writer/writer-adapter.js, main.py, scoped review tests, Vietnamese existing Help articles and handoff. Dependencies: installed LibreOffice, WebView2 and hidden Word COM. No new dependency.

Risk: section references, untouched OMML, nested comment/revision anchors and page layout. Verify synthetic unchanged/body edit/new document cases, desktop CDP save/reopen + hidden Word, full Node/Python suites, legacy layout batch versus both supplied baselines. Only one Word audit at a time. Legacy local script remains untracked; change transport only to CDP to satisfy input rules.

Rollback: revert scoped CH-5.6 changes on this branch if verification identifies regressions; do not modify main or company documents. Commit and provide standard handoff with measured outcomes.
