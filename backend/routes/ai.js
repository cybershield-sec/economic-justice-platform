const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const DeepSeekClient = require('../utils/deepseek');
const AIParticipantManager = require('../aip/AIParticipantManager');

const router = express.Router();
const deepseek = new DeepSeekClient();
const aipManager = new AIParticipantManager();

// Analyze story with AI
router.post('/analyze/story/:id', authenticateToken, async (req, res) => {
  try {
    const storyId = parseInt(req.params.id);
    const userId = req.user.userId;

    // In a real implementation, you would fetch the story from database
    // For now, we'll use the request body
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Story content is required' });
    }

    const analysis = await deepseek.analyzeStory(content, userId);
    const parsedAnalysis = deepseek.parseAIResponse(analysis);

    res.json({
      success: true,
      analysis: parsedAnalysis,
      storyId
    });

  } catch (error) {
    console.error('Story analysis error:', error);
    res.status(500).json({
      error: 'AI analysis failed',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Get AI recommendations for user
router.get('/recommendations', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.userId;

    // In a real implementation, you would fetch user profile and stories
    const userProfile = {
      userId,
      interests: req.query.interests ? req.query.interests.split(',') : []
    };

    const storyContext = req.query.context || 'General economic justice interest';

    const recommendations = await deepseek.generateRecommendations(userProfile, storyContext);
    const parsedRecommendations = deepseek.parseAIResponse(recommendations);

    res.json({
      success: true,
      recommendations: parsedRecommendations.recommendations || [],
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Recommendations error:', error);
    res.status(500).json({
      error: 'AI recommendations failed',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Content moderation check
router.post('/moderate', authenticateToken, async (req, res) => {
  try {
    const { content, contentType = 'text' } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required for moderation' });
    }

    const moderation = await deepseek.moderateContent(content, contentType);
    const parsedModeration = deepseek.parseAIResponse(moderation);

    res.json({
      success: true,
      moderation: parsedModeration,
      moderatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Content moderation error:', error);
    res.status(500).json({
      error: 'AI moderation failed',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Community sentiment analysis (admin only)
router.get('/sentiment/community', authenticateToken, async (req, res) => {
  try {
    // This would typically be an admin-only endpoint
    // For now, we'll use sample data
    const sampleStories = [
      { content: "I've been struggling with medical debt and it's overwhelming..." },
      { content: "Our community came together to support a local business..." }
    ];

    const sampleComments = [
      { content: "This is so important! Thank you for sharing." },
      { content: "I've experienced something similar and it's comforting to know I'm not alone." }
    ];

    const sentiment = await deepseek.analyzeCommunitySentiment(sampleStories, sampleComments);
    const parsedSentiment = deepseek.parseAIResponse(sentiment);

    res.json({
      success: true,
      sentiment: parsedSentiment,
      analyzedAt: new Date().toISOString(),
      sampleSize: {
        stories: sampleStories.length,
        comments: sampleComments.length
      }
    });

  } catch (error) {
    console.error('Sentiment analysis error:', error);
    res.status(500).json({
      error: 'AI sentiment analysis failed',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Test endpoint without authentication
router.post('/test/analyze', async (req, res) => {
  try {
    const { content } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const analysis = await deepseek.analyzeStory(content, 'test-user');
    const parsedAnalysis = deepseek.parseAIResponse(analysis);

    res.json({
      success: true,
      analysis: parsedAnalysis,
      note: 'This is a test endpoint - use authenticated endpoints in production'
    });

  } catch (error) {
    console.error('Test analysis error:', error);
    res.status(500).json({
      error: 'AI analysis failed',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Chat endpoint for multi-agent conversations
router.post('/chat', async (req, res) => {
  try {
    const { 
      messages, 
      max_tokens = 300, 
      agent = 'AI Assistant',
      context = {},
      conversationHistory = [],
      participantId = null
    } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    // Get the last user message
    const userMessage = messages[messages.length - 1]?.content || '';
    
    // If participant ID is specified, use that participant
    if (participantId) {
      const response = await aipManager.generateResponse(
        participantId, 
        userMessage, 
        context, 
        conversationHistory
      );
      
      return res.json({
        success: true,
        response: response,
        agent: aipManager.getParticipant(participantId)?.name || agent,
        participantId,
        timestamp: new Date().toISOString()
      });
    }

    // Otherwise, select participant based on message content
    const selectedParticipant = aipManager.selectParticipantForMessage(userMessage);
    const response = await selectedParticipant.generateResponse(
      userMessage, 
      context, 
      conversationHistory
    );

    res.json({
      success: true,
      response: response,
      agent: selectedParticipant.name,
      participantId: selectedParticipant.id,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Chat API error:', error);
    res.status(500).json({
      error: 'AI chat failed',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      response: 'I\'m experiencing technical difficulties. Let me share some insights: Economic justice requires both systemic change and community action. What specific aspect interests you most?'
    });
  }
});

// Endpoint for follow-up responses from other participants
router.post('/chat/followup', async (req, res) => {
  try {
    const { 
      originalMessage, 
      firstResponse, 
      context = {},
      excludeParticipantId = null
    } = req.body;

    if (!originalMessage || !firstResponse) {
      return res.status(400).json({ error: 'Original message and first response are required' });
    }

    const followUpResponse = await aipManager.generateFollowUp(
      originalMessage, 
      firstResponse, 
      context,
      excludeParticipantId
    );

    if (!followUpResponse) {
      return res.json({
        success: true,
        response: null,
        agent: null,
        timestamp: new Date().toISOString()
      });
    }

    // Get the participant who generated the follow-up
    const participant = aipManager.getRandomParticipant(excludeParticipantId);

    res.json({
      success: true,
      response: followUpResponse,
      agent: participant.name,
      participantId: participant.id,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Follow-up API error:', error);
    res.status(500).json({
      error: 'AI follow-up failed',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      response: null
    });
  }
});

// Get list of all AI participants
router.get('/participants', (req, res) => {
  try {
    const participants = aipManager.getAllParticipants();
    res.json({
      success: true,
      participants: participants,
      count: participants.length
    });
  } catch (error) {
    console.error('Participants API error:', error);
    res.status(500).json({
      error: 'Failed to fetch participants',
      message: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// Health check for AI services
router.get('/health', async (req, res) => {
  try {
    // Simple test to check if AI service is configured
    const isConfigured = !!process.env.DEEPSEEK_API_KEY;

    res.json({
      service: 'AI Integration',
      status: isConfigured ? 'configured' : 'not_configured',
      configured: isConfigured,
      model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      service: 'AI Integration',
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;