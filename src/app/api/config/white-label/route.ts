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
    dashboards: z.record(z.string(), z.boolean()).optional(),
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
    const { searchParams } = new URL(request.url);
    const instanceId = searchParams.get('instanceId') || 'default';
    
    const config = await whiteLabelConfigService.getConfiguration(instanceId);
    
    if (!config) {
      // Return default demo configuration if none exists
      const demoConfig = {
        instanceId,
        branding: {
          primaryColor: '#3B82F6',
          secondaryColor: '#1F2937',
          accentColor: '#10B981',
          logo: '',
          favicon: '',
          companyName: 'Demo Company',
          tagline: 'Gamification Made Simple'
        },
        features: {
          ranking: true,
          dashboards: {
            carteira_i: true,
            carteira_ii: true,
            carteira_iii: false,
            carteira_iv: false
          },
          history: true,
          personalizedRanking: true
        }
      };
      return NextResponse.json(demoConfig);
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
  validatedData?: { body?: z.infer<typeof updateConfigSchema> }
) {
  try {
    if (!validatedData?.body) {
      return NextResponse.json(
        { error: 'Request body is required' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(request.url);
    const instanceId = searchParams.get('instanceId') || 'default';
    
    // Create a full configuration object with the updates
    const existingConfig = await whiteLabelConfigService.getConfiguration(instanceId);
    const fullConfig = {
      instanceId,
      branding: {
        primaryColor: '#3B82F6',
        secondaryColor: '#1F2937',
        accentColor: '#10B981',
        logo: '',
        favicon: '',
        companyName: 'Demo Company',
        tagline: 'Gamification Made Simple',
        ...existingConfig?.branding,
        ...validatedData.body.branding
      },
      features: {
        ranking: true,
        dashboards: {
          carteira_i: true,
          carteira_ii: true,
          carteira_iii: false,
          carteira_iv: false
        },
        history: true,
        personalizedRanking: true,
        ...existingConfig?.features,
        ...validatedData.body.features
      },
      funifierIntegration: existingConfig?.funifierIntegration || {
        apiKey: '',
        serverUrl: '',
        authToken: '',
        customCollections: []
      },
      createdAt: existingConfig?.createdAt || Date.now(),
      updatedAt: Date.now()
    };

    const result = await whiteLabelConfigService.saveConfiguration(
      instanceId,
      fullConfig,
      'api-user'
    );
    
    if (result.success) {
      return NextResponse.json(result.configuration);
    } else {
      return NextResponse.json(
        { error: 'Failed to update configuration', details: result.errors },
        { status: 500 }
      );
    }
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
    const { searchParams } = new URL(request.url);
    const instanceId = searchParams.get('instanceId') || 'default';
    
    const result = await whiteLabelConfigService.resetConfiguration(instanceId, 'api-user');
    
    if (result.success) {
      return NextResponse.json(result.configuration);
    } else {
      return NextResponse.json(
        { error: 'Failed to reset configuration', details: result.errors },
        { status: 500 }
      );
    }
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