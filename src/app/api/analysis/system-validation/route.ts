import { NextRequest, NextResponse } from 'next/server';
import { SystemValidationService } from '@/services/analysis/system-validation.service';

const systemValidationService = new SystemValidationService();

export async function POST(request: NextRequest) {
  try {
    const { validationType, options } = await request.json();

    let result;
    switch (validationType) {
      case 'comprehensive':
        result = await systemValidationService.executeComprehensiveValidation(options);
        break;
      case 'security':
        result = await systemValidationService.executeSecurityValidation(options);
        break;
      case 'deployment':
        result = await systemValidationService.prepareDeployment(options);
        break;
      default:
        return NextResponse.json(
          { error: 'Invalid validation type' },
          { status: 400 }
        );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('System validation error:', error);
    return NextResponse.json(
      { error: 'System validation failed' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const validationId = searchParams.get('validationId');

    if (validationId) {
      const result = await systemValidationService.getValidationResult(validationId);
      return NextResponse.json(result);
    }

    const status = await systemValidationService.getSystemStatus();
    return NextResponse.json(status);
  } catch (error) {
    console.error('System validation status error:', error);
    return NextResponse.json(
      { error: 'Failed to get validation status' },
      { status: 500 }
    );
  }
}