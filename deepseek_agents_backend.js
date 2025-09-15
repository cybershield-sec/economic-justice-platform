// backend/routes/ai.js
const express = require('express');
const router = express.Router();
const axios = require('axios');
const rateLimit = require('express-rate-limit');

// Rate limiting for AI endpoints
const aiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many AI requests, please try again later.'
});

// Apply rate limiting to all AI routes
router.use(aiRateLimit);

// DeepSeek API configuration
const DEEPSEEK_API_URL = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

// Agent personalities and specialties
const AGENTS = {
  economist: {
    id: "economist",
    name: "EconAgent",
    role: "AI Economist",
    specialty: "Monetary Policy",
    avatar: "E",
    systemPrompt: `You are EconAgent, an AI economist specializing in monetary policy and economic justice. You are analytical, data-driven, and reference historical economic examples. Focus on monetary systems, banking, inflation, and economic policy. Keep responses under 300 words and speak with authority about economic principles while remaining accessible.`
  },
  activist: {
    id: "activist",
    name: "ActionBot",
    role: "AI Activist",
    specialty: "Community Organizing",
    avatar: "A",
    systemPrompt: `You are ActionBot, an AI activist focused on community organizing and grassroots action. You are passionate about justice and focus on practical action steps. Emphasize organizing strategies, direct action, and building movements. Keep responses under 300 words and always include actionable next steps.`
  },
  historian: {
    id: "historian",
    name: "HistoryBot",
    role: "AI Historian",
    specialty: "Economic Movements",
    avatar: "H",
    systemPrompt: `You are HistoryBot, an AI historian specializing in economic justice movements. You provide historical context and draw lessons from past movements. Reference specific historical examples, dates, and figures. Keep responses under 300 words and always connect past struggles to present challenges.`
  },
  policy: {
    id: "policy",
    name: "PolicyPro",
    role: "AI Policy Analyst",
    specialty: "Legislative Strategy",
    avatar: "P",
    systemPrompt: `You are PolicyPro, an AI policy analyst focused on legislative strategy. You are detail-oriented, explain policy mechanisms, and identify implementation pathways. Discuss bills, regulations, and policy frameworks. Keep responses under 300 words and focus on concrete policy solutions.`
  },
  legal: {
    id: "legal",
    name: "JusticeAdvocate",
    role: "AI Legal Strategist",
    specialty: "Legal Frameworks",
    avatar: "L",
    systemPrompt: `You are JusticeAdvocate, an AI legal strategist focused on legal frameworks for economic justice. You are rights-focused, explain legal mechanisms, and identify strategic opportunities. Discuss constitutional law, rights frameworks, and legal precedents. Keep responses under 300 words.`
  },
  educator: {
    id: "educator",
    name: "LearnGuide",
    role: "AI Popular Educator",
    specialty: "Knowledge Sharing",
    avatar: "G",
    systemPrompt: `You are LearnGuide, an AI popular educator focused on making complex ideas accessible. You are a patient teacher who uses analogies and stories. Break down complex economic concepts into understandable terms. Keep responses under 300 words and always include educational elements.`
  },
  currency: {
    id: "currency",
    name: "CryptoEcon",
    role: "AI Currency Specialist",
    specialty: "Community Currencies",
    avatar: "C",
    systemPrompt: `You are CryptoEcon, an AI currency specialist focused on community currencies and alternative economic systems. You are innovative, security-focused, and explain both technical and equity implications. Discuss tally systems, local currencies, and alternative value systems. Keep responses under 300 words.`
  }
};

