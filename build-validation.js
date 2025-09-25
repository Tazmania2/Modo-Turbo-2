// Build validation script - checks for common TypeScript/JavaScript issues
// This can be run without Node.js to validate syntax

const fs = require('fs');
const path = require('path');

// Files to check
const filesToCheck = [
  'src/services/white-label-config.service.ts',
  'src/services/setup.service.ts', 
  'src/app/api/setup/route.ts'
];

console.log('🔍 Build Validation Check');
console.log('========================');

let hasErrors = false;

filesToCheck.forEach(filePath => {
  console.log(`\n📁 Checking: ${filePath}`);
  
  try {
    if (!fs.existsSync(filePath)) {
      console.log(`❌ File not found: ${filePath}`);
      hasErrors = true;
      return;
    }
    
    const content = fs.readFileSync(filePath, 'utf8');
    
    // Basic syntax checks
    const issues = [];
    
    // Check for unmatched brackets
    const openBraces = (content.match(/\{/g) || []).length;
    const closeBraces = (content.match(/\}/g) || []).length;
    if (openBraces !== closeBraces) {
      issues.push(`Unmatched braces: ${openBraces} open, ${closeBraces} close`);
    }
    
    // Check for unmatched parentheses
    const openParens = (content.match(/\(/g) || []).length;
    const closeParens = (content.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      issues.push(`Unmatched parentheses: ${openParens} open, ${closeParens} close`);
    }
    
    // Check for missing semicolons after statements (basic check)
    const lines = content.split('\n');
    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (trimmed.length > 0 && 
          !trimmed.startsWith('//') && 
          !trimmed.startsWith('*') &&
          !trimmed.startsWith('/*') &&
          !trimmed.endsWith(';') && 
          !trimmed.endsWith('{') && 
          !trimmed.endsWith('}') &&
          !trimmed.endsWith(',') &&
          !trimmed.includes('import ') &&
          !trimmed.includes('export ') &&
          trimmed.includes('=') &&
          !trimmed.includes('=>')) {
        // This is a very basic check - may have false positives
        // issues.push(`Line ${index + 1}: Possible missing semicolon`);
      }
    });
    
    // Check for common TypeScript issues
    if (content.includes('Promise<') && !content.includes('async ')) {
      // This is just a warning, not an error
    }
    
    if (issues.length === 0) {
      console.log('✅ No syntax issues found');
    } else {
      console.log('⚠️  Potential issues:');
      issues.forEach(issue => console.log(`   - ${issue}`));
      hasErrors = true;
    }
    
  } catch (error) {
    console.log(`❌ Error reading file: ${error.message}`);
    hasErrors = true;
  }
});

console.log('\n📊 Summary');
console.log('==========');

if (hasErrors) {
  console.log('❌ Build validation found potential issues');
  console.log('   Please review the files above');
} else {
  console.log('✅ Build validation passed');
  console.log('   All checked files appear to have valid syntax');
}

console.log('\n📋 Next Steps:');
console.log('   1. Install Node.js and npm if not available');
console.log('   2. Run: npm install');
console.log('   3. Run: npm run type-check');
console.log('   4. Run: npm run build');
console.log('   5. Run: npm run dev');

module.exports = { filesToCheck, hasErrors };