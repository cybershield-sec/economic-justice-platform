const DeepSeekClient = require('../utils/deepseek');

class AIParticipant {
  constructor(config) {
    this.id = config.id;
    this.name = config.name;
    this.role = config.role;
    this.specialty = config.specialty;
    this.avatar = config.avatar;
    this.personality = config.personality;
    this.expertise = config.expertise || [];
    this.responseStyles = config.responseStyles || [];
    this.conversationHistory = [];
    this.deepseek = new DeepSeekClient();
  }

  // Generate a response based on the message and context
  async generateResponse(message, context, conversationHistory = []) {
    // Add message to history
    this.conversationHistory.push({
      role: 'user',
      content: message,
      timestamp: new Date()
    });

    // Build context for AI response
    const recentHistory = conversationHistory.slice(-6).map(msg => 
      `${msg.author}: ${msg.content}`
    ).join('\n');

    // Create system prompt with enhanced personality and context
    const systemPrompt = this.createSystemPrompt(context, recentHistory);

    try {
      // Use DeepSeek API for chat completion with enhanced parameters
      const response = await this.deepseek.chatCompletion([
        { role: "system", content: systemPrompt },
        { role: "user", content: message }
      ], {
        max_tokens: 300,
        temperature: this.getDynamicTemperature(),
        frequency_penalty: 0.5,
        presence_penalty: 0.3
      });

      const aiResponse = this.deepseek.parseAIResponse(response);
      const responseContent = aiResponse.isTextResponse
        ? aiResponse.message
        : (aiResponse.choices && aiResponse.choices[0]
          ? aiResponse.choices[0].message.content
          : this.getFallbackResponse());

      // Add response to history
      this.conversationHistory.push({
        role: 'assistant',
        content: responseContent,
        timestamp: new Date()
      });

      return responseContent;
    } catch (error) {
      console.error(`Error getting response from ${this.name}:`, error);
      return this.getFallbackResponse();
    }
  }

  // Create system prompt with enhanced personality and context
  createSystemPrompt(context, recentHistory) {
    return `You are ${this.name}, an ${this.role} specializing in ${this.specialty}.
    
PERSONALITY TRAITS:
${this.personality}

EXPERTISE AREAS:
${this.expertise.join(', ')}

RESPONSE STYLES:
${this.responseStyles.join(', ')}

CURRENT DISCUSSION CONTEXT:
Topic: ${context.topic || 'general'}
Description: ${context.topicContext?.context || 'Economic justice discussion'}
Key Points: ${context.topicContext?.keyPoints ? context.topicContext.keyPoints.join(', ') : 'economic justice, community action'}
Mode: ${context.mode || 'discussion'}

RECENT CONVERSATION:
${recentHistory}

RESPONSE GUIDELINES:
1. Respond in character as ${this.name} with your unique personality
2. Reference your expertise areas when relevant
3. Use your response styles to shape your communication
4. Be helpful, knowledgeable, and focused on economic justice solutions
5. Reference real examples and data when relevant
6. Keep responses conversational but informative (2-4 sentences typically)
7. Occasionally ask follow-up questions to engage the user
8. Build on previous messages in the conversation when appropriate`;
  }

  // Get dynamic temperature based on participant personality
  getDynamicTemperature() {
    if (this.personality.includes('creative') || this.personality.includes('innovative')) {
      return 0.8; // More creative/varied responses
    } else if (this.personality.includes('analytical') || this.personality.includes('data-driven')) {
      return 0.5; // More focused/precise responses
    } else {
      return 0.7; // Balanced responses
    }
  }

