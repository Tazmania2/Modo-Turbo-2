import { NextRequest, NextResponse } from 'next/server';
import { setupService } from '@/services/setup.service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    // Generate demo data
    const demoData = setupService.generateDemoData();

    // Return specific type if requested
    if (type) {
      switch (type) {
        case 'players':
          return NextResponse.json({ players: demoData.players });
        case 'leaderboards':
          return NextResponse.json({ leaderboards: demoData.leaderboards });
        case 'player-status':
          return NextResponse.json({ playerStatus: demoData.samplePlayerStatus });
        case 'season-history':
          return NextResponse.json({ seasonHistory: demoData.seasonHistory });
        default:
          return NextResponse.json({ error: 'Invalid data type' }, { status: 400 });
      }
    }

    // Return all demo data
    return NextResponse.json(demoData);
  } catch (error) {
    console.error('Demo data API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate demo data' },
      { status: 500 }
    );
  }
}