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

    // Get current user data
    const userData = await funifierAuthService.getCurrentUser();

    return NextResponse.json({
      user: userData,
      isAuthenticated: true,
    });
  } catch (error) {
    console.error('Get current user error:', error);
    
    return NextResponse.json(
      { error: 'Failed to get user data' },
      { status: 401 }
    );
  }
}