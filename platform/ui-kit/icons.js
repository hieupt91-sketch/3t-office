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

  // Định dạng ký tự
  bold: `<svg viewBox="0 0 24 24" width="15" height="15" fill="#0F172A"><path d="M6 3h7c2.76 0 5 2.24 5 5 0 1.55-.7 2.94-1.8 3.87C17.48 12.87 18.5 14.54 18.5 16.5 18.5 19.54 16.04 22 13 22H6V3zm3.5 3v4h3.5c1.1 0 2-.9 2-2s-.9-2-2-2H9.5zm0 7v6H13c1.38 0 2.5-1.12 2.5-2.5S14.38 13 13 13H9.5z"/></svg>`,
  italic: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#0F172A" stroke-width="2.4"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>`,
  underline: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#0F172A" stroke-width="2.2"><path d="M6 3v7a6 6 0 0 0 12 0V3"/><line x1="4" y1="21" x2="20" y2="21"/></svg>`,
  strike: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#0F172A" stroke-width="2"><path d="M17.3 4.9c-2.3-.6-5.8-.8-7.3.5-1.5 1.3-1.2 3.6.5 4.6 1.4.8 3.5 1 5.3 1.5M4 12h16M7 17.5c1.4.8 3.3 1.2 5 1.2 3.2 0 5-1.4 5-3.3"/></svg>`,
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

  currencyVND: `<svg viewBox="0 0 32 32" width="28" height="28" fill="none">
    <circle cx="16" cy="16" r="13" fill="#F5B800" stroke="#D97706" stroke-width="1.5"/>
    <circle cx="16" cy="16" r="10" fill="#FCD34D"/>
    <text x="10" y="21" font-size="16" font-weight="900" fill="#92400E" font-family="sans-serif">₫</text>
  </svg>`,

  autoSum: `<svg viewBox="0 0 32 32" width="28" height="28" fill="none">
    <rect x="4" y="4" width="24" height="24" rx="5" fill="#E7F4EC" stroke="#0F6D38" stroke-width="1.2"/>
    <path d="M22 9H11L17 16L11 23H22" stroke="#0F6D38" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`,

  filter: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" fill="#67E8F9" stroke="#0891B2" stroke-width="1.5"/>
  </svg>`,

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
  </svg>`
};
