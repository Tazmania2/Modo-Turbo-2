#!/usr/bin/env node

/**
 * Script to fix Next.js 15 async params in dynamic routes
 */

const fs = require('fs');
const path = require('path');

// Find all dynamic route files
function findDynamicRoutes(dir) {
  const files = [];
  
  function traverse(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Check if directory name contains brackets (dynamic route)
        if (item.includes('[') && item.includes(']')) {
          // Look for route.ts files in this directory
          const routeFile = path.join(fullPath, 'route.ts');
          if (fs.existsSync(routeFile)) {
            files.push(routeFile);
          }
        }
        traverse(fullPath);
      }
    }
  }
  
  traverse(dir);
  return files;
}

// Fix async params in a file
function fixAsyncParams(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Pattern to match function signatures with params
  const patterns = [
    // Standard pattern: { params }: { params: { paramName: string } }
    /\{\s*params\s*\}:\s*\{\s*params:\s*\{\s*([^}]+)\s*\}\s*\}/g,
    // RouteParams interface pattern
    /\{\s*params\s*\}:\s*RouteParams/g
  ];
  
  patterns.forEach(pattern => {
    if (pattern.test(content)) {
      console.log(`Fixing async params in: ${filePath}`);
      
      // Reset regex
      pattern.lastIndex = 0;
      
      content = content.replace(pattern, (match, paramTypes) => {
        modified = true;
        if (paramTypes) {
          return `{ params }: { params: Promise<{ ${paramTypes} }> }`;
        } else {
          // For RouteParams, we need to find the interface and update it
          return match; // Handle separately
        }
      });
    }
  });
  
  // Fix await params usage
  const awaitParamsPattern = /const\s*\{\s*([^}]+)\s*\}\s*=\s*params;/g;
  if (awaitParamsPattern.test(content)) {
    console.log(`Adding await to params destructuring in: ${filePath}`);
    content = content.replace(awaitParamsPattern, (match, paramNames) => {
      modified = true;
      return `const { ${paramNames} } = await params;`;
    });
  }
  
  // Remove RouteParams interface if it exists
  const routeParamsInterface = /interface\s+RouteParams\s*\{[^}]*\}/g;
  if (routeParamsInterface.test(content)) {
    console.log(`Removing RouteParams interface in: ${filePath}`);
    content = content.replace(routeParamsInterface, '');
    modified = true;
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ Fixed: ${filePath}`);
  }
}

// Main execution
const apiDir = path.join(__dirname, '../src/app/api');
const dynamicRoutes = findDynamicRoutes(apiDir);

console.log(`Found ${dynamicRoutes.length} dynamic route files:`);
dynamicRoutes.forEach(file => console.log(`  - ${file}`));

console.log('\nFixing async params...');
dynamicRoutes.forEach(fixAsyncParams);

console.log('\n✅ All dynamic routes have been updated for Next.js 15 async params!');