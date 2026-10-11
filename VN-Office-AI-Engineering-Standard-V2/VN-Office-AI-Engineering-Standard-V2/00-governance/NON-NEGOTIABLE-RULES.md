# Non-Negotiable Rules
1. Baseline LibreOffice nguyên bản phải build được trước customization.
2. Không rewrite Writer/Calc/Impress engines.
3. Không rewrite OOXML filters nếu chưa có ADR và phê duyệt.
4. Không fork sâu Core vì lý do UI.
5. Không duplicate shared controls.
6. Không long-lived branches `writer`, `sheet`, `slides`.
7. Không agent overlap working tree.
8. Không merge broken build.
9. Không giấu known failure.
10. Không commit user documents vào test corpus nếu không có quyền.
11. Không hard-code credentials/endpoints nhạy cảm.
12. Không network/blocking I/O trên UI thread.
13. Không AI request synchronous trên UI thread.
14. Không destructive document replacement từ AI nếu user chưa chủ động áp dụng.
15. Không thay shortcut phổ biến tùy tiện.
16. Không làm localization bằng string hard-code rải rác.
17. Không đổi upstream source hàng loạt chỉ để “đẹp cấu trúc”.
18. Không format/refactor unrelated upstream code.
19. Không merge Core patch thiếu regression test.
20. Không release thiếu license notices và compatibility smoke.
