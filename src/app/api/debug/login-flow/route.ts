import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const instanceId = searchParams.get('instance') || 'default';
    
    const debugInfo = {
      timestamp: new Date().toISOString(),
      instanceId,
      requestUrl: request.url,
      origin: request.nextUrl.origin,
      defaultFunifierUrl: process.env.DEFAULT_FUNIFIER_URL || 'https://service2.funifier.com',
      environment: process.env.NODE_ENV,
      headers: Object.fromEntries(request.headers.entries())
    };
    
    console.log('Login flow debug info:', debugInfo);
    
    return NextResponse.json({
      message: 'Login flow debug information',
      data: debugInfo,
      suggestedFunifierUrl: `${debugInfo.defaultFunifierUrl}/login?redirect_uri=${encodeURIComponent(`${debugInfo.origin}/dashboard?instance=${instanceId}`)}`
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