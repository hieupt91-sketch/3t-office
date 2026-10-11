# VN Office — Vietnamese Office Suite

VN Office là bộ ứng dụng văn phòng thương hiệu Việt, thống nhất và hiện đại, bao gồm:
- **VN Writer**: Ứng dụng soạn thảo văn bản chuyên nghiệp (kế thừa LibreOffice Writer engine).
- **VN Sheet**: Ứng dụng bảng tính thông minh (kế thừa LibreOffice Calc engine).
- **VN Slides**: Ứng dụng trình chiếu ấn tượng (kế thừa LibreOffice Impress engine).

## Triết lý kỹ thuật
1. **Reuse Before Rewrite**: Tận dụng tối đa sức mạnh của LibreOffice Core thay vì viết lại engine.
2. **Dedicated UI/UX**: Trực quan, quen thuộc, hỗ trợ tiếng Việt sâu sắc, hiện đại, dễ tiếp cận.
3. **Phát triển song song**: 3 ứng dụng phát triển song song dựa trên Shared Platform duy nhất.
4. **Adapter Boundary**: UI tách biệt hoàn toàn với Core thông qua VN Command Bus & LibreOffice Adapter.
5. **Bảo mật & AI**: Quyền riêng tư là trên hết. AI chỉ đóng vai trò trợ lý, không ghi đè dữ liệu người dùng khi chưa có xác nhận.

## Cấu trúc Monorepo
- `apps/`: Mã nguồn UI và logic đặc thù cho Writer, Sheet, Slides.
- `platform/`: Shared Platform dùng chung (Shell, Ribbon, UI Kit, Theme, Command Bus, AI...).
- `adapters/`: Tầng giao tiếp giữa Platform/Apps với LibreOffice Core.
- `core-master/`: Mã nguồn LibreOffice Core upstream.
- `branding/`: Thiết kế nhận diện, icon, màu sắc thương hiệu VN Office.
- `tests/`: Bộ kiểm thử unit, integration, smoke, round-trip OOXML.
- `docs/`: Tài liệu kiến trúc và hướng dẫn kỹ thuật.
