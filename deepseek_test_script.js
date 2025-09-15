// backend/test-deepseek.js
// Test script for DeepSeek API integration

require('dotenv').config();
const axios = require('axios');

const DEEPSEEK_API_URL = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/v1';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';

async function testDeepSeekAPI() {
  console.log('🧪 Testing DeepSeek API Integration...\n');

  // Check environment variables
  console.log('Environment Check:');
  console.log(`- API URL: ${DEEPSEEK_API_URL}`);
  console.log(`- API Key: ${DEEPSEEK_API_KEY ? 'Set ✅' : 'Missing ❌'}`);
  console.log(`- Model: ${DEEPSEEK_MODEL}\n`);

  if (!DEEPSEEK_API_KEY) {
    console.error('❌ DEEPSEEK_API_KEY not found in environment variables');
    console.error('Please add your DeepSeek API key to backend/.env file');
    process.exit(1);
  }

  try {
    // Test basic API call
    console.log('Testing basic API call...');
    
    const testMessage = {
      model: DEEPSEEK_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are EconAgent, an AI economist specializing in monetary policy. Respond briefly about economic justice.'
        },
        {
          role: 'user',
          content: 'What is your perspective on sovereign money creation?'
        }
      ],
      max_tokens: 200,
      temperature: 0.7
    };

    const response = await axios.post(
      `${DEEPSEEK_API_URL}/chat/completions`,
      testMessage,
      {
        headers: {
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      }
    );

    console.log('✅ API call successful!');
    console.log('\nResponse from EconAgent:');
    console.log('-'.repeat(50));
    console.log(response.data.choices[0].message.content);
    console.log('-'.repeat(50));

    // Test multiple agents
    console.log('\n🤖 Testing multiple agent personalities...\n');

    const agents = [
      {
        name: 'ActionBot',
        prompt: 'You are ActionBot, an AI activist focused on community organizing. Respond briefly about organizing for economic justice.'
      },
      {
        name: 'HistoryBot', 
        prompt: 'You are HistoryBot, an AI historian specializing in economic movements. Provide a brief historical example of economic justice organizing.'
      }
    ];

    for (const agent of agents) {
      try {
        const agentResponse = await axios.post(
          `${DEEPSEEK_API_URL}/chat/completions`,
          {
            model: DEEPSEEK_MODEL,
            messages: [
              { role: 'system', content: agent.prompt },
              { role: 'user', content: 'Share your perspective on economic justice.' }
            ],
            max_tokens: 150,
            temperature: 0.7
          },
          {
            headers: {
              'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
              'Content-Type': 'application/json'
            },
            timeout: 30000
          }
        );

        console.log(`${agent.name} response:`);
        console.log(agentResponse.data.choices[0].message.content);
        console.log('');
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`❌ Error testing ${agent.name}:`, error.message);
      }
    }

    console.log('✅ Multi-agent test completed successfully!');
    console.log('\n🎉 DeepSeek integration is working correctly!');
    console.log('You can now start your server with: npm run dev');

  } catch (error) {
    console.error('❌ API test failed:');
    
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error(`Error: ${JSON.stringify(error.response.data, null, 2)}`);
      
      if (error.response.status === 401) {
        console.error('\n💡 This looks like an authentication error.');
        console.error('Please check that your API key is correct and has sufficient credits.');
      }
    } else if (error.request) {
      console.error('No response received. Check your internet connection and DeepSeek API status.');
    } else {
      console.error('Error:', error.message);
    }
    
    process.exit(1);
  }
}

// Test local server endpoints (if running)
async function testLocalEndpoints() {
  console.log('\n🌐 Testing local server endpoints...');
  
  const baseUrl = 'http://localhost:3000';
  
  try {
    // Test health endpoint
    const healthResponse = await axios.get(`${baseUrl}/api/ai/health`);
    console.log('✅ Health check:', healthResponse.data);
    
    // Test agents endpoint
    const agentsResponse = await axios.get(`${baseUrl}/api/ai/agents`);
    console.log('✅ Agents endpoint:', `${agentsResponse.data.agents.length} agents available`);
    
  } catch (error) {
    console.log('ℹ️  Local server not running or endpoints not available');
    console.log('   Start your server first to test these endpoints');
  }
}

// Main test function
async function runTests() {
  await testDeepSeekAPI();
  await testLocalEndpoints();
}

runTests();