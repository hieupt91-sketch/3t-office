import fs from 'fs';
import path from 'path';

// Load all help entries with their ribbon info
const helpDir = 'platform/help';
const entryFiles = fs.readdirSync(helpDir).filter(f => f.startsWith('entries-') && f.endsWith('.js'));

let allHelpEntries = [];
for (const file of entryFiles) {
  const content = fs.readFileSync(path.join(helpDir, file), 'utf8');
  
  // Extract each help entry object
  // This is a bit hacky but works for our format
  const entryRegex = /\{\s*id:\s*"([^"]+)"[\s\S]*?steps:\s*\[[\s\S]*?\]\s*\}/g;
  let match;
  while ((match = entryRegex.exec(content)) !== null) {
    const entryText = match[0];
    
    // Extract fields
    const idMatch = entryText.match(/id:\s*"([^"]+)"/);
    const appMatch = entryText.match(/app:\s*"([^"]+)"/);
    const commandIdsMatch = entryText.match(/commandIds:\s*\[([^\]]*)\]/);
    const titleMatch = entryText.match(/title:\s*"([^"]+)"/);
    const ribbonMatch = entryText.match(/ribbon:\s*\{[\s\S]*?\}/);
    
    if (idMatch) {
      let ribbon = null;
      if (ribbonMatch) {
        const ribbonText = ribbonMatch[0];
        const tabMatch = ribbonText.match(/tab:\s*"([^"]+)"/);
        const tabIdMatch = ribbonText.match(/tabId:\s*"([^"]+)"/);
        const groupMatch = ribbonText.match(/group:\s*"([^"]+)"/);
        if (tabMatch || groupMatch) {
          ribbon = {
            tab: tabMatch ? tabMatch[1] : null,
            tabId: tabIdMatch ? tabIdMatch[1] : null,
            group: groupMatch ? groupMatch[1] : null
          };
        }
      }
      
      let commandIds = [];
      if (commandIdsMatch) {
        const idsText = commandIdsMatch[1];
        const ids = idsText.match(/"([^"]+)"/g);
        if (ids) commandIds = ids.map(id => id.replace(/"/g, ''));
      }
      
      allHelpEntries.push({
        id: idMatch[1],
        app: appMatch ? appMatch[1] : 'unknown',
        commandIds,
        title: titleMatch ? titleMatch[1] : '',
        ribbon
      });
    }
  }
}

console.log('Total help entries:', allHelpEntries.length);

// Load actual ribbon locations
const locations = JSON.parse(fs.readFileSync('scripts/command-locations.json', 'utf8'));

// Compare ribbon locations for each help entry
console.log('\n=== Ribbon Location Comparison ===\n');
let mismatches = 0;
let matches = 0;
let noRibbonInHelp = 0;
let noLocationData = 0;

for (const entry of allHelpEntries) {
  if (!entry.ribbon || !entry.ribbon.tab) {
    noRibbonInHelp++;
    continue;
  }
  
  // Check first commandId that has location data
  let hasLocationData = false;
  for (const cmdId of entry.commandIds) {
    if (locations[cmdId]) {
      hasLocationData = true;
      const actual = locations[cmdId];
      const helpTab = entry.ribbon.tab;
      const helpGroup = entry.ribbon.group;
      const actualTab = actual.tab;
      const actualGroup = actual.group;
      
      const tabMatch = helpTab === actualTab;
      const groupMatch = helpGroup === actualGroup;
      
      if (!tabMatch || !groupMatch) {
        mismatches++;
        console.log('MISMATCH:', entry.id);
        console.log('  Command:', cmdId);
        console.log('  Help says: Tab="' + helpTab + '", Group="' + helpGroup + '"');
        console.log('  Actual:    Tab="' + actualTab + '", Group="' + actualGroup + '"');
        console.log('  Entry title:', entry.title);
        console.log('');
      } else {
        matches++;
      }
      break; // Check only first command with location
    }
  }
  
  if (!hasLocationData && entry.commandIds.length > 0) {
    noLocationData++;
  }
}

console.log('Summary:');
console.log('  Matches:', matches);
console.log('  Mismatches:', mismatches);
console.log('  No ribbon in help entry:', noRibbonInHelp);
console.log('  Has commandIds but no location data:', noLocationData);

// Now find commands that are on ribbon but help entry has wrong/no location
console.log('\n=== Commands needing accurate ribbon location ===');
const ribbonCmds = JSON.parse(fs.readFileSync('scripts/ribbon-commands.json', 'utf8'));

for (const cmdId of ribbonCmds) {
  if (!locations[cmdId]) continue; // Skip if we couldn't extract location
  
  const actual = locations[cmdId];
  
  // Find help entry covering this command
  let helpEntry = null;
  for (const entry of allHelpEntries) {
    if (entry.commandIds.includes(cmdId)) {
      helpEntry = entry;
      break;
    }
  }
  
  if (!helpEntry) {
    console.log('NO HELP ENTRY:', cmdId, '->', actual.tab, '>', actual.group);
    continue;
  }
  
  if (!helpEntry.ribbon || !helpEntry.ribbon.tab) {
    console.log('HELP ENTRY MISSING RIBBON INFO:', cmdId, '->', actual.tab, '>', actual.group, '(help entry:', helpEntry.id + ')');
    continue;
  }
  
  const helpTab = helpEntry.ribbon.tab;
  const helpGroup = helpEntry.ribbon.group;
  const actualTab = actual.tab;
  const actualGroup = actual.group;
  
  if (helpTab !== actualTab || helpGroup !== actualGroup) {
    console.log('LOCATION MISMATCH:', cmdId);
    console.log('  Help entry:', helpEntry.id, '(' + helpEntry.title + ')');
    console.log('  Help says:', helpTab, '>', helpGroup);
    console.log('  Actual:   ', actualTab, '>', actualGroup);
    console.log('');
  }
}