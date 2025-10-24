# Demo Mode Implementation Guide

## Overview

The demo mode system provides a centralized way to manage demo/production mode detection and ensure proper data source isolation. This prevents mock data from appearing in production and ensures demo data is only used when explicitly enabled.

## Architecture

### Core Service: `demo-mode.service.ts`

The `DemoModeService` is the single source of truth for demo mode detection. It provides:

- **Centralized demo mode detection** with multiple priority levels
- **Data source validation** to ensure data comes from the correct source
- **Visual indicators** for UI components
- **Caching** to improve performance

### Priority Order for Demo Mode Detection

1. **localStorage flag** (client-side only) - Highest priority
2. **Environment variable** `NEXT_PUBLIC_DEMO_MODE=true`
3. **Missing or invalid Funifier credentials** - Automatic fallback

## Usage

### In Services

```typescript
import { demoModeService } from '@/services/demo-mode.service';

class MyService {
  async getData() {
    if (demoModeService.isDemoMode()) {
      // Return demo data
      return generateDemoData();
    }
    
    // Return production data from Funifier API
    return await funifierApi.getData();
  }
}
```

### In React Components

```typescript
import { useDemoMode } from '@/hooks/useDemoMode';

function MyComponent() {
  const { isDemoMode, enableDemoMode, disableDemoMode, config } = useDemoMode();
  
  return (
    <div>
      {isDemoMode && <div>Demo Mode Active</div>}
      <button onClick={enableDemoMode}>Enable Demo</button>
      <button onClick={disableDemoMode}>Disable Demo</button>
    </div>
  );
}
```

### Data Source Validation

Always validate that data comes from the expected source:

```typescript
const data = await fetchData();

// Validate data source
demoModeService.validateDataSource(data, isDemoMode ? 'demo' : 'funifier');
```

## Demo Data Markers

All demo data should include markers to identify it:

```typescript
// Demo data should have IDs starting with 'demo_'
const demoUser = {
  _id: 'demo_user_123',
  name: 'Demo User',
  // ... other fields
};

// Or include a source field
const demoData = {
  ...data,
  source: 'demo'
};
```

## Visual Indicators

The `DemoModeIndicator` component automatically shows when demo mode is active:

```typescript
// In layout.tsx
import { DemoModeIndicator } from '@/components/common/DemoModeIndicator';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <DemoModeIndicator />
        {children}
      </body>
    </html>
  );
}
```

## Mode-Aware Data Fetching

Services should implement mode-aware data fetching:

```typescript
class FunifierDirectService {
  private async executeWithModeAwareness<T>(
    operation: string,
    funifierOperation: () => Promise<T>,
    demoDataGenerator: () => T
  ): Promise<T> {
    if (this.isDemoMode()) {
      console.log(`Using demo data for ${operation}`);
      const demoData = demoDataGenerator();
      this.validateDataSource(demoData, operation);
      return demoData;
    }

    console.log(`Using Funifier API for ${operation}`);
    const data = await funifierOperation();
    this.validateDataSource(data, operation);
    return data;
  }
}
```

## Environment Configuration

### Development Mode

```env
# .env.local
NEXT_PUBLIC_DEMO_MODE=true
```

### Production Mode

```env
# .env.production
NEXT_PUBLIC_DEMO_MODE=false
FUNIFIER_API_KEY=your_real_api_key
FUNIFIER_SERVER_URL=https://api.funifier.com
```

## Testing

### Unit Tests

```typescript
import { demoModeService } from '@/services/demo-mode.service';

describe('DemoModeService', () => {
  it('should detect demo mode from environment', () => {
    process.env.NEXT_PUBLIC_DEMO_MODE = 'true';
    expect(demoModeService.isDemoMode()).toBe(true);
  });
  
  it('should validate demo data source', () => {
    const demoData = { _id: 'demo_123', source: 'demo' };
    const isValid = demoModeService.validateDataSource(demoData, 'demo');
    expect(isValid).toBe(true);
  });
});
```

### Integration Tests

