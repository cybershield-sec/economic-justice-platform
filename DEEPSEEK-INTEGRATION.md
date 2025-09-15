# DeepSeek AI Integration Guide

## Overview

This guide covers the integration of DeepSeek AI into the Economic Justice Platform for enhanced story analysis, content moderation, and personalized recommendations.

## Features Implemented

- **Story Analysis**: AI-powered analysis of economic justice stories
- **Content Moderation**: Automated moderation with human review flags
- **Personalized Recommendations**: Resource recommendations based on user context
- **Community Sentiment Analysis**: Aggregate analysis of community content
- **Real-time AI Assistance**: Integrated with Socket.io for live interactions

## Setup Instructions

### 1. Get DeepSeek API Key

1. Visit [DeepSeek Platform](https://platform.deepseek.com)
2. Sign up for an account
3. Navigate to API Keys section
4. Create a new API key
5. Copy the API key

### 2. Configure Environment

Edit `/backend/.env` file:

```bash
# DeepSeek AI Integration
DEEPSEEK_API_KEY=your_actual_api_key_here
DEEPSEEK_API_URL=https://api.deepseek.com/v1
DEEPSEEK_MODEL=deepseek-chat
```

Replace `your_actual_api_key_here` with your actual DeepSeek API key.

### 3. Install Dependencies

```bash
cd backend
npm install
```

### 4. Test Integration

```bash
# Run the test script
node test-deepseek.js
```

### 5. Start the Server

```bash
npm run dev
```

## API Endpoints

### Story Analysis
```http
POST /api/ai/analyze/story/:id
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "content": "Story content to analyze..."
}
```

### Get Recommendations
```http
GET /api/ai/recommendations?interests=debt,healthcare&context=medical+debt
Authorization: Bearer <JWT_TOKEN>
```

### Content Moderation
```http
POST /api/ai/moderate
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json

{
  "content": "Content to moderate...",
  "contentType": "story"
}
```

### Community Sentiment
```http
GET /api/ai/sentiment/community
Authorization: Bearer <JWT_TOKEN>
```

### Health Check
```http
GET /api/ai/health
```

## Response Formats

### Story Analysis Response
```json
{
  "themes": ["medical_debt", "healthcare_access"],
  "sentiment": {
    "primary": "negative",
    "confidence": 0.92
  },
  "community_tags": ["healthcare", "financial_stress"],
  "recommended_resources": ["medical_debt_relief", "financial_counseling"],
  "moderation_flags": {
    "needs_review": false,
    "reasons": [],
    "confidence": 0.0
  }
}
```

### Recommendations Response
```json
{
  "recommendations": [
    {
      "type": "education",
      "title": "Medical Debt Rights Guide",
      "description": "Learn about your rights and options for medical debt",
      "why_relevant": "Directly addresses medical debt concerns",
      "action_url": "#"
    }
  ]
}
```

## Integration with Awesome DeepSeek Project

This implementation follows patterns from the [Awesome DeepSeek Integration](https://github.com/deepseek-ai/awesome-deepseek-integration) project, including:

- Standard API client structure
- JSON response parsing
- Error handling patterns
- Rate limiting considerations

## Usage Examples

### Frontend Integration

```javascript
// Analyze a story
async function analyzeStory(storyContent) {
  const response = await fetch('/api/ai/analyze/story/123', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${userToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ content: storyContent })
  });

  return response.json();
}

// Get recommendations
async function getRecommendations(interests, context) {
  const params = new URLSearchParams();
  if (interests) params.append('interests', interests.join(','));
  if (context) params.append('context', context);

  const response = await fetch(`/api/ai/recommendations?${params}`, {
    headers: { 'Authorization': `Bearer ${userToken}` }
  });

  return response.json();
}
```

## Error Handling

The API includes comprehensive error handling:

- **401 Unauthorized**: Invalid or missing JWT token
- **400 Bad Request**: Missing required parameters
- **500 Internal Server Error**: AI service unavailable
- **429 Too Many Requests**: Rate limiting

## Rate Limiting

AI endpoints are rate limited to prevent abuse:
- 100 requests per 15 minutes per user
- Separate limits for different endpoint categories

## Monitoring

Check AI service status:
```bash
curl http://localhost:3000/api/ai/health
```

Response:
```json
{
  "service": "AI Integration",
  "status": "configured",
  "configured": true,
  "model": "deepseek-chat",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## Troubleshooting

### Common Issues

1. **API Key Not Working**
   - Check if API key is correctly set in .env
   - Verify API key has sufficient credits
   - Ensure no extra spaces in the key

2. **Connection Timeouts**
   - Check internet connection
   - Verify DeepSeek API status
   - Adjust timeout settings if needed

3. **JSON Parsing Errors**
   - AI response format may change
   - Check DeepSeek API documentation

### Support

- DeepSeek API Documentation: https://platform.deepseek.com/docs
- GitHub Issues: https://github.com/deepseek-ai/awesome-deepseek-integration/issues
- Community Support: Economic Justice Platform Discord

## Cost Considerations

DeepSeek API pricing:
- Check current pricing at https://platform.deepseek.com/pricing
- Monitor usage through DeepSeek dashboard
- Implement caching to reduce API calls

## Security

- API keys are stored in environment variables
- All AI requests require authentication
- Content moderation helps maintain community safety
- No sensitive data is sent to AI services

## Future Enhancements

- Batch processing for multiple stories
- Custom model fine-tuning
- Multi-language support
- Advanced sentiment analysis
- Real-time translation services