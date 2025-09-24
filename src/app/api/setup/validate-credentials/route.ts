import { NextRequest, NextResponse } from 'next/server';
import { setupService } from '@/services/setup.service';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiKey, serverUrl, authToken } = body;

    if (!apiKey || !serverUrl || !authToken) {
      return NextResponse.json(
        { 
          isValid: false, 
          errors: ['All credentials are required'] 
        },
        { status: 400 }
      );
    }

    // Validate the credentials
    const result = await setupService.validateFunifierCredentials({
      apiKey,
      serverUrl,
      authToken
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Credentials validation error:', error);
    return NextResponse.json(
      { 
        isValid: false, 
        errors: ['Failed to validate credentials'] 
      },
      { status: 500 }
    );
  }
}