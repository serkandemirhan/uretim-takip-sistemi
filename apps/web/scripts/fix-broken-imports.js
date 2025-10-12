#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

const dashboardDir = path.join(__dirname, '../app/(dashboard)');
const filesToFix = glob.sync('**/*.{ts,tsx}', {
  cwd: dashboardDir,
  absolute: true,
});

let fixedFiles = 0;

console.log('🔧 Fixing broken imports...\n');

filesToFix.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8');
  let originalContent = content;

  // Pattern 1: import in middle of code
  // Find lines like: "something import { ... } from '@/lib/utils/error-handler' morecode"
  const badPattern1 = /^(.+)(import \{ handleError, handleApiError, debugLog \} from '@\/lib\/utils\/error-handler')(.+)$/gm;

  if (badPattern1.test(content)) {
    // Extract the import
    const importStatement = "import { handleError, handleApiError, debugLog } from '@/lib/utils/error-handler'";

    // Remove the misplaced import from middle of lines
    content = content.replace(/import \{ handleError, handleApiError, debugLog \} from '@\/lib\/utils\/error-handler'/g, '');

    // Check if import already exists at top
    const hasImport = /^import.*error-handler/m.test(content);

    if (!hasImport) {
      // Find last import and add after it
      const imports = content.match(/^import[^;]+;$/gm);
      if (imports && imports.length > 0) {
        const lastImport = imports[imports.length - 1];
        content = content.replace(lastImport, lastImport + '\n' + importStatement);
      }
    }

    // Write back
    fs.writeFileSync(filePath, content, 'utf8');
    const relativePath = path.relative(process.cwd(), filePath);
    console.log(`✅ Fixed: ${relativePath}`);
    fixedFiles++;
  }
});

console.log(`\n📊 Summary: Fixed ${fixedFiles} files\n`);
