import { NextRequest, NextResponse } from 'next/server';
import { funifierAuthService } from '@/services/funifier-auth.service';
import { getAuthTokenFromRequest } from '@/utils/auth';

export async function GET(request: NextRequest) {
  try {
    // Get auth token from request
    const authToken = getAuthTokenFromRequest(request);
    
    if (!authToken) {
      return NextResponse.json(
        { error: 'No authentication token provided' },
        { status: 401 }
      );
    }

    // Verify admin role using Funifier API
    const adminVerification = await funifierAuthService.verifyAdminRole();

    return NextResponse.json({
      isAdmin: adminVerification.isAdmin,
      roles: adminVerification.roles,
      playerData: adminVerification.playerData,
    });
  } catch (error) {
    console.error('Admin verification error:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: 'Admin verification failed' },
      { status: 500 }
    );
  }
}