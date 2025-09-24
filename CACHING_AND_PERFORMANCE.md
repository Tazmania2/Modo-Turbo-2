# Caching and Performance Optimization

This document describes the comprehensive caching and performance optimization system implemented for the white-label gamification platform.

## Overview

The platform implements a multi-layered caching strategy with Redis as the primary cache, in-memory fallback caching, and comprehensive performance monitoring. The system is designed to handle the 5-second maximum response time requirement while providing real-time cache invalidation and performance insights.

## Architecture

### Cache Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    Application Layer                        │
├─────────────────────────────────────────────────────────────┤
│              Enhanced Cache Manager                         │
├─────────────────────────────────────────────────────────────┤
│  Redis Cache    │  Dashboard Cache  │  Ranking Cache        │
│  (Primary)      │  (Memory)         │  (Memory)             │
├─────────────────────────────────────────────────────────────┤
│              Performance Monitor                            │
├─────────────────────────────────────────────────────────────┤
│                    Funifier API                            │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

1. **Redis Cache Service** - Distributed caching with automatic fallback
2. **Enhanced Cache Manager** - Intelligent cache orchestration
3. **Performance Monitor** - Comprehensive metrics and alerting
4. **Cache Invalidation System** - Real-time cache updates
5. **Performance Middleware** - Request tracking and optimization

## Cache Services

### Redis Cache Service

Primary distributed cache with automatic failover to in-memory cache.

**Features:**
- Automatic Redis connection management
- Fallback to in-memory cache when Redis is unavailable
- Batch operations (mget, mset)
- Pattern-based cache invalidation
- Health monitoring and metrics
- Configurable TTL and compression

**Configuration:**
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_KEY_PREFIX=wlgp:
```

**Usage:**
```typescript
import { redisCacheService } from '@/services/redis-cache.service';

// Set data with TTL
await redisCacheService.set('key', data, 300); // 5 minutes

// Get data
const data = await redisCacheService.get('key');

// Batch operations
const results = await redisCacheService.mget(['key1', 'key2']);
```

### Enhanced Cache Manager

Orchestrates all caching layers with intelligent strategies.

**Cache Strategies:**
- `dashboard_data`: 5 minutes TTL, Redis + Memory
- `ranking_data`: 2 minutes TTL, Redis + Memory, Compressed
- `personal_ranking`: 1 minute TTL, Redis only
- `config_data`: 10 minutes TTL, Redis + Memory
- `history_data`: 30 minutes TTL, Redis only, Compressed

**Usage:**
```typescript
import { enhancedCacheManager } from '@/services/enhanced-cache-manager.service';

// Get data with strategy
const data = await enhancedCacheManager.get(
  'dashboard:player:123',
  'dashboard_data',
  async () => {
    // Fetch function called on cache miss
    return await fetchFromFunifier();
  }
);
```

### Dashboard Cache Service

Specialized caching for dashboard data with intelligent invalidation.

**Features:**
- Hierarchical cache keys
- Automatic invalidation rules
- Performance metrics
- Cache warming strategies
- Maintenance and cleanup

### Ranking Cache Service

Optimized caching for ranking and leaderboard data.

**Features:**
- Leaderboard-specific caching
- Personal ranking optimization
- Memory usage monitoring
- Automatic cleanup
- Query result caching

## Performance Monitoring

### Performance Monitor Service

Comprehensive performance tracking with Prometheus metrics.

**Metrics Tracked:**
- Cache hit/miss rates
- API response times
- Funifier API performance
- Memory usage
- Load times (dashboard, ranking)
- Error rates
- Active connections

**Alerts:**
- Low cache hit rate (< 80%)
- High API response time (> 5s)
- High memory usage (> 512MB)
- High error rate (> 5%)
- Slow load times

**Usage:**
```typescript
import { performanceMonitor } from '@/services/performance-monitor.service';

// Record metrics
performanceMonitor.recordCacheHit('redis', 'dashboard', 50);
performanceMonitor.recordApiRequest('GET', '/api/dashboard', 200, 150);
performanceMonitor.recordDashboardLoadTime('carteira_i', 'player123', 2500);

