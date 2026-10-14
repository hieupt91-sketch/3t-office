import type { Project } from '../types'

export const products: Project[] = [
  {
    name: '3T Reader',
    kind: { vi: 'Sản phẩm', en: 'Product' },
    description: {
      vi: 'Không gian làm việc PDF tích hợp đọc tài liệu, OCR tiếng Việt, tìm kiếm nội dung scan, AI và ký số trong một ứng dụng.',
      en: 'A focused PDF workspace combining document reading, Vietnamese OCR, searchable scans, AI, and digital signing.',
    },
    url: 'https://reader.3tcomputer.com/',
    mark: 'PDF',
    highlights: [
      { vi: 'OCR tiếng Việt', en: 'Vietnamese OCR' },
      { vi: 'AI & dịch', en: 'AI & translation' },
      { vi: 'Ký số', en: 'Digital signing' },
    ],
    image: './projects/3t-reader.png',
    imageAlt: { vi: 'Giao diện đọc PDF trong 3T Reader', en: 'The PDF reading interface in 3T Reader' },
  },
  {
    name: '3T Office',
    kind: { vi: 'Sản phẩm', en: 'Product' },
    description: {
      vi: 'Bộ Doc, Sheet và Slide chạy ngoại tuyến trên Windows, làm việc với các định dạng văn phòng quen thuộc và chuẩn mở.',
      en: 'An offline-first Windows suite with Doc, Sheet, and Slide for familiar office formats and open standards.',
    },
    url: 'https://office.3tcomputer.com/',
    mark: '3T',
    highlights: [
      { vi: 'Offline-first', en: 'Offline-first' },
      { vi: 'Doc · Sheet · Slide', en: 'Doc · Sheet · Slide' },
      { vi: 'OOXML & ODF', en: 'OOXML & ODF' },
    ],
    image: './projects/3t-office.png',
    imageAlt: { vi: 'Giao diện soạn thảo Doc trong bộ 3T Office', en: 'The Doc editor interface in the 3T Office suite' },
  },
  {
    name: 'ScanDocApp',
    kind: { vi: 'Sản phẩm', en: 'Product' },
    description: {
      vi: 'Ứng dụng iPhone để quét, căn chỉnh, nhận dạng OCR và xuất tài liệu PDF, TXT hoặc RTF; dữ liệu lưu trên thiết bị theo mặc định.',
      en: 'An iPhone app for scanning, cropping, OCR, and PDF/TXT/RTF export, with documents stored locally by default.',
    },
    url: 'https://scandoc.3tcomputer.com/',
    mark: 'SCAN',
    highlights: [
      { vi: 'Quét & căn chỉnh', en: 'Scan & crop' },
      { vi: 'OCR', en: 'OCR' },
      { vi: 'Local mặc định', en: 'Local by default' },
    ],
    image: './projects/scandoc.png',
    imageAlt: { vi: 'Giao diện quét tài liệu của ScanDocApp trên iPhone', en: 'The ScanDocApp document scanning interface on iPhone' },
  },
  {
    name: 'ZCP',
    kind: { vi: 'Sản phẩm', en: 'Product' },
    description: {
      vi: 'Nền tảng POS và quản lý kho cho cửa hàng, hỗ trợ đa chi nhánh, F&B, báo cáo và vận hành Online hoặc Offline-First.',
      en: 'A POS and inventory platform for stores, with multi-branch, F&B, reporting, and online or offline-first operation.',
    },
    url: 'https://zcp.io.vn/portal/',
    mark: 'ZCP',
    highlights: [
      { vi: 'POS & kho', en: 'POS & inventory' },
      { vi: 'Đa chi nhánh', en: 'Multi-branch' },
      { vi: 'Offline-first', en: 'Offline-first' },
    ],
    image: './projects/zcp.png',
    imageAlt: { vi: 'Giao diện bán hàng tại quầy của ZCP', en: 'The ZCP retail point-of-sale interface' },
  },
]

export const clientProjects: Project[] = [
  {
    name: 'Happy Kids Website',
    kind: { vi: 'Dự án thực tế', en: 'Client project' },
    description: {
      vi: 'Website song ngữ giới thiệu chương trình, đội ngũ và hoạt động của môi trường giáo dục hỗ trợ trẻ phát triển kỹ năng.',
      en: 'A bilingual website presenting programs, educators, and activities for a child development and education organization.',
    },
    url: 'https://happykidsqb.edu.vn/',
    mark: 'HK',
    highlights: [
      { vi: 'Song ngữ', en: 'Bilingual' },
      { vi: 'Nội dung giáo dục', en: 'Education content' },
      { vi: 'Responsive', en: 'Responsive' },
    ],
    image: './projects/happy-kids.jpg',
    imageAlt: { vi: 'Hoạt động học tập tại Happy Kids Quảng Bình', en: 'Learning activities at Happy Kids Quang Binh' },
  },
  {
    name: 'Happy Kids Admin App',
    kind: { vi: 'Dự án thực tế', en: 'Client project' },
    description: {
      vi: 'Hệ thống quản trị dành cho đơn vị giáo dục, đang triển khai.',
      en: 'An administration system under development for an education organization.',
    },
    url: 'https://adminapp.happykidsqb.edu.vn/login',
    mark: 'ADMIN',
    highlights: [
      { vi: 'Quản trị vận hành', en: 'Operations admin' },
      { vi: 'Đang triển khai', en: 'In development' },
    ],
    image: './projects/happy-kids-admin.png',
    imageAlt: { vi: 'Logo ứng dụng quản trị Happy Kids', en: 'Happy Kids Admin App logo' },
  },
]
