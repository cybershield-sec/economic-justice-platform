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
      const responseContent = aiResponse.choices && aiResponse.choices[0] 
        ? aiResponse.choices[0].message.content 
        : this.getFallbackResponse();

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
Topic: ${context.topic}
Description: ${context.description}
Key Points: ${context.keyPoints.join(', ')}
Mode: ${context.mode}

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
    const fallbacks = [
      `As a ${this.role}, I believe this is an important topic that deserves deeper exploration. What specific aspect would you like to discuss further?`,
      `From my perspective as ${this.name}, this connects to broader themes in ${this.specialty}. I'd love to hear your thoughts on how we might approach this.`,
      `I'm here to collaborate on economic justice solutions with my expertise in ${this.specialty}. Let's continue this important discussion.`,
      `This raises interesting questions that relate to my work in ${this.specialty}. What experiences have you had with similar issues?`,
      `Building on what's been discussed, I think there are several pathways forward in ${this.specialty}. What resonates most with you?`
    ];
    
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
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