// Get metrics
const metrics = performanceMonitor.getMetrics();
const alerts = performanceMonitor.getUnresolvedAlerts();
```

### Performance Middleware

Automatic performance tracking for API requests.

**Features:**
- Request/response time tracking
- Error rate monitoring
- Request ID generation
- Performance headers
- Rate limiting based on performance

## Cache Invalidation

### Real-time Invalidation

Intelligent cache invalidation based on data changes.

**Invalidation Events:**
- `player_update`: Invalidates player-specific data
- `team_change`: Invalidates team-related data
- `leaderboard_update`: Invalidates ranking data
- `config_change`: Invalidates configuration data
- `manual`: Manual cache clearing

**Usage with React Hook:**
```typescript
import { useCacheInvalidation } from '@/hooks/useCacheInvalidation';

function PlayerComponent({ playerId }) {
  const { invalidatePlayer } = useCacheInvalidation();
  
  const handleUpdate = async () => {
    await updatePlayer(playerId);
    invalidatePlayer(playerId); // Automatic cache invalidation
  };
}
```

### Batch Invalidation

Efficient batch processing of invalidation events.

**Features:**
- Configurable batch size and delay
- Automatic batching of similar events
- Queue processing with error handling
- Performance optimization

## API Endpoints

### Cache Management

**GET /api/cache/stats**
- Returns comprehensive cache statistics
- Includes performance metrics and alerts
- Health status and recommendations

**POST /api/cache/invalidate**
- Trigger cache invalidation
- Supports scoped invalidation (player, team, global)
- Batch invalidation support

**POST /api/cache/warmup**
- Trigger cache warmup process
- Pre-loads frequently accessed data
- Performance optimization

**DELETE /api/cache/invalidate**
- Clear all caches
- Emergency cache reset
- System maintenance

### Performance Monitoring

**GET /api/performance/metrics**
- Prometheus-formatted metrics
- JSON format support
- Real-time performance data

**PATCH /api/performance/alerts/[alertId]**
- Resolve performance alerts
- Alert management
- Notification system

## Configuration

### Environment Variables

```env
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_KEY_PREFIX=wlgp:

# Performance Monitoring
ENABLE_PERFORMANCE_MONITORING=true
PERFORMANCE_METRICS_ENDPOINT=/api/performance/metrics

# Cache Configuration
CACHE_DEFAULT_TTL=300
CACHE_MAX_SIZE=1000
ENABLE_CACHE_COMPRESSION=false
```

### Cache Strategies

Cache strategies can be configured per data type:

```typescript
const strategies = {
  dashboard_data: {
    ttl: 300, // 5 minutes
    useRedis: true,
    useMemory: true,
    compressionEnabled: false
  },
  ranking_data: {
    ttl: 120, // 2 minutes
    useRedis: true,
    useMemory: true,
    compressionEnabled: true
  }
};
```

## Performance Optimization

### Cache Warming

Proactive cache loading for frequently accessed data.

**Strategies:**
- Startup warming: Load critical data on application start
- Periodic warming: Refresh data at regular intervals
- Predictive warming: Load data based on usage patterns

**Configuration:**
```typescript
const warmupConfig = {
  enabled: true,
  strategies: {
    dashboard: true,
    ranking: true,
    config: true
  },
  schedules: {
    startup: true,
    periodic: true,
    intervalMinutes: 30
  }
};
```

### Load Time Optimization

**Target Performance:**
- Dashboard load: < 3 seconds
- Ranking load: < 2 seconds
- API response: < 5 seconds
- Cache hit rate: > 80%

**Optimization Techniques:**
- Intelligent cache strategies
- Data compression
- Batch operations
- Connection pooling
- Query optimization

### Memory Management

**Memory Optimization:**
- Automatic cleanup of expired entries
- LRU eviction policies
- Memory usage monitoring
- Garbage collection optimization

## Monitoring and Alerting

### Health Checks

Regular health monitoring of all cache services:

```typescript
const health = await redisCacheService.healthCheck();
// Returns: { redis: { connected: true, latency: 5 }, fallback: { operational: true } }
```

### Performance Reports

Comprehensive performance analysis:

```typescript
const report = await enhancedCacheManager.getPerformanceReport();
// Returns detailed metrics, recommendations, and health status
```

### Alerts and Notifications

Automatic alerting for performance issues:

- **Warning**: Cache hit rate below 80%
- **Error**: API response time above 5 seconds
- **Critical**: Memory usage above 512MB

## Best Practices

### Cache Key Design

Use hierarchical, descriptive cache keys:

```typescript
// Good
'dashboard:player:123:carteira_i'
'ranking:leaderboard:456:personal:123'
'config:instance:789:branding'

