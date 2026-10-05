import fs from 'fs';

const helpCmds = JSON.parse(fs.readFileSync('scripts/help-command-ids.json', 'utf8'));
const ribbonCmds = JSON.parse(fs.readFileSync('scripts/ribbon-commands.json', 'utf8'));

// Check a few specific ribbon commands
const testCmds = [
  'writer.font.family',
  'writer.font.size',
  'writer.text.bold',
  'writer.para.alignLeft',
  'writer.list.bullet',
  'writer.table.insert',
  'writer.image.insert',
  'writer.insert.equation',
  'writer.page.break',
  'writer.header.insert',
  'writer.reference.tocInsert',
  'writer.trackChanges.toggle',
  'writer.review.wordCount',
  'writer.view.ruler',
  'writer.style.gallery',
  'writer.design.themeGallery',
  'writer.page.watermark',
  'sheet.font.family',
  'sheet.cell.bold',
  'sheet.format.cellsDialog',
  'sheet.data.pivotTable',
  'sheet.formula.insertFunction',
  'sheet.row.insert',
  'sheet.view.freezePanes',
  'slides.font.family',
  'slides.text.bold',
  'slides.slide.new',
  'slides.layout.apply',
  'slides.shape.insert',
  'slides.animation.apply',
  'slides.transition.apply',
  'slides.show.startFromBegin',
  'slides.review.spellCheck',
  'slides.notes.toggle',
  'common.edit.paste',
  'common.edit.cut',
  'common.edit.copy',
  'common.edit.find',
  'common.edit.replace',
  'common.file.print',
  'common.file.new',
  'common.file.open',
  'common.file.save'
];

for (const cmd of testCmds) {
  const inHelp = helpCmds.includes(cmd);
  const inRibbon = ribbonCmds.includes(cmd);
  console.log(cmd + ': help=' + inHelp + ', ribbon=' + inRibbon);
}

// Now find which ribbon commands are NOT in help
const missing = ribbonCmds.filter(cmd => !helpCmds.includes(cmd));
console.log('\nMissing from help:', missing.length);
if (missing.length > 0) {
  console.log('First 50 missing:', missing.slice(0, 50));
}