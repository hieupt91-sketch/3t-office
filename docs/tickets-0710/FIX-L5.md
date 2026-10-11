# FIX-L5 (Slides vs PowerPoint) - phieu nho
Bang chung (Claude 11/10, PowerPoint COM vs app, 16 thao tac): 14 KHOP, 2 LECH.
1. colorDefault: bam nut `slides.color.text` (mau chu mac dinh) -> app Color=-2147483648 (khong dat), PowerPoint dat do (RGB 255). Sua app: nut ap mau do mac dinh nhu PowerPoint, luu vao PPTX.
2. slideHide: harness bao NO_BUTTON cho `slides.slide.toggleHidden` (nut khong hien trong ribbon dang xem). Xac dinh nut An slide nam o dau; neu thieu thi them; kiem tra PPTX co `show="0"`; doi chieu PowerPoint `SlideShowTransition.Hidden`.
Tai hien: scripts/audit-0610/word_parallel/ppt-compare.ps1 + tests/live/cdp/claude-ppt-parallel-app.desktop.mjs (OPS=colorDefault,slideHide, VNO_APP_ROOT=<worktree>).
Nghiem thu: 16/16 KHOP; Node + Python PASS; kem huong dan tieng Viet + i18n. Moi muc 1 commit; bao cao 3 dong.