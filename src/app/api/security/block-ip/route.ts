import { NextRequest, NextResponse } from 'next/server';
import { auditLogger } from '@/services/audit-logger.service';
import { blockIP } from '@/middleware/security';
import { withAdminSecurity } from '@/middleware/security';
import { withValidation } from '@/middleware/validation';
import { z } from 'zod';

const blockIPSchema = z.object({
  ip: z.string()
    .regex(/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$|^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/, 'Invalid IP address'),
  reason: z.string()
    .min(1, 'Reason is required')
    .max(500, 'Reason too long'),
  duration: z.number()
    .min(60000, 'Minimum duration is 1 minute') // 1 minute
    .max(7 * 24 * 60 * 60 * 1000, 'Maximum duration is 7 days') // 7 days
    .optional()
    .default(60 * 60 * 1000) // Default 1 hour
});

async function handleBlockIP(
  request: NextRequest,
  context: any,
  validatedData?: { body?: any }
): Promise<NextResponse> {
  try {
    const { ip, reason, duration } = validatedData?.body || {};
    
    // Block the IP address
    blockIP(ip, reason, duration);
    
    // Log the admin action
    auditLogger.logAdminAction({
      action: 'USER_BLOCKED',
      severity: 'high',
      clientId: ip,
      userId: 'admin', // In a real app, get from auth context
      userAgent: request.headers.get('user-agent') || undefined,
      url: request.url,
      method: request.method,
      details: { 
        blockedIP: ip, 
        reason, 
        duration,
        blockedBy: 'admin' // In a real app, get from auth context
      },
      timestamp: new Date()
    });
    
    return NextResponse.json({
      success: true,
      message: `IP ${ip} has been blocked for ${Math.round(duration / (60 * 1000))} minutes`,
      data: {
        ip,
        reason,
        duration,
        blockedUntil: new Date(Date.now() + duration)
      }
    });
  } catch (error) {
    console.error('Error blocking IP:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to block IP address' 
      },
      { status: 500 }
    );
  }
}

// POST /api/security/block-ip - Manually block an IP address
export const POST = withAdminSecurity(
  withValidation(blockIPSchema)(handleBlockIP)
);