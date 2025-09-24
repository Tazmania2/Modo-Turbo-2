import { NextRequest, NextResponse } from 'next/server';
import { funifierAuthService } from '@/services/funifier-auth.service';

export async function POST(_request: NextRequest) {
  try {
    // Attempt to logout from Funifier
    await funifierAuthService.logout();

    // Create response and clear cookies
    const response = NextResponse.json({ success: true });
    
    response.cookies.delete('auth_token');
    response.cookies.delete('refresh_token');

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    
    // Even if logout fails, clear cookies
    const response = NextResponse.json({ success: true });
    
    response.cookies.delete('auth_token');
    response.cookies.delete('refresh_token');

    return response;
  }
}