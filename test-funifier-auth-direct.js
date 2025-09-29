/**
 * Direct test of Funifier authentication to isolate the issue
 * Run this with: node test-funifier-auth-direct.js
 */

const https = require('https');
const { URLSearchParams } = require('url');

// Test configuration - replace with actual values
const TEST_CONFIG = {
  serverUrl: 'https://service2.funifier.com',
  apiKey: 'YOUR_API_KEY_HERE', // Replace with actual API key
  username: 'test_user', // Replace with actual username
  password: 'test_password' // Replace with actual password
};

async function testFunifierAuth() {
  console.log('=== TESTING FUNIFIER AUTHENTICATION ===');
  console.log('Server URL:', TEST_CONFIG.serverUrl);
  console.log('API Key:', TEST_CONFIG.apiKey ? `${TEST_CONFIG.apiKey.substring(0, 8)}...` : 'NOT_SET');
  console.log('Username:', TEST_CONFIG.username);
  console.log('');

  // Prepare the request exactly as documented
  const endpoint = `${TEST_CONFIG.serverUrl}/v3/auth/token`;
  
  // Create URL-encoded body
  const body = new URLSearchParams({
    apiKey: TEST_CONFIG.apiKey,
    grant_type: 'password',
    username: TEST_CONFIG.username,
    password: TEST_CONFIG.password,
  }).toString();

  // Headers - NO Authorization header for initial auth request
  const headers = {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Accept': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  };

  console.log('REQUEST DETAILS:');
  console.log('Method: POST');
  console.log('URL:', endpoint);
  console.log('Headers:', headers);
  console.log('Body:', body.replace(TEST_CONFIG.password, '***HIDDEN***'));
  console.log('');

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: headers,
      body: body,
    });

    console.log('RESPONSE DETAILS:');
    console.log('Status:', response.status, response.statusText);
    console.log('Headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('Body:', responseText);
    console.log('');

    if (response.ok) {
      console.log('✅ SUCCESS: Authentication successful!');
      try {
        const authData = JSON.parse(responseText);
        console.log('Token Type:', authData.token_type);
        console.log('Expires In:', authData.expires_in);
        console.log('Access Token:', authData.access_token ? `${authData.access_token.substring(0, 20)}...` : 'NOT_FOUND');
      } catch (parseError) {
        console.log('⚠️  Could not parse response as JSON');
      }
    } else {
      console.log('❌ FAILED: Authentication failed');
      
      // Check for specific error messages
      if (responseText.includes('Need to inform a type of authentication')) {
        console.log('🔍 DIAGNOSIS: This error suggests we\'re hitting a protected endpoint instead of the auth endpoint');
        console.log('   - Verify the endpoint URL is correct: /v3/auth/token');
        console.log('   - Ensure no Authorization headers are being sent');
      }
      
      if (responseText.includes('Invalid API key')) {
        console.log('🔍 DIAGNOSIS: API key is invalid or not found');
      }
      
      if (responseText.includes('Invalid credentials')) {
        console.log('🔍 DIAGNOSIS: Username/password combination is incorrect');
      }
    }

  } catch (error) {
    console.log('❌ ERROR: Request failed');
    console.error(error);
  }
}

// Check if we have the required configuration
if (TEST_CONFIG.apiKey === 'YOUR_API_KEY_HERE') {
  console.log('❌ Please update TEST_CONFIG with your actual Funifier credentials');
  console.log('Edit this file and replace:');
  console.log('- apiKey: Your Funifier API key');
  console.log('- username: A valid Funifier username');
  console.log('- password: The corresponding password');
  process.exit(1);
}

// Run the test
testFunifierAuth().catch(console.error);