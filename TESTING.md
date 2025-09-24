# Testing Guide

This document outlines the comprehensive testing strategy for the White-Label Gamification Platform.

## Testing Architecture

The testing suite is organized into four main categories:

### 1. Unit Tests
- **Location**: `src/**/__tests__/*.test.ts|tsx`
- **Framework**: Vitest + Testing Library
- **Purpose**: Test individual components, hooks, and utility functions
- **Run**: `npm run test:unit`

### 2. Integration Tests
- **Location**: `src/app/api/__tests__/*.integration.test.ts`
- **Framework**: Vitest
- **Purpose**: Test API routes and service integrations
- **Run**: `npm run test:integration`

### 3. End-to-End Tests
- **Location**: `e2e/*.spec.ts`
- **Framework**: Playwright
- **Purpose**: Test complete user journeys and workflows
- **Run**: `npm run test:e2e`

### 4. Service Layer Tests
- **Location**: `src/services/__tests__/*.test.ts`
- **Framework**: Vitest
- **Purpose**: Test business logic and external service integrations
- **Run**: Included in `npm run test:unit`

## Test Coverage

### Unit Tests Coverage

#### Components
- ✅ Dashboard Components
  - `DashboardContainer` - Loading states, data display, error handling
  - `GoalCard` - Goal rendering, progress indicators, boost states
  - `PointsDisplay` - Point formatting, locked states
  - `CycleProgress` - Progress calculation and display

- ✅ Ranking Components
  - `PersonalRankingCard` - Player data, position changes, avatars
  - `RankingNavigation` - Leaderboard switching, view toggles
  - `RaceVisualization` - Race track rendering, player positions
  - `ContextualRanking` - Top players, current user context

- ✅ Error Components
  - `ErrorBoundary` - Error catching, fallback rendering, retry logic
  - `ErrorDisplay` - Error formatting, action buttons, details

- ✅ Feedback Components
  - `Toast` - Message display, auto-close, user interactions
  - `ToastContainer` - Toast management, positioning

- ✅ Loading Components
  - `LoadingSpinner` - Animation states, sizes
  - `ProgressBar` - Progress indication, animations
  - `SkeletonLoader` - Content placeholders

#### Hooks
- ✅ `useLoadingState` - Loading management, progress tracking, timeouts
- ✅ `useTheme` - Theme switching, branding application
- ✅ `useDashboardData` - Data fetching, caching, error handling
- ✅ `useRankingData` - Ranking data management
- ✅ `useAuth` - Authentication state management

#### Services
- ✅ **Funifier Integration**
  - `FunifierApiClient` - API communication, error handling
  - `FunifierAuthService` - Authentication, token management
  - `FunifierDatabaseService` - Database operations
  - `FunifierPlayerService` - Player data retrieval

- ✅ **Data Processing**
  - `DashboardProcessor` - Dashboard data transformation
  - `RankingDataProcessor` - Ranking calculations
  - `TeamProcessor` - Team data processing

- ✅ **Caching**
  - `RedisCacheService` - Redis operations, fallback handling
  - `DashboardCacheService` - Dashboard-specific caching
  - `RankingCacheService` - Ranking data caching

- ✅ **Configuration**
  - `WhiteLabelConfigService` - Configuration management
  - `FeatureToggleService` - Feature flag management
  - `BrandingService` - Branding configuration

- ✅ **Error Handling**
  - `ErrorLoggerService` - Error logging, metrics
  - `FallbackManagerService` - Fallback strategies
  - `HealthMonitorService` - System health monitoring

#### Utilities
- ✅ `utils` - Number formatting, text manipulation, debouncing
- ✅ `validation` - Input validation, schema checking
- ✅ `encryption` - Data encryption/decryption
- ✅ `auth` - Authentication utilities

### Integration Tests Coverage

#### API Routes
- ✅ **Setup Endpoints**
  - `POST /api/setup` - Demo and Funifier setup flows
  - Validation, error handling, credential testing

- ✅ **Dashboard Endpoints**
  - `GET /api/dashboard/player/[playerId]` - Player data retrieval
  - Caching, error handling, authentication

- ✅ **Ranking Endpoints**
  - `GET /api/ranking/leaderboards` - Leaderboard listing
  - `GET /api/ranking/[id]/personal/[playerId]` - Personal rankings
  - `GET /api/ranking/[id]/global` - Global rankings

- ✅ **Admin Endpoints**
  - Feature management APIs
  - Branding configuration APIs
  - Funifier credentials testing

### End-to-End Tests Coverage

