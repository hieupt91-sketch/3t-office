import { WriterAdapter } from "../../adapters/libreoffice/writer/writer-adapter.js";

function check(value, message) { if (!value) throw new Error(message); }

export async function runWriterTablePaintBordersTests() {
  const results = [];
  const test = (name, fn) => { try { fn(); results.push({ name, pass: true }); } catch (error) { results.push({ name, pass: false, error: error.message }); } };

  test("W47: longhand padding-bottom is kept and increased by borderPx, not replaced with 0+borderPx (d09)", () => {
    const html = '<table data-vno-border-px="1"><tr>'
      + '<td style="padding: 0cm 0.08cm 0.08cm 0cm; border-bottom: 1px solid #d4d6d9; border-right: 1px solid #d4d6d9">H</td>'
      + '</tr><tr>'
      + '<td style="padding-top: 0cm; padding-bottom: 0.11cm; padding-left: 0cm; padding-right: 0.05cm; border-top: none; border-bottom: 1px solid #d5d5d5; border-left: none; border-right: 1px solid #d4d6d9">C</td>'
      + "</tr></table>";
    const out = new WriterAdapter(null)._applyPaintOnlyTableBorders(html);
    const cells = [...out.matchAll(/<td\b([^>]*)>/g)].map((m) => m[1]);
    check(cells.length === 2, `expected 2 cells: ${out}`);
    // Hàng dữ liệu: 0.11cm = 4.157px + 1px viền → 5.157px; không được thành padding: 0 0 1px 0.
    check(/padding:\s*0cm\s+0\.05cm\s+5\.157px\s+0cm/i.test(cells[1]), `data-row padding-bottom 0.11cm must be kept+1px: ${cells[1]}`);
    check(!/padding:\s*0px\s+0px\s+1px\s+0px/i.test(cells[1]), `must not wipe longhand padding to 0+borderPx: ${cells[1]}`);
    check(/data-vno-lo-padding="padding-top: 0cm; padding-bottom: 0\.11cm; padding-left: 0cm; padding-right: 0\.05cm"/i.test(cells[1]), `original longhand padding stored: ${cells[1]}`);
    // Hàng đầu có shorthand: 0.08cm + 1px bottom, top không cộng vì border-top không solid trên ô này — ô H chỉ có bottom/right.
    check(/data-vno-lo-padding="padding: 0cm 0\.08cm 0\.08cm 0cm"/i.test(cells[0]), `header original shorthand stored: ${cells[0]}`);
  });

  test("W47: export restores original cell padding so W44b extra does not leak to LibreOffice (d20)", () => {
    const html = '<table data-vno-border-px="0.667"><tr>'
      + '<td style="padding: 0.049cm; border: 0.5pt solid #000">A</td>'
      + "</tr></table>";
    const painted = new WriterAdapter(null)._applyPaintOnlyTableBorders(html);
    check(/data-vno-lo-padding="padding: 0\.049cm"/i.test(painted), `original padding stored: ${painted}`);
    check(/padding:\s*[\d.]+px\s+0\.049cm\s+[\d.]+px\s+0\.049cm/i.test(painted), `canvas padding must add borderPx on top+bottom: ${painted}`);
    const exported = new WriterAdapter(null)._restoreLibreOfficeTableWidthsForExport(painted);
    check(/padding:\s*0\.049cm/i.test(exported), `export must restore original padding: ${exported}`);
    check(!/data-vno-lo-padding/i.test(exported), `marker must be removed on export: ${exported}`);
    check(!/box-shadow/i.test(exported), `box-shadow must not leak: ${exported}`);
    check(/border:\s*0\.5pt solid #000/i.test(exported), `original border restored: ${exported}`);
  });

  test("W47: cell without original padding exports without a padding declaration", () => {
    const html = '<table data-vno-border-px="0.667"><tr><td style="border-bottom: 1px solid #000">Z</td></tr></table>';
    const painted = new WriterAdapter(null)._applyPaintOnlyTableBorders(html);
    check(/data-vno-lo-padding=""/i.test(painted), `empty original padding stored: ${painted}`);
    const exported = new WriterAdapter(null)._restoreTableBordersForExport(painted);
    check(!/padding\s*:/i.test(exported), `export must not invent padding: ${exported}`);
    check(!/data-vno-lo-padding/i.test(exported), `marker must be removed: ${exported}`);
  });

  return results;
}
