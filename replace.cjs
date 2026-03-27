const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/components/Builder.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replace labels
content = content.replace(/block text-xs font-bold text-zinc-300 uppercase mb-2/g, 'block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-2');
content = content.replace(/block text-xs font-bold text-zinc-300 uppercase mb-3/g, 'block text-[11px] font-semibold text-zinc-500 uppercase tracking-wider mb-3');

// Replace inputs
content = content.replace(/w-full bg-white\/5 border border-white\/10 rounded-xl p-2 text-sm text-white placeholder-zinc-400 focus:border-white\/30 focus:outline-none transition-colors/g, 'glass-input');
content = content.replace(/w-full bg-white\/5 border border-white\/10 rounded-xl p-2 text-sm text-white focus:border-white\/30 focus:outline-none transition-colors/g, 'glass-input');
content = content.replace(/w-full bg-white\/5 border border-white\/10 rounded-xl p-2 text-sm text-white focus:border-white\/30 focus:outline-none transition-colors appearance-none/g, 'glass-input appearance-none');
content = content.replace(/w-full bg-white\/5 border border-white\/10 rounded-lg p-2 text-sm text-white placeholder-zinc-400 focus:border-white\/30 focus:outline-none transition-colors/g, 'glass-input');
content = content.replace(/w-full bg-white\/5 border border-white\/10 rounded-lg p-2 text-sm text-white font-medium placeholder-zinc-400 focus:border-white\/30 focus:outline-none transition-colors/g, 'glass-input font-medium');

// Replace select alignment buttons
content = content.replace(/flex bg-white\/5 rounded-xl p-1 border border-white\/5/g, 'flex bg-black/5 rounded-xl p-1 border border-black/5');
content = content.replace(/text-zinc-300 hover:text-zinc-200 hover:bg-white\/5/g, 'text-zinc-500 hover:text-zinc-900 hover:bg-black/5');
content = content.replace(/bg-white\/10 shadow-sm text-white/g, 'bg-white shadow-sm border border-black/5 text-zinc-900');

// Replace colors input
content = content.replace(/flex-1 bg-white\/5 border border-white\/10 rounded-xl p-2 text-sm font-mono uppercase text-white focus:border-white\/30 focus:outline-none transition-colors/g, 'flex-1 glass-input font-mono uppercase');

// Replace array editors
content = content.replace(/flex gap-2 items-start bg-white\/5 p-3 rounded-xl border border-white\/10/g, 'flex gap-2 items-start bg-white/40 p-3 rounded-2xl border border-black/5 shadow-sm');
content = content.replace(/w-full py-2 border border-dashed border-white\/20 text-zinc-300 rounded-xl text-sm font-medium hover:border-white\/40 hover:text-white hover:bg-white\/5 transition-all flex items-center justify-center gap-2 mt-2/g, 'w-full py-2 border border-dashed border-black/10 text-zinc-500 rounded-xl text-sm font-medium hover:border-black/20 hover:text-zinc-900 hover:bg-black/5 transition-all flex items-center justify-center gap-2 mt-2');

// Replace LayerTree
content = content.replace(/hover:bg-white\/5 text-zinc-300 hover:text-zinc-200 border border-transparent/g, 'hover:bg-black/5 text-zinc-600 hover:text-zinc-900 border border-transparent');
content = content.replace(/bg-white\/10 text-white font-medium border border-white\/20/g, 'bg-white text-zinc-900 font-medium border border-black/5 shadow-sm');
content = content.replace(/text-zinc-300/g, 'text-zinc-500');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Replacements done.');
