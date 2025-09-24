import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/middleware/auth';
import { withValidation, commonSchemas } from '@/middleware/validation';
import { handleApiError } from '@/middleware/error-handler';
import { whiteLabelConfigService } from '@/services/white-label-config.service';
import { z } from 'zod';

const updateConfigSchema = z.object({
  branding: z.object({
    primaryColor: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
    secondaryColor: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
    accentColor: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
    logo: z.string().optional(),
    favicon: z.string().optional(),
    companyName: z.string().max(100).optional(),
    tagline: z.string().max(200).optional(),
  }).optional(),
  features: z.object({
    ranking: z.boolean().optional(),
    dashboards: z.record(z.boolean()).optional(),
    history: z.boolean().optional(),
    personalizedRanking: z.boolean().optional(),
  }).optional(),
});

/**
 * GET /api/config/white-label
 * Retrieves current white-label configuration
 * Implements requirement 6.3: Fetch white-label settings from Funifier collection
 */
async function getHandler(request: NextRequest) {
  try {
    const config = await whiteLabelConfigService.getConfiguration();
    
    if (!config) {
      // Return default configuration if none exists
      const defaultConfig = await whiteLabelConfigService.getDefaultConfiguration();
      return NextResponse.json(defaultConfig);
    }
    
    return NextResponse.json(config);
  } catch (error) {
    return handleApiError(error, 'Failed to fetch white-label configuration');
  }
}

/**
 * PUT /api/config/white-label
 * Updates white-label configuration
 * Implements requirement 6.2: Store configurations in Funifier database collection
 */
async function putHandler(
  request: NextRequest,
  context: any,
  validatedData?: { body: z.infer<typeof updateConfigSchema> }
) {
  try {
    if (!validatedData?.body) {
      return NextResponse.json(
        { error: 'Request body is required' },
        { status: 400 }
      );
    }

    const updatedConfig = await whiteLabelConfigService.updateConfiguration(
      validatedData.body
    );
    
    return NextResponse.json(updatedConfig);
  } catch (error) {
    return handleApiError(error, 'Failed to update white-label configuration');
  }
}

/**
 * POST /api/config/white-label/reset
 * Resets configuration to neutral defaults
 * Implements requirement 12.3: Return to neutral default configuration
 */
async function resetHandler(request: NextRequest) {
  try {
    const defaultConfig = await whiteLabelConfigService.resetToDefaults();
    return NextResponse.json(defaultConfig);
  } catch (error) {
    return handleApiError(error, 'Failed to reset white-label configuration');
  }
}

// Export handlers with middleware
export async function GET(request: NextRequest) {
  return withAuth(request, getHandler, { requireAuth: false });
}

export async function PUT(request: NextRequest, context: any) {
  const validatedHandler = withValidation(updateConfigSchema)(putHandler);
  return withAuth(request, (req) => validatedHandler(req, context), { requireAdmin: true });
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  if (searchParams.get('action') === 'reset') {
    return withAuth(request, resetHandler, { requireAdmin: true });
  }
  
  return NextResponse.json(
    { error: 'Invalid action' },
    { status: 400 }
  );
}