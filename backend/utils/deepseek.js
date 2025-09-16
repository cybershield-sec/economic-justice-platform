const axios = require('axios');

class DeepSeekClient {
  constructor() {
    this.apiKey = process.env.DEEPSEEK_API_KEY;
    console.log("DEEPSEEK_API_KEY:", this.apiKey);
    this.baseURL = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1';
    this.model = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
  }

  async chatCompletion(messages, options = {}) {
    // Mock response for testing without API key
    if (!this.apiKey || this.apiKey === 'your-deepseek-api-key-here') {
      console.log('⚠️  Using mock DeepSeek response (no API key configured)');

      // Generate mock response based on the prompt
      const userMessage = messages.find(m => m.role === 'user')?.content || '';

      if (userMessage.includes('Analyze this economic justice story')) {
        return {
          choices: [{
            message: {
              content: '```json\n{\n  "themes": ["medical_debt", "healthcare_access", "family_stress"],\n  "sentiment": {\n    "primary": "negative",\n    "confidence": 0.88\n  },\n  "community_tags": ["healthcare", "financial_stress", "family_support"],\n  "recommended_resources": ["medical_debt_relief", "financial_counseling", "mental_health_support"],\n  "moderation_flags": {\n    "needs_review": false,\n    "reasons": [],\n    "confidence": 0.0\n  }\n}\n```'
            }
          }]
        };
      }

      // Default mock response
      return {
        choices: [{
          message: {
            content: '```json\n{\n  "response": "mock_data",\n  "status": "success",\n  "note": "DeepSeek API key not configured - using mock response"\n}\n```'
          }
        }]
      };
    }

    try {
      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: this.model,
          messages,
          max_tokens: options.max_tokens || 2000,
          temperature: options.temperature || 0.7,
          stream: options.stream || false
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      return response.data;
    } catch (error) {
      console.error('DeepSeek API Error:', error.response?.data || error.message);
      return { choices: [{ message: { content: `DeepSeek API call failed: ${error.message}` } }] };
    }
  }

  // Analyze story content for economic justice themes
  async analyzeStory(storyContent, userId) {
    const prompt = `
Analyze this economic justice story and provide structured insights:

STORY CONTENT:
${storyContent}

Please analyze for:
1. Key economic justice themes present
2. Emotional tone and sentiment
3. Potential community connections
4. Resource recommendations
5. Content moderation flags

Return JSON response with this structure:
{
  "themes": ["theme1", "theme2"],
  "sentiment": {"primary": "positive/negative/neutral", "confidence": 0.95},
  "community_tags": ["tag1", "tag2"],
  "recommended_resources": ["resource_type1", "resource_type2"],
  "moderation_flags": {
    "needs_review": boolean,
    "reasons": [],
    "confidence": 0.0
  }
}
`;

    const messages = [
      {
        role: "system",
        content: "You are an AI assistant specialized in economic justice analysis. Provide thoughtful, nuanced analysis of personal stories related to economic challenges and community support."
      },
      {
        role: "user",
        content: prompt
      }
    ];

    return this.chatCompletion(messages, { max_tokens: 1000 });
  }

  // Generate personalized resource recommendations
  async generateRecommendations(userProfile, storyContext) {
    const prompt = `
Based on this user profile and story context, generate personalized resource recommendations:

USER PROFILE:
${JSON.stringify(userProfile, null, 2)}

STORY CONTEXT:
${storyContext}

Recommend resources in these categories:
- Educational materials
- Community organizations
- Advocacy opportunities
- Support services
- Further learning paths

Return JSON response with this structure:
{
  "recommendations": [
    {
      "type": "education|community|advocacy|support|learning",
      "title": "Resource Title",
      "description": "Brief description",
      "why_relevant": "Why this is relevant to the user",
      "action_url": "#"
    }
  ]
}
`;

    const messages = [
      {
        role: "system",
        content: "You are a resource recommendation engine for economic justice. Provide actionable, relevant resources based on user needs and context."
      },
      {
        role: "user",
        content: prompt
      }
    ];

    return this.chatCompletion(messages, { max_tokens: 1500 });
  }

  // Content moderation assistance
  async moderateContent(content, contentType = 'story') {
    const prompt = `
Review this ${contentType} content for compliance with community guidelines:

CONTENT:
${content}

Check for:
- Hate speech or discrimination
- Personal attacks
- Spam or promotional content
- Privacy violations
- Constructive vs harmful criticism

Return JSON response with this structure:
{
  "needs_human_review": boolean,
  "confidence": 0.95,
  "flags": [
    {
      "type": "hate_speech|personal_attack|spam|privacy|other",
      "severity": "low|medium|high",
      "explanation": "Brief explanation",
      "text_snippet": "Relevant text snippet"
    }
  ],
  "overall_assessment": "Brief overall assessment"
}
`;

    const messages = [
      {
        role: "system",
        content: "You are a content moderation assistant. Be thorough but fair in your assessment. Flag content that violates community guidelines while respecting free expression."
      },
      {
        role: "user",
        content: prompt
      }
    ];

    return this.chatCompletion(messages, { max_tokens: 800 });
  }

  // Community sentiment analysis
  async analyzeCommunitySentiment(stories, comments) {
    const sampleContent = stories.slice(0, 5).map(s => s.content).join('\n\n---\n\n') +
                         '\n\nCOMMENTS:\n\n' +
                         comments.slice(0, 10).map(c => c.content).join('\n\n');

    const prompt = `
Analyze community sentiment from this sample of stories and comments:

SAMPLE CONTENT:
${sampleContent}

Provide insights on:
- Overall emotional tone of the community
- Common themes and concerns
- Emerging issues or patterns
- Community strengths and support networks
- Areas needing attention or resources

Return JSON response with this structure:
{
  "overall_sentiment": {
    "primary_tone": "positive|negative|neutral|mixed",
    "confidence": 0.95,
    "dominant_emotions": ["emotion1", "emotion2"]
  },
  "common_themes": [
    {
      "theme": "Theme name",
      "prevalence": "high|medium|low",
      "examples": ["example1", "example2"]
    }
  ],
  "emerging_issues": ["issue1", "issue2"],
  "community_strengths": ["strength1", "strength2"],
  "recommended_actions": ["action1", "action2"]
}
`;

    const messages = [
      {
        role: "system",
        content: "You are a community sentiment analyst. Provide nuanced insights about community dynamics, emotional tones, and collective needs."
      },
      {
        role: "user",
        content: prompt
      }
    ];

    return this.chatCompletion(messages, { max_tokens: 2000 });
  }

  // Helper method to parse AI responses
  parseAIResponse(response) {
    try {
      if (!response.choices || !response.choices[0] || !response.choices[0].message) {
        return { error: 'Invalid response format', raw: response };
      }

      const content = response.choices[0].message.content;

      // First try to parse as JSON directly
      try {
        return JSON.parse(content);
      } catch (e) {
        // If not JSON, try to extract JSON from code blocks
        const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || content.match(/```\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[1]);
        }

        // If it's plain text, return it as a successful response
        return {
          success: true,
          message: content,
          isTextResponse: true
        };
      }
    } catch (error) {
      console.error('Failed to parse AI response:', error);
      return {
        error: 'Failed to parse AI response',
        raw: response.choices ? response.choices[0]?.message?.content : 'No content'
      };
    }
  }
}

module.exports = DeepSeekClient;