import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const instanceId = searchParams.get('instance') || 'default';
    
    // Test different Funifier URLs to see which one works
    const testUrls = [
      'https://service2.funifier.com/login',
      'https://service2.funifier.com/auth/login',
      'https://service2.funifier.com/v3/login',
      'https://service2.funifier.com/v3/auth/login',
      'https://app.funifier.com/login',
      'https://app.funifier.com/auth/login'
    ];
    
    const returnUrl = `${request.nextUrl.origin}/dashboard?instance=${instanceId}`;
    
    const testResults = testUrls.map(url => ({
      url,
      fullUrl: `${url}?redirect_uri=${encodeURIComponent(returnUrl)}`,
      description: getUrlDescription(url)
    }));
    
    return NextResponse.json({
      message: 'Funifier URL test results',
      instanceId,
      returnUrl,
      testUrls: testResults,
      recommendation: 'Try each URL manually to see which one works',
      currentError: 'Could not find resource (404) suggests wrong URL path'
    });
    
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

function getUrlDescription(url: string): string {
  if (url.includes('service2.funifier.com/login')) return 'Direct login on service2';
  if (url.includes('service2.funifier.com/auth/login')) return 'Auth login on service2';
  if (url.includes('service2.funifier.com/v3/login')) return 'V3 API login on service2';
  if (url.includes('service2.funifier.com/v3/auth/login')) return 'V3 auth login on service2';
  if (url.includes('app.funifier.com/login')) return 'App login';
  if (url.includes('app.funifier.com/auth/login')) return 'App auth login';
  return 'Unknown';
}