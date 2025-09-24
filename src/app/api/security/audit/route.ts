import { NextRequest, NextResponse } from 'next/server';
import { auditLogger } from '@/services/audit-logger.service';
import { withAdminSecurity } from '@/middleware/security';
import { withValidation, commonSchemas } from '@/middleware/validation';

async function handleGetAuditLogs(
  request: NextRequest,
  context: any,
  validatedData?: { query?: any }
): Promise<NextResponse> {
  try {
    const query = validatedData?.query || {};
    
    // Search audit logs based on query parameters
    const auditEvents = auditLogger.searchLog({
      action: query.action,
      severity: query.severity,
      startDate: query.startDate ? new Date(query.startDate) : undefined,
      endDate: query.endDate ? new Date(query.endDate) : undefined,
      limit: query.limit
    });

    // Get audit metrics for the same time period
    const timeWindow = query.startDate && query.endDate 
      ? new Date(query.endDate).getTime() - new Date(query.startDate).getTime()
      : 24 * 60 * 60 * 1000; // Default to 24 hours

    const metrics = auditLogger.getAuditMetrics(timeWindow);

    return NextResponse.json({
      success: true,
      data: {
        events: auditEvents,
        metrics,
        query
      }
    });
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch audit logs' 
      },
      { status: 500 }
    );
  }
}

async function handleExportAuditLogs(
  request: NextRequest,
  context: any,
  validatedData?: { query?: any }
): Promise<NextResponse> {
  try {
    const query = validatedData?.query || {};
    const format = query.format || 'json';

    // Export audit logs
    const exportData = auditLogger.exportLog(format);

    const headers = new Headers();
    if (format === 'csv') {
      headers.set('Content-Type', 'text/csv');
      headers.set('Content-Disposition', 'attachment; filename="audit-logs.csv"');
    } else {
      headers.set('Content-Type', 'application/json');
      headers.set('Content-Disposition', 'attachment; filename="audit-logs.json"');
    }

    return new NextResponse(exportData, { headers });
  } catch (error) {
    console.error('Error exporting audit logs:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to export audit logs' 
      },
      { status: 500 }
    );
  }
}

// GET /api/security/audit - Get audit logs with filtering
export const GET = withAdminSecurity(
  withValidation(
    undefined, // no body schema
    commonSchemas.auditQuery // query schema
  )(handleGetAuditLogs)
);

// POST /api/security/audit/export - Export audit logs
export const POST = withAdminSecurity(
  withValidation(
    undefined, // no body schema
    commonSchemas.auditQuery // query schema for export parameters
  )(handleExportAuditLogs)
);