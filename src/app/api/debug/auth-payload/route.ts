import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const instanceId = searchParams.get('instance') || 'default';
    
    const body = await request.json();
    const { username, password } = body;
    
    // Get the API key from configuration
    let apiKey = '';
    let serverUrl = 'https://service2.funifier.com';
    let cachedConfig = null;
    
    try {
      const { whiteLabelConfigCache } = await import('@/utils/cache');
      cachedConfig = whiteLabelConfigCache.getConfiguration(instanceId);
      
      if (cachedConfig?.funifierIntegration?.apiKey) {
        apiKey = cachedConfig.funifierIntegration.apiKey;
        serverUrl = cachedConfig.funifierIntegration.serverUrl || serverUrl;
      }
    } catch (cacheError) {
      console.warn('Could not get API key from cache:', cacheError);
    }
    
    const funifierUrl = `${serverUrl}/v3/auth/token`;
    
    const payload = {
      apiKey: apiKey,
      grant_type: 'password',
      username: username,
      password: password,
    };
    
    // Debug information
    const debugInfo = {
      timestamp: new Date().toISOString(),
      instanceId,
      funifierUrl,
      payload: {
        apiKey: apiKey ? `${apiKey.substring(0, 8)}...` : 'NOT_FOUND',
        grant_type: payload.grant_type,
        username: payload.username,
        password: password ? '***HIDDEN***' : 'NOT_PROVIDED'
      },
      cachedConfigExists: !!cachedConfig,
      serverUrl,
      headers: {
        'Content-Type': 'application/json'
      }
    };
    
    // Try the actual request and capture the response
    let funifierResponse = null;
    let funifierError = null;
    
    try {
      console.log('Sending payload to Funifier:', JSON.stringify(payload, null, 2));
      
      const authResponse = await fetch(funifierUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      
      const responseText = await authResponse.text();
      
      funifierResponse = {
        status: authResponse.status,
        statusText: authResponse.statusText,
        headers: Object.fromEntries(authResponse.headers.entries()),
        body: responseText,
        bodyParsed: null
      };
      
      try {
        funifierResponse.bodyParsed = JSON.parse(responseText);
      } catch (parseError) {
        funifierResponse.parseError = 'Could not parse response as JSON';
      }
      
    } catch (fetchError) {
      funifierError = {
        message: fetchError instanceof Error ? fetchError.message : 'Unknown error',
        type: fetchError instanceof Error ? fetchError.constructor.name : 'Unknown'
      };
    }
    
    return NextResponse.json({
      message: 'Auth payload debug information',
      debug: debugInfo,
      funifierResponse,
      funifierError,
      recommendation: funifierError 
        ? 'Check network connectivity and Funifier server URL'
        : funifierResponse?.status !== 200 
        ? 'Check API key, credentials, and payload format'
        : 'Authentication should work'
    });
    
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Debug failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}