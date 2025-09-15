# Economic Justice AI Agents Setup Guide

This guide will help you enable the AI agents in your economic justice chat platform using the DeepSeek API.

## Prerequisites

- Node.js (v16 or higher)
- DeepSeek API account and key
- Git (for version control)

## Step 1: Get DeepSeek API Key

1. Visit [DeepSeek Platform](https://platform.deepseek.com)
2. Create an account or sign in
3. Navigate to API Keys section
4. Create a new API key
5. Copy the API key (you'll need this for step 3)

## Step 2: Project Structure

Ensure your project has this structure:
```
your-project/
├── backend/
│   ├── routes/
│   │   └── ai.js                 # AI routes (created above)
│   ├── .env                      # Environment variables
│   ├── server.js                 # Main server file
│   ├── package.json              # Dependencies
│   └── test-deepseek.js          # Test script
└── frontend/
    └── multi-agent-chat.html     # Your existing chat interface
```

## Step 3: Environment Configuration

Create or update `backend/.env` file:

```bash
# DeepSeek AI Integration
DEEPSEEK_API_KEY=your_actual_deepseek_api_key_here
DEEPSEEK_API_URL=https://api.deepseek.com/v1
DEEPSEEK_MODEL=deepseek-chat

# Server Configuration
PORT=3000
NODE_ENV=development

# Rate Limiting (optional)
AI_RATE_LIMIT_WINDOW_MS=900000
AI_RATE_LIMIT_MAX_REQUESTS=100
```

**Important:** Replace `your_actual_deepseek_api_key_here` with your actual DeepSeek API key.

## Step 4: Install Dependencies

```bash
cd backend
npm install express cors dotenv axios express-rate-limit
npm install --save-dev nodemon
```

## Step 5: Set Up Files

1. **AI Routes**: Copy the `ai.js` routes file to `backend/routes/ai.js`
2. **Server File**: Update your `backend/server.js` with the integration code
3. **Test Script**: Add the `test-deepseek.js` file to your backend directory
4. **Package.json**: Update with the provided dependencies and scripts

## Step 6: Test the Integration

Before starting your server, test the DeepSeek API connection:

```bash
cd backend
node test-deepseek.js
```

You should see output like:
```
🧪 Testing DeepSeek API Integration...

Environment Check:
- API URL: https://api.deepseek.com/v1
- API Key: Set ✅
- Model: deepseek-chat

Testing basic API call...
✅ API call successful!

Response from EconAgent:
--------------------------------------------------
Sovereign money creation represents a fundamental shift from our current debt-based monetary system to one where governments create money directly...
--------------------------------------------------

🤖 Testing multiple agent personalities...

ActionBot response:
Economic justice requires direct action and community organizing...

HistoryBot response:
The Greenback movement of the 1860s-1870s demonstrates successful sovereign money creation...

✅ Multi-agent test completed successfully!
🎉 DeepSeek integration is working correctly!
```

If you see errors, check:
- Your API key is correct
- You have sufficient credits in your DeepSeek account
- Your internet connection is stable

## Step 7: Start the Server

```bash
npm run dev
```

The server will start and show:
```
🚀 Server running on port 3000
💬 Chat interface: http://localhost:3000/chat
🔍 Health check: http://localhost:3000/health
🤖 AI Health check: http://localhost:3000/api/ai/health
✅ DeepSeek API configured
```

## Step 8: Test the Chat Interface

1. Open your browser to `http://localhost:3000/chat`
2. You should see your existing multi-agent chat interface
3. Type a message about economic justice
4. You should receive responses from AI agents like EconAgent, ActionBot, etc.

## API Endpoints Reference

Your chat interface can now use these endpoints:

### Main Chat Endpoint
```javascript
POST /api/ai/chat
Content-Type: application/json

{
  "messages": [
    { "role": "user", "content": "What do you think about universal basic income?" }
  ],
  "context": {
    "topic": "universal-basic-income",
    "mode": "discussion"
  },
  "conversationHistory": []
}
```

### Follow-up Response
```javascript
POST /api/ai/chat/followup
Content-Type: application/json

{
  "originalMessage": "What do you think about UBI?",
  "firstResponse": "UBI represents a paradigm shift...",
  "context": { "topic": "universal-basic-income" },
  "excludeParticipantId": "economist"
}
```

### Content Moderation
```javascript
POST /api/ai/moderate
Content-Type: application/json

{
  "content": "Message to moderate",
  "contentType": "message"
}
```

### Available Agents
```javascript
GET /api/ai/agents
```

### Health Check
```javascript
GET /api/ai/health
```

## Agent Personalities

The system includes 7 specialized AI agents:

1. **EconAgent** - Economist specializing in monetary policy
2. **ActionBot** - Activist focused on community organizing  
3. **HistoryBot** - Historian of economic justice movements
4. **PolicyPro** - Policy analyst for legislative strategy
5. **JusticeAdvocate** - Legal strategist for rights frameworks
6. **LearnGuide** - Popular educator making concepts accessible
7. **CryptoEcon** - Currency specialist for alternative systems

## Troubleshooting

### Common Issues

**API Key Error (401)**
- Verify your DeepSeek API key is correct
- Check that you have sufficient credits
- Ensure no extra spaces in the .env file

**Connection Timeout**
- Check your internet connection
- Verify DeepSeek API status at their website
- Try increasing timeout in the code (currently 30 seconds)

**Agents Not Responding**
- Check browser console for JavaScript errors
- Verify the backend server is running
- Test the health endpoint: `curl http://localhost:3000/api/ai/health`

**Rate Limiting**
- Default: 100 requests per 15 minutes
- Adjust in .env if needed: `AI_RATE_LIMIT_MAX_REQUESTS=200`

### Debug Mode

Set `NODE_ENV=development` in your .env file for detailed error messages.

### Logging

Check server logs for detailed information about API calls and responses.

## Frontend Integration Notes

Your existing `multi-agent-chat.html` file should work with minimal changes. The key integration points are:

1. **API Calls**: The existing `getAIResponse()` function should work with the new `/api/ai/chat` endpoint
2. **Agent Selection**: The backend automatically selects appropriate agents based on message content
3. **Follow-up Responses**: The `triggerAdditionalResponse()` function uses the new `/api/ai/chat/followup` endpoint

## Security Considerations

- API keys are stored in environment variables (never in frontend code)
- Rate limiting prevents abuse
- Content moderation helps maintain community standards
- All requests are validated for required parameters

## Cost Management

- Responses are limited to 300 tokens to control costs
- Implement caching for repeated questions if needed
- Monitor usage through DeepSeek dashboard
- Consider implementing user-based rate limiting for production

## Next Steps

1. Test thoroughly with different types of economic justice discussions
2. Monitor AI responses for quality and relevance
3. Adjust agent personalities in the code as needed
4. Consider adding authentication for production deployment
5. Implement conversation persistence if desired
6. Add analytics to track engagement and topics

## Support Resources

- DeepSeek API Documentation: https://platform.deepseek.com/docs
- Express.js Documentation: https://expressjs.com/
- Economic Justice Platform Community: [Your Discord/Forum]

## Production Deployment

For production deployment:

1. Set `NODE_ENV=production`
2. Use a process manager like PM2
3. Set up proper logging
4. Configure HTTPS
5. Implement user authentication
6. Set up monitoring and alerting
7. Configure backup and recovery

Your AI agents should now be fully functional and ready to engage in meaningful discussions about economic justice!