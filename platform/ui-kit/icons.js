/**
 * VN Office UI Kit — Precision Vector Icons (SVG)
 * Tối ưu hóa pixel-perfect cho hiển thị Retina / High-DPI
 */

export const ICONS = {
  // Thương hiệu VN Office
  brandLogo: `<svg viewBox="0 0 32 32" width="22" height="22" fill="none">
    <rect width="32" height="32" rx="7" fill="#C01E17"/>
    <path d="M7 9L16 25L25 9H20L16 17.5L12 9H7Z" fill="#F5B800"/>
    <path d="M16 5L17.5 8.5L21 9L18.5 11.5L19 15L16 13L13 15L13.5 11.5L11 9L14.5 8.5L16 5Z" fill="#FFFFFF" opacity="0.95"/>
  </svg>`,

  // App Logos
  appWriter: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none"><rect width="24" height="24" rx="5" fill="#0F4C81"/><text x="6.5" y="17" fill="#FFF" font-weight="900" font-size="14" font-family="sans-serif">W</text></svg>`,
  appSheet: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none"><rect width="24" height="24" rx="5" fill="#0F6D38"/><text x="6.5" y="17" fill="#FFF" font-weight="900" font-size="14" font-family="sans-serif">S</text></svg>`,
  appSlides: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none"><rect width="24" height="24" rx="5" fill="#B53818"/><text x="7" y="17" fill="#FFF" font-weight="900" font-size="14" font-family="sans-serif">P</text></svg>`,

  // File Operations
  fileNew: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>`,
  fileOpen: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`,
  fileSave: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>`,
  filePrint: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.75"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>`,
  filePdf: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><text x="6" y="18" font-size="6.5" font-family="sans-serif" font-weight="900" fill="currentColor">PDF</text></svg>`,

  // Clipboard & Edit
  undo: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>`,
  redo: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>`,
  cut: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.75"><circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><line x1="20" y1="4" x2="8.12" y2="15.88"/><line x1="14.47" y1="14.48" x2="20" y2="20"/><line x1="8.12" y1="8.12" x2="12" y2="12"/></svg>`,
  copy: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.75"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`,
  paste: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/></svg>`,
  formatPainter: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M19 11V4a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v2a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2v5"/><path d="M14 14v7a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-7"/></svg>`,

  // Text Formatting
  bold: `<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor"><path d="M6 3h7c2.76 0 5 2.24 5 5 0 1.55-.7 2.94-1.8 3.87C17.48 12.87 18.5 14.54 18.5 16.5 18.5 19.54 16.04 22 13 22H6V3zm3.5 3v4h3.5c1.1 0 2-.9 2-2s-.9-2-2-2H9.5zm0 7v6H13c1.38 0 2.5-1.12 2.5-2.5S14.38 13 13 13H9.5z"/></svg>`,
  italic: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.25"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>`,
  underline: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.25"><path d="M6 3v7a6 6 0 0 0 12 0V3"/><line x1="4" y1="21" x2="20" y2="21"/></svg>`,
  strike: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.3 4.9c-2.3-.6-5.8-.8-7.3.5-1.5 1.3-1.2 3.6.5 4.6 1.4.8 3.5 1 5.3 1.5M4 12h16M7 17.5c1.4.8 3.3 1.2 5 1.2 3.2 0 5-1.4 5-3.3"/></svg>`,
  clearFormat: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M3 3l18 18M7 7l5-5 7 7-5 5"/><path d="M2 20h14"/></svg>`,
  colorText: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 19l6-14 6 14M8 14h8"/><rect x="3" y="21" width="18" height="3" fill="#C01E17" stroke="none"/></svg>`,
  colorHighlight: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M9 11l-6 6v3h3l6-6"/><path d="M22 7l-5-5-7 7 5 5 7-7z"/><rect x="3" y="21" width="18" height="3" fill="#F5B800" stroke="none"/></svg>`,

  // Paragraph & Alignment
  alignLeft: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/></svg>`,
  alignCenter: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="10" x2="6" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="18" y1="18" x2="6" y2="18"/></svg>`,
  alignRight: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><line x1="21" y1="10" x2="7" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="21" y1="18" x2="7" y2="18"/></svg>`,
  alignJustify: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="10" x2="3" y2="10"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="21" y1="18" x2="3" y2="18"/></svg>`,
  listBullet: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><circle cx="4" cy="6" r="2" fill="currentColor"/><circle cx="4" cy="12" r="2" fill="currentColor"/><circle cx="4" cy="18" r="2" fill="currentColor"/></svg>`,
  listNumber: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.75"><line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 7h1v-4M3 7h3M3 13a2 2 0 1 1 3-1.7c-.5.4-2 1.7-2 2.7h3M3 17a1.5 1.5 0 0 1 2.5-1.1 1.5 1.5 0 0 1-1 2.6H3"/></svg>`,
  indentInc: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.75"><line x1="21" y1="6" x2="11" y2="6"/><line x1="21" y1="12" x2="11" y2="12"/><line x1="21" y1="18" x2="11" y2="18"/><polyline points="7 8 3 12 7 16"/></svg>`,
  indentDec: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.75"><line x1="21" y1="6" x2="11" y2="6"/><line x1="21" y1="12" x2="11" y2="12"/><line x1="21" y1="18" x2="11" y2="18"/><polyline points="3 8 7 12 3 16"/></svg>`,

  // Insert Elements
  table: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.75"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/></svg>`,
  image: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.75"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`,
  pageBreak: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M14 2H6a2 2 0 0 0-2 2v7h16V8z"/><path d="M4 17v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/><line x1="2" y1="14" x2="22" y2="14" stroke-dasharray="3 3"/></svg>`,
  headerFooter: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.75"><rect x="4" y="2" width="16" height="20" rx="2"/><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="17" x2="20" y2="17"/></svg>`,
  margins: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.75"><rect x="3" y="3" width="18" height="18" rx="2"/><rect x="7" y="7" width="10" height="10" stroke-dasharray="2 2"/></svg>`,
  orientation: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.75"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18l-3-3m3 3l3-3m-3 3v-6"/></svg>`,

  // Sheet Controls
  mergeCells: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.75"><rect x="3" y="4" width="18" height="16" rx="2"/><line x1="8" y1="12" x2="16" y2="12"/><polyline points="10 10 8 12 10 14"/><polyline points="14 10 16 12 14 14"/></svg>`,
  currencyVND: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><text x="3" y="17" font-size="14" font-weight="bold" fill="currentColor">₫</text></svg>`,
  autoSum: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.25"><path d="M18 4H6l7 8-7 8h12"/></svg>`,
  filter: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.75"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>`,
  sortAsc: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M3 6h7M3 12h5M3 18h3M17 4v16m0 0l-3-3m3 3l3-3"/></svg>`,
  sortDesc: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.75"><path d="M3 6h3M3 12h5M3 18h7M17 20V4m0 0l-3 3m3-3l3 3"/></svg>`,

  // Slides Controls
  slideNew: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.75"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/><line x1="12" y1="7" x2="12" y2="13"/><line x1="9" y1="10" x2="15" y2="10"/></svg>`,
  slidePlay: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.75"><polygon points="5 3 19 12 5 21 5 3"/></svg>`,
  shape: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.75"><rect x="3" y="3" width="10" height="10" rx="1"/><circle cx="16" cy="16" r="5"/></svg>`,
  textBox: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.75"><rect x="3" y="3" width="18" height="18" rx="2" stroke-dasharray="2 2"/><text x="8" y="16" font-size="12" font-weight="bold" fill="currentColor">A</text></svg>`,

  // Shell & Utilities
  aiSparkle: `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2l2.4 5.6L20 10l-5.6 2.4L12 18l-2.4-5.6L4 10l5.6-2.4z"/><path d="M19 16l1.2 2.8L23 20l-2.8 1.2L19 24l-1.2-2.8L15 20l2.8-1.2z"/></svg>`,
  search: `<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`,
  chevronDown: `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>`,
  dialogLaunch: `<svg viewBox="0 0 24 24" width="10" height="10" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`,
  close: `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`
};
