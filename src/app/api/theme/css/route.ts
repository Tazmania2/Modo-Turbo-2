import { NextRequest, NextResponse } from 'next/server';
import { brandingService } from '@/services/branding.service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const instanceId = searchParams.get('instanceId');

    if (!instanceId) {
      return new NextResponse(
        '/* Instance ID is required */',
        { 
          status: 400,
          headers: { 'Content-Type': 'text/css' }
        }
      );
    }

    const branding = await brandingService.getBranding(instanceId);

    if (!branding) {
      // Return default CSS
      return new NextResponse(
        generateDefaultCSS(),
        { 
          status: 200,
          headers: { 
            'Content-Type': 'text/css',
            'Cache-Control': 'public, max-age=3600'
          }
        }
      );
    }

    // Generate CSS properties for the branding
    const cssProperties = brandingService.generateCSSProperties(branding);
    const css = generateThemeCSS(cssProperties, branding);

    return new NextResponse(
      css,
      { 
        status: 200,
        headers: { 
          'Content-Type': 'text/css',
          'Cache-Control': 'public, max-age=3600'
        }
      }
    );
  } catch (error) {
    console.error('Failed to generate theme CSS:', error);
    return new NextResponse(
      '/* Error generating theme CSS */',
      { 
        status: 500,
        headers: { 'Content-Type': 'text/css' }
      }
    );
  }
}

function generateDefaultCSS(): string {
  return `
/* Default White-Label Theme */
:root {
  --color-primary-500: #3B82F6;
  --color-secondary-500: #1F2937;
  --color-accent-500: #10B981;
  --company-name: "Gamification Platform";
  --company-tagline: "Powered by Funifier";
}

.white-label-theme {
  /* Default theme applied */
}
`;
}

function generateThemeCSS(cssProperties: Record<string, string>, branding: any): string {
  const propertyDeclarations = Object.entries(cssProperties)
    .map(([property, value]) => `  ${property}: ${value};`)
    .join('\n');

  return `
/* White-Label Theme CSS */
:root {
${propertyDeclarations}
}

.white-label-theme {
  /* Custom theme applied */
}

/* Logo styles */
.logo-container img {
  max-height: 2rem;
  width: auto;
  object-fit: contain;
}

/* Company branding */
.company-name::before {
  content: var(--company-name);
}

.company-tagline::before {
  content: var(--company-tagline);
}

/* Theme-aware button styles */
.btn-primary {
  background-color: var(--color-primary-500);
  border-color: var(--color-primary-500);
}

.btn-primary:hover {
  background-color: var(--color-primary-600);
  border-color: var(--color-primary-600);
}

.btn-secondary {
  background-color: var(--color-secondary-500);
  border-color: var(--color-secondary-500);
}

.btn-secondary:hover {
  background-color: var(--color-secondary-600);
  border-color: var(--color-secondary-600);
}

.btn-accent {
  background-color: var(--color-accent-500);
  border-color: var(--color-accent-500);
}

.btn-accent:hover {
  background-color: var(--color-accent-600);
  border-color: var(--color-accent-600);
}

/* Card and component theming */
.card-primary {
  border-color: var(--color-primary-200);
  background-color: var(--color-primary-50);
}

.card-secondary {
  border-color: var(--color-secondary-200);
  background-color: var(--color-secondary-50);
}

.text-primary {
  color: var(--color-primary-600);
}

.text-secondary {
  color: var(--color-secondary-600);
}

.text-accent {
  color: var(--color-accent-600);
}

.bg-primary {
  background-color: var(--color-primary-500);
}

.bg-secondary {
  background-color: var(--color-secondary-500);
}

.bg-accent {
  background-color: var(--color-accent-500);
}

/* Progress bars and indicators */
.progress-primary .progress-bar {
  background-color: var(--color-primary-500);
}

.progress-secondary .progress-bar {
  background-color: var(--color-secondary-500);
}

.progress-accent .progress-bar {
  background-color: var(--color-accent-500);
}

/* Navigation and header theming */
.navbar-brand {
  color: var(--color-primary-700);
}

.nav-link:hover {
  color: var(--color-primary-600);
}

.nav-link.active {
  color: var(--color-primary-700);
  border-bottom-color: var(--color-primary-500);
}
`;
}