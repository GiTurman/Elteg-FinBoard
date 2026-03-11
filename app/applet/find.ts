import fs from 'fs';
import { glob } from 'glob';

const files = glob.sync('components/**/*.tsx');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // If the file has <input type="number", we need to replace it.
  if (content.includes('type="number"')) {
    // We need to add import NumpadInput if it's not there
    if (!content.includes('import NumpadInput')) {
      // Find the last import
      const lastImportIndex = content.lastIndexOf('import ');
      if (lastImportIndex !== -1) {
        const endOfLine = content.indexOf('\n', lastImportIndex);
        content = content.slice(0, endOfLine + 1) + 'import { NumpadInput } from \'./NumpadInput\';\n' + content.slice(endOfLine + 1);
      } else {
        content = 'import { NumpadInput } from \'./NumpadInput\';\n' + content;
      }
    }

    // Now we need to replace <input type="number" ... /> with <NumpadInput ... />
    // This is tricky because of the onChange handler.
    // Let's just do it manually for the files that have it.
    console.log(file);
  }
});
