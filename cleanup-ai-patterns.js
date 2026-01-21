const fs = require('fs');
const path = require('path');

// Patterns à nettoyer
const patterns = [
  // Emojis excessifs dans les logs
  { regex: /console\.log\(['"]🔍.*?\)/g, replace: '' },
  { regex: /console\.log\(['"]✅.*?\)/g, replace: '' },
  { regex: /console\.log\(['"]❌.*?\)/g, replace: '' },
  { regex: /console\.log\(['"]⚠️.*?\)/g, replace: '' },
  { regex: /console\.log\(['"]📱.*?\)/g, replace: '' },
  { regex: /console\.log\(['"]🛑.*?\)/g, replace: '' },
  
  // Commentaires trop verbeux
  { regex: /\/\/ ={3,}/g, replace: '' },
  { regex: /\/\*\*\n \* .{100,}\n \*\//g, replace: '' },
  
  // Logs de debug excessifs
  { regex: /console\.log\('\[DEBUG\].*?\);?\n/g, replace: '' },
  { regex: /console\.log\('\[PUSH\].*?\);?\n/g, replace: '' },
  { regex: /console\.log\('\[AUTH-CONTEXT\].*?\);?\n/g, replace: '' },
];

function cleanFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    patterns.forEach(({ regex, replace }) => {
      const newContent = content.replace(regex, replace);
      if (newContent !== content) {
        content = newContent;
        modified = true;
      }
    });
    
    if (modified) {
      // Nettoyer les lignes vides multiples
      content = content.replace(/\n{3,}/g, '\n\n');
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Cleaned: ${filePath}`);
    }
  } catch (error) {
    console.error(`Error cleaning ${filePath}:`, error.message);
  }
}

function walkDir(dir, extensions = ['.ts', '.tsx', '.js', '.jsx']) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      if (!['node_modules', '.git', 'dist', 'build'].includes(file)) {
        walkDir(filePath, extensions);
      }
    } else if (extensions.some(ext => file.endsWith(ext))) {
      cleanFile(filePath);
    }
  });
}

console.log('Starting cleanup...');
walkDir('./lib');
walkDir('./app');
walkDir('./components');
console.log('Cleanup complete!');