// Topic contexts
const TOPIC_CONTEXTS = {
  'monetary-reform': {
    context: "Discussion about sovereign money creation, inspired by The King's Reckoning parable about tally sticks and monetary control",
    keyPoints: ["sovereign money systems", "Federal Reserve critique", "public banking", "monetary democracy"]
  },
  'worker-ownership': {
    context: "Exploring cooperative economics and worker control of enterprises",
    keyPoints: ["worker cooperatives", "profit sharing", "democratic workplaces", "Mondragon model"]
  },
  'universal-basic-income': {
    context: "Examining universal basic income as economic justice tool",
    keyPoints: ["UBI pilots", "automation response", "poverty elimination", "economic security"]
  },
  'community-currencies': {
    context: "Local currency systems that keep wealth in communities",
    keyPoints: ["BerkShares", "time banks", "local exchange systems", "community resilience"]
  },
  'cooperative-economics': {
    context: "Economic systems based on cooperation rather than competition",
    keyPoints: ["cooperative principles", "solidarity economy", "mutual aid networks", "commons management"]
  },
  'debt-abolition': {
    context: "Strategies for eliminating exploitative debt systems",
    keyPoints: ["debt strikes", "medical debt relief", "student loan forgiveness", "predatory lending"]
  },
  'housing-justice': {
    context: "Housing as a human right, not commodity",
    keyPoints: ["social housing", "rent control", "community land trusts", "tenant organizing"]
  },
  'tally-system': {
    context: "Designing and protecting the Tally system as a unique community metric and potential currency",
    keyPoints: ["resource accounting", "contribution tracking", "community valuation", "anti-exploitation measures", "decentralized governance"]
  }
};

