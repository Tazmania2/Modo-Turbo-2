import { NextResponse } from 'next/server';

export async function POST() {
  try {
    // Call the main monitoring endpoint to stop monitoring
    const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/analysis/performance-monitoring`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'stop' })
    });
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Failed to stop performance monitoring:', error);
    return NextResponse.json(
      { error: 'Failed to stop monitoring' },
      { status: 500 }
    );
  }
}