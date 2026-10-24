import fs from 'fs';

for (const a of ['writer', 'sheet', 'slides']) {
  const d = JSON.parse(fs.readFileSync('scripts/audit-ui5/audit_result_' + a + '.json', 'utf8'));
  console.log('=== ' + a.toUpperCase() + ' INVALID INPUTS ===');
  const grouped = {};
  for (const inv of d.invalidInputs) {
    if (!grouped[inv.dialogLabel]) grouped[inv.dialogLabel] = [];
    grouped[inv.dialogLabel].push(inv);
  }
  for (const [lbl, cases] of Object.entries(grouped)) {
    const passed = cases.filter(c => c.pass).length;
    console.log(`  ${lbl}: ${passed}/${cases.length} passed`);
    for (const c of cases) {
      if (!c.pass) {
        console.log(`    [FAIL] ${c.testCase}: hasErr=${c.checkResult?.hasErrorMessage} okDis=${c.checkResult?.isOkDisabled} errText="${(c.checkResult?.errorText || '')}"`);
      }
    }
  }
}
