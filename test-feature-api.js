// Simple test script to check if the feature API is working
async function testFeatureAPI() {
  const instanceId = 'test-instance';
  
  console.log('Testing Feature API...');
  
  try {
    // Test GET request
    console.log('1. Testing GET /api/admin/features');
    const getResponse = await fetch(`http://localhost:3000/api/admin/features?instanceId=${instanceId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'auth_token=test-token' // You might need a real token
      }
    });
    
    console.log('GET Response status:', getResponse.status);
    const getData = await getResponse.json();
    console.log('GET Response data:', getData);
    
    // Test PUT request
    console.log('\n2. Testing PUT /api/admin/features');
    const updates = [
      { featureName: 'ranking', enabled: true },
      { featureName: 'dashboards.carteira_i', enabled: false }
    ];
    
    const putResponse = await fetch(`http://localhost:3000/api/admin/features?instanceId=${instanceId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': 'auth_token=test-token'
      },
      body: JSON.stringify({ updates })
    });
    
    console.log('PUT Response status:', putResponse.status);
    const putData = await putResponse.json();
    console.log('PUT Response data:', putData);
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

// Run the test if this is executed directly
if (typeof window === 'undefined') {
  testFeatureAPI();
}