import fs from 'fs';
const file = 'components/RevenueAnalysis.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  /<input type="number" placeholder="%" value=\{tranche\.percentage \|\| ''\} onChange=\{e => handleTrancheChange\(index, 'percentage', parseFloat\(e\.target\.value\) \|\| 0\)\} className="w-20 px-3 py-2 text-sm bg-gray-700 border border-gray-600 rounded" max="100" min="0"\/>/g,
  '<NumpadInput placeholder="%" value={tranche.percentage || \'\'} onChange={val => handleTrancheChange(index, \'percentage\', val)} className="w-20 px-3 py-2 text-sm bg-gray-700 border border-gray-600 rounded" max={100} min={0}/>'
);

fs.writeFileSync(file, content, 'utf8');
console.log('Done');
