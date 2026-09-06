import { getContrastRatio, meetsWcagAA } from "../platform/ui-kit/contrast-checker.js";

const pairs = [
  // Sheet Dialogs
  { dialog: "Sheet - General", label: "Dialog hint text on white window", fg: "#475569", bg: "#ffffff", isLarge: false },
  { dialog: "Sheet - General", label: "Dialog hint text on dark window", fg: "#94a3b8", bg: "#1e1e1e", isLarge: false },
  { dialog: "Sheet - General", label: "Label secondary text on white window", fg: "#334155", bg: "#ffffff", isLarge: false },
  { dialog: "Sheet - General", label: "Label secondary text on dark window", fg: "#cbd5e1", bg: "#1e1e1e", isLarge: false },
  { dialog: "Sheet - General", label: "Dialog error text on white window", fg: "#b91c1c", bg: "#ffffff", isLarge: false },
  { dialog: "Sheet - General", label: "Dialog error text in dark mode (#f87171 on #1e1e1e)", fg: "#f87171", bg: "#1e1e1e", isLarge: false },
  { dialog: "Sheet - Evaluate Formula", label: "Underline green on light muted (#0f6d38 on #f8fafc)", fg: "#0f6d38", bg: "#f8fafc", isLarge: false },
  { dialog: "Sheet - Evaluate Formula", label: "Underline green in dark mode (#4ade80 on #2d2d2d)", fg: "#4ade80", bg: "#2d2d2d", isLarge: false },
  { dialog: "Sheet - Consolidate", label: "Destination code font on white", fg: "#0f172a", bg: "#ffffff", isLarge: false },
  { dialog: "Sheet - Consolidate", label: "Destination code font on dark window", fg: "#f1f5f9", bg: "#1e1e1e", isLarge: false },
  { dialog: "Sheet - Rule Dialog", label: "Close button text in dark mode (#94a3b8 on #1e1e1e)", fg: "#94a3b8", bg: "#1e1e1e", isLarge: true },
  { dialog: "Sheet - AutoFilter", label: "Popover item text on white", fg: "#0f172a", bg: "#ffffff", isLarge: false },
  { dialog: "Sheet - AutoFilter", label: "Popover item text on dark surface", fg: "#f1f5f9", bg: "#1e1e1e", isLarge: false },
  { dialog: "Sheet - AutoFilter", label: "Popover section label on white", fg: "#475569", bg: "#ffffff", isLarge: false },
  { dialog: "Sheet - AutoFilter", label: "Popover section label on dark surface", fg: "#94a3b8", bg: "#1e1e1e", isLarge: false },
  
  // Slides Dialogs
  { dialog: "Slides - Animation Pane", label: "Header title on white", fg: "#0f172a", bg: "#ffffff", isLarge: false },
  { dialog: "Slides - Animation Pane", label: "Header title on dark window", fg: "#f1f5f9", bg: "#1e1e1e", isLarge: false },
  { dialog: "Slides - Animation Pane", label: "Header close button on white (#b53818)", fg: "#b53818", bg: "#ffffff", isLarge: true },
  { dialog: "Slides - Animation Pane", label: "Header close button on dark (#fdba74)", fg: "#fdba74", bg: "#1e1e1e", isLarge: true },
  { dialog: "Slides - Animation Pane", label: "Order badge text (#ffffff on #b53818)", fg: "#ffffff", bg: "#b53818", isLarge: false },
  { dialog: "Slides - Animation Pane", label: "Item object label on light orange (#0f172a on #fff7ed)", fg: "#0f172a", bg: "#fff7ed", isLarge: false },
  { dialog: "Slides - Animation Pane", label: "Item object label in dark mode (#f1f5f9 on #431407)", fg: "#f1f5f9", bg: "#431407", isLarge: false },
  { dialog: "Slides - Animation Pane", label: "Item type label on light orange (#9a3412 on #fff7ed)", fg: "#9a3412", bg: "#fff7ed", isLarge: false },
  { dialog: "Slides - Animation Pane", label: "Item type label in dark mode (#fdba74 on #431407)", fg: "#fdba74", bg: "#431407", isLarge: false },
  { dialog: "Slides - Animation Pane", label: "Remove button on white (#b91c1c on #ffffff)", fg: "#b91c1c", bg: "#ffffff", isLarge: false },
  { dialog: "Slides - Animation Pane", label: "Remove button in dark mode (#fca5a5 on #252526)", fg: "#fca5a5", bg: "#252526", isLarge: false },
  { dialog: "Slides - Set Up Show", label: "Hint text on white (#475569 on #ffffff)", fg: "#475569", bg: "#ffffff", isLarge: false },
  { dialog: "Slides - Set Up Show", label: "Hint text on dark (#94a3b8 on #1e1e1e)", fg: "#94a3b8", bg: "#1e1e1e", isLarge: false },
  { dialog: "Slides - Set Up Show", label: "Label text on white (#334155 on #ffffff)", fg: "#334155", bg: "#ffffff", isLarge: false },
  { dialog: "Slides - Set Up Show", label: "Label text on dark (#cbd5e1 on #1e1e1e)", fg: "#cbd5e1", bg: "#1e1e1e", isLarge: false },
  { dialog: "Slides - Transition", label: "Preview sample card text on white (#b53818 on #ffffff)", fg: "#b53818", bg: "#ffffff", isLarge: true },
  { dialog: "Slides - Transition", label: "Preview sample card text in dark mode (#fdba74 on #252526)", fg: "#fdba74", bg: "#252526", isLarge: true },
  { dialog: "Slides - Diagram", label: "Card title in dark mode (#f1f5f9 on #252526)", fg: "#f1f5f9", bg: "#252526", isLarge: false },
  { dialog: "Slides - Diagram", label: "Card title selected in dark mode (#f1f5f9 on #431407)", fg: "#f1f5f9", bg: "#431407", isLarge: false },
  { dialog: "Slides - Diagram", label: "Preview symbol in dark mode (#60a5fa on #252526)", fg: "#60a5fa", bg: "#252526", isLarge: true },
  { dialog: "Slides - Presenter View", label: "Console button text (#f8fafc on #334155)", fg: "#f8fafc", bg: "#334155", isLarge: false },
  { dialog: "Slides - Chart", label: "Error message in dark mode (#f87171 on #1e1e1e)", fg: "#f87171", bg: "#1e1e1e", isLarge: false },

  // Writer Dialogs
  { dialog: "Writer - Page Color", label: "Palette border active (#2563eb on #ffffff)", fg: "#2563eb", bg: "#ffffff", isLarge: true },
  { dialog: "Writer - Page Color", label: "Palette border inactive (#64748b on #ffffff)", fg: "#64748b", bg: "#ffffff", isLarge: true },
  { dialog: "Writer - Envelopes & Labels", label: "Dialog header icon light (#0f4c81 on #f8fafc)", fg: "#0f4c81", bg: "#f8fafc", isLarge: true },
  { dialog: "Writer - Envelopes & Labels", label: "Dialog header icon dark (#93c5fd on #1f1f1f)", fg: "#93c5fd", bg: "#1f1f1f", isLarge: true },
  { dialog: "Writer - Envelopes & Labels", label: "Size option text light (#0f172a on #ffffff)", fg: "#0f172a", bg: "#ffffff", isLarge: false },
  { dialog: "Writer - Envelopes & Labels", label: "Size option text dark (#f1f5f9 on #1e1e1e)", fg: "#f1f5f9", bg: "#1e1e1e", isLarge: false },
  { dialog: "Writer - Illustrations", label: "Shape/Diagram card title light (#1e293b on #ffffff)", fg: "#1e293b", bg: "#ffffff", isLarge: false },
  { dialog: "Writer - Illustrations", label: "Shape/Diagram card title light selected (#1e293b on #eff6ff)", fg: "#1e293b", bg: "#eff6ff", isLarge: false },
  { dialog: "Writer - Illustrations", label: "Shape/Diagram card title dark (#f1f5f9 on #252526)", fg: "#f1f5f9", bg: "#252526", isLarge: false },
  { dialog: "Writer - Illustrations", label: "Shape/Diagram card title dark selected (#f1f5f9 on #172554)", fg: "#f1f5f9", bg: "#172554", isLarge: false },
  { dialog: "Writer - Illustrations", label: "Chart preview label light (#334155 on #ffffff)", fg: "#334155", bg: "#ffffff", isLarge: false },
  { dialog: "Writer - Illustrations", label: "Chart preview label dark (#cbd5e1 on #1e1e1e)", fg: "#cbd5e1", bg: "#1e1e1e", isLarge: false },
  { dialog: "Writer - Comments Panel", label: "Comment author/text in dark mode (#f1f5f9 on #252526)", fg: "#f1f5f9", bg: "#252526", isLarge: false },
  { dialog: "Writer - Comments Panel", label: "Comment meta text in dark mode (#94a3b8 on #252526)", fg: "#94a3b8", bg: "#252526", isLarge: false },
  { dialog: "Writer - Comments Panel", label: "Comment delete button in dark mode (#fca5a5 on #252526)", fg: "#fca5a5", bg: "#252526", isLarge: false },

  // App Chrome UI Polish (Ribbon, Statusbar, Backstage, Panels, Context Menu)
  { dialog: "Chrome - Ribbon Active Button", label: "Writer active button in dark mode (#60a5fa on #172554)", fg: "#60a5fa", bg: "#172554", isLarge: false },
  { dialog: "Chrome - Ribbon Active Button", label: "Sheet active button in dark mode (#4ade80 on #052e16)", fg: "#4ade80", bg: "#052e16", isLarge: false },
  { dialog: "Chrome - Ribbon Active Button", label: "Slides active button in dark mode (#fb923c on #431407)", fg: "#fb923c", bg: "#431407", isLarge: false },
  { dialog: "Chrome - Status Bar", label: "Status text on Writer navy (#ffffff on #0f4c81)", fg: "#ffffff", bg: "#0f4c81", isLarge: false },
  { dialog: "Chrome - Status Bar", label: "Status text on Sheet green (#ffffff on #0f6d38)", fg: "#ffffff", bg: "#0f6d38", isLarge: false },
  { dialog: "Chrome - Status Bar", label: "Status text on Slides amber (#ffffff on #b53818)", fg: "#ffffff", bg: "#b53818", isLarge: false },
  { dialog: "Chrome - Backstage", label: "Nav button active in dark mode (#60a5fa on #1e1e1e)", fg: "#60a5fa", bg: "#1e1e1e", isLarge: false },
  { dialog: "Chrome - Backstage", label: "Recent row hover text in dark mode (#f1f5f9 on #2a2d2e)", fg: "#f1f5f9", bg: "#2a2d2e", isLarge: false },
  { dialog: "Chrome - Sheet Formula Bar", label: "Formula input focus border in dark mode (#4ade80 on #1e1e1e)", fg: "#4ade80", bg: "#1e1e1e", isLarge: true },
  { dialog: "Chrome - Sheet Tab Bar", label: "Active tab text in dark mode (#4ade80 on #1e1e1e)", fg: "#4ade80", bg: "#1e1e1e", isLarge: false },
  { dialog: "Chrome - Slides Navigator", label: "Active thumbnail outline in dark mode (#fb923c on #1e1e1e)", fg: "#fb923c", bg: "#1e1e1e", isLarge: true },
  { dialog: "Chrome - Context Menu", label: "Sheet context item hover in dark mode (#4ade80 on #2a2d2e)", fg: "#4ade80", bg: "#2a2d2e", isLarge: false },
  { dialog: "Chrome - Context Menu", label: "Writer spellcheck hover in dark mode (#60a5fa on #2a2d2e)", fg: "#60a5fa", bg: "#2a2d2e", isLarge: false },

  // Canvas Editing Surface UI Polish (Writer, Sheet, Slides)
  { dialog: "Writer - Canvas Caret", label: "Caret/Text primary in dark mode (#f1f5f9 on #1e1e1e)", fg: "#f1f5f9", bg: "#1e1e1e", isLarge: false },
  { dialog: "Writer - Text Selection", label: "Selection text in dark mode (#ffffff on #1d4ed8)", fg: "#ffffff", bg: "#1d4ed8", isLarge: false },
  { dialog: "Writer - Track Changes", label: "Insert marker green in dark mode (#4ade80 on #1e1e1e)", fg: "#4ade80", bg: "#1e1e1e", isLarge: false },
  { dialog: "Writer - Track Changes", label: "Delete marker red in dark mode (#f87171 on #1e1e1e)", fg: "#f87171", bg: "#1e1e1e", isLarge: false },
  { dialog: "Writer - Spellcheck", label: "Squiggly underline in dark mode (#f87171 on #1e1e1e)", fg: "#f87171", bg: "#1e1e1e", isLarge: true },
  { dialog: "Writer - Table Focus", label: "Cell focus outline in dark mode (#60a5fa on #1e1e1e)", fg: "#60a5fa", bg: "#1e1e1e", isLarge: true },
  { dialog: "Sheet - Cell Selection", label: "Selection border in dark mode (#4ade80 on #1e1e1e)", fg: "#4ade80", bg: "#1e1e1e", isLarge: true },
  { dialog: "Sheet - Freeze Pane", label: "Divider line in dark mode (#64748b on #1e1e1e)", fg: "#64748b", bg: "#1e1e1e", isLarge: true },
  { dialog: "Sheet - Formula In-Cell", label: "Autocomplete active item in dark mode (#4ade80 on #052e16)", fg: "#4ade80", bg: "#052e16", isLarge: false },
  { dialog: "Sheet - Formula In-Cell", label: "Syntax param active in dark mode (#4ade80 on #052e16)", fg: "#4ade80", bg: "#052e16", isLarge: false },
  { dialog: "Slides - Shape Selection", label: "Selection outline in dark mode (#60a5fa on #1e1e1e)", fg: "#60a5fa", bg: "#1e1e1e", isLarge: true },
  { dialog: "Slides - Shape Focus", label: "Focus outline in dark mode (#fb923c on #1e1e1e)", fg: "#fb923c", bg: "#1e1e1e", isLarge: true },
  { dialog: "Slides - Resize Handle", label: "Handle outline on dark canvas (#60a5fa on #1e1e1e)", fg: "#60a5fa", bg: "#1e1e1e", isLarge: true },
  { dialog: "Slides - Resize Handle", label: "Handle border on light handle fill (#2563eb on #ffffff)", fg: "#2563eb", bg: "#ffffff", isLarge: true },
  { dialog: "Slides - Smart Guide", label: "Guide line in dark mode (#f87171 on #1e1e1e)", fg: "#f87171", bg: "#1e1e1e", isLarge: true },
  { dialog: "Slides - Textbox Text", label: "Textbox text in dark mode (#f1f5f9 on #1e1e1e)", fg: "#f1f5f9", bg: "#1e1e1e", isLarge: false }
];


console.log("=== BẮT ĐẦU ĐO ĐỘ TƯƠNG PHẢN THỰC TẾ (WCAG 2.1 AA) ===\n");
let allPass = true;
for (const p of pairs) {
  const ratio = getContrastRatio(p.fg, p.bg);
  const pass = meetsWcagAA(p.fg, p.bg, p.isLarge);
  const req = p.isLarge ? 3.0 : 4.5;
  if (!pass) allPass = false;
  console.log(`[${pass ? "PASS" : "FAIL"}] [${p.dialog}] ${p.label}`);
  console.log(`       FG: ${p.fg} | BG: ${p.bg} | Ratio: ${ratio}:1 (Yêu cầu: >= ${req}:1)\n`);
}

console.log(allPass ? "TẤT CẢ CÁC CẶP MÀU ĐỀU ĐẠT CHUẨN WCAG 2.1 AA!" : "CẢNH BÁO: CÓ CẶP MÀU CHƯA ĐẠT CHUẨN WCAG AA!");
