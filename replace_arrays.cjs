const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'Builder.tsx');
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(/border-t border-white\/10/g, 'border-t border-black/5');
content = content.replace(/className="flex-1 bg-white\/5 border border-white\/10 rounded-xl p-2 text-sm text-white focus:border-white\/30 focus:outline-none transition-colors"/g, 'className="flex-1 glass-input"');
content = content.replace(/className="flex-1 bg-white\/5 border border-white\/10 rounded-xl p-2 text-sm text-white placeholder-zinc-400 focus:border-white\/30 focus:outline-none transition-colors"/g, 'className="flex-1 glass-input"');
content = content.replace(/bg-white\/40/g, 'bg-black/5');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Replaced array editor styles.');
