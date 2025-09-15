const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    memory: process.memoryUsage(),
    platform: process.platform
  });
});

// Serve uploaded media files
app.use('/media', express.static(process.env.MEDIA_BASE_DIR || '/home/cybersage/Revolution/economic-justice-platform/media', {
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
app.use(express.static('/home/cybersage/Revolution/economic-justice-platform', {
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
  res.sendFile('/home/cybersage/Revolution/economic-justice-platform/index.html');
});

const PORT = process.env.PORT || 3000;

// Initialize database and start server
const startServer = async () => {
  try {
    // Try to initialize database, but continue even if it fails
    try {
      await initDatabase();
    } catch (dbError) {
      console.log('⚠️  Database not available, running in limited mode');
      console.log('ℹ️  Some features requiring database will not work');
    }

    server.listen(PORT, () => {
      console.log(`🚀 Economic Justice API server running on port ${PORT}`);
      console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
      console.log(`❤️  Health Check: http://localhost:${PORT}/api/health`);
      console.log(`🤖 AI Endpoints: http://localhost:${PORT}/api/ai/*`);
      console.log('⚠️  Running in limited mode (no database)');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

module.exports = { app, server, io };