// Avoid
'data123'
'cache_key'
'temp'
```

### TTL Strategy

Choose appropriate TTL values based on data volatility:

- **Real-time data**: 1-2 minutes
- **User data**: 5-10 minutes
- **Configuration**: 10-30 minutes
- **Historical data**: 1+ hours

### Error Handling

Always implement graceful fallbacks:

```typescript
try {
  const data = await cacheService.get(key);
  if (!data) {
    return await fetchFromSource();
  }
  return data;
} catch (error) {
  console.error('Cache error:', error);
  return await fetchFromSource(); // Fallback to source
}
```

### Performance Monitoring

Regularly monitor and optimize:

- Review cache hit rates weekly
- Monitor response times daily
- Set up automated alerts
- Analyze performance trends

## Troubleshooting

### Common Issues

**Redis Connection Issues:**
- Check Redis server status
- Verify network connectivity
- Review connection configuration
- Monitor connection pool

**Low Cache Hit Rates:**
- Review TTL values
- Check invalidation logic
- Analyze access patterns
- Optimize cache keys

**High Memory Usage:**
- Enable compression
- Reduce cache size limits
- Implement cleanup policies
- Monitor memory leaks

**Slow Response Times:**
- Optimize cache strategies
- Review query patterns
- Check network latency
- Analyze bottlenecks

### Debug Tools

**Cache Statistics:**
```bash
curl http://localhost:3000/api/cache/stats
```

**Performance Metrics:**
```bash
curl http://localhost:3000/api/performance/metrics
```

**Health Check:**
```typescript
const health = await redisCacheService.healthCheck();
console.log('Cache Health:', health);
```

## Testing

### Unit Tests

Comprehensive test coverage for all cache services:

```bash
npm test src/services/__tests__/redis-cache.service.test.ts
npm test src/services/__tests__/performance-monitor.service.test.ts
npm test src/services/__tests__/enhanced-cache-manager.service.test.ts
```

### Integration Tests

Test cache integration with Funifier APIs:

```bash
npm test src/services/__tests__/cache-integration.test.ts
```

### Performance Tests

Load testing and performance validation:

```bash
npm run test:performance
```

## Deployment

### Production Configuration

Recommended production settings:

```env
# Redis (Production)
REDIS_HOST=redis.production.com
REDIS_PORT=6379
REDIS_PASSWORD=secure_password
REDIS_DB=0

# Performance
ENABLE_PERFORMANCE_MONITORING=true
CACHE_DEFAULT_TTL=300
CACHE_MAX_SIZE=5000
ENABLE_CACHE_COMPRESSION=true
```

### Monitoring Setup

Set up monitoring dashboards:

1. **Prometheus**: Metrics collection
2. **Grafana**: Visualization dashboards
3. **AlertManager**: Alert notifications
4. **Health Checks**: Automated monitoring

### Scaling Considerations

For high-traffic deployments:

- Use Redis Cluster for horizontal scaling
- Implement cache sharding strategies
- Set up Redis replication
- Monitor memory usage and scaling triggers
- Consider CDN for static assets

## Conclusion

The caching and performance optimization system provides:

✅ **Sub-5 second response times**  
✅ **Intelligent cache invalidation**  
✅ **Comprehensive performance monitoring**  
✅ **Automatic failover and recovery**  
✅ **Real-time metrics and alerting**  
✅ **Scalable architecture**  

This implementation ensures optimal performance while maintaining data consistency and providing detailed insights into system behavior.