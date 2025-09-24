import { NextRequest, NextResponse } from 'next/server';
import { auditLogger } from '@/services/audit-logger.service';
import { getSecurityStatus } from '@/middleware/security';
import { withAdminSecurity } from '@/middleware/security';
import { withValidation, commonSchemas } from '@/middleware/validation';

async function handleGetSecurityViolations(
  request: NextRequest,
  context: any,
  validatedData?: { query?: any }
): Promise<NextResponse> {
  try {
    const query = validatedData?.query || {};
    
    // Get security violations from audit logs
    const violations = auditLogger.getSecurityViolations(query.limit || 100);
    
    // Get current security status (blocked IPs, etc.)
    const securityStatus = getSecurityStatus();
    
    // Get violation metrics
    const metrics = auditLogger.getAuditMetrics(24 * 60 * 60 * 1000); // Last 24 hours
    
    return NextResponse.json({
      success: true,
      data: {
        violations,
        securityStatus,
        metrics: {
          totalViolations: metrics.securityViolations,
          violationsBySeverity: metrics.eventsBySeverity,
          recentViolations: violations.slice(-10)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching security violations:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch security violations' 
      },
      { status: 500 }
    );
  }
}

// GET /api/security/violations - Get security violations and status
export const GET = withAdminSecurity(
  withValidation(
    undefined, // no body schema
    commonSchemas.paginationQuery // query schema
  )(handleGetSecurityViolations)
);