  // Get fallback response when API fails
  getFallbackResponse() {
    // Agent-specific fallback responses based on specialty
    const agentFallbacks = {
      economist: [
        "From an economic perspective, sovereign money creation could reduce our dependence on private banking debt. Historical examples like Lincoln's Greenbacks show this is feasible.",
        "The current fractional reserve system creates money as debt. A public banking option could provide counter-cyclical lending during recessions.",
        "Studies show that public banks like the Bank of North Dakota weathered the 2008 crisis better than private institutions. This model deserves serious consideration.",
        "Worker cooperatives show 5-10% higher productivity than traditional firms according to recent studies. The incentive alignment creates better outcomes.",
        "UBI trials in Kenya and Finland show reduced poverty without significant work disincentives. The data is promising for broader implementation."
      ],
      activist: [
        "We need to organize! Start with local credit unions and public banking campaigns. Every community deserves democratic control over its financial resources.",
        "The Federal Reserve serves Wall Street, not Main Street. Join the movement for monetary democracy - your voice matters!",
        "Every workplace can be democratized! Start with your own - propose profit-sharing, push for board representation, organize your coworkers.",
        "Worker power is rising! From Starbucks to Amazon, people are demanding dignity. Cooperatives are the next step in this movement.",
        "UBI is a human right! Organize locally - petition city councils, create mutual aid networks that prefigure basic income."
      ],
      historian: [
        "The tally stick system worked for 700 years in England before private banking interests destroyed it. History shows alternatives are possible.",
        "Every major economic transformation faced 'impossibility' claims. The New Deal, Social Security, Medicare - all were called radical.",
        "The Rochdale Pioneers started with 28 weavers in 1844. Today, cooperatives serve 1 billion people globally. Movements grow from small beginnings.",
        "Thomas Paine proposed a citizen's dividend in 1797. Martin Luther King Jr. championed guaranteed income. This idea has deep roots.",
        "Medieval guilds tracked member contributions through elaborate systems. Community accounting has historical precedent."
      ],
      policy: [
        "HR 2990, the NEED Act, provided a legislative template for monetary reform. We can build on this framework with updated provisions.",
        "State-level public banking bills are advancing in 20+ states. California's AB 857 created a legal framework others can adopt.",
        "The Main Street Employee Ownership Act provides tax incentives for worker buyouts. We need to expand and strengthen these provisions.",
        "Carbon fee-and-dividend proposals could fund partial UBI while addressing climate change. The Energy Innovation Act provides a model.",
        "Complementary currency legislation exists in multiple states. The E-Gold Act provides regulatory clarity for digital value systems."
      ],
      legal: [
        "Constitutional frameworks often allow for innovative economic systems when they serve public purpose and general welfare.",
        "Human rights law increasingly recognizes economic rights as fundamental, including rights to housing, healthcare, and dignified work.",
        "Legal precedents exist for community-based economic systems that operate alongside traditional market structures.",
        "Many jurisdictions have laws supporting cooperative business models and worker ownership structures.",
        "International human rights frameworks provide strong foundations for challenging exploitative economic practices."
      ],
      educator: [
        "Let me break this down: economic justice means ensuring everyone has access to resources and opportunities for a dignified life.",
        "Think of it like this: our current system prioritizes profit over people, but alternatives prioritize community well-being.",
        "A helpful analogy: just as we need diverse ecosystems in nature, we need diverse economic models for community resilience.",
        "The key concept here is that money should serve people, not the other way around. This shifts our entire perspective.",
        "Imagine an economy where your caregiving, creativity, and community work are valued as much as traditional paid work."
      ],
      currency: [
        "A tally-based accounting system could track real resource flows rather than abstract monetary values.",
        "Community-validated contribution metrics prevent gaming while maintaining transparency in value exchange.",
        "By separating the unit of account from the medium of exchange, we can design better economic feedback loops.",
        "Cryptographic systems can ensure security while maintaining community control over value creation.",
        "Resource-based accounting focuses on what we actually produce and need, rather than abstract financial metrics."
      ]
    };

    // Get responses for this specific agent or default to general responses
    const responses = agentFallbacks[this.id] || [
      `As a ${this.role}, I believe this is an important topic that deserves deeper exploration.`,
      `From my perspective in ${this.specialty}, this connects to broader themes we should discuss.`,
      `I'm here to collaborate on economic justice solutions with my expertise in ${this.specialty}.`
    ];

    return responses[Math.floor(Math.random() * responses.length)];
  }

  // Generate follow-up response to continue conversation
  async generateFollowUp(originalMessage, firstResponse, context) {
    const followUpPrompt = `You are ${this.name}, providing a follow-up comment in The Commons economic justice forum.
    
The user said: "${originalMessage}"
Another participant responded: "${firstResponse}"

Provide a brief follow-up or different perspective that adds value to the discussion. 
Keep it short (1-2 sentences) and in character as a ${this.role} with expertise in ${this.specialty}.
Focus on: ${this.responseStyles[Math.floor(Math.random() * this.responseStyles.length)] || 'adding constructive insight'}`;

    try {
      const response = await this.deepseek.chatCompletion([
        { role: "system", content: followUpPrompt }
      ], {
        max_tokens: 150,
        temperature: 0.8
      });

      const aiResponse = this.deepseek.parseAIResponse(response);
      return aiResponse.choices && aiResponse.choices[0] 
        ? aiResponse.choices[0].message.content 
        : this.getFollowUpFallback();
    } catch (error) {
      console.error(`Error getting follow-up from ${this.name}:`, error);
      return this.getFollowUpFallback();
    }
  }

  // Fallback for follow-up responses
  getFollowUpFallback() {
    const followUps = [
      "That's a great point. I'd also add that we should consider...",
      "Building on that idea, I wonder if we might also explore...",
      "I appreciate that perspective. From my experience in " + this.specialty + ", I've seen...",
      "That connects to something I've been researching in " + this.specialty + "...",
      "Interesting point. I'd love to hear more about how that might work in practice."
    ];
    
    return followUps[Math.floor(Math.random() * followUps.length)];
  }

  // Get participant info for UI
  getInfo() {
    return {
      id: this.id,
      name: this.name,
      role: this.role,
      specialty: this.specialty,
      avatar: this.avatar,
      personality: this.personality
    };
  }
}

module.exports = AIParticipant;