import fs from 'fs';
import path from 'path';

// Read all help entry files
const helpDir = 'platform/help';
const entryFiles = fs.readdirSync(helpDir).filter(f => f.startsWith('entries-') && f.endsWith('.js'));

let allEntries = [];
for (const file of entryFiles) {
  const content = fs.readFileSync(path.join(helpDir, file), 'utf8');
  // Simple extraction of commandIds
  const matches = content.match(/commandIds:\s*\[([^\]]+)\]/g);
  if (matches) {
    for (const m of matches) {
      const ids = m.match(/"([^"]+)"/g);
      if (ids) {
        allEntries.push(...ids.map(id => id.replace(/"/g, '')));
      }
    }
  }
}

console.log('Total commandIds in help entries:', allEntries.length);
console.log('Unique commandIds:', [...new Set(allEntries)].length);
console.log('Sample:', [...new Set(allEntries)].slice(0, 30));

// Write to file
fs.writeFileSync('scripts/help-command-ids.json', JSON.stringify([...new Set(allEntries)], null, 2));