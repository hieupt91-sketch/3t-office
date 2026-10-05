import fs from 'fs';
import path from 'path';

// Load data
const ribbonCmds = JSON.parse(fs.readFileSync('scripts/ribbon-commands.json', 'utf8'));
const locations = JSON.parse(fs.readFileSync('scripts/command-locations.json', 'utf8'));
const helpCmds = JSON.parse(fs.readFileSync('scripts/help-command-ids.json', 'utf8'));

// Load all help entries
const helpDir = 'platform/help';
const entryFiles = fs.readdirSync(helpDir).filter(f => f.startsWith('entries-') && f.endsWith('.js'));

let allHelpEntries = [];
for (const file of entryFiles) {
  const content = fs.readFileSync(path.join(helpDir, file), 'utf8');
  const entryRegex = /\{\s*id:\s*"([^"]+)"[\s\S]*?steps:\s*\[[\s\S]*?\]\s*\}/g;
  let match;
  while ((match = entryRegex.exec(content)) !== null) {
    const entryText = match[0];
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

// Build mapping table
console.log('=== RIBBON COMMAND -> HELP MAPPING TABLE ===\n');
console.log('| App | Command ID | Ribbon Tab | Ribbon Group | Has Help | Help Entry ID | Help Title | Location Match |');
console.log('|-----|------------|------------|--------------|----------|---------------|------------|----------------|');

let hasHelpCount = 0;
let noHelpCount = 0;
let locationMismatchCount = 0;
let locationMatchCount = 0;

for (const cmdId of ribbonCmds.sort()) {
  const loc = locations[cmdId];
  if (!loc) continue;
  
  const app = loc.app;
  const tab = loc.tab || 'N/A';
  const group = loc.group || 'N/A';
  
  // Find help entry
  let helpEntry = null;
  for (const entry of allHelpEntries) {
    if (entry.commandIds.includes(cmdId)) {
      helpEntry = entry;
      break;
    }
  }
  
  const hasHelp = helpEntry ? 'Yes' : 'No';
  const helpEntryId = helpEntry ? helpEntry.id : '';
  const helpTitle = helpEntry ? helpEntry.title : '';
  
  let locationMatch = 'N/A';
  if (helpEntry && helpEntry.ribbon && helpEntry.ribbon.tab) {
    const helpTab = helpEntry.ribbon.tab;
    const helpGroup = helpEntry.ribbon.group;
    if (helpTab === tab && helpGroup === group) {
      locationMatch = 'Yes';
      locationMatchCount++;
    } else {
      locationMatch = 'No';
      locationMismatchCount++;
    }
  }
  
  if (hasHelp === 'Yes') hasHelpCount++;
  else noHelpCount++;
  
  console.log(`| ${app} | ${cmdId} | ${tab} | ${group} | ${hasHelp} | ${helpEntryId} | ${helpTitle} | ${locationMatch} |`);
}

console.log('\n=== SUMMARY ===');
console.log(`Total ribbon commands checked: ${hasHelpCount + noHelpCount}`);
console.log(`Commands with help: ${hasHelpCount}`);
console.log(`Commands without help: ${noHelpCount}`);
console.log(`Location matches: ${locationMatchCount}`);
console.log(`Location mismatches: ${locationMismatchCount}`);

// Save mapping table to file
let csvContent = 'App,Command ID,Ribbon Tab,Ribbon Group,Has Help,Help Entry ID,Help Title,Location Match\n';
for (const cmdId of ribbonCmds.sort()) {
  const loc = locations[cmdId];
  if (!loc) continue;
  
  const app = loc.app;
  const tab = loc.tab || 'N/A';
  const group = loc.group || 'N/A';
  
  let helpEntry = null;
  for (const entry of allHelpEntries) {
    if (entry.commandIds.includes(cmdId)) {
      helpEntry = entry;
      break;
    }
  }
  
  const hasHelp = helpEntry ? 'Yes' : 'No';
  const helpEntryId = helpEntry ? helpEntry.id : '';
  const helpTitle = helpEntry ? helpEntry.title.replace(/,/g, ';') : '';
  
  let locationMatch = 'N/A';
  if (helpEntry && helpEntry.ribbon && helpEntry.ribbon.tab) {
    const helpTab = helpEntry.ribbon.tab;
    const helpGroup = helpEntry.ribbon.group;
    locationMatch = (helpTab === tab && helpGroup === group) ? 'Yes' : 'No';
  }
  
  csvContent += `${app},${cmdId},${tab},${group},${hasHelp},${helpEntryId},${helpTitle},${locationMatch}\n`;
}

fs.writeFileSync('scripts/ribbon-help-mapping.csv', csvContent);
console.log('\nMapping table saved to scripts/ribbon-help-mapping.csv');