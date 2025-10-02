import { NextRequest, NextResponse } from 'next/server';
import { funifierEnvService } from '@/services/funifier-env.service';

export async function GET(request: NextRequest) {
  try {
    // Get auth token from cookies
    const authToken = request.cookies.get('auth_token')?.value;
    
    if (!authToken) {
      return NextResponse.json(
        { error: 'No authentication token provided' },
        { status: 401 }
      );
    }

    // Check if we're in demo mode
    if (funifierEnvService.isDemoMode()) {
      // Return demo admin user
      return NextResponse.json({
        isAdmin: true,
        roles: ['admin'],
        playerData: {
          _id: 'demo-admin',
          name: 'Demo Admin',
          total_points: 5000,
          teams: ['demo_team'],
          extra: {}
        }
      });
    }

    // Get API client from environment service
    const apiClient = funifierEnvService.getApiClient();
    
    // Set the access token for the request
    apiClient.setAccessToken(authToken, 3600); // Assume 1 hour expiry
    
    try {
      // Step 1: Get current user info using Bearer token
      const currentUser = await apiClient.get('/player/me/status');
      
      if (!currentUser || !currentUser._id) {
        return NextResponse.json(
          { error: 'Failed to get user information' },
          { status: 401 }
        );
      }

      // Step 2: Check admin role using database aggregate with Basic token
      // Database requests need to use the basic token, not the bearer token
      const basicApiClient = funifierEnvService.getApiClient();
      // Reset to use basic auth for database requests
      basicApiClient.setCredentials({
        apiKey: process.env.FUNIFIER_API_KEY || '',
        authToken: process.env.FUNIFIER_BASIC_TOKEN || '',
        serverUrl: process.env.DEFAULT_FUNIFIER_URL || 'https://service2.funifier.com/v3'
      });
      
      // Use aggregate to find the user in principal collection
      const aggregateQuery = [
        {
          "$match": { 
            "_id": currentUser._id 
          }
        },
        {
          "$limit": 1
        }
      ];
      
      const principalResponse = await basicApiClient.post(`/database/principal/aggregate?strict=true`, aggregateQuery);
      
      // The response is an array, get the first (and only) result
      const principalData = principalResponse && principalResponse.length > 0 ? principalResponse[0] : null;
      
      // Check if user has admin role
      const isAdmin = principalData?.roles?.includes('admin') || false;
      
      return NextResponse.json({
        isAdmin,
        roles: principalData?.roles || [],
        playerData: currentUser,
      });
      
    } catch (apiError: any) {
      console.error('Funifier API error:', apiError);
      
      // If it's an authentication error, return 401
      if (apiError.type === 'AUTHENTICATION_ERROR' || apiError.status === 401) {
        return NextResponse.json(
          { error: 'Authentication failed' },
          { status: 401 }
        );
      }
      
      // For other errors, try to return the user data without admin status
      try {
        const currentUser = await apiClient.get('/player/me/status');
        return NextResponse.json({
          isAdmin: false,
          roles: [],
          playerData: currentUser,
        });
      } catch (userError) {
        return NextResponse.json(
          { error: 'Failed to verify user' },
          { status: 500 }
        );
      }
    }

  } catch (error: any) {
    console.error('Admin verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}