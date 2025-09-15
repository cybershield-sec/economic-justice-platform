const DeepSeekClient = require('./utils/deepseek');
require('dotenv').config();

async function testDeepSeekIntegration() {
  console.log('🧪 Testing DeepSeek AI Integration...\n');

  const deepseek = new DeepSeekClient();

  // Test 1: Check if API key is configured
  console.log('1. API Key Configuration:');
  if (!process.env.DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY === 'your-deepseek-api-key-here') {
    console.log('   ❌ DEEPSEEK_API_KEY not configured. Please set it in .env file');
    console.log('   ℹ️  Get your API key from: https://platform.deepseek.com/api_keys');
    return;
  }
  console.log('   ✅ API Key configured');

  // Test 2: Test health endpoint
  console.log('\n2. Health Check:');
  try {
    const health = await deepseek.chatCompletion([
      {
        role: "system",
        content: "You are a helpful assistant. Respond with 'Hello, DeepSeek is working!'"
      },
      {
        role: "user",
        content: "Say hello"
      }
    ], { max_tokens: 50 });

    if (health.choices && health.choices[0]) {
      console.log('   ✅ DeepSeek API connected successfully');
      console.log(`   Response: ${health.choices[0].message.content}`);
    } else {
      console.log('   ❌ Unexpected response format');
    }
  } catch (error) {
    console.log('   ❌ DeepSeek API connection failed:', error.message);
    if (error.response?.status === 401) {
      console.log('   ℹ️  Check if your API key is valid and has sufficient credits');
    }
    return;
  }

  // Test 3: Test story analysis
  console.log('\n3. Story Analysis Test:');
  try {
    const sampleStory = "I've been struggling with medical debt after an unexpected surgery. The bills keep piling up and it's overwhelming. I don't know how I'll ever pay them off while also supporting my family.";

    const analysis = await deepseek.analyzeStory(sampleStory, 'test-user');
    const parsed = deepseek.parseAIResponse(analysis);

    console.log('   ✅ Story analysis completed');
    console.log('   Themes:', parsed.themes?.join(', ') || 'N/A');
    console.log('   Sentiment:', parsed.sentiment?.primary || 'N/A');

  } catch (error) {
    console.log('   ❌ Story analysis failed:', error.message);
  }

  console.log('\n🎉 DeepSeek integration test completed!');
  console.log('\nNext steps:');
  console.log('1. Replace "your-deepseek-api-key-here" with your actual API key in .env');
  console.log('2. Run: node test-deepseek.js');
  console.log('3. Start the server: npm run dev');
}

testDeepSeekIntegration().catch(console.error);