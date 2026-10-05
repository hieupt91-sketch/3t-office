import fs from 'fs';
import path from 'path';

// Simple but thorough extraction - just find all commandId patterns in the files
function extractAllCommandIds(content) {
  const commands = [];
  
  // Find all commandId: "xxx" patterns
  const regex = /commandId:\s*"([^"]+)"/g;
  let match;
  while ((match = regex.exec(content)) !== null) {
    commands.push(match[1]);
  }
  
  // Find all launcherCommandId: "xxx" patterns
  const launcherRegex = /launcherCommandId:\s*"([^"]+)"/g;
  while ((match = launcherRegex.exec(content)) !== null) {
    commands.push(match[1]);
  }
  
  return [...new Set(commands)];
}

function extractCommandLocations(content, appName) {
  const locations = {};
  
  // Strategy: Find tab definitions, then within each tab find groups, then within each group find commandIds
  // We'll do this by finding the structure using regex with careful boundary matching
  
  // First, split content into tabs
  // Tabs are objects with id, label, and groups
  const tabStartIndices = [];
  let pos = 0;
  while (true) {
    const idx = content.indexOf('id:', pos);
    if (idx === -1) break;
    // Check if this looks like a tab (followed by label and then groups)
    const snippet = content.substring(idx, idx + 200);
    if (snippet.includes('label:') && snippet.includes('groups:')) {
      tabStartIndices.push(idx);
    }
    pos = idx + 1;
  }
  
  for (let i = 0; i < tabStartIndices.length; i++) {
    const start = tabStartIndices[i];
    const end = tabStartIndices[i + 1] || content.length;
    const tabSection = content.substring(start, end);
    
    // Extract tab id and label
    const tabIdMatch = tabSection.match(/id:\s*"([^"]+)"/);
    const tabLabelMatch = tabSection.match(/label:\s*"([^"]+)"/);
    if (!tabIdMatch || !tabLabelMatch) continue;
    
    const tabId = tabIdMatch[1];
    const tabLabel = tabLabelMatch[1];
    
    // Find groups in this tab
    const groupRegex = /\{\s*id:\s*"([^"]+)",\s*label:\s*"([^"]+)"[\s\S]*?items:\s*\[([\s\S]*?)\n\s*\]\s*\}/g;
    let groupMatch;
    while ((groupMatch = groupRegex.exec(tabSection)) !== null) {
      const groupId = groupMatch[1];
      const groupLabel = groupMatch[2];
      const itemsContent = groupMatch[3];
      
      // Find all commandIds in this group's items (including nested)
      const cmdRegex = /commandId:\s*"([^"]+)"/g;
      let cmdMatch;
      while ((cmdMatch = cmdRegex.exec(itemsContent)) !== null) {
        const cmdId = cmdMatch[1];
        if (!locations[cmdId]) {
          locations[cmdId] = { tab: tabLabel, tabId, group: groupLabel, groupId, app: appName };
        }
      }
      
      // Check for launcherCommandId in group
      const launcherMatch = groupMatch[0].match(/launcherCommandId:\s*"([^"]+)"/);
      if (launcherMatch) {
        const cmdId = launcherMatch[1];
        if (!locations[cmdId]) {
          locations[cmdId] = { tab: tabLabel, tabId, group: groupLabel, groupId, app: appName };
        }
      }
    }
  }
  
  return locations;
}

const writerRibbon = 'apps/writer/writer-ribbon.js';
const sheetRibbon = 'apps/sheet/sheet-ribbon.js';
const slidesRibbon = 'apps/slides/slides-ribbon.js';

const writerContent = fs.readFileSync(writerRibbon, 'utf8');
const sheetContent = fs.readFileSync(sheetRibbon, 'utf8');
const slidesContent = fs.readFileSync(slidesRibbon, 'utf8');

const writerCmds = extractAllCommandIds(writerContent);
const sheetCmds = extractAllCommandIds(sheetContent);
const slidesCmds = extractAllCommandIds(slidesContent);

console.log('Writer commands:', writerCmds.length);
console.log('Sheet commands:', sheetCmds.length);
console.log('Slides commands:', slidesCmds.length);

const allRibbonCmds = [...new Set([...writerCmds, ...sheetCmds, ...slidesCmds])];
console.log('Total unique ribbon commands:', allRibbonCmds.length);

const writerLocations = extractCommandLocations(writerContent, 'writer');
const sheetLocations = extractCommandLocations(sheetContent, 'sheet');
const slidesLocations = extractCommandLocations(slidesContent, 'slides');

const allLocations = { ...writerLocations, ...sheetLocations, ...slidesLocations };
console.log('Total commands with locations:', Object.keys(allLocations).length);

// Load help command IDs
const helpCmds = JSON.parse(fs.readFileSync('scripts/help-command-ids.json', 'utf8'));
console.log('\nHelp command IDs:', helpCmds.length);

// Find missing help entries
const missing = allRibbonCmds.filter(cmd => !helpCmds.includes(cmd));
console.log('\nMissing help entries:', missing.length);

// Categorize
const commonCmds = missing.filter(cmd => cmd.startsWith('common.'));
const writerOnly = missing.filter(cmd => cmd.startsWith('writer.'));
const sheetOnly = missing.filter(cmd => cmd.startsWith('sheet.'));
const slidesOnly = missing.filter(cmd => cmd.startsWith('slides.'));
const aiCmds = missing.filter(cmd => cmd.startsWith('ai.'));

console.log('\nCommon missing:', commonCmds.length);
console.log('Writer only missing:', writerOnly.length);
console.log('Sheet only missing:', sheetOnly.length);
console.log('Slides only missing:', slidesOnly.length);
console.log('AI missing:', aiCmds.length);

console.log('\n--- All missing with locations ---');
for (const cmd of missing.slice(0, 50)) {
  const loc = allLocations[cmd];
  if (loc) {
    console.log(`  ${cmd}: ${loc.app} > ${loc.tab} > ${loc.group}`);
  } else {
    console.log(`  ${cmd}: NO LOCATION FOUND`);
  }
}

if (missing.length > 50) {
  console.log(`\n... and ${missing.length - 50} more`);
}

// Save results
fs.writeFileSync('scripts/ribbon-commands.json', JSON.stringify(allRibbonCmds, null, 2));
fs.writeFileSync('scripts/command-locations.json', JSON.stringify(allLocations, null, 2));
fs.writeFileSync('scripts/missing-help.json', JSON.stringify(missing, null, 2));

const missingWithLocations = missing.map(cmd => ({
  commandId: cmd,
  location: allLocations[cmd] || null
}));

fs.writeFileSync('scripts/missing-help-with-locations.json', JSON.stringify(missingWithLocations, null, 2));