// backend/server.js or backend/app.js
// Main server file with AI routes integration

const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files from frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Import AI routes
const aiRoutes = require('./routes/ai');

// Mount AI routes
app.use('/api/ai', aiRoutes);

// Serve the chat interface
app.get('/chat', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/multi-agent-chat.html'));
});

// Default route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    ai_configured: !!process.env.DEEPSEEK_API_KEY
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    details: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`💬 Chat interface: http://localhost:${PORT}/chat`);
  console.log(`🔍 Health check: http://localhost:${PORT}/health`);
  console.log(`🤖 AI Health check: http://localhost:${PORT}/api/ai/health`);
  
  if (!process.env.DEEPSEEK_API_KEY) {
    console.warn('⚠️  DeepSeek API key not configured. AI features will not work.');
    console.warn('   Add DEEPSEEK_API_KEY to your .env file');
  } else {
    console.log('✅ DeepSeek API configured');
  }
});

module.exports = app;