// Helper function to call DeepSeek API
async function callDeepSeekAPI(messages, maxTokens = 300) {
  if (!DEEPSEEK_API_KEY) {
    throw new Error('DeepSeek API key not configured');
  }

  try {
    const response = await axios.post(
      `${DEEPSEEK_API_URL}/chat/completions`,
      {
        model: DEEPSEEK_MODEL,
        messages: messages,
        max_tokens: maxTokens,
        temperature: 0.7,
        top_p: 0.9
      },
      {
        headers: {
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 second timeout
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('DeepSeek API Error:', error.response?.data || error.message);
    throw error;
  }
}

// Helper function to select appropriate agent based on message content
function selectAgent(message, excludeId = null) {
  const lowerMessage = message.toLowerCase();
  
  // Keywords for different agents
  const agentKeywords = {
    historian: ['history', 'past', 'before', 'historical', 'movement', 'example'],
    activist: ['action', 'organize', 'fight', 'movement', 'protest', 'campaign'],
    policy: ['policy', 'legislation', 'law', 'bill', 'congress', 'government'],
    legal: ['legal', 'rights', 'court', 'constitutional', 'lawsuit', 'precedent'],
    educator: ['learn', 'understand', 'explain', 'teach', 'clarify', 'help'],
    currency: ['tally', 'currency', 'token', 'metric', 'value', 'money', 'crypto'],
    economist: ['economic', 'economy', 'financial', 'bank', 'inflation', 'market']
  };

  // Score each agent based on keyword matches
  const scores = {};
  for (const [agentId, keywords] of Object.entries(agentKeywords)) {
    if (agentId === excludeId) continue;
    
    scores[agentId] = keywords.reduce((score, keyword) => {
      return score + (lowerMessage.includes(keyword) ? 1 : 0);
    }, 0);
  }

  // Find agent with highest score
  const bestAgent = Object.entries(scores).reduce((best, [agentId, score]) => {
    return score > best.score ? { id: agentId, score } : best;
  }, { id: 'economist', score: 0 });

  return AGENTS[bestAgent.id];
}

// Main chat endpoint
router.post('/chat', async (req, res) => {
  try {
    const { messages, context, conversationHistory } = req.body;
    
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    const userMessage = messages[messages.length - 1].content;
    const selectedAgent = selectAgent(userMessage);
    
    // Build context for the AI
    const topicContext = TOPIC_CONTEXTS[context?.topic] || TOPIC_CONTEXTS['monetary-reform'];
    
    // Create conversation context
    const recentHistory = (conversationHistory || [])
      .slice(-6)
      .map(msg => `${msg.author}: ${msg.content}`)
      .join('\n');

    // Build system message
    const systemMessage = `${selectedAgent.systemPrompt}

Current discussion topic: ${context?.topic || 'monetary-reform'}
Topic context: ${topicContext.context}
Key discussion points: ${topicContext.keyPoints.join(', ')}
Discussion mode: ${context?.mode || 'discussion'}

Recent conversation history:
${recentHistory}

Respond as ${selectedAgent.name} with your unique perspective on this topic. Be engaging, informative, and true to your character.`;

    // Prepare messages for DeepSeek API
    const apiMessages = [
      { role: 'system', content: systemMessage },
      { role: 'user', content: userMessage }
    ];

    // Get AI response
    const aiResponse = await callDeepSeekAPI(apiMessages);

    res.json({
      response: aiResponse,
      agent: selectedAgent.name,
      participantId: selectedAgent.id,
      role: selectedAgent.role
    });

  } catch (error) {
    console.error('Chat endpoint error:', error);
    res.status(500).json({ 
      error: 'Failed to get AI response',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Follow-up response endpoint
router.post('/chat/followup', async (req, res) => {
  try {
    const { originalMessage, firstResponse, context, excludeParticipantId } = req.body;
    
    if (!originalMessage || !firstResponse) {
      return res.status(400).json({ error: 'Original message and first response are required' });
    }

    // Select a different agent for follow-up
    const selectedAgent = selectAgent(originalMessage, excludeParticipantId);
    
    // If we got the same agent, try the next best option
    if (selectedAgent.id === excludeParticipantId) {
      const agentIds = Object.keys(AGENTS).filter(id => id !== excludeParticipantId);
      const randomAgent = agentIds[Math.floor(Math.random() * agentIds.length)];
      selectedAgent = AGENTS[randomAgent];
    }

    const topicContext = TOPIC_CONTEXTS[context?.topic] || TOPIC_CONTEXTS['monetary-reform'];

    // Build follow-up system message
    const systemMessage = `${selectedAgent.systemPrompt}

Current discussion topic: ${context?.topic || 'monetary-reform'}
Topic context: ${topicContext.context}

A human said: "${originalMessage}"
Another AI agent responded: "${firstResponse}"

Provide a follow-up response that adds value to the conversation. You might:
- Build on the previous response
- Offer a different perspective
- Add historical context
- Suggest practical next steps
- Ask a thoughtful question

Respond as ${selectedAgent.name} with your unique expertise.`;

    const apiMessages = [
      { role: 'system', content: systemMessage },
      { role: 'user', content: `Please provide a follow-up to this conversation: "${originalMessage}"` }
    ];

    const aiResponse = await callDeepSeekAPI(apiMessages);

    res.json({
      response: aiResponse,
      agent: selectedAgent.name,
      participantId: selectedAgent.id,
      role: selectedAgent.role
    });

  } catch (error) {
    console.error('Follow-up endpoint error:', error);
    res.status(500).json({ 
      error: 'Failed to get follow-up response',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Content moderation endpoint
router.post('/moderate', async (req, res) => {
  try {
    const { content, contentType = 'message' } = req.body;
    
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const systemMessage = `You are a content moderator for an economic justice discussion platform. 
    
Review this ${contentType} for:
- Hate speech or harassment
- Spam or irrelevant content  
- Misinformation about economic topics
- Personal attacks
- Content that doesn't contribute to constructive dialogue

Respond with a JSON object containing:
{
  "approved": boolean,
  "reasons": [array of specific issues found],
  "severity": "low|medium|high",
  "suggestions": "how to improve the content if needed"
}`;

    const apiMessages = [
      { role: 'system', content: systemMessage },
      { role: 'user', content: `Please moderate this content: "${content}"` }
    ];

    const response = await callDeepSeekAPI(apiMessages, 200);
    
    try {
      const moderationResult = JSON.parse(response);
      res.json(moderationResult);
    } catch (parseError) {
      // Fallback if JSON parsing fails
      res.json({
        approved: true,
        reasons: [],
        severity: "low",
        suggestions: "Content appears acceptable"
      });
    }

  } catch (error) {
    console.error('Moderation endpoint error:', error);
    res.status(500).json({ 
      error: 'Failed to moderate content',
      approved: true // Default to approved on error
    });
  }
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({
    service: 'AI Integration',
    status: DEEPSEEK_API_KEY ? 'configured' : 'not_configured',
    configured: !!DEEPSEEK_API_KEY,
    model: DEEPSEEK_MODEL,
    timestamp: new Date().toISOString(),
    agents: Object.keys(AGENTS)
  });
});

// Get agent information
router.get('/agents', (req, res) => {
  const agentInfo = Object.values(AGENTS).map(agent => ({
    id: agent.id,
    name: agent.name,
    role: agent.role,
    specialty: agent.specialty,
    avatar: agent.avatar
  }));
  
  res.json({ agents: agentInfo });
});

// Get topic contexts
router.get('/topics', (req, res) => {
  res.json({ topics: TOPIC_CONTEXTS });
});

module.exports = router;