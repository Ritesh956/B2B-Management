const fs = require('fs');
const glob = require('glob');

const files = glob.sync('client/src/{components,pages}/**/*.tsx');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // Backgrounds
  content = content.replace(/\bbg-slate-950\/(\d+)\b/g, 'bg-white dark:bg-slate-950/$1');
  content = content.replace(/\bbg-slate-950\b(?![\/\-])/g, 'bg-white dark:bg-slate-950');
  content = content.replace(/\bbg-slate-900\b(?![\/\-])/g, 'bg-slate-50 dark:bg-slate-900');
  content = content.replace(/\bbg-white\/5\b/g, 'bg-slate-50 dark:bg-white/5');
  content = content.replace(/\bbg-white\/10\b/g, 'bg-slate-100 dark:bg-white/10');
  
  // Borders
  content = content.replace(/\bborder-white\/10\b/g, 'border-slate-200 dark:border-white/10');
  content = content.replace(/\bborder-white\/5\b/g, 'border-slate-200 dark:border-white/5');
  content = content.replace(/\bdivide-white\/10\b/g, 'divide-slate-200 dark:divide-white/10');
  
  // Text
  content = content.replace(/\btext-slate-300\b/g, 'text-slate-600 dark:text-slate-300');
  content = content.replace(/\btext-slate-400\b/g, 'text-slate-500 dark:text-slate-400');
  content = content.replace(/\btext-white\b/g, (match, offset, str) => {
    // Avoid replacing text-white if it's inside a button or badge with a colorful background like bg-blue-500
    // It's a bit complex with regex, but let's assume `text-white` on primary text needs `text-slate-900 dark:text-white`
    // We can do a simpler replace, and manually check buttons.
    return 'text-slate-900 dark:text-white';
  });

  // Rings
  content = content.replace(/\bring-slate-950\b/g, 'ring-white dark:ring-slate-950');
  content = content.replace(/\bring-white\/10\b/g, 'ring-slate-200 dark:ring-white/10');

  // Fix up buttons that got messed up, like 'bg-blue-500 text-slate-900 dark:text-white' -> 'bg-blue-500 text-white'
  // Actually, it's easier to just do it via regex carefully
  content = content.replace(/bg-blue-500(.*?)text-slate-900 dark:text-white/g, 'bg-blue-500$1text-white');
  content = content.replace(/bg-violet-500(.*?)text-slate-900 dark:text-white/g, 'bg-violet-500$1text-white');
  content = content.replace(/bg-indigo-500(.*?)text-slate-900 dark:text-white/g, 'bg-indigo-500$1text-white');
  content = content.replace(/bg-cyan-500(.*?)text-slate-900 dark:text-white/g, 'bg-cyan-500$1text-white');
  content = content.replace(/bg-emerald-500(.*?)text-slate-900 dark:text-white/g, 'bg-emerald-500$1text-white');
  content = content.replace(/bg-rose-500(.*?)text-slate-900 dark:text-white/g, 'bg-rose-500$1text-white');
  content = content.replace(/bg-amber-500(.*?)text-slate-900 dark:text-white/g, 'bg-amber-500$1text-white');
  content = content.replace(/bg-slate-500(.*?)text-slate-900 dark:text-white/g, 'bg-slate-500$1text-white');
  content = content.replace(/bg-red-500(.*?)text-slate-900 dark:text-white/g, 'bg-red-500$1text-white');

  if (originalContent !== content) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
  }
});
