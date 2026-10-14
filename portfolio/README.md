# Portfolio — Phạm Trung Hiếu

Website portfolio song ngữ Việt–Anh theo nguyên tắc **Profile First — Service On Demand**. Dự án hiện chỉ dùng để phát triển và kiểm thử local; chưa được deploy.

## Chạy local

Yêu cầu Node.js 20.19+ hoặc 22.12+.

```bash
npm install
npm run dev
```

Kiểm tra trước khi duyệt:

```bash
npm run test
npm run lint
npm run typecheck
npm run build
npm run preview
```

## Cấu trúc nội dung

- `src/content/copy.ts`: toàn bộ nội dung giao diện VI/EN.
- `src/data/projects.ts`: 4 sản phẩm và 2 dự án cùng URL đã cung cấp.
- `src/data/services.ts`: lựa chọn dịch vụ, ngân sách và thời gian.
- `src/components`: các phần giao diện và dialog gửi yêu cầu.
- `src/lib/formValidation.ts`: validation phía client.
- `src/lib/formSubmission.ts`: adapter gửi form qua endpoint HTTPS.

Ngày sinh và nơi sinh không được đưa vào source frontend, DOM, metadata hoặc bundle. Các thông tin chưa xác nhận như Founder, timeline, học vấn, công nghệ, social link, vai trò cụ thể và trạng thái sản phẩm cũng chưa hiển thị.

## Cấu hình gửi yêu cầu

Mặc định biểu mẫu chạy ở **chế độ xem trước**: validation hoạt động nhưng không gửi và không bao giờ báo thành công giả.

1. Chọn Formspree hoặc provider tương đương, do chủ sở hữu tài khoản quản lý.
2. Xác minh `hieupt.qb@gmail.com`, domain được phép, rate limit, anti-spam, chính sách lưu/xóa dữ liệu và nơi xử lý dữ liệu.
3. Sao chép `.env.example` thành `.env.local` và đặt endpoint HTTPS công khai:

   ```text
   VITE_FORM_ENDPOINT=https://provider.example/form/your-public-id
   ```

4. Không đặt API key, Gmail password hoặc token bí mật trong biến `VITE_*`.
5. Kiểm tra gửi thật vào inbox và spam; kiểm tra offline, timeout, 4xx/5xx, input độc hại và double submit trước deploy.

Client validation và honeypot không thay thế validation, rate limit và anti-spam phía provider/server. Nếu provider yêu cầu payload khác, chỉ sửa adapter `formSubmission.ts`; không để UI gọi trực tiếp implementation provider.

## Privacy

Form không lưu dữ liệu vào URL, localStorage/sessionStorage, analytics hoặc console. Trước khi bật provider thật cần công bố notice đầy đủ: đơn vị kiểm soát dữ liệu, mục đích, trường bắt buộc, provider/recipient, thời gian lưu, quyền yêu cầu xóa và việc truyền dữ liệu qua biên giới nếu có.

## Nội dung và tài sản còn chờ xác nhận

- Tên pháp nhân tiếng Việt/Anh và việc dùng chức danh Founder.
- Có công khai ngày sinh/nơi sinh hay không (hiện hoàn toàn không ship).
- GitHub, LinkedIn, Facebook/fanpage chính xác.
- Ảnh chân dung, logo 3T và screenshot sản phẩm được phép sử dụng.
- Vai trò trong từng dự án, công nghệ, timeline nghề nghiệp và học vấn.
- Trạng thái chính xác của từng sản phẩm.
- Provider/form endpoint, retention/privacy và domain chính thức.

Không thêm ảnh stock, khuôn mặt tạo sinh hoặc screenshot giả. Khi có tài sản thật, cần tối ưu kích thước, khai báo width/height, alt text và quyền sử dụng.

## Deploy

Không deploy, không bật GitHub Pages và không cấu hình DNS cho đến khi chủ sở hữu duyệt giao diện, nội dung, privacy và provider. `vite.config.ts` hiện dùng `base: './'` để production build có thể preview ở thư mục con; canonical, sitemap, robots và OG image chỉ nên thêm sau khi có domain chính thức.
