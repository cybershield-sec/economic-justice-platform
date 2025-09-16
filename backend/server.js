const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

// Monitoring and logging
const logger = require('./utils/logger');
const monitoring = require('./utils/monitoring');

// Function to validate required environment variables
const validateEnvironmentVariables = () => {
  const requiredVars = ['JWT_SECRET'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    logger.error('❌ Missing required environment variables:', { missingVars });
    process.exit(1);
  }
  
  // Validate DATABASE_URL or individual DB variables
  if (!process.env.DATABASE_URL && 
      (!process.env.DB_HOST || !process.env.DB_NAME || !process.env.DB_USER || !process.env.DB_PASSWORD)) {
    logger.warn('⚠️  Database configuration is incomplete. Running in limited mode.');
  }
  
  logger.info('✅ Environment variables validation passed');
};

const { initDatabase } = require('./utils/database');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:8000",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:8000",
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// Analytics tracking middleware
const analyticsRouter = require('./routes/analytics');
app.use((req, res, next) => {
  // Simple request tracking without database dependency for now
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/stories', require('./routes/stories'));
app.use('/api/comments', require('./routes/comments'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/ai', require('./routes/ai'));

// Add monitoring middleware
app.use(monitoring.httpMetricsMiddleware);

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    // Check database health if available
    let dbHealth = 'unknown';
    if (pool) {
      dbHealth = await monitoring.checkDatabaseHealth(pool) ? 'healthy' : 'unhealthy';
    }

    const healthStatus = monitoring.getHealthStatus();

    res.json({
      status: healthStatus.status,
      timestamp: healthStatus.timestamp,
      uptime: healthStatus.uptime,
      environment: process.env.NODE_ENV || 'development',
      memory: healthStatus.memory,
      platform: process.platform,
      components: healthStatus.components,
      version: healthStatus.version
  });
});

// Metrics endpoint for Prometheus
app.get('/api/metrics', async (req, res) => {
  try {
    res.set('Content-Type', monitoring.register.contentType);
    res.end(await monitoring.register.metrics());
  } catch (error) {
    res.status(500).json({ error: 'Failed to collect metrics' });
  }
});

// Serve uploaded media files
app.use('/media', express.static(process.env.MEDIA_BASE_DIR || path.join(__dirname, '..', 'media'), {
  maxAge: '1y', // Cache for 1 year
  setHeaders: (res, path) => {
    if (path.endsWith('.mp4') || path.endsWith('.webm')) {
      res.setHeader('Content-Type', 'video/mp4');
    }
  }
}));

// API documentation
app.get('/api-docs', (req, res) => {
  res.json({
    message: 'Economic Justice Platform API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      stories: '/api/stories',
      comments: '/api/comments',
      analytics: '/api/analytics',
      upload: '/api/upload'
    },
    documentation: 'Swagger UI will be available at /api-docs in future versions'
  });
});

// Socket.io real-time communication
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-story', (storyId) => {
    socket.join(`story-${storyId}`);
  });

  socket.on('new-comment', (data) => {
    socket.to(`story-${data.storyId}`).emit('comment-added', data);
  });

  socket.on('story-published', (story) => {
    socket.broadcast.emit('new-story', story);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// Serve static frontend files
app.use(express.static(process.env.FRONTEND_BASE_DIR || path.join(__dirname, '..'), {
  index: ['index.html', 'index.htm'],
  extensions: ['html', 'htm']
}));

// 404 handler - serve index.html for SPA routing
app.use('*', (req, res) => {
  // If it's an API route, return JSON error
  if (req.originalUrl.startsWith('/api/')) {
    return res.status(404).json({ error: 'Endpoint not found' });
  }

  // For frontend routes, serve the main HTML file
  res.sendFile(path.join(process.env.FRONTEND_BASE_DIR || __dirname, '..', 'index.html'));
});

const PORT = process.env.PORT || 3000;

// Initialize database and start server
const startServer = async () => {
  try {
    // Validate environment variables first
    validateEnvironmentVariables();
    
    // Try to initialize database, but continue even if it fails
    try {
      await initDatabase();
      logger.info('✅ Database initialization completed');
    } catch (dbError) {
      logger.warn('⚠️  Database not available, running in limited mode');
      logger.warn('Database connection error:', { error: dbError.message });
    }

    server.listen(PORT, () => {
      logger.info(`🚀 Economic Justice API server running on port ${PORT}`);
      logger.info(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
      logger.info(`❤️  Health Check: http://localhost:${PORT}/api/health`);
      logger.info(`🤖 AI Endpoints: http://localhost:${PORT}/api/ai/*`);
      if (!process.env.DATABASE_URL &&
          (!process.env.DB_HOST || !process.env.DB_NAME || !process.env.DB_USER || !process.env.DB_PASSWORD)) {
        logger.warn('⚠️  Running in limited mode (no database)');
      }
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', { error: error.message, stack: error.stack });
    process.exit(1);
  }
};

startServer();

module.exports = { app, server, io };