```typescript
describe('Mode-aware data fetching', () => {
  it('should use demo data in demo mode', async () => {
    demoModeService.enableDemoMode();
    
    const data = await service.getData();
    expect(data._id).toMatch(/^demo_/);
  });
  
  it('should use Funifier API in production mode', async () => {
    demoModeService.disableDemoMode();
    
    const data = await service.getData();
    expect(data._id).not.toMatch(/^demo_/);
  });
});
```

## Migration Guide

### Updating Existing Services

1. **Import the demo mode service**:
   ```typescript
   import { demoModeService } from '@/services/demo-mode.service';
   ```

2. **Replace hardcoded demo checks**:
   ```typescript
   // Before
   const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
   
   // After
   const isDemoMode = demoModeService.isDemoMode();
   ```

3. **Add data source validation**:
   ```typescript
   const data = await fetchData();
   demoModeService.validateDataSource(data, isDemoMode ? 'demo' : 'funifier');
   ```

4. **Use demo data generators**:
   ```typescript
   // Before
   const mockData = { /* hardcoded data */ };
   
   // After
   import { demoDataService } from '@/services/demo-data.service';
   const demoData = demoDataService.generatePlayerStatus('demo_player_1');
   ```

### Updating Components

1. **Use the useDemoMode hook**:
   ```typescript
   import { useDemoMode } from '@/hooks/useDemoMode';
   
   function MyComponent() {
     const { isDemoMode } = useDemoMode();
     // Use isDemoMode instead of checking environment directly
   }
   ```

2. **Add visual indicators**:
   ```typescript
   {isDemoMode && (
     <div className="demo-indicator">
       Demo Mode Active
     </div>
   )}
   ```

## Best Practices

1. **Always use `demoModeService.isDemoMode()`** instead of checking environment variables directly
2. **Validate data sources** after fetching data
3. **Mark demo data** with `demo_` prefix or `source: 'demo'` field
4. **Log mode-aware operations** for debugging
5. **Never mix demo and production data** in the same response
6. **Clear demo mode** when switching to production
7. **Test both modes** in your integration tests

## Troubleshooting

### Demo data appearing in production

1. Check `demoModeService.getDemoModeConfig()` to see why demo mode is enabled
2. Verify `FUNIFIER_API_KEY` is set and not 'demo'
3. Check localStorage for `demo_mode` flag
4. Clear demo mode cache: `demoModeService.clearCache()`

### Production data appearing in demo mode

1. Verify demo mode is actually enabled: `demoModeService.isDemoMode()`
2. Check if service is using the centralized demo mode service
3. Ensure demo data generators are being called
4. Validate data source after fetching

### Visual indicator not showing

1. Ensure `DemoModeIndicator` is in the layout
2. Check if demo mode is actually enabled
3. Verify the component is client-side (`'use client'`)

## API Reference

### DemoModeService

- `isDemoMode(): boolean` - Check if demo mode is active
- `getDemoModeConfig(): DemoModeConfig` - Get detailed configuration
- `enableDemoMode(): void` - Enable demo mode (client-side)
- `disableDemoMode(): void` - Disable demo mode (client-side)
- `getDataSourceInfo(): DataSourceInfo` - Get current data source
- `validateDataSource(data, expectedSource): boolean` - Validate data source
- `getVisualIndicator(): IndicatorConfig | null` - Get UI indicator config
- `clearCache(): void` - Clear demo mode cache
- `logStatus(): void` - Log current status (debugging)

### useDemoMode Hook

Returns:
- `isDemoMode: boolean` - Current demo mode state
- `enableDemoMode: () => void` - Enable demo mode
- `disableDemoMode: () => void` - Disable demo mode
- `getDataSourceInfo: () => DataSourceInfo` - Get data source info
- `config: DemoModeConfig` - Current configuration

## Related Files

- `src/services/demo-mode.service.ts` - Core demo mode service
- `src/services/demo-data.service.ts` - Demo data generators
- `src/hooks/useDemoMode.ts` - React hook for demo mode
- `src/components/common/DemoModeIndicator.tsx` - Visual indicator
- `src/utils/demo.ts` - Legacy utilities (deprecated)
