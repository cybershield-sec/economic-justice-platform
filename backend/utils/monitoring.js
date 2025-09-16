const client = require('prom-client');
const logger = require('./logger');

// Create a Registry to register metrics
const register = new client.Registry();

// Add default metrics (CPU, memory, etc.)
client.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5]
});

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});

const databaseQueryDuration = new client.Histogram({
  name: 'database_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation', 'table'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1]
});

const activeConnections = new client.Gauge({
  name: 'active_connections',
  help: 'Number of active connections'
});

const networkPeers = new client.Gauge({
  name: 'network_peers_total',
  help: 'Total number of network peers',
  labelNames: ['status']
});

const memoryUsage = new client.Gauge({
  name: 'process_memory_usage_bytes',
  help: 'Memory usage of the process',
  labelNames: ['type']
});

// Register all metrics
register.registerMetric(httpRequestDuration);
register.registerMetric(httpRequestsTotal);
register.registerMetric(databaseQueryDuration);
register.registerMetric(activeConnections);
register.registerMetric(networkPeers);
register.registerMetric(memoryUsage);

// Function to update memory usage metrics
function updateMemoryMetrics() {
  const memory = process.memoryUsage();
  memoryUsage.set({ type: 'rss' }, memory.rss);
  memoryUsage.set({ type: 'heap_total' }, memory.heapTotal);
  memoryUsage.set({ type: 'heap_used' }, memory.heapUsed);
  memoryUsage.set({ type: 'external' }, memory.external);
}

// Update memory metrics every 30 seconds
setInterval(updateMemoryMetrics, 30000);
updateMemoryMetrics();

// Health check status
let isDatabaseHealthy = false;
let isRedisHealthy = false;
let isNetworkHealthy = false;

// Health check functions
async function checkDatabaseHealth(pool) {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    isDatabaseHealthy = true;
    return true;
  } catch (error) {
    isDatabaseHealthy = false;
    logger.error('Database health check failed', { error: error.message });
    return false;
  }
}

async function checkRedisHealth(redisClient) {
  try {
    await redisClient.ping();
    isRedisHealthy = true;
    return true;
  } catch (error) {
    isRedisHealthy = false;
    logger.error('Redis health check failed', { error: error.message });
    return false;
  }
}

function checkNetworkHealth() {
  // This would check network connectivity
  // For now, we'll assume it's healthy if the server is running
  isNetworkHealthy = true;
  return true;
}

// Get overall health status
function getHealthStatus() {
  return {
    status: isDatabaseHealthy && isRedisHealthy && isNetworkHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    components: {
      database: isDatabaseHealthy ? 'healthy' : 'unhealthy',
      redis: isRedisHealthy ? 'healthy' : 'unhealthy',
      network: isNetworkHealthy ? 'healthy' : 'unhealthy',
      api: 'healthy'
    },
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: process.env.npm_package_version || '1.0.0'
  };
}

// Middleware to track HTTP requests
function httpMetricsMiddleware(req, res, next) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route ? req.route.path : req.path;

    httpRequestDuration.observe({
      method: req.method,
      route: route,
      status_code: res.statusCode
    }, duration);

    httpRequestsTotal.inc({
      method: req.method,
      route: route,
      status_code: res.statusCode
    });
  });

  next();
}

// Database query timing wrapper
function trackDatabaseQuery(operation, table, queryFn) {
  const start = Date.now();

  return queryFn().then(result => {
    const duration = (Date.now() - start) / 1000;
    databaseQueryDuration.observe({ operation, table }, duration);
    return result;
  }).catch(error => {
    const duration = (Date.now() - start) / 1000;
    databaseQueryDuration.observe({ operation, table }, duration);
    throw error;
  });
}

module.exports = {
  register,
  httpRequestDuration,
  httpRequestsTotal,
  databaseQueryDuration,
  activeConnections,
  networkPeers,
  memoryUsage,
  checkDatabaseHealth,
  checkRedisHealth,
  checkNetworkHealth,
  getHealthStatus,
  httpMetricsMiddleware,
  trackDatabaseQuery,
  updateMemoryMetrics
};