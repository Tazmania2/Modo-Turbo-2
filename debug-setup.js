// Simple debug script to test setup functionality
// Note: This requires the project to be built first
// Run with: npm run build && node debug-setup.js

// This would need to be adapted based on the actual build output
console.log('This script requires the TypeScript project to be compiled first.');
console.log('Run: npm run build');
console.log('Then adapt this script to use the compiled JavaScript files.');

// For now, this is a template for testing
const setupService = null; // Would be: require('./dist/services/setup.service.js');

async function testDemoSetup() {
  console.log('Testing demo setup...');
  
  if (!setupService) {
    console.log('⚠️  Setup service not available - compile TypeScript first');
    return;
  }
  
  try {
    const result = await setupService.handleSetup({
      mode: 'demo'
    });
    
    console.log('Demo setup result:', result);
    
    if (result.success) {
      console.log('✅ Demo setup successful!');
      console.log('Instance ID:', result.instanceId);
      console.log('Redirect URL:', result.redirectUrl);
    } else {
      console.log('❌ Demo setup failed:');
      console.log('Errors:', result.errors);
    }
  } catch (error) {
    console.error('❌ Demo setup threw an error:', error);
  }
}

async function testSetupStatus() {
  console.log('Testing setup status check...');
  
  if (!setupService) {
    console.log('⚠️  Setup service not available - compile TypeScript first');
    return;
  }
  
  try {
    const needsSetup = await setupService.needsSetup();
    console.log('Needs setup:', needsSetup);
    
    // Test with a demo instance ID
    const demoInstanceId = 'demo_test_123';
    const demoNeedsSetup = await setupService.needsSetup(demoInstanceId);
    console.log(`Demo instance ${demoInstanceId} needs setup:`, demoNeedsSetup);
  } catch (error) {
    console.error('❌ Setup status check failed:', error);
  }
}

async function main() {
  console.log('🔧 Debug Setup Script');
  console.log('====================');
  
  await testSetupStatus();
  console.log('');
  await testDemoSetup();
}

// Run if this file is executed directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testDemoSetup, testSetupStatus };