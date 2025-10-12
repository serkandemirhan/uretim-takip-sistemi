#!/usr/bin/env node

/**
 * Script to remove console.log/error/warn statements from dashboard pages
 * and replace them with proper error handling
 */

const fs = require('fs');
const path = require('path');
const { glob } = require('glob');

const dashboardDir = path.join(__dirname, '../app/(dashboard)');

// Patterns to replace
const replacements = [
  {
    // console.error('Message', error) -> handleApiError(error, 'Context')
    pattern: /console\.error\(['"]([^'"]+)['"],\s*(\w+)\)/g,
    replacement: (match, message, errorVar) => {
      // Extract context from message
      const context = message.replace(/ error:?/i, '').replace(/load error:?/i, 'Load').trim();
      return `handleApiError(${errorVar}, '${context}')`;
    }
  },
  {
    // console.error(e) -> handleError(e)
    pattern: /console\.error\((\w+)\)/g,
    replacement: 'handleError($1)'
  },
  {
    // console.log('Debug:', data) -> debugLog('Debug', data)
    pattern: /console\.log\(['"]([^'"]+)['"],\s*(.+)\)/g,
    replacement: (match, message, data) => {
      return `debugLog('${message}', ${data})`;
    }
  },
  {
    // console.warn -> debugLog
    pattern: /console\.warn\(['"]([^'"]+)['"],\s*(.+)\)/g,
    replacement: (match, message, data) => {
      return `debugLog('Warning: ${message}', ${data})`;
    }
  },
  {
    // console.warn(e) -> handleError(e)
    pattern: /console\.warn\((\w+)\)/g,
    replacement: 'handleError($1)'
  }
];

// Files to process
const filesToProcess = glob.sync('**/*.{ts,tsx}', {
  cwd: dashboardDir,
  absolute: true,
});

let totalReplacements = 0;
const modifiedFiles = [];

console.log('🧹 Cleaning console statements...\n');

filesToProcess.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8');
  let fileModified = false;
  let fileReplacements = 0;

  // Check if file has console statements
  if (!/console\.(log|error|warn)/.test(content)) {
    return;
  }

  // Check if error-handler import already exists
  const hasErrorImport = /import.*handleError.*from.*error-handler/.test(content);

  // Apply replacements
  replacements.forEach(({ pattern, replacement }) => {
    const matches = content.match(pattern);
    if (matches) {
      fileReplacements += matches.length;
      content = content.replace(pattern, replacement);
      fileModified = true;
    }
  });

  // Add error-handler import if needed
  if (fileModified && !hasErrorImport) {
    // Find the last import statement
    const importMatch = content.match(/import[^;]+;/g);
    if (importMatch) {
      const lastImport = importMatch[importMatch.length - 1];
      const importToAdd = "\nimport { handleError, handleApiError, debugLog } from '@/lib/utils/error-handler'";
      content = content.replace(lastImport, lastImport + importToAdd);
    }
  }

  if (fileModified) {
    fs.writeFileSync(filePath, content, 'utf8');
    const relativePath = path.relative(process.cwd(), filePath);
    modifiedFiles.push(relativePath);
    totalReplacements += fileReplacements;
    console.log(`✅ ${relativePath} (${fileReplacements} replacements)`);
  }
});

console.log('\n📊 Summary:');
console.log(`  Files modified: ${modifiedFiles.length}`);
console.log(`  Total replacements: ${totalReplacements}`);
console.log('\n✨ Done! Console statements replaced with proper error handling.\n');

// Write summary to file
const summaryPath = path.join(__dirname, '../CONSOLE_CLEANUP_SUMMARY.md');
const summary = `# Console Cleanup Summary

**Date:** ${new Date().toISOString()}

## Statistics
- **Files modified:** ${modifiedFiles.length}
- **Total replacements:** ${totalReplacements}

## Modified Files
${modifiedFiles.map(f => `- ${f}`).join('\n')}

## Changes Made
- \`console.error('Message', error)\` → \`handleApiError(error, 'Context')\`
- \`console.error(e)\` → \`handleError(e)\`
- \`console.log('Debug:', data)\` → \`debugLog('Debug', data)\`
- \`console.warn(...)\` → \`debugLog('Warning: ...', ...)\`

## New Import Added
\`\`\`typescript
import { handleError, handleApiError, debugLog } from '@/lib/utils/error-handler'
\`\`\`

All error handling now uses centralized utility with:
- Toast notifications for users
- Development-only console logging
- Production error tracking (ready for Sentry integration)
`;

fs.writeFileSync(summaryPath, summary, 'utf8');
console.log(`📄 Summary saved to: CONSOLE_CLEANUP_SUMMARY.md\n`);