#### User Journeys
- ✅ **Initial Setup Flow**
  - First-time setup experience
  - Demo mode selection
  - Funifier credentials configuration
  - Setup validation and error handling

- ✅ **Dashboard Experience**
  - Dashboard data loading and display
  - Goal progress visualization
  - Points and cycle progress
  - Navigation to ranking

- ✅ **Ranking Experience**
  - Race visualization
  - Personal vs global views
  - Leaderboard switching
  - Position tracking

- ✅ **Admin Panel**
  - Admin authentication
  - Feature toggle management
  - Branding configuration
  - Funifier settings management

#### Cross-Browser Testing
- ✅ Chrome/Chromium
- ✅ Firefox
- ✅ Safari/WebKit
- ✅ Mobile Chrome
- ✅ Mobile Safari

## Running Tests

### All Tests
```bash
npm run test:all
```

### Individual Test Suites
```bash
# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# E2E tests only
npm run test:e2e

# E2E tests with UI
npm run test:e2e:ui

# Watch mode for development
npm run test:watch

# Coverage report
npm run test:coverage
```

### Specific Test Files
```bash
# Run specific unit test
npx vitest src/components/dashboard/__tests__/DashboardContainer.test.tsx

# Run specific E2E test
npx playwright test e2e/dashboard.spec.ts

# Run tests matching pattern
npx vitest --run dashboard
```

## Test Configuration

### Vitest Configuration
- **File**: `vitest.config.ts`
- **Environment**: jsdom for React components
- **Setup**: `src/test/setup.ts`
- **Mocks**: Next.js router, global APIs

### Playwright Configuration
- **File**: `playwright.config.ts`
- **Browsers**: Chromium, Firefox, WebKit, Mobile
- **Base URL**: `http://localhost:3000`
- **Retries**: 2 on CI, 0 locally

## Mocking Strategy

### External Services
- **Funifier API**: Mocked responses for all endpoints
- **Redis**: In-memory fallback for caching tests
- **File System**: Virtual file system for configuration tests

### Next.js Features
- **Router**: Mocked navigation functions
- **API Routes**: Mocked for component tests
- **Environment Variables**: Test-specific values

### Browser APIs
- **Fetch**: Mocked for service tests
- **LocalStorage**: Mocked for persistence tests
- **Timers**: Fake timers for timeout tests

## Test Data Management

### Mock Data
- **Location**: `src/test/mocks/`
- **Types**: Player data, ranking data, configuration data
- **Usage**: Consistent test data across all test types

### Test Fixtures
- **Location**: `e2e/fixtures/`
- **Purpose**: E2E test data setup
- **Format**: JSON files with realistic data

## Continuous Integration

### GitHub Actions
```yaml
- name: Run Tests
  run: |
    npm run test:unit
    npm run test:integration
    npm run test:e2e
```

### Test Requirements
- **Unit Tests**: Must pass with 90%+ coverage
- **Integration Tests**: Must pass all API endpoint tests
- **E2E Tests**: Must pass all critical user journeys

## Best Practices

### Writing Tests
1. **Arrange-Act-Assert**: Clear test structure
2. **Descriptive Names**: Test names explain what is being tested
3. **Single Responsibility**: One assertion per test when possible
4. **Mock External Dependencies**: Isolate units under test
5. **Test Edge Cases**: Error conditions, boundary values

### Test Maintenance
1. **Keep Tests Fast**: Unit tests < 100ms, integration < 1s
2. **Avoid Test Interdependence**: Tests should run independently
3. **Update Tests with Code**: Tests are part of the codebase
4. **Regular Test Review**: Remove obsolete tests, add missing coverage

### Debugging Tests
1. **Use Test UI**: `npm run test:ui` for interactive debugging
2. **Playwright Trace**: `--trace on` for E2E debugging
3. **Console Logs**: Strategic logging in test failures
4. **Isolation**: Run single tests to isolate issues

## Coverage Goals

- **Unit Tests**: 90%+ line coverage
- **Integration Tests**: 100% API endpoint coverage
- **E2E Tests**: 100% critical user journey coverage
- **Overall**: 85%+ combined coverage

## Reporting

### Coverage Reports
- **Format**: HTML, JSON, LCOV
- **Location**: `coverage/` directory
- **CI Integration**: Coverage uploaded to code coverage service

### Test Results
- **Format**: JUnit XML for CI integration
- **Screenshots**: Playwright captures on failure
- **Videos**: E2E test recordings for debugging

This comprehensive testing strategy ensures the reliability, maintainability, and quality of the White-Label Gamification Platform across all layers of the application.