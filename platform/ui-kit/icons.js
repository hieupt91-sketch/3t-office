/**
 * VN Office UI Kit — Precision Multi-Tone Vector Icons (SVG)
 * Thiết kế đồ họa sắc nét, trực quan, đa sắc màu đẳng cấp Office Suite
 */

export const ICONS = {
  // Thương hiệu VN Office
  brandLogo: `<svg viewBox="0 0 32 32" width="22" height="22" fill="none">
    <rect width="32" height="32" rx="7" fill="#C01E17"/>
    <path d="M7 9L16 25L25 9H20L16 17.5L12 9H7Z" fill="#F5B800"/>
    <path d="M16 5L17.5 8.5L21 9L18.5 11.5L19 15L16 13L13 15L13.5 11.5L11 9L14.5 8.5L16 5Z" fill="#FFFFFF" opacity="0.95"/>
  </svg>`,

  // App Logos
  appWriter: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none"><rect width="24" height="24" rx="5" fill="#0F4C81"/><path d="M5 6L8.5 18H11.5L14 9.5L16.5 18H19.5L23 6H19.5L17.5 14L15.2 6H12.8L10.5 14L8.5 6H5Z" fill="#FFF"/></svg>`,
  appSheet: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none"><rect width="24" height="24" rx="5" fill="#0F6D38"/><rect x="5" y="5" width="14" height="14" rx="2" fill="#FFF" fill-opacity="0.2"/><path d="M5 10H19M5 14H19M10 5V19M15 5V19" stroke="#FFF" stroke-width="1.5"/></svg>`,
  appSlides: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none"><rect width="24" height="24" rx="5" fill="#B53818"/><rect x="5" y="6" width="14" height="10" rx="1.5" fill="#FFF" fill-opacity="0.3" stroke="#FFF" stroke-width="1.2"/><polygon points="10,9 15,11 10,13" fill="#FFF"/></svg>`,

  // Tệp (File)
  fileNew: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none">
    <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" fill="#F8FAFC" stroke="#0F4C81" stroke-width="1.5"/>
    <path d="M14 2V8H20" fill="#93C5FD" stroke="#0F4C81" stroke-width="1.5"/>
    <circle cx="12" cy="14" r="4" fill="#10B981"/>
    <path d="M12 12V16M10 14H14" stroke="#FFF" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`,

  fileOpen: `<svg viewBox="0 0 24 24" width="22" height="22" fill="none">
    <path d="M4 4H10L12 6H20C21.1 6 22 6.9 22 8V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z" fill="#F59E0B" stroke="#D97706" stroke-width="1.2"/>
    <path d="M2 10H22V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V10Z" fill="#FCD34D"/>
  </svg>`,

  fileSave: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none">
    <path d="M19 21H5C3.9 21 3 20.1 3 19V5C3 3.9 3.9 3 5 3H16L21 8V19C21 20.1 20.1 21 19 21Z" fill="#2563EB" stroke="#1D4ED8" stroke-width="1.2"/>
    <rect x="7" y="3" width="9" height="5" rx="1" fill="#FFFFFF"/>
    <rect x="6" y="12" width="12" height="7" rx="1" fill="#DBEAFE"/>
    <rect x="13" y="4" width="2" height="3" fill="#1D4ED8"/>
  </svg>`,

  filePrint: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none">
    <rect x="6" y="2" width="12" height="6" rx="1" fill="#E2E8F0" stroke="#475569" stroke-width="1.2"/>
    <rect x="3" y="7" width="18" height="10" rx="2" fill="#0F4C81"/>
    <rect x="6" y="13" width="12" height="8" rx="1" fill="#FFFFFF" stroke="#475569" stroke-width="1.2"/>
    <line x1="8" y1="16" x2="16" y2="16" stroke="#94A3B8" stroke-width="1.2"/>
    <line x1="8" y1="18" x2="14" y2="18" stroke="#94A3B8" stroke-width="1.2"/>
    <circle cx="18" cy="10" r="1" fill="#10B981"/>
  </svg>`,

  filePdf: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none">
    <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" fill="#FEE2E2" stroke="#DC2626" stroke-width="1.2"/>
    <path d="M14 2V8H20" fill="#FCA5A5"/>
    <rect x="5" y="12" width="14" height="7" rx="1.5" fill="#DC2626"/>
    <text x="7" y="17.5" fill="#FFF" font-weight="900" font-size="6" font-family="sans-serif">PDF</text>
  </svg>`,

  // Bảng nhớ tạm (Clipboard)
  paste: `<svg viewBox="0 0 32 32" width="28" height="28" fill="none">
    <rect x="7" y="5" width="18" height="23" rx="2" fill="#94A3B8"/>
    <rect x="9" y="7" width="14" height="19" rx="1" fill="#FFFFFF"/>
    <line x1="12" y1="12" x2="20" y2="12" stroke="#CBD5E1" stroke-width="1.5"/>
    <line x1="12" y1="15" x2="18" y2="15" stroke="#CBD5E1" stroke-width="1.5"/>
    <line x1="12" y1="18" x2="19" y2="18" stroke="#CBD5E1" stroke-width="1.5"/>
    <rect x="12" y="3" width="8" height="4" rx="1.5" fill="#F59E0B" stroke="#D97706" stroke-width="1"/>
    <rect x="14" y="11" width="14" height="17" rx="2" fill="#2563EB" opacity="0.9"/>
    <path d="M18 16H24M18 20H24M18 24H21" stroke="#FFF" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`,

  cut: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none">
    <circle cx="6" cy="6" r="3" stroke="#DC2626" stroke-width="1.75"/>
    <circle cx="6" cy="18" r="3" stroke="#DC2626" stroke-width="1.75"/>
    <line x1="20" y1="4" x2="8.12" y2="15.88" stroke="#334155" stroke-width="1.75"/>
    <line x1="14.47" y1="14.48" x2="20" y2="20" stroke="#334155" stroke-width="1.75"/>
    <line x1="8.12" y1="8.12" x2="12" y2="12" stroke="#334155" stroke-width="1.75"/>
  </svg>`,

  copy: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none">
    <rect x="8" y="8" width="13" height="13" rx="2" fill="#DBEAFE" stroke="#2563EB" stroke-width="1.5"/>
    <path d="M5 15H4C2.9 15 2 14.1 2 13V4C2 2.9 2.9 2 4 2H13C14.1 2 15 2.9 15 4V5" stroke="#64748B" stroke-width="1.5"/>
  </svg>`,

  formatPainter: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none">
    <rect x="3" y="3" width="14" height="7" rx="1.5" fill="#F59E0B" stroke="#D97706" stroke-width="1.2"/>
    <rect x="5" y="7" width="10" height="3" fill="#3B82F6"/>
    <path d="M12 10V14C12 15.1 12.9 16 14 16H15V21" stroke="#475569" stroke-width="2" stroke-linecap="round"/>
  </svg>`,

  undo: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#2563EB" stroke-width="2.2" stroke-linecap="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>`,
  redo: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#2563EB" stroke-width="2.2" stroke-linecap="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>`,
  zoomIn: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#2563EB" stroke-width="2" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5M10.5 7.5v6M7.5 10.5h6"/></svg>`,
  zoomOut: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#2563EB" stroke-width="2" stroke-linecap="round"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m15.5 15.5 5 5M7.5 10.5h6"/></svg>`,
  zoomReset: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#2563EB" stroke-width="2" stroke-linecap="round"><path d="M4 8a8 8 0 1 1-1 7M4 3v5h5"/><text x="8" y="15" fill="#2563EB" stroke="none" font-size="7" font-weight="700">100</text></svg>`,
  gridlines: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#0F6D38" stroke-width="1.7"><rect x="3" y="3" width="18" height="18" rx="1"/><path d="M9 3v18M15 3v18M3 9h18M3 15h18"/></svg>`,
  headings: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#0F6D38" stroke-width="1.7"><rect x="3" y="3" width="18" height="18" rx="1"/><path d="M8 3v18M3 8h18"/><path d="m11 6 1.5-3L14 6M5 11v6M4 12l1-1 1 1"/></svg>`,
  writerPrintLayout: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none"><rect x="5" y="2.5" width="14" height="19" rx="1.5" fill="#EFF6FF" stroke="#0F4C81" stroke-width="1.5"/><path d="M8 7h8M8 10h8M8 13h6M8 17h8" stroke="#60A5FA" stroke-width="1.4" stroke-linecap="round"/></svg>`,
  writerWebLayout: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none"><rect x="2.5" y="4" width="19" height="16" rx="2" fill="#ECFEFF" stroke="#0F4C81" stroke-width="1.5"/><path d="M3 8h18M7 4v4M11 4v4M7 12h10M7 15h7" stroke="#0891B2" stroke-width="1.4" stroke-linecap="round"/></svg>`,
  writerReadMode: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none"><path d="M3 5.5c3.3-1.3 6.3-.7 9 1.3v13c-2.7-2-5.7-2.6-9-1.3v-13Z" fill="#DBEAFE" stroke="#0F4C81" stroke-width="1.4"/><path d="M21 5.5c-3.3-1.3-6.3-.7-9 1.3v13c2.7-2 5.7-2.6 9-1.3v-13Z" fill="#FEF3C7" stroke="#0F4C81" stroke-width="1.4"/></svg>`,
  writerRuler: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none"><rect x="2" y="7" width="20" height="10" rx="1.5" fill="#FEF3C7" stroke="#A16207" stroke-width="1.4"/><path d="M6 7v5M10 7v3M14 7v5M18 7v3" stroke="#A16207" stroke-width="1.3"/></svg>`,
  writerPageWidth: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none"><rect x="5" y="3" width="14" height="18" rx="1.5" fill="#EFF6FF" stroke="#0F4C81" stroke-width="1.4"/><path d="M2 12h20M2 12l3-3M2 12l3 3M22 12l-3-3M22 12l-3 3" stroke="#2563EB" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  writerNewWindow: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none"><rect x="3" y="6" width="14" height="14" rx="1.5" fill="#DBEAFE" stroke="#0F4C81" stroke-width="1.4"/><rect x="7" y="3" width="14" height="14" rx="1.5" fill="#FFF" stroke="#2563EB" stroke-width="1.4"/><path d="M7 7h14" stroke="#2563EB" stroke-width="1.4"/></svg>`,
  newWindow: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none"><rect x="3" y="6" width="14" height="14" rx="1.5" fill="#DBEAFE" stroke="#0F4C81" stroke-width="1.4"/><rect x="7" y="3" width="14" height="14" rx="1.5" fill="#FFF" stroke="#2563EB" stroke-width="1.4"/><path d="M7 7h14" stroke="#2563EB" stroke-width="1.4"/></svg>`,
  sheetNormalView: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none"><rect x="3" y="4" width="18" height="16" rx="2" fill="#ECFDF5" stroke="#0F6D38" stroke-width="1.5"/><path d="M3 9h18M3 14h18M9 4v16M15 4v16" stroke="#0F6D38" stroke-width="1.2"/></svg>`,
  sheetPageBreakPreview: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none"><rect x="3" y="4" width="18" height="16" rx="2" fill="#F8FAFC" stroke="#64748B" stroke-width="1.2"/><path d="M3 12h18" stroke="#2563EB" stroke-width="1.8" stroke-dasharray="3 2"/><path d="M12 4v16" stroke="#2563EB" stroke-width="1.8" stroke-dasharray="3 2"/><rect x="5" y="6" width="14" height="12" stroke="#1D4ED8" stroke-width="1.5"/><text x="7" y="11" font-size="5" fill="#2563EB" font-weight="700">Trang 1</text></svg>`,
  sheetPageLayout: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none"><rect x="4" y="3" width="16" height="18" rx="1.5" fill="#EFF6FF" stroke="#0F6D38" stroke-width="1.5"/><path d="M7 6h10M7 8h10M7 11h10M7 14h10M7 17h10M11 8v9M14 8v9" stroke="#3B82F6" stroke-width="1.1"/></svg>`,
  sheetFormulaBar: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none"><rect x="2.5" y="7" width="19" height="10" rx="2" fill="#ECFDF5" stroke="#0F6D38" stroke-width="1.4"/><text x="5" y="14" font-size="8" font-weight="700" fill="#0F6D38" font-style="italic">fx</text><line x1="11" y1="9" x2="11" y2="15" stroke="#94A3B8" stroke-width="1.2"/><line x1="13" y1="12" x2="19" y2="12" stroke="#0F6D38" stroke-width="1.5"/></svg>`,
  sheetZoomSelection: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none"><circle cx="10" cy="10" r="6" stroke="#2563EB" stroke-width="1.8"/><path d="m14.5 14.5 5.5 5.5" stroke="#2563EB" stroke-width="2" stroke-linecap="round"/><rect x="7" y="7" width="6" height="6" stroke="#0F6D38" stroke-width="1.2" stroke-dasharray="2 1"/></svg>`,
  slidesNormalView: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none"><rect x="2.5" y="4" width="5" height="16" rx="1" fill="#FAEEE8" stroke="#B53818" stroke-width="1.2"/><rect x="9.5" y="4" width="12" height="16" rx="1.5" fill="#FFF" stroke="#B53818" stroke-width="1.5"/><line x1="12" y1="8" x2="19" y2="8" stroke="#B53818" stroke-width="1.2"/><line x1="12" y1="12" x2="17" y2="12" stroke="#94A3B8" stroke-width="1"/></svg>`,
  slidesReadingView: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none"><rect x="3" y="4" width="18" height="14" rx="2" fill="#FAEEE8" stroke="#B53818" stroke-width="1.5"/><polygon points="9,8 15,11 9,14" fill="#B53818"/><line x1="6" y1="20" x2="18" y2="20" stroke="#B53818" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  slidesRuler: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none"><rect x="2" y="7" width="20" height="10" rx="1.5" fill="#FAEEE8" stroke="#B53818" stroke-width="1.4"/><path d="M6 7v5M10 7v3M14 7v5M18 7v3" stroke="#B53818" stroke-width="1.3"/></svg>`,
  slidesGridlines: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none"><rect x="3" y="4" width="18" height="14" rx="1.5" fill="#FFF" stroke="#B53818" stroke-width="1.4"/><path d="M3 9h18M3 13h18M8 4v14M13 4v14M18 4v14" stroke="#B53818" stroke-width="1" stroke-dasharray="2 2"/></svg>`,
  slidesGuides: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none"><rect x="3" y="4" width="18" height="14" rx="1.5" fill="#FFF" stroke="#B53818" stroke-width="1.4"/><line x1="12" y1="4" x2="12" y2="18" stroke="#E11D48" stroke-width="1.6" stroke-dasharray="3 2"/><line x1="3" y1="11" x2="21" y2="11" stroke="#E11D48" stroke-width="1.6" stroke-dasharray="3 2"/></svg>`,
  slidesFitWindow: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none"><rect x="4" y="5" width="16" height="12" rx="1.5" fill="#FAEEE8" stroke="#B53818" stroke-width="1.4"/><path d="M2 2l4 4M2 2h3M2 2v3M22 2l-4 4M22 2h-3M22 2v3M2 20l4-4M2 20h3M2 20v-3M22 20l-4-4M22 20h-3M22 20v-3" stroke="#B53818" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  comment: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#B53818" stroke-width="2" stroke-linejoin="round"><path d="M4 4h16v12H9l-5 4V4Z"/><path d="M8 8h8M8 12h5"/></svg>`,

  // Định dạng ký tự
  bold: `<svg viewBox="0 0 24 24" width="15" height="15" fill="#0F172A"><path d="M6 3h7c2.76 0 5 2.24 5 5 0 1.55-.7 2.94-1.8 3.87C17.48 12.87 18.5 14.54 18.5 16.5 18.5 19.54 16.04 22 13 22H6V3zm3.5 3v4h3.5c1.1 0 2-.9 2-2s-.9-2-2-2H9.5zm0 7v6H13c1.38 0 2.5-1.12 2.5-2.5S14.38 13 13 13H9.5z"/></svg>`,
  italic: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#0F172A" stroke-width="2.4"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>`,
  underline: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#0F172A" stroke-width="2.2"><path d="M6 3v7a6 6 0 0 0 12 0V3"/><line x1="4" y1="21" x2="20" y2="21"/></svg>`,
  strike: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#0F172A" stroke-width="2"><path d="M17.3 4.9c-2.3-.6-5.8-.8-7.3.5-1.5 1.3-1.2 3.6.5 4.6 1.4.8 3.5 1 5.3 1.5M4 12h16M7 17.5c1.4.8 3.3 1.2 5 1.2 3.2 0 5-1.4 5-3.3"/></svg>`,
  subscript: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#0F172A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="5" x2="13" y2="17"/><line x1="13" y1="5" x2="4" y2="17"/><path d="M16 14.5c.2-.9 1-1.5 2-1.5 1.1 0 2 .8 2 1.8 0 1.2-1.2 2-2.2 2.8l-1.8 1.4h4" stroke-width="1.8"/></svg>`,
  superscript: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#0F172A" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" y1="7" x2="13" y2="19"/><line x1="13" y1="7" x2="4" y2="19"/><path d="M16 5.5c.2-.9 1-1.5 2-1.5 1.1 0 2 .8 2 1.8 0 1.2-1.2 2-2.2 2.8l-1.8 1.4h4" stroke-width="1.8"/></svg>`,
  clearFormat: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none"><path d="M3 3l18 18M7 7l5-5 7 7-5 5" stroke="#EF4444" stroke-width="2"/><path d="M2 20h14" stroke="#475569" stroke-width="2"/></svg>`,
  colorText: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none"><path d="M6 17l6-13 6 13M8 13h8" stroke="#0F172A" stroke-width="2"/><rect x="2" y="19" width="20" height="3" rx="1" fill="#C01E17"/></svg>`,
  colorHighlight: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none"><path d="M9 11l-6 6v3h3l6-6" stroke="#D97706" stroke-width="1.8"/><path d="M22 7l-5-5-7 7 5 5 7-7z" fill="#FCD34D" stroke="#D97706" stroke-width="1.2"/><rect x="2" y="19" width="20" height="3" rx="1" fill="#F5B800"/></svg>`,

  // Căn lề & Đoạn văn
  alignLeft: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#334155" stroke-width="2"><line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/></svg>`,
  alignCenter: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#334155" stroke-width="2"><line x1="18" y1="10" x2="6" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="18" y1="18" x2="6" y2="18"/></svg>`,
  alignRight: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#334155" stroke-width="2"><line x1="21" y1="10" x2="7" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="21" y1="18" x2="7" y2="18"/></svg>`,
  alignJustify: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#334155" stroke-width="2"><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="10" x2="3" y2="10"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="21" y1="18" x2="3" y2="18"/></svg>`,
  listBullet: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#334155" stroke-width="2"><line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><circle cx="4" cy="6" r="2" fill="#2563EB" stroke="none"/><circle cx="4" cy="12" r="2" fill="#2563EB" stroke="none"/><circle cx="4" cy="18" r="2" fill="#2563EB" stroke="none"/></svg>`,
  listNumber: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#334155" stroke-width="1.8"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 7h1v-4M3 7h3" stroke="#2563EB"/><path d="M3 13a2 2 0 1 1 3-1.7c-.5.4-2 1.7-2 2.7h3" stroke="#2563EB"/></svg>`,
  indentInc: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#334155" stroke-width="1.8"><line x1="21" y1="6" x2="11" y2="6"/><line x1="21" y1="12" x2="11" y2="12"/><line x1="21" y1="18" x2="11" y2="18"/><polyline points="7 8 3 12 7 16" stroke="#2563EB"/></svg>`,
  indentDec: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#334155" stroke-width="1.8"><line x1="21" y1="6" x2="11" y2="6"/><line x1="21" y1="12" x2="11" y2="12"/><line x1="21" y1="18" x2="11" y2="18"/><polyline points="3 8 7 12 3 16" stroke="#2563EB"/></svg>`,
  fontGrow: `<svg viewBox="0 0 24 24" width="17" height="17" fill="none" aria-hidden="true"><path d="M3.5 19 9 5h2.2l5.5 14h-2.5l-1.35-3.65H7.3L5.95 19H3.5Zm4.55-5.75h4.05L10.08 7.7l-2.03 5.55Z" fill="#334155"/><path d="M18.5 11V4.5m-3.25 3.25 3.25-3.25 3.25 3.25" stroke="#0F6D38" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  fontShrink: `<svg viewBox="0 0 24 24" width="17" height="17" fill="none" aria-hidden="true"><path d="M3.5 19 9 5h2.2l5.5 14h-2.5l-1.35-3.65H7.3L5.95 19H3.5Zm4.55-5.75h4.05L10.08 7.7l-2.03 5.55Z" fill="#334155"/><path d="M18.5 4.5V11m-3.25-3.25L18.5 11l3.25-3.25" stroke="#0F6D38" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  changeCase: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true"><path d="M2.5 18 7.7 5h2.15l5.2 13h-2.4l-1.2-3.25H6.1L4.9 18H2.5Zm4.35-5.3h3.85L8.78 7.45 6.85 12.7Z" fill="#334155"/><path d="M15.2 11.4c.85-.55 1.82-.82 2.9-.82 2.05 0 3.4 1.04 3.4 3.08V18h-1.95v-.9c-.68.72-1.52 1.08-2.52 1.08-1.55 0-2.63-.9-2.63-2.25 0-1.45 1.18-2.32 3.23-2.32h1.92v-.18c0-.82-.58-1.25-1.72-1.25-.72 0-1.4.2-2.05.62l-.58-1.4Zm4.35 3.45h-1.67c-.98 0-1.48.32-1.48.95 0 .58.45.88 1.18.88.9 0 1.97-.58 1.97-1.55v-.28Z" fill="#0F4C81"/></svg>`,
  paragraphSort: `<svg viewBox="0 0 24 24" width="17" height="17" fill="none" aria-hidden="true"><path d="M3 5h7M3 9h5M3 13h7" stroke="#334155" stroke-width="1.7" stroke-linecap="round"/><path d="M15 5v14m-3-3 3 3 3-3" stroke="#0F4C81" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="m19 6 1.5-3L22 6m-2.4-1.2h1.8" stroke="#334155" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  formattingMarks: `<svg viewBox="0 0 24 24" width="17" height="17" fill="none" aria-hidden="true"><path d="M14.5 4v16M18 4v16M14.5 4h3.5M14.5 12h-2.2a4 4 0 0 1 0-8H18" stroke="#0F4C81" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  paragraphShading: `<svg viewBox="0 0 24 24" width="17" height="17" fill="none" aria-hidden="true"><path d="m7 3 9 9-6.2 6.2a2 2 0 0 1-2.8 0l-3.2-3.2a2 2 0 0 1 0-2.8L10 6" fill="#FFF2CC" stroke="#334155" stroke-width="1.5" stroke-linejoin="round"/><path d="m7 3 3 3" stroke="#334155" stroke-width="1.7" stroke-linecap="round"/><path d="M14 20h7" stroke="#D6A800" stroke-width="2.4" stroke-linecap="round"/></svg>`,
  paragraphBorders: `<svg viewBox="0 0 24 24" width="17" height="17" fill="none" aria-hidden="true"><rect x="3" y="3" width="15" height="15" rx="1" stroke="#334155" stroke-width="1.6"/><path d="M3 8h15M3 13h15M8 3v15M13 3v15" stroke="#94A3B8" stroke-width="1"/><path d="m20 10 2 2 2-2" transform="translate(-1 5)" stroke="#0F4C81" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  alignTop: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true"><path d="M4 4h16" stroke="#0F6D38" stroke-width="2" stroke-linecap="round"/><path d="M7 8h10M7 11h7" stroke="#334155" stroke-width="1.7" stroke-linecap="round"/></svg>`,
  alignMiddle: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true"><path d="M4 12h16" stroke="#0F6D38" stroke-width="2" stroke-linecap="round"/><path d="M7 7h10M7 17h7" stroke="#334155" stroke-width="1.7" stroke-linecap="round"/></svg>`,
  alignBottom: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true"><path d="M4 20h16" stroke="#0F6D38" stroke-width="2" stroke-linecap="round"/><path d="M7 13h7M7 16h10" stroke="#334155" stroke-width="1.7" stroke-linecap="round"/></svg>`,
  wrapText: `<svg viewBox="0 0 24 24" width="17" height="17" fill="none" aria-hidden="true"><path d="M3 6h18M3 11h13a3 3 0 0 1 0 6H9" stroke="#334155" stroke-width="1.7" stroke-linecap="round"/><path d="m12 14-3 3 3 3" stroke="#0F6D38" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  increaseDecimal: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true"><text x="2" y="10" fill="#334155" font-size="8" font-family="Arial,sans-serif" font-weight="700">.0</text><text x="12" y="20" fill="#334155" font-size="8" font-family="Arial,sans-serif" font-weight="700">.00</text><path d="M8 14h7m-2.5-2.5L15 14l-2.5 2.5" stroke="#0F6D38" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  decreaseDecimal: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true"><text x="1" y="10" fill="#334155" font-size="8" font-family="Arial,sans-serif" font-weight="700">.00</text><text x="14" y="20" fill="#334155" font-size="8" font-family="Arial,sans-serif" font-weight="700">.0</text><path d="M16 14H9m2.5-2.5L9 14l2.5 2.5" stroke="#0F6D38" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`,

  // Chèn nâng cao (Insert Elements)
  table: `<svg viewBox="0 0 32 32" width="28" height="28" fill="none">
    <rect x="3" y="4" width="26" height="24" rx="3" fill="#F8FAFC" stroke="#0F4C81" stroke-width="1.5"/>
    <path d="M3 7C3 5.3 4.3 4 6 4H26C27.7 4 29 5.3 29 7V11H3V7Z" fill="#0F4C81"/>
    <line x1="3" y1="17" x2="29" y2="17" stroke="#CBD5E1" stroke-width="1.2"/>
    <line x1="3" y1="23" x2="29" y2="23" stroke="#CBD5E1" stroke-width="1.2"/>
    <line x1="12" y1="11" x2="12" y2="28" stroke="#CBD5E1" stroke-width="1.2"/>
    <line x1="20" y1="11" x2="20" y2="28" stroke="#CBD5E1" stroke-width="1.2"/>
  </svg>`,

  template: `<svg viewBox="0 0 32 32" width="28" height="28" fill="none">
    <rect x="3" y="4" width="26" height="24" rx="3" fill="#F8FAFC" stroke="#B53818" stroke-width="1.5"/>
    <rect x="3" y="4" width="8" height="24" rx="0" fill="#F5B800"/>
    <rect x="3" y="4" width="26" height="24" rx="3" fill="none" stroke="#B53818" stroke-width="1.5"/>
    <line x1="15" y1="10" x2="26" y2="10" stroke="#B53818" stroke-width="2" stroke-linecap="round"/>
    <line x1="15" y1="15" x2="26" y2="15" stroke="#CBD5E1" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="15" y1="19" x2="22" y2="19" stroke="#CBD5E1" stroke-width="1.5" stroke-linecap="round"/>
    <circle cx="7" cy="10" r="2" fill="#FFFFFF" opacity="0.85"/>
  </svg>`,

  themeGallery: `<svg viewBox="0 0 32 32" width="28" height="28" fill="none"><rect x="3" y="4" width="26" height="20" rx="3" fill="#F8FAFC" stroke="#7C3AED" stroke-width="1.5"/><path d="M3 9h26" stroke="#7C3AED" stroke-width="4"/><rect x="7" y="13" width="8" height="7" rx="1" fill="#DBEAFE"/><rect x="17" y="13" width="8" height="7" rx="1" fill="#FFEDD5"/><circle cx="23" cy="24" r="6" fill="#7C3AED"/><path d="m20.5 24 1.7 1.7 3.4-4" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,

  slideSize: `<svg viewBox="0 0 32 32" width="28" height="28" fill="none"><rect x="3" y="7" width="26" height="18" rx="2" fill="#FFF7ED" stroke="#B53818" stroke-width="1.5"/><path d="M8 11 4 7m4 4H4V7M24 11l4-4m-4 4h4V7M8 21l-4 4m4-4H4v4M24 21l4 4m-4-4h4v4" stroke="#2563EB" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>`,

  image: `<svg viewBox="0 0 32 32" width="28" height="28" fill="none">
    <rect x="3" y="5" width="26" height="22" rx="3" fill="#EFF6FF" stroke="#2563EB" stroke-width="1.5"/>
    <circle cx="10" cy="11" r="3" fill="#F59E0B"/>
    <path d="M4 23L11 16L17 21L21 17L28 24V24C28 25.7 26.7 27 25 27H7C5.3 27 4 25.7 4 24V23Z" fill="#10B981"/>
  </svg>`,

  pageBreak: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none">
    <path d="M14 2H6a2 2 0 0 0-2 2v7h16V8z" fill="#DBEAFE" stroke="#2563EB" stroke-width="1.2"/>
    <path d="M4 17v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" stroke="#2563EB" stroke-width="1.2"/>
    <line x1="2" y1="14" x2="22" y2="14" stroke="#DC2626" stroke-width="1.5" stroke-dasharray="3 3"/>
  </svg>`,

  headerFooter: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none">
    <rect x="4" y="2" width="16" height="20" rx="2" fill="#F8FAFC" stroke="#475569" stroke-width="1.2"/>
    <rect x="4" y="2" width="16" height="5" fill="#DBEAFE" stroke="#2563EB" stroke-width="1.2"/>
    <rect x="4" y="17" width="16" height="5" fill="#DBEAFE" stroke="#2563EB" stroke-width="1.2"/>
  </svg>`,

  margins: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none">
    <rect x="3" y="3" width="18" height="18" rx="2" fill="#F8FAFC" stroke="#0F4C81" stroke-width="1.5"/>
    <rect x="7" y="7" width="10" height="10" stroke="#2563EB" stroke-width="1.2" stroke-dasharray="2 2"/>
    <path d="M3 12H7M17 12H21M12 3V7M12 17V21" stroke="#DC2626" stroke-width="1.5"/>
  </svg>`,

  orientation: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none">
    <rect x="5" y="3" width="14" height="18" rx="2" fill="#DBEAFE" stroke="#2563EB" stroke-width="1.2"/>
    <path d="M12 15L9 12M12 15L15 12M12 15V8" stroke="#1D4ED8" stroke-width="1.8" stroke-linecap="round"/>
  </svg>`,

  // Sheet / Calc Controls
  mergeCells: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none">
    <rect x="3" y="5" width="18" height="14" rx="2" fill="#E7F4EC" stroke="#0F6D38" stroke-width="1.5"/>
    <line x1="7" y1="12" x2="17" y2="12" stroke="#0F6D38" stroke-width="2"/>
    <polyline points="9 10 7 12 9 14" stroke="#0F6D38" stroke-width="1.5"/>
    <polyline points="15 10 17 12 15 14" stroke="#0F6D38" stroke-width="1.5"/>
  </svg>`,
  mergeAcross: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none"><rect x="3" y="5" width="18" height="6" rx="1" fill="#E7F4EC" stroke="#0F6D38"/><rect x="3" y="13" width="18" height="6" rx="1" fill="#E7F4EC" stroke="#0F6D38"/><path d="M7 8h10M7 16h10" stroke="#0F6D38" stroke-width="1.5"/></svg>`,
  unmergeCells: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none"><rect x="3" y="5" width="18" height="14" rx="2" fill="#FFF7ED" stroke="#C2410C"/><path d="M12 5v14M3 12h18" stroke="#C2410C"/><path d="m8 9-3 3 3 3m8-6 3 3-3 3" stroke="#C2410C" stroke-width="1.5"/></svg>`,

  currencyVND: `<svg viewBox="0 0 32 32" width="28" height="28" fill="none">
    <circle cx="16" cy="16" r="13" fill="#F5B800" stroke="#D97706" stroke-width="1.5"/>
    <circle cx="16" cy="16" r="10" fill="#FCD34D"/>
    <text x="10" y="21" font-size="16" font-weight="900" fill="#92400E" font-family="sans-serif">₫</text>
  </svg>`,

  autoSum: `<svg viewBox="0 0 32 32" width="28" height="28" fill="none">
    <rect x="4" y="4" width="24" height="24" rx="5" fill="#E7F4EC" stroke="#0F6D38" stroke-width="1.2"/>
    <path d="M22 9H11L17 16L11 23H22" stroke="#0F6D38" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,

  nameManager: `<svg viewBox="0 0 32 32" width="28" height="28" fill="none"><rect x="4" y="5" width="24" height="22" rx="3" fill="#ECFDF5" stroke="#0F6D38" stroke-width="1.5"/><path d="M10 22V10l8 12V10M21 13h5M21 18h5M21 23h5" stroke="#0F6D38" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  cellComment: `<svg viewBox="0 0 32 32" width="28" height="28" fill="none"><path d="M5 5h22v16H14l-6 6v-6H5z" fill="#FFF7ED" stroke="#C2410C" stroke-width="1.7" stroke-linejoin="round"/><path d="M10 11h12M10 16h9" stroke="#C2410C" stroke-width="2" stroke-linecap="round"/><path d="M23 5h4v4z" fill="#DC2626"/></svg>`,
  printArea: `<svg viewBox="0 0 32 32" width="28" height="28" fill="none"><rect x="4" y="5" width="24" height="22" rx="2" fill="#F8FAFC" stroke="#64748B"/><path d="M4 12h24M11 5v22M20 5v22M4 20h24" stroke="#CBD5E1"/><rect x="11" y="12" width="9" height="8" fill="#DCFCE7" stroke="#0F6D38" stroke-width="2"/></svg>`,
  clearPrintArea: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none"><rect x="3" y="4" width="18" height="16" rx="2" fill="#F8FAFC" stroke="#64748B"/><path d="M7 8l10 8M17 8L7 16" stroke="#DC2626" stroke-width="2" stroke-linecap="round"/></svg>`,
  sheetPageBreak: `<svg viewBox="0 0 32 32" width="28" height="28" fill="none"><rect x="4" y="4" width="24" height="24" rx="2" fill="#F8FAFC" stroke="#64748B"/><path d="M4 16h24M16 4v24" stroke="#2563EB" stroke-width="2" stroke-dasharray="4 3"/><path d="M11 12l5 4 5-4" stroke="#0F6D38" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  removePageBreak: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none"><rect x="3" y="3" width="18" height="18" rx="2" fill="#F8FAFC" stroke="#64748B"/><path d="M3 12h18M12 3v18" stroke="#2563EB" stroke-dasharray="3 2"/><path d="M8 8l8 8M16 8l-8 8" stroke="#DC2626" stroke-width="2" stroke-linecap="round"/></svg>`,

  filter: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" fill="#67E8F9" stroke="#0891B2" stroke-width="1.5"/>
  </svg>`,

  pivotTable: `<svg viewBox="0 0 32 32" width="28" height="28" fill="none"><rect x="3" y="4" width="26" height="24" rx="3" fill="#F8FAFC" stroke="#0F6D38" stroke-width="1.5"/><path d="M3 11h26M11 4v24" stroke="#0F6D38" stroke-width="1.5"/><rect x="4" y="5" width="24" height="5" fill="#BBF7D0"/><rect x="4" y="12" width="6" height="15" fill="#DCFCE7"/><path d="M15 15h10M15 20h7M15 25h9" stroke="#2563EB" stroke-width="2" stroke-linecap="round"/></svg>`,
  refreshTable: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none"><rect x="3" y="4" width="18" height="16" rx="2" fill="#ECFDF5" stroke="#0F6D38"/><path d="M8 8h8M8 12h4M8 16h7" stroke="#64748B"/><path d="M18 9a5 5 0 1 1-1.2-3.2M17 3v4h4" stroke="#2563EB" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`,

  sortAsc: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none">
    <text x="3" y="9" font-size="9" font-weight="bold" fill="#0F172A" font-family="sans-serif">A</text>
    <text x="3" y="19" font-size="9" font-weight="bold" fill="#0F172A" font-family="sans-serif">Z</text>
    <path d="M15 5V19M15 19L11 15M15 19L19 15" stroke="#2563EB" stroke-width="2" stroke-linecap="round"/>
  </svg>`,

  sortDesc: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none">
    <text x="3" y="9" font-size="9" font-weight="bold" fill="#0F172A" font-family="sans-serif">Z</text>
    <text x="3" y="19" font-size="9" font-weight="bold" fill="#0F172A" font-family="sans-serif">A</text>
    <path d="M15 5V19M15 19L11 15M15 19L19 15" stroke="#DC2626" stroke-width="2" stroke-linecap="round"/>
  </svg>`,

  // Slides / Impress Controls
  slideNew: `<svg viewBox="0 0 32 32" width="28" height="28" fill="none">
    <rect x="3" y="5" width="26" height="18" rx="2" fill="#F8FAFC" stroke="#B53818" stroke-width="1.5"/>
    <rect x="3" y="5" width="26" height="5" fill="#FAEEE8"/>
    <circle cx="21" cy="21" r="7" fill="#10B981"/>
    <path d="M21 17V25M17 21H25" stroke="#FFF" stroke-width="2" stroke-linecap="round"/>
  </svg>`,

  slideLayout: `<svg viewBox="0 0 32 32" width="28" height="28" fill="none">
    <rect x="3" y="4" width="26" height="24" rx="3" fill="#F8FAFC" stroke="#B53818" stroke-width="1.5"/>
    <rect x="6" y="7" width="20" height="5" rx="1.5" fill="#FAEEE8" stroke="#B53818" stroke-width="1"/>
    <rect x="6" y="15" width="9.5" height="10.5" rx="1.5" fill="#EFF6FF" stroke="#2563EB" stroke-width="1"/>
    <rect x="16.5" y="15" width="9.5" height="10.5" rx="1.5" fill="#EFF6FF" stroke="#2563EB" stroke-width="1"/>
    <line x1="8" y1="18" x2="13.5" y2="18" stroke="#3B82F6" stroke-width="1" stroke-linecap="round"/>
    <line x1="8" y1="21" x2="12" y2="21" stroke="#94A3B8" stroke-width="1" stroke-linecap="round"/>
    <line x1="18.5" y1="18" x2="24" y2="18" stroke="#3B82F6" stroke-width="1" stroke-linecap="round"/>
    <line x1="18.5" y1="21" x2="22.5" y2="21" stroke="#94A3B8" stroke-width="1" stroke-linecap="round"/>
  </svg>`,

  slideSorter: `<svg viewBox="0 0 32 32" width="28" height="28" fill="none">
    <rect x="3" y="4" width="11" height="8" rx="1.5" fill="#FAEEE8" stroke="#B53818" stroke-width="1.5"/>
    <rect x="18" y="4" width="11" height="8" rx="1.5" fill="#F8FAFC" stroke="#B53818" stroke-width="1.5"/>
    <rect x="3" y="19" width="11" height="8" rx="1.5" fill="#F8FAFC" stroke="#B53818" stroke-width="1.5"/>
    <rect x="18" y="19" width="11" height="8" rx="1.5" fill="#FAEEE8" stroke="#B53818" stroke-width="1.5"/>
    <path d="M8 15.5H24" stroke="#2563EB" stroke-width="1.5" stroke-linecap="round" stroke-dasharray="2 2"/>
  </svg>`,

  videoInsert: `<svg viewBox="0 0 32 32" width="28" height="28" fill="none">
    <rect x="3" y="6" width="20" height="20" rx="2" fill="#F8FAFC" stroke="#0F172A" stroke-width="1.5"/>
    <polygon points="10,12 19,16 10,20" fill="#DC2626"/>
    <path d="M25 12L29 9V23L25 20V12Z" fill="#0F172A" stroke="#0F172A" stroke-width="1"/>
  </svg>`,

  audioInsert: `<svg viewBox="0 0 32 32" width="28" height="28" fill="none">
    <path d="M8 12H12L18 6V26L12 20H8V12Z" fill="#0F172A"/>
    <path d="M22 10C24.5 12.5 24.5 19.5 22 22" stroke="#2563EB" stroke-width="2" stroke-linecap="round"/>
    <path d="M25.5 6.5C29.5 11.5 29.5 20.5 25.5 25.5" stroke="#2563EB" stroke-width="2" stroke-linecap="round" opacity="0.6"/>
  </svg>`,

  rehearseTimings: `<svg viewBox="0 0 32 32" width="28" height="28" fill="none">
    <circle cx="16" cy="18" r="11" fill="#F8FAFC" stroke="#0F172A" stroke-width="1.5"/>
    <path d="M16 11V18L21 21" stroke="#DC2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M12 3H20" stroke="#0F172A" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M16 3V7" stroke="#0F172A" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`,

  slidePlay: `<svg viewBox="0 0 32 32" width="28" height="28" fill="none">
    <rect x="3" y="4" width="26" height="18" rx="2" fill="#1E293B" stroke="#0F172A" stroke-width="1.2"/>
    <polygon points="12,8 21,13 12,18" fill="#F59E0B"/>
    <path d="M10 26L16 22L22 26" stroke="#475569" stroke-width="2" stroke-linecap="round"/>
  </svg>`,

  shape: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none">
    <rect x="2" y="3" width="9" height="9" rx="1.5" fill="#3B82F6"/>
    <circle cx="17" cy="7" r="5" fill="#10B981"/>
    <polygon points="12,14 18,22 6,22" fill="#F59E0B"/>
  </svg>`,

  diagram: `<svg viewBox="0 0 32 32" width="28" height="28" fill="none">
    <rect x="3" y="5" width="9" height="7" rx="2" fill="#2563EB"/>
    <rect x="20" y="5" width="9" height="7" rx="2" fill="#10B981"/>
    <rect x="11.5" y="21" width="9" height="7" rx="2" fill="#F59E0B"/>
    <path d="M12 8.5H18.5M24.5 12V16.5L20 21M7.5 12V16.5L12 21" stroke="#475569" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M17 6.5L19.5 8.5L17 10.5M21.5 18.5L20 21L22.8 21.2M10.5 18.5L12 21L9.2 21.2" stroke="#475569" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,

  textBox: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none">
    <rect x="3" y="3" width="18" height="18" rx="2" stroke="#3B82F6" stroke-width="1.5" stroke-dasharray="2 2"/>
    <text x="7" y="17" font-size="14" font-weight="bold" fill="#1D4ED8" font-family="serif">A</text>
  </svg>`,

  // Utilities
  aiSparkle: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none">
    <path d="M12 2L14.5 7.5L20 10L14.5 12.5L12 18L9.5 12.5L4 10L9.5 7.5L12 2Z" fill="#F5B800" stroke="#D97706" stroke-width="0.8"/>
    <path d="M19 15L20.2 17.8L23 19L20.2 20.2L19 23L17.8 20.2L15 19L17.8 17.8L19 15Z" fill="#8B5CF6"/>
  </svg>`,

  search: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#2563EB" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  chevronDown: `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>`,
  close: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,

  // Tham chiếu (References / TOC / Footnotes / Endnotes)
  tocInsert: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none">
    <rect x="3" y="2" width="18" height="20" rx="2" fill="#F8FAFC" stroke="#0F4C81" stroke-width="1.5"/>
    <line x1="6" y1="6" x2="14" y2="6" stroke="#0F4C81" stroke-width="1.8" stroke-linecap="round"/>
    <line x1="17" y1="6" x2="18" y2="6" stroke="#0F4C81" stroke-width="1.8" stroke-linecap="round"/>
    <line x1="8" y1="10" x2="14" y2="10" stroke="#64748B" stroke-width="1.4" stroke-linecap="round"/>
    <line x1="17" y1="10" x2="18" y2="10" stroke="#64748B" stroke-width="1.4" stroke-linecap="round"/>
    <line x1="8" y1="14" x2="14" y2="14" stroke="#64748B" stroke-width="1.4" stroke-linecap="round"/>
    <line x1="17" y1="14" x2="18" y2="14" stroke="#64748B" stroke-width="1.4" stroke-linecap="round"/>
    <line x1="6" y1="18" x2="14" y2="18" stroke="#0F4C81" stroke-width="1.8" stroke-linecap="round"/>
    <line x1="17" y1="18" x2="18" y2="18" stroke="#0F4C81" stroke-width="1.8" stroke-linecap="round"/>
  </svg>`,

  tocUpdate: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none">
    <rect x="3" y="2" width="18" height="20" rx="2" fill="#F8FAFC" stroke="#0F4C81" stroke-width="1.5"/>
    <line x1="6" y1="6" x2="13" y2="6" stroke="#0F4C81" stroke-width="1.6" stroke-linecap="round"/>
    <line x1="6" y1="10" x2="12" y2="10" stroke="#64748B" stroke-width="1.4" stroke-linecap="round"/>
    <line x1="6" y1="14" x2="11" y2="14" stroke="#64748B" stroke-width="1.4" stroke-linecap="round"/>
    <circle cx="16" cy="16" r="5" fill="#EFF6FF" stroke="#2563EB" stroke-width="1.2"/>
    <path d="M14 16A2 2 0 1 1 16 18M16 18L15 19.5M16 18L14.5 17" stroke="#2563EB" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,

  footnoteInsert: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none">
    <rect x="4" y="2" width="16" height="20" rx="2" fill="#F8FAFC" stroke="#0F4C81" stroke-width="1.5"/>
    <line x1="7" y1="6" x2="13" y2="6" stroke="#334155" stroke-width="1.4" stroke-linecap="round"/>
    <text x="14" y="6" font-size="5" font-weight="900" fill="#2563EB" font-family="sans-serif">1</text>
    <line x1="7" y1="10" x2="17" y2="10" stroke="#94A3B8" stroke-width="1.4" stroke-linecap="round"/>
    <line x1="7" y1="15" x2="12" y2="15" stroke="#0F4C81" stroke-width="1.2"/>
    <text x="7" y="19.5" font-size="5" font-weight="900" fill="#2563EB" font-family="sans-serif">1</text>
    <line x1="10" y1="19" x2="17" y2="19" stroke="#64748B" stroke-width="1.2" stroke-linecap="round"/>
  </svg>`,

  endnoteInsert: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none">
    <path d="M6 3H18C19.1 3 20 3.9 20 5V19C20 20.1 19.1 21 18 21H6C4.9 21 4 20.1 4 19V5C4 3.9 4.9 3 6 3Z" fill="#F8FAFC" stroke="#B53818" stroke-width="1.5"/>
    <line x1="7" y1="6" x2="13" y2="6" stroke="#334155" stroke-width="1.4" stroke-linecap="round"/>
    <text x="14" y="6" font-size="5" font-weight="900" fill="#DC2626" font-family="sans-serif">i</text>
    <line x1="7" y1="10" x2="17" y2="10" stroke="#94A3B8" stroke-width="1.4" stroke-linecap="round"/>
    <line x1="7" y1="14" x2="17" y2="14" stroke="#94A3B8" stroke-width="1.4" stroke-linecap="round"/>
    <line x1="7" y1="17" x2="11" y2="17" stroke="#B53818" stroke-width="1.2"/>
    <text x="7" y="20.5" font-size="5" font-weight="900" fill="#DC2626" font-family="sans-serif">i</text>
    <line x1="9.5" y1="20" x2="17" y2="20" stroke="#64748B" stroke-width="1.2" stroke-linecap="round"/>
  </svg>`,

  // Trộn thư (Mail Merge)
  mailMerge: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none">
    <rect x="2" y="6" width="20" height="14" rx="2" fill="#EFF6FF" stroke="#0F4C81" stroke-width="1.4"/>
    <path d="M2 8L12 14L22 8" stroke="#2563EB" stroke-width="1.5" stroke-linejoin="round"/>
    <rect x="7" y="2" width="10" height="6" rx="1" fill="#FFFFFF" stroke="#0F4C81" stroke-width="1.2"/>
    <line x1="9" y1="4" x2="15" y2="4" stroke="#2563EB" stroke-width="1.2" stroke-linecap="round"/>
    <circle cx="18" cy="16" r="3.5" fill="#10B981"/>
    <path d="M16.5 16L17.5 17L19.5 15" stroke="#FFFFFF" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,

  mergeInsertField: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none">
    <rect x="3" y="3" width="18" height="18" rx="2" fill="#F8FAFC" stroke="#0F4C81" stroke-width="1.4"/>
    <text x="5" y="15" font-family="monospace, sans-serif" font-size="11" font-weight="bold" fill="#2563EB">«</text>
    <line x1="10" y1="13" x2="14" y2="13" stroke="#94A3B8" stroke-width="1.5" stroke-linecap="round"/>
    <text x="15" y="15" font-family="monospace, sans-serif" font-size="11" font-weight="bold" fill="#2563EB">»</text>
    <circle cx="18" cy="6" r="3.5" fill="#2563EB"/>
    <line x1="18" y1="4.5" x2="18" y2="7.5" stroke="#FFFFFF" stroke-width="1.2" stroke-linecap="round"/>
    <line x1="16.5" y1="6" x2="19.5" y2="6" stroke="#FFFFFF" stroke-width="1.2" stroke-linecap="round"/>
  </svg>`,

  mergePreview: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none">
    <rect x="3" y="3" width="18" height="18" rx="2" fill="#F8FAFC" stroke="#0F4C81" stroke-width="1.4"/>
    <path d="M4 12C6.5 8 10 6 12 6C14 6 17.5 8 20 12C17.5 16 14 18 12 18C10 18 6.5 16 4 12Z" fill="#DBEAFE" stroke="#2563EB" stroke-width="1.2"/>
    <circle cx="12" cy="12" r="3" fill="#2563EB"/>
    <circle cx="13" cy="11" r="1" fill="#FFFFFF"/>
  </svg>`,

  mergePrev: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none">
    <rect x="2" y="3" width="20" height="18" rx="2" fill="#F8FAFC" stroke="#64748B" stroke-width="1.2"/>
    <polyline points="14 7 9 12 14 17" stroke="#0F4C81" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,

  mergeNext: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none">
    <rect x="2" y="3" width="20" height="18" rx="2" fill="#F8FAFC" stroke="#64748B" stroke-width="1.2"/>
    <polyline points="10 7 15 12 10 17" stroke="#0F4C81" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,

  mergeFinish: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none">
    <rect x="2" y="5" width="14" height="16" rx="2" fill="#F8FAFC" stroke="#64748B" stroke-width="1.2"/>
    <rect x="6" y="2" width="14" height="16" rx="2" fill="#EFF6FF" stroke="#0F4C81" stroke-width="1.4"/>
    <line x1="9" y1="6" x2="16" y2="6" stroke="#2563EB" stroke-width="1.3" stroke-linecap="round"/>
    <line x1="9" y1="9" x2="16" y2="9" stroke="#94A3B8" stroke-width="1.2" stroke-linecap="round"/>
    <circle cx="17" cy="16" r="4.5" fill="#10B981"/>
    <polyline points="15 16 16.5 17.5 19 14.5" stroke="#FFFFFF" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,

  // Kiểu dáng & Trang trí trang (Styles Gallery & Page Decorations)
  styleGallery: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none">
    <rect x="2" y="3" width="20" height="18" rx="2" fill="#F8FAFC" stroke="#0F4C81" stroke-width="1.4"/>
    <path d="M5.5 16L9 7H10.5L14 16H12.3L11.5 13.8H8L7.2 16H5.5ZM8.4 12.3H11.1L9.75 8.5L8.4 12.3Z" fill="#0F4C81"/>
    <rect x="15" y="6" width="5" height="2" rx="0.8" fill="#2563EB"/>
    <rect x="15" y="10" width="5" height="2" rx="0.8" fill="#10B981"/>
    <rect x="15" y="14" width="5" height="2" rx="0.8" fill="#F59E0B"/>
  </svg>`,

  pageWatermark: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none">
    <path d="M5 2H15L20 7V22H5C3.9 22 3 21.1 3 20V4C3 2.9 3.9 2 5 2Z" fill="#F8FAFC" stroke="#0F4C81" stroke-width="1.4"/>
    <path d="M15 2V7H20" fill="#DBEAFE" stroke="#0F4C81" stroke-width="1.2"/>
    <g transform="rotate(-30 11 14)" opacity="0.7">
      <rect x="4.5" y="12" width="13.5" height="4.5" rx="1" fill="#FEE2E2" stroke="#DC2626" stroke-width="0.9" stroke-dasharray="2 1"/>
      <text x="6" y="15.5" font-family="sans-serif" font-size="3.2" font-weight="900" fill="#DC2626" letter-spacing="0.3">MẬT</text>
    </g>
  </svg>`,

  pageBorder: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none">
    <rect x="3" y="2" width="18" height="20" rx="2" fill="#F8FAFC" stroke="#94A3B8" stroke-width="1.2"/>
    <rect x="5.5" y="4.5" width="13" height="15" rx="1" fill="#EFF6FF" stroke="#0F4C81" stroke-width="1.5" stroke-dasharray="3.5 1.5"/>
    <line x1="8" y1="8" x2="16" y2="8" stroke="#64748B" stroke-width="1.2" stroke-linecap="round"/>
    <line x1="8" y1="11" x2="16" y2="11" stroke="#94A3B8" stroke-width="1" stroke-linecap="round"/>
    <line x1="8" y1="14" x2="13" y2="14" stroke="#94A3B8" stroke-width="1" stroke-linecap="round"/>
  </svg>`,

  // Chia cột văn bản (Columns)
  pageColumns: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none">
    <rect x="3" y="2" width="18" height="20" rx="2" fill="#F8FAFC" stroke="#0F4C81" stroke-width="1.4"/>
    <rect x="5" y="5" width="5.5" height="14" rx="1" fill="#EFF6FF"/>
    <line x1="6.5" y1="7.5" x2="9.5" y2="7.5" stroke="#2563EB" stroke-width="1.3" stroke-linecap="round"/>
    <line x1="6.5" y1="10.5" x2="9.5" y2="10.5" stroke="#64748B" stroke-width="1.1" stroke-linecap="round"/>
    <line x1="6.5" y1="13.5" x2="9" y2="13.5" stroke="#64748B" stroke-width="1.1" stroke-linecap="round"/>
    <line x1="6.5" y1="16.5" x2="9.5" y2="16.5" stroke="#64748B" stroke-width="1.1" stroke-linecap="round"/>
    <rect x="13.5" y="5" width="5.5" height="14" rx="1" fill="#EFF6FF"/>
    <line x1="15" y1="7.5" x2="18" y2="7.5" stroke="#2563EB" stroke-width="1.3" stroke-linecap="round"/>
    <line x1="15" y1="10.5" x2="18" y2="10.5" stroke="#64748B" stroke-width="1.1" stroke-linecap="round"/>
    <line x1="15" y1="13.5" x2="17.5" y2="13.5" stroke="#64748B" stroke-width="1.1" stroke-linecap="round"/>
    <line x1="15" y1="16.5" x2="18" y2="16.5" stroke="#64748B" stroke-width="1.1" stroke-linecap="round"/>
    <line x1="12" y1="5.5" x2="12" y2="18.5" stroke="#94A3B8" stroke-width="1" stroke-dasharray="2 1.5"/>
  </svg>`,

  columnsOne: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none">
    <rect x="4" y="3" width="16" height="18" rx="1.5" fill="#F8FAFC" stroke="#64748B" stroke-width="1.2"/>
    <line x1="7" y1="7" x2="17" y2="7" stroke="#0F4C81" stroke-width="1.6" stroke-linecap="round"/>
    <line x1="7" y1="10" x2="17" y2="10" stroke="#64748B" stroke-width="1.2" stroke-linecap="round"/>
    <line x1="7" y1="13" x2="17" y2="13" stroke="#64748B" stroke-width="1.2" stroke-linecap="round"/>
    <line x1="7" y1="16" x2="14" y2="16" stroke="#64748B" stroke-width="1.2" stroke-linecap="round"/>
  </svg>`,

  columnsTwo: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none">
    <rect x="4" y="3" width="16" height="18" rx="1.5" fill="#F8FAFC" stroke="#64748B" stroke-width="1.2"/>
    <line x1="6.5" y1="7" x2="10.5" y2="7" stroke="#2563EB" stroke-width="1.4" stroke-linecap="round"/>
    <line x1="6.5" y1="10" x2="10.5" y2="10" stroke="#64748B" stroke-width="1.1" stroke-linecap="round"/>
    <line x1="6.5" y1="13" x2="10.5" y2="13" stroke="#64748B" stroke-width="1.1" stroke-linecap="round"/>
    <line x1="6.5" y1="16" x2="9" y2="16" stroke="#64748B" stroke-width="1.1" stroke-linecap="round"/>
    <line x1="13.5" y1="7" x2="17.5" y2="7" stroke="#2563EB" stroke-width="1.4" stroke-linecap="round"/>
    <line x1="13.5" y1="10" x2="17.5" y2="10" stroke="#64748B" stroke-width="1.1" stroke-linecap="round"/>
    <line x1="13.5" y1="13" x2="17.5" y2="13" stroke="#64748B" stroke-width="1.1" stroke-linecap="round"/>
    <line x1="13.5" y1="16" x2="16" y2="16" stroke="#64748B" stroke-width="1.1" stroke-linecap="round"/>
  </svg>`,

  columnsThree: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none">
    <rect x="3" y="3" width="18" height="18" rx="1.5" fill="#F8FAFC" stroke="#64748B" stroke-width="1.2"/>
    <line x1="5" y1="7" x2="7.5" y2="7" stroke="#10B981" stroke-width="1.3" stroke-linecap="round"/>
    <line x1="5" y1="10" x2="7.5" y2="10" stroke="#64748B" stroke-width="1.1" stroke-linecap="round"/>
    <line x1="5" y1="13" x2="7.5" y2="13" stroke="#64748B" stroke-width="1.1" stroke-linecap="round"/>
    <line x1="5" y1="16" x2="6.5" y2="16" stroke="#64748B" stroke-width="1.1" stroke-linecap="round"/>
    <line x1="10.5" y1="7" x2="13" y2="7" stroke="#10B981" stroke-width="1.3" stroke-linecap="round"/>
    <line x1="10.5" y1="10" x2="13" y2="10" stroke="#64748B" stroke-width="1.1" stroke-linecap="round"/>
    <line x1="10.5" y1="13" x2="13" y2="13" stroke="#64748B" stroke-width="1.1" stroke-linecap="round"/>
    <line x1="10.5" y1="16" x2="12" y2="16" stroke="#64748B" stroke-width="1.1" stroke-linecap="round"/>
    <line x1="16" y1="7" x2="18.5" y2="7" stroke="#10B981" stroke-width="1.3" stroke-linecap="round"/>
    <line x1="16" y1="10" x2="18.5" y2="10" stroke="#64748B" stroke-width="1.1" stroke-linecap="round"/>
    <line x1="16" y1="13" x2="18.5" y2="13" stroke="#64748B" stroke-width="1.1" stroke-linecap="round"/>
    <line x1="16" y1="16" x2="17.5" y2="16" stroke="#64748B" stroke-width="1.1" stroke-linecap="round"/>
  </svg>`,

  // Minh họa & Liên kết (Illustrations & Links)
  shape: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none">
    <rect x="3" y="3" width="10" height="10" rx="1.5" fill="#DBEAFE" stroke="#2563EB" stroke-width="1.4"/>
    <circle cx="15" cy="15" r="6" fill="#FEF3C7" stroke="#D97706" stroke-width="1.4"/>
  </svg>`,

  diagram: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none">
    <rect x="2" y="3" width="6" height="5" rx="1" fill="#DBEAFE" stroke="#2563EB" stroke-width="1.2"/>
    <rect x="16" y="3" width="6" height="5" rx="1" fill="#DBEAFE" stroke="#2563EB" stroke-width="1.2"/>
    <rect x="9" y="15" width="6" height="5" rx="1" fill="#DCFCE7" stroke="#15803D" stroke-width="1.2"/>
    <path d="M5 8v3h14V8M12 11v4" stroke="#64748B" stroke-width="1.2" stroke-linecap="round"/>
  </svg>`,

  chart: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none">
    <rect x="3" y="12" width="4" height="9" rx="1" fill="#93C5FD"/>
    <rect x="10" y="7" width="4" height="14" rx="1" fill="#2563EB"/>
    <rect x="17" y="3" width="4" height="18" rx="1" fill="#0F4C81"/>
    <polyline points="4 9 11 5 18 2" stroke="#DC2626" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="18" cy="2" r="1.5" fill="#DC2626"/>
  </svg>`,

  themeGallery: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none">
    <rect x="2" y="2" width="20" height="20" rx="3" fill="#F8FAFC" stroke="#0F4C81" stroke-width="1.4"/>
    <rect x="4" y="4" width="7" height="7" rx="1.5" fill="#2563EB"/>
    <rect x="13" y="4" width="7" height="7" rx="1.5" fill="#0F6D38"/>
    <rect x="4" y="13" width="7" height="7" rx="1.5" fill="#D97706"/>
    <rect x="13" y="13" width="7" height="7" rx="1.5" fill="#B53818"/>
  </svg>`,

  hyperlink: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#2563EB" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
  </svg>`,

  // Hộp thoại định dạng ô & Dialog launcher
  formatCells: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none">
    <rect x="3" y="4" width="18" height="16" rx="2" fill="#F8FAFC" stroke="#0F6D38" stroke-width="1.5"/>
    <line x1="3" y1="10" x2="21" y2="10" stroke="#0F6D38" stroke-width="1.2"/>
    <line x1="10" y1="4" x2="10" y2="20" stroke="#0F6D38" stroke-width="1.2"/>
    <text x="5" y="8.5" fill="#0F6D38" font-size="5" font-weight="700" font-family="sans-serif">12</text>
    <text x="12" y="8.5" fill="#0F6D38" font-size="5" font-weight="700" font-family="sans-serif">₫</text>
    <path d="M14 14l3 3m0-3l-3 3" stroke="#2563EB" stroke-width="1.2" stroke-linecap="round"/>
  </svg>`,

  // Sheet Styles & Editing Icons
  formatTable: `<svg viewBox="0 0 32 32" width="28" height="28" fill="none">
    <rect x="3" y="5" width="26" height="22" rx="3" fill="#FFFFFF" stroke="#0F4C81" stroke-width="1.5"/>
    <rect x="3" y="5" width="26" height="6" rx="2" fill="#2563EB"/>
    <line x1="3" y1="11" x2="29" y2="11" stroke="#1D4ED8" stroke-width="1.5"/>
    <line x1="12" y1="5" x2="12" y2="27" stroke="#CBD5E1" stroke-width="1.2"/>
    <line x1="21" y1="5" x2="21" y2="27" stroke="#CBD5E1" stroke-width="1.2"/>
    <rect x="3" y="16" width="26" height="5" fill="#F0F7FF"/>
    <line x1="3" y1="16" x2="29" y2="16" stroke="#E2E8F0" stroke-width="1"/>
    <line x1="3" y1="21" x2="29" y2="21" stroke="#E2E8F0" stroke-width="1"/>
  </svg>`,

  cellStyles: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none">
    <rect x="2" y="2" width="20" height="20" rx="3" fill="#F8FAFC" stroke="#0F6D38" stroke-width="1.4"/>
    <rect x="4" y="4" width="7" height="7" rx="1.5" fill="#BBF7D0" stroke="#16A34A" stroke-width="0.8"/>
    <rect x="13" y="4" width="7" height="7" rx="1.5" fill="#FECACA" stroke="#DC2626" stroke-width="0.8"/>
    <rect x="4" y="13" width="7" height="7" rx="1.5" fill="#FEF08A" stroke="#CA8A04" stroke-width="0.8"/>
    <rect x="13" y="13" width="7" height="7" rx="1.5" fill="#BFDBFE" stroke="#2563EB" stroke-width="0.8"/>
  </svg>`,

  fillDown: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none">
    <rect x="4" y="3" width="16" height="7" rx="1.5" fill="#BBF7D0" stroke="#16A34A" stroke-width="1.2"/>
    <rect x="4" y="14" width="16" height="7" rx="1.5" fill="#F8FAFC" stroke="#64748B" stroke-width="1.2" stroke-dasharray="2 2"/>
    <path d="M12 9V16M9 13L12 16L15 13" stroke="#0F6D38" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,

  fillRight: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none">
    <rect x="3" y="4" width="7" height="16" rx="1.5" fill="#BBF7D0" stroke="#16A34A" stroke-width="1.2"/>
    <rect x="14" y="4" width="7" height="16" rx="1.5" fill="#F8FAFC" stroke="#64748B" stroke-width="1.2" stroke-dasharray="2 2"/>
    <path d="M9 12H16M13 9L16 12L13 15" stroke="#0F6D38" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,

  clearAll: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none">
    <path d="M19 7L18.1 19.1C18 20.2 17.1 21 16 21H8C6.9 21 6 20.2 5.9 19.1L5 7M3 7H21M9 7V4C9 3.4 9.4 3 10 3H14C14.6 3 15 3.4 15 4V7" stroke="#DC2626" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
    <line x1="10" y1="11" x2="10" y2="17" stroke="#DC2626" stroke-width="1.4" stroke-linecap="round"/>
    <line x1="14" y1="11" x2="14" y2="17" stroke="#DC2626" stroke-width="1.4" stroke-linecap="round"/>
  </svg>`,

  clearContents: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none">
    <rect x="3" y="4" width="18" height="16" rx="2" fill="#F8FAFC" stroke="#64748B" stroke-width="1.4"/>
    <line x1="7" y1="9" x2="13" y2="9" stroke="#94A3B8" stroke-width="1.5" stroke-linecap="round"/>
    <circle cx="16.5" cy="14.5" r="4.5" fill="#EF4444"/>
    <line x1="14.5" y1="12.5" x2="18.5" y2="16.5" stroke="#FFF" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="18.5" y1="12.5" x2="14.5" y2="16.5" stroke="#FFF" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`,

  dialogLauncher: `<svg viewBox="0 0 14 14" width="10" height="10" fill="none">
    <path d="M2 11h9V2" stroke="#94A3B8" stroke-width="1.2"/>
    <path d="M11 11L5 5m0 0h4m-4 0v4" stroke="#475569" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,

  dropCap: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none">
    <text x="3" y="18" font-size="16" font-weight="800" fill="#0F4C81" font-family="serif">A</text>
    <line x1="12" y1="7" x2="21" y2="7" stroke="#64748B" stroke-width="1.6" stroke-linecap="round"/>
    <line x1="12" y1="11" x2="21" y2="11" stroke="#94A3B8" stroke-width="1.4" stroke-linecap="round"/>
    <line x1="3" y1="21" x2="21" y2="21" stroke="#94A3B8" stroke-width="1.4" stroke-linecap="round"/>
  </svg>`,

  dateTime: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none">
    <rect x="3" y="5" width="18" height="16" rx="2" fill="#EFF6FF" stroke="#2563EB" stroke-width="1.4"/>
    <rect x="3" y="5" width="18" height="5" rx="2" fill="#2563EB"/>
    <path d="M8 3v4M16 3v4" stroke="#1D4ED8" stroke-width="1.6" stroke-linecap="round"/>
    <circle cx="16.5" cy="16.5" r="4.2" fill="#FFFFFF" stroke="#0F4C81" stroke-width="1.2"/>
    <path d="M16.5 14.6V16.5l1.4 1" stroke="#DC2626" stroke-width="1.3" stroke-linecap="round"/>
  </svg>`,

  equation: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none">
    <rect x="2" y="3" width="20" height="18" rx="3" fill="#F8FAFC" stroke="#7C3AED" stroke-width="1.4"/>
    <text x="5" y="16" font-size="11" font-weight="700" fill="#6D28D9" font-family="serif">∑x</text>
    <path d="M15 8h5M16.5 8v8M15 16h5" stroke="#2563EB" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`,

  symbol: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none">
    <rect x="3" y="3" width="18" height="18" rx="3" fill="#FEF3C7" stroke="#D97706" stroke-width="1.4"/>
    <text x="6.2" y="17" font-size="13" font-weight="800" fill="#92400E" font-family="serif">Ω</text>
  </svg>`,

  bookmark: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none">
    <path d="M7 3h10a1.5 1.5 0 0 1 1.5 1.5V21l-6.5-3.5L5.5 21V4.5A1.5 1.5 0 0 1 7 3Z" fill="#DBEAFE" stroke="#2563EB" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M9 8h6" stroke="#1D4ED8" stroke-width="1.4" stroke-linecap="round"/>
  </svg>`,

  crossReference: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none">
    <rect x="2" y="4" width="11" height="14" rx="1.5" fill="#F8FAFC" stroke="#0F4C81" stroke-width="1.4"/>
    <rect x="11" y="8" width="11" height="14" rx="1.5" fill="#EFF6FF" stroke="#2563EB" stroke-width="1.4"/>
    <path d="M6 9h3M6 12h2" stroke="#64748B" stroke-width="1.3" stroke-linecap="round"/>
    <path d="M14 13h5M16.5 11L19 13l-2.5 2" stroke="#16A34A" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,

  slideNumber: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none">
    <rect x="3" y="5" width="18" height="13" rx="2" fill="#FAEEE8" stroke="#B53818" stroke-width="1.4"/>
    <text x="8" y="14.5" font-size="9" font-weight="800" fill="#B53818" font-family="sans-serif">#3</text>
    <path d="M7 21h10" stroke="#64748B" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`,

  header: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none">
    <rect x="4" y="2" width="16" height="20" rx="2" fill="#F8FAFC" stroke="#475569" stroke-width="1.2"/>
    <rect x="4" y="2" width="16" height="6" fill="#DBEAFE" stroke="#2563EB" stroke-width="1.2"/>
    <line x1="7" y1="5" x2="17" y2="5" stroke="#1D4ED8" stroke-width="1.4" stroke-linecap="round"/>
    <line x1="7" y1="12" x2="17" y2="12" stroke="#CBD5E1" stroke-width="1.2"/>
    <line x1="7" y1="16" x2="14" y2="16" stroke="#E2E8F0" stroke-width="1.2"/>
  </svg>`,

  footer: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none">
    <rect x="4" y="2" width="16" height="20" rx="2" fill="#F8FAFC" stroke="#475569" stroke-width="1.2"/>
    <line x1="7" y1="7" x2="17" y2="7" stroke="#E2E8F0" stroke-width="1.2"/>
    <line x1="7" y1="11" x2="14" y2="11" stroke="#CBD5E1" stroke-width="1.2"/>
    <rect x="4" y="16" width="16" height="6" fill="#DBEAFE" stroke="#2563EB" stroke-width="1.2"/>
    <line x1="7" y1="19" x2="17" y2="19" stroke="#1D4ED8" stroke-width="1.4" stroke-linecap="round"/>
  </svg>`,

  printPreview: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none">
    <rect x="3" y="2" width="12" height="16" rx="1.5" fill="#F8FAFC" stroke="#475569" stroke-width="1.2"/>
    <line x1="6" y1="6" x2="12" y2="6" stroke="#94A3B8" stroke-width="1.2"/>
    <line x1="6" y1="9" x2="11" y2="9" stroke="#CBD5E1" stroke-width="1.2"/>
    <circle cx="16" cy="16" r="5" fill="#EFF6FF" stroke="#0F4C81" stroke-width="1.4"/>
    <path d="M19.5 19.5 22 22" stroke="#0F4C81" stroke-width="1.6" stroke-linecap="round"/>
  </svg>`,

  pageSize: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none">
    <rect x="6" y="3" width="12" height="18" rx="1.5" fill="#EFF6FF" stroke="#2563EB" stroke-width="1.3"/>
    <path d="M3 8v8M21 8v8M3 8l2-2M3 8l2 2M21 8l-2-2M21 8l-2 2M3 16l2-2M3 16l2 2M21 16l-2-2M21 16l-2 2" stroke="#0F4C81" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="8.2" y="14" font-size="6" font-weight="800" fill="#1D4ED8" font-family="sans-serif">A4</text>
  </svg>`,

  trackChanges: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none">
    <rect x="4" y="3" width="13" height="18" rx="1.5" fill="#F8FAFC" stroke="#0F4C81" stroke-width="1.3"/>
    <line x1="7" y1="8" x2="14" y2="8" stroke="#16A34A" stroke-width="1.6" stroke-linecap="round"/>
    <line x1="7" y1="12" x2="12" y2="12" stroke="#DC2626" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M16 14l3 3 5-6" transform="translate(-4 1)" stroke="#16A34A" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,

  percentFormat: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none">
    <circle cx="7" cy="7" r="3" fill="#DBEAFE" stroke="#2563EB" stroke-width="1.3"/>
    <circle cx="17" cy="17" r="3" fill="#DBEAFE" stroke="#2563EB" stroke-width="1.3"/>
    <path d="M6 18 18 6" stroke="#0F6D38" stroke-width="2" stroke-linecap="round"/>
  </svg>`,

  average: `<svg viewBox="0 0 32 32" width="28" height="28" fill="none">
    <rect x="4" y="4" width="24" height="24" rx="5" fill="#ECFDF5" stroke="#0F6D38" stroke-width="1.2"/>
    <text x="7" y="21" font-size="14" font-weight="800" fill="#0F6D38" font-family="serif">x̄</text>
  </svg>`,

  sparklineLine: `<svg viewBox="0 0 32 32" width="28" height="28" fill="none">
    <rect x="3" y="5" width="26" height="22" rx="3" fill="#F0FDF4" stroke="#0F6D38" stroke-width="1.3"/>
    <polyline points="6,22 12,14 17,17 26,8" fill="none" stroke="#2563EB" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="26" cy="8" r="2" fill="#DC2626"/>
  </svg>`,

  sparklineColumn: `<svg viewBox="0 0 32 32" width="28" height="28" fill="none">
    <rect x="3" y="5" width="26" height="22" rx="3" fill="#F0FDF4" stroke="#0F6D38" stroke-width="1.3"/>
    <rect x="7" y="16" width="4" height="8" rx="0.8" fill="#93C5FD"/>
    <rect x="14" y="11" width="4" height="13" rx="0.8" fill="#2563EB"/>
    <rect x="21" y="8" width="4" height="16" rx="0.8" fill="#0F4C81"/>
  </svg>`,

  replace: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none">
    <circle cx="10" cy="10" r="6.5" stroke="#2563EB" stroke-width="1.8"/>
    <path d="M15 15 20 20" stroke="#2563EB" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M8 8h4M10 8v4" stroke="#0F6D38" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`,

  insertRow: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none">
    <rect x="3" y="4" width="18" height="16" rx="1.5" fill="#F8FAFC" stroke="#0F6D38" stroke-width="1.3"/>
    <path d="M3 10h18M9 4v16" stroke="#CBD5E1"/>
    <rect x="3" y="10" width="18" height="5" fill="#BBF7D0" opacity="0.85"/>
    <path d="M16 7v6M13 10h6" stroke="#16A34A" stroke-width="1.6" stroke-linecap="round"/>
  </svg>`,

  insertCol: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none">
    <rect x="3" y="4" width="18" height="16" rx="1.5" fill="#F8FAFC" stroke="#0F6D38" stroke-width="1.3"/>
    <path d="M3 10h18M10 4v16" stroke="#CBD5E1"/>
    <rect x="10" y="4" width="5" height="16" fill="#BBF7D0" opacity="0.85"/>
    <path d="M17 8v6M14 11h6" stroke="#16A34A" stroke-width="1.6" stroke-linecap="round"/>
  </svg>`,

  deleteRow: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none">
    <rect x="3" y="4" width="18" height="16" rx="1.5" fill="#F8FAFC" stroke="#64748B" stroke-width="1.3"/>
    <path d="M3 10h18M9 4v16" stroke="#CBD5E1"/>
    <rect x="3" y="10" width="18" height="5" fill="#FECACA" opacity="0.9"/>
    <path d="M14 10.5 19 14.5M19 10.5 14 14.5" stroke="#DC2626" stroke-width="1.6" stroke-linecap="round"/>
  </svg>`,

  deleteCol: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none">
    <rect x="3" y="4" width="18" height="16" rx="1.5" fill="#F8FAFC" stroke="#64748B" stroke-width="1.3"/>
    <path d="M3 10h18M10 4v16" stroke="#CBD5E1"/>
    <rect x="10" y="4" width="5" height="16" fill="#FECACA" opacity="0.9"/>
    <path d="M16 8 20 14M20 8 16 14" stroke="#DC2626" stroke-width="1.6" stroke-linecap="round"/>
  </svg>`,

  cellBorders: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none">
    <rect x="4" y="4" width="16" height="16" rx="1" fill="#F8FAFC" stroke="#0F172A" stroke-width="2"/>
    <path d="M4 12h16M12 4v16" stroke="#94A3B8" stroke-width="1"/>
  </svg>`,

  conditionalFormat: `<svg viewBox="0 0 32 32" width="28" height="28" fill="none">
    <rect x="4" y="6" width="24" height="6" rx="1.5" fill="#BBF7D0" stroke="#16A34A"/>
    <rect x="4" y="13" width="24" height="6" rx="1.5" fill="#FEF08A" stroke="#CA8A04"/>
    <rect x="4" y="20" width="24" height="6" rx="1.5" fill="#FECACA" stroke="#DC2626"/>
  </svg>`,

  freezePanes: `<svg viewBox="0 0 32 32" width="28" height="28" fill="none">
    <rect x="4" y="5" width="24" height="22" rx="2" fill="#F8FAFC" stroke="#0F6D38" stroke-width="1.4"/>
    <rect x="4" y="5" width="24" height="7" fill="#BBF7D0"/>
    <rect x="4" y="5" width="8" height="22" fill="#86EFAC" opacity="0.85"/>
    <path d="M4 12h24M12 5v22" stroke="#0F6D38" stroke-width="1.6"/>
    <path d="M20 16l2 5 2-5" stroke="#2563EB" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,

  dataValidation: `<svg viewBox="0 0 32 32" width="28" height="28" fill="none">
    <rect x="4" y="6" width="24" height="20" rx="3" fill="#F8FAFC" stroke="#0F6D38" stroke-width="1.4"/>
    <path d="M8 13h10M8 18h7" stroke="#64748B" stroke-width="1.6" stroke-linecap="round"/>
    <circle cx="22" cy="16" r="6" fill="#DCFCE7" stroke="#16A34A" stroke-width="1.4"/>
    <path d="M19.5 16.2 21.3 18l3.4-4" stroke="#15803D" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,

  aiSummarize: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none">
    <rect x="4" y="3" width="12" height="16" rx="1.5" fill="#F8FAFC" stroke="#0F4C81" stroke-width="1.3"/>
    <path d="M7 7h6M7 10h5M7 13h4" stroke="#64748B" stroke-width="1.3" stroke-linecap="round"/>
    <path d="M16 14l1.6 3.4L21 19l-3.4 1.6L16 24l-1.6-3.4L11 19l3.4-1.6L16 14Z" fill="#F5B800" stroke="#D97706" stroke-width="0.6"/>
  </svg>`,

  aiRewrite: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none">
    <path d="M4 18 14 8l3 3L7 21H4v-3Z" fill="#DBEAFE" stroke="#2563EB" stroke-width="1.3" stroke-linejoin="round"/>
    <path d="M13 9l2-2 3 3-2 2" stroke="#0F4C81" stroke-width="1.3" stroke-linejoin="round"/>
    <path d="M18 3l1.2 2.6L22 7l-2.8 1.2L18 11l-1.2-2.8L14 7l2.8-1.4L18 3Z" fill="#F5B800"/>
  </svg>`,

  aiGrammar: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none">
    <rect x="3" y="4" width="14" height="16" rx="1.5" fill="#F8FAFC" stroke="#0F4C81" stroke-width="1.3"/>
    <path d="M6 9h8M6 13h5" stroke="#64748B" stroke-width="1.3" stroke-linecap="round"/>
    <circle cx="17" cy="16" r="5" fill="#DCFCE7" stroke="#16A34A" stroke-width="1.3"/>
    <path d="M14.8 16.2 16.5 18l3.2-3.6" stroke="#15803D" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,

  objectAnimation: `<svg viewBox="0 0 32 32" width="28" height="28" fill="none">
    <rect x="6" y="8" width="16" height="12" rx="2" fill="#FAEEE8" stroke="#B53818" stroke-width="1.4"/>
    <path d="M24 10l5 6-5 6" stroke="#F59E0B" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="14" cy="14" r="2.2" fill="#B53818"/>
  </svg>`,

  slideTransition: `<svg viewBox="0 0 32 32" width="28" height="28" fill="none">
    <rect x="3" y="6" width="14" height="10" rx="1.5" fill="#F8FAFC" stroke="#64748B" stroke-width="1.2"/>
    <rect x="13" y="14" width="16" height="12" rx="1.5" fill="#1E293B" stroke="#0F172A" stroke-width="1.2"/>
    <polygon points="18,17 26,20 18,23" fill="#F59E0B"/>
  </svg>`,

  slidePlayFromBegin: `<svg viewBox="0 0 32 32" width="28" height="28" fill="none">
    <rect x="3" y="4" width="26" height="18" rx="2" fill="#1E293B" stroke="#0F172A" stroke-width="1.2"/>
    <polygon points="12,8 21,13 12,18" fill="#F59E0B"/>
    <path d="M7 26h4M9 24v4" stroke="#0F6D38" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M14 26h12" stroke="#94A3B8" stroke-width="1.6" stroke-linecap="round"/>
  </svg>`,

  slidePlayFromCurrent: `<svg viewBox="0 0 32 32" width="28" height="28" fill="none">
    <rect x="3" y="4" width="26" height="18" rx="2" fill="#1E293B" stroke="#0F172A" stroke-width="1.2"/>
    <polygon points="12,8 21,13 12,18" fill="#38BDF8"/>
    <path d="M7 26h8" stroke="#94A3B8" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M17 24v4M15 26h12" stroke="#2563EB" stroke-width="1.8" stroke-linecap="round"/>
  </svg>`,

  presenterMode: `<svg viewBox="0 0 32 32" width="28" height="28" fill="none">
    <rect x="3" y="5" width="16" height="11" rx="1.5" fill="#1E293B"/>
    <polygon points="8,8 14,10.5 8,13" fill="#F59E0B"/>
    <rect x="13" y="14" width="16" height="12" rx="1.5" fill="#FFF7ED" stroke="#B53818" stroke-width="1.3"/>
    <path d="M16 18h10M16 21h7M16 24h5" stroke="#B53818" stroke-width="1.4" stroke-linecap="round"/>
  </svg>`,

  speakerNotes: `<svg viewBox="0 0 32 32" width="28" height="28" fill="none">
    <rect x="4" y="4" width="24" height="16" rx="2" fill="#FAEEE8" stroke="#B53818" stroke-width="1.4"/>
    <path d="M8 22h8l-2 5" stroke="#B53818" stroke-width="1.5" stroke-linejoin="round"/>
    <path d="M9 9h14M9 13h10" stroke="#9A3412" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`,

  // Tab Công thức (Formulas Tab Icons)
  insertFunction: `<svg viewBox="0 0 32 32" width="28" height="28" fill="none">
    <rect x="3" y="4" width="26" height="24" rx="4" fill="#ECFDF5" stroke="#0F6D38" stroke-width="1.5"/>
    <path d="M9 22V13c0-2 1.2-3 3-3h2M8 17h6" stroke="#0F6D38" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M17 14l6 8M23 14l-6 8" stroke="#0F6D38" stroke-width="2.2" stroke-linecap="round"/>
  </svg>`,

  countNumbers: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none">
    <rect x="3" y="3" width="18" height="18" rx="3" fill="#F0FDF4" stroke="#0F6D38" stroke-width="1.2"/>
    <path d="M6 16V8l-1.5 1.5M10.5 10a2 2 0 0 1 2 2c0 1-2 2-2 4h3M15 16h2a2 2 0 0 0 0-4h-1m1 0a1.8 1.8 0 0 0 0-3.6h-2" stroke="#0F6D38" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,

  maxFunction: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none">
    <rect x="3" y="3" width="18" height="18" rx="3" fill="#F8FAFC" stroke="#64748B" stroke-width="1.2"/>
    <rect x="6" y="13" width="3" height="6" fill="#94A3B8"/>
    <rect x="10.5" y="7" width="3" height="12" fill="#0F6D38"/>
    <rect x="15" y="10" width="3" height="9" fill="#94A3B8"/>
    <path d="M12 4l-2 3h4l-2-3z" fill="#DC2626"/>
  </svg>`,

  minFunction: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none">
    <rect x="3" y="3" width="18" height="18" rx="3" fill="#F8FAFC" stroke="#64748B" stroke-width="1.2"/>
    <rect x="6" y="8" width="3" height="11" fill="#94A3B8"/>
    <rect x="10.5" y="14" width="3" height="5" fill="#0F6D38"/>
    <rect x="15" y="10" width="3" height="9" fill="#94A3B8"/>
    <path d="M12 21l-2-3h4l-2 3z" fill="#2563EB"/>
  </svg>`,

  categoryFinancial: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none">
    <rect x="3" y="4" width="18" height="16" rx="3" fill="#FEF3C7" stroke="#D97706" stroke-width="1.2"/>
    <circle cx="12" cy="12" r="5" fill="#F59E0B"/>
    <path d="M12 9v6M10.5 10.5h2.5a1 1 0 0 1 0 2h-2a1 1 0 0 0 0 2h2.5" stroke="#FFF" stroke-width="1.2" stroke-linecap="round"/>
  </svg>`,

  categoryLogical: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none">
    <rect x="3" y="3" width="18" height="18" rx="3" fill="#EFF6FF" stroke="#2563EB" stroke-width="1.2"/>
    <path d="M6 12h4m0 0l4-4m-4 4l4 4m4-4h2" stroke="#2563EB" stroke-width="1.6" stroke-linecap="round"/>
    <circle cx="6" cy="12" r="1.5" fill="#2563EB"/>
    <circle cx="18" cy="8" r="1.5" fill="#10B981"/>
    <circle cx="18" cy="16" r="1.5" fill="#EF4444"/>
  </svg>`,

  categoryText: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none">
    <rect x="3" y="3" width="18" height="18" rx="3" fill="#F8FAFC" stroke="#64748B" stroke-width="1.2"/>
    <path d="M7 7h10M12 7v11M9 18h6" stroke="#4F46E5" stroke-width="1.8" stroke-linecap="round"/>
  </svg>`,

  categoryDateTime: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none">
    <rect x="3" y="4" width="18" height="16" rx="3" fill="#F8FAFC" stroke="#64748B" stroke-width="1.2"/>
    <path d="M3 8h18M8 2v4M16 2v4" stroke="#0F6D38" stroke-width="1.4" stroke-linecap="round"/>
    <circle cx="14" cy="13" r="4" fill="#DCFCE7" stroke="#0F6D38" stroke-width="1.2"/>
    <path d="M14 11.5v1.8l1.2.8" stroke="#0F6D38" stroke-width="1.2" stroke-linecap="round"/>
  </svg>`,

  categoryLookup: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none">
    <rect x="3" y="3" width="18" height="18" rx="3" fill="#F8FAFC" stroke="#64748B" stroke-width="1.2"/>
    <path d="M3 9h18M9 3v18" stroke="#CBD5E1"/>
    <circle cx="14" cy="14" r="3.5" fill="#DBEAFE" stroke="#2563EB" stroke-width="1.3"/>
    <path d="M16.5 16.5L20 20" stroke="#2563EB" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`,

  categoryMath: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none">
    <rect x="3" y="3" width="18" height="18" rx="3" fill="#F8FAFC" stroke="#64748B" stroke-width="1.2"/>
    <path d="M6 7h4M8 5v4M14 7h4M6 17h4M8 15v4M14 15h4M14 18h4" stroke="#0F6D38" stroke-width="1.4" stroke-linecap="round"/>
  </svg>`,

  categoryMore: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none">
    <rect x="3" y="3" width="18" height="18" rx="3" fill="#F8FAFC" stroke="#64748B" stroke-width="1.2"/>
    <path d="M7 6h10l-6 6 6 6H7" stroke="#0F6D38" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,

  defineName: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none">
    <path d="M4 6a2 2 0 0 1 2-2h7l7 7-7 7H6a2 2 0 0 1-2-2V6z" fill="#ECFDF5" stroke="#0F6D38" stroke-width="1.3"/>
    <circle cx="8" cy="8" r="1.5" fill="#0F6D38"/>
    <path d="M15 13v4m-2-2h4" stroke="#0F6D38" stroke-width="1.4" stroke-linecap="round"/>
  </svg>`,

  useInFormula: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none">
    <rect x="3" y="3" width="18" height="18" rx="3" fill="#F8FAFC" stroke="#64748B" stroke-width="1.2"/>
    <path d="M6 7h8M6 11h12M6 15h6" stroke="#64748B" stroke-width="1.4" stroke-linecap="round"/>
    <path d="M16 14l3 3-3 3m3-3h-5" stroke="#0F6D38" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,

  createFromSelection: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none">
    <rect x="3" y="3" width="18" height="18" rx="3" fill="#F8FAFC" stroke="#64748B" stroke-width="1.2"/>
    <rect x="5" y="5" width="14" height="4" fill="#BBF7D0"/>
    <path d="M5 9h14M5 13h14M5 17h14M10 5v14M15 5v14" stroke="#94A3B8" stroke-width="0.8"/>
    <path d="M17 13l2 2-2 2" stroke="#0F6D38" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,

  tracePrecedents: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none">
    <rect x="3" y="3" width="6" height="6" rx="1" fill="#DBEAFE" stroke="#2563EB" stroke-width="1.2"/>
    <rect x="15" y="15" width="6" height="6" rx="1" fill="#DCFCE7" stroke="#0F6D38" stroke-width="1.2"/>
    <circle cx="6" cy="6" r="1.5" fill="#2563EB"/>
    <path d="M6 9v7c0 1 1 2 2 2h6" stroke="#2563EB" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M12 16l3 2-3 2v-4z" fill="#2563EB"/>
  </svg>`,

  traceDependents: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none">
    <rect x="3" y="3" width="6" height="6" rx="1" fill="#DCFCE7" stroke="#0F6D38" stroke-width="1.2"/>
    <rect x="15" y="15" width="6" height="6" rx="1" fill="#DBEAFE" stroke="#2563EB" stroke-width="1.2"/>
    <circle cx="6" cy="6" r="1.5" fill="#0F6D38"/>
    <path d="M9 6h6c1 0 2 1 2 2v6" stroke="#2563EB" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M15 12l2 3 2-3h-4z" fill="#2563EB"/>
  </svg>`,

  removeArrows: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none">
    <path d="M5 8h10c1 0 2 1 2 2v6" stroke="#94A3B8" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M15 14l2 2 2-2" stroke="#94A3B8" stroke-width="1.6" stroke-linecap="round"/>
    <path d="M6 18l12-12M6 6l12 12" stroke="#DC2626" stroke-width="2" stroke-linecap="round"/>
  </svg>`,

  showFormulas: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none">
    <rect x="3" y="3" width="18" height="18" rx="3" fill="#ECFDF5" stroke="#0F6D38" stroke-width="1.3"/>
    <path d="M7 16V10c0-1.5 1-2 2-2h2M6 13h5" stroke="#0F6D38" stroke-width="1.5" stroke-linecap="round"/>
    <path d="M13 11l4 5M17 11l-4 5" stroke="#0F6D38" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`,

  errorChecking: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none">
    <rect x="3" y="3" width="18" height="18" rx="3" fill="#FFFBEB" stroke="#D97706" stroke-width="1.2"/>
    <path d="M12 7v6M12 16h.01" stroke="#D97706" stroke-width="2" stroke-linecap="round"/>
    <path d="M4 4l4 0 0 4z" fill="#10B981"/>
  </svg>`,

  watchWindow: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none">
    <rect x="3" y="4" width="18" height="16" rx="3" fill="#F8FAFC" stroke="#64748B" stroke-width="1.2"/>
    <path d="M3 9h18M8 4v16" stroke="#CBD5E1"/>
    <circle cx="8" cy="13" r="3.5" stroke="#2563EB" stroke-width="1.4" fill="#DBEAFE"/>
    <circle cx="15" cy="13" r="3.5" stroke="#2563EB" stroke-width="1.4" fill="#DBEAFE"/>
    <path d="M11.5 13h1" stroke="#2563EB" stroke-width="1.4"/>
  </svg>`,

  calculationOptions: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none">
    <rect x="3" y="3" width="18" height="18" rx="3" fill="#F0FDF4" stroke="#0F6D38" stroke-width="1.2"/>
    <rect x="6" y="6" width="12" height="4" rx="1" fill="#DCFCE7"/>
    <circle cx="8" cy="13" r="1" fill="#0F6D38"/>
    <circle cx="12" cy="13" r="1" fill="#0F6D38"/>
    <circle cx="16" cy="13" r="1" fill="#0F6D38"/>
    <circle cx="8" cy="17" r="1" fill="#0F6D38"/>
    <circle cx="12" cy="17" r="1" fill="#0F6D38"/>
    <path d="M15 17h2" stroke="#0F6D38" stroke-width="1.5" stroke-linecap="round"/>
  </svg>`,

  calculateSheet: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none">
    <rect x="4" y="3" width="16" height="18" rx="2" fill="#F8FAFC" stroke="#0F6D38" stroke-width="1.2"/>
    <path d="M7 7h10M7 11h5" stroke="#94A3B8" stroke-width="1.2"/>
    <path d="M15 13a3.5 3.5 0 1 1-1-2.5M15 9v3h-3" stroke="#2563EB" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`
};
