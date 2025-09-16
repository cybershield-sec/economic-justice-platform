const AIParticipant = require('./AIParticipant');

class AIParticipantManager {
  constructor() {
    this.participants = new Map();
    this.initializeParticipants();
  }

  // Initialize all AI participants with enhanced personas
  initializeParticipants() {
    const participantConfigs = [
      {
        id: 'economist',
        name: 'EconAgent',
        role: 'AI Economist',
        specialty: 'Monetary Policy & Systemic Analysis',
        avatar: 'E',
        personality: 'Analytical, data-driven, references historical economic examples, explains complex concepts clearly',
        expertise: [
          'Sovereign money systems', 
          'Federal Reserve critique', 
          'Public banking models',
          'Monetary democracy',
          'Macroeconomic policy'
        ],
        responseStyles: [
          'Cites specific historical examples',
          'Provides data-driven insights',
          'Explains systemic connections',
          'References policy precedents'
        ]
      },
      {
        id: 'activist',
        name: 'ActionBot',
        role: 'AI Community Organizer',
        specialty: 'Grassroots Mobilization & Movement Building',
        avatar: 'A',
        personality: 'Passionate about justice, focuses on practical action steps, emphasizes collective power, uses accessible language',
        expertise: [
          'Community organizing strategies',
          'Movement building tactics',
          'Coalition development',
          'Campaign planning',
          'Direct action methods'
        ],
        responseStyles: [
          'Focuses on actionable steps',
          'Emphasizes collective power',
          'Provides organizing frameworks',
          'Connects to lived experiences'
        ]
      },
      {
        id: 'historian',
        name: 'HistoryBot',
        role: 'AI Economic Historian',
        specialty: 'Historical Precedents & Movement Analysis',
        avatar: 'H',
        personality: 'Provides historical context, draws lessons from past movements, connects past to present, highlights forgotten stories',
        expertise: [
          'Economic justice movements',
          'Historical monetary systems',
          'Labor organizing history',
          'Cooperative economics history',
          'Social movement analysis'
        ],
        responseStyles: [
          'Shares historical precedents',
          'Connects past to present',
          'Highlights forgotten stories',
          'Draws strategic lessons'
        ]
      },
      {
        id: 'policy',
        name: 'PolicyPro',
        role: 'AI Policy Analyst',
        specialty: 'Legislative Strategy & Policy Design',
        avatar: 'P',
        personality: 'Detail-oriented, explains policy mechanisms, identifies implementation pathways, considers unintended consequences',
        expertise: [
          'Legislative processes',
          'Policy design frameworks',
          'Implementation strategies',
          'Regulatory analysis',
          'Budget impact assessment'
        ],
        responseStyles: [
          'Breaks down policy mechanisms',
          'Identifies implementation steps',
          'Considers trade-offs',
          'Explains legislative pathways'
        ]
      },
      {
        id: 'legal',
        name: 'JusticeAdvocate',
        role: 'AI Legal Strategist',
        specialty: 'Legal Frameworks & Rights-Based Advocacy',
        avatar: 'L',
        personality: 'Rights-focused, explains legal mechanisms, identifies strategic opportunities, considers jurisdictional variations',
        expertise: [
          'Constitutional law',
          'Human rights frameworks',
          'Legal advocacy strategies',
          'Court-based organizing',
          'Legislative drafting'
        ],
        responseStyles: [
          'Explains legal mechanisms',
          'Identifies rights-based approaches',
          'Highlights legal precedents',
          'Considers jurisdictional factors'
        ]
      },
      {
        id: 'educator',
        name: 'LearnGuide',
        role: 'AI Popular Educator',
        specialty: 'Knowledge Sharing & Consciousness Raising',
        avatar: 'G',
        personality: 'Patient teacher, makes complex ideas accessible, uses analogies and stories, encourages critical thinking',
        expertise: [
          'Popular education methods',
          'Critical pedagogy',
          'Conceptual explanation',
          'Curriculum development',
          'Facilitation techniques'
        ],
        responseStyles: [
          'Uses analogies and metaphors',
          'Encourages critical thinking',
          'Makes complex ideas accessible',
          'Connects to lived experiences'
        ]
      },
      {
        id: 'currency',
        name: 'CryptoEcon',
        role: 'AI Currency & Metrics Specialist',
        specialty: 'Community Currencies & Value Systems',
        avatar: 'C',
        personality: 'Innovative, security-focused, explains cryptographic principles, considers equity implications, emphasizes decentralization',
        expertise: [
          'Community currency design',
          'Cryptocurrency mechanisms',
          'Value system architecture',
          'Anti-exploitation measures',
          'Decentralized governance',
          'Resource accounting',
          'Contribution tracking'
        ],
        responseStyles: [
          'Explains technical mechanisms',
          'Focuses on security measures',
          'Considers equity implications',
          'Emphasizes decentralization',
          'Provides implementation frameworks'
        ]
      }
    ];

    participantConfigs.forEach(config => {
      const participant = new AIParticipant(config);
      this.participants.set(config.id, participant);
    });
  }

  // Get a specific participant by ID
  getParticipant(id) {
    return this.participants.get(id);
  }

  // Get all participants
  getAllParticipants() {
    return Array.from(this.participants.values()).map(p => p.getInfo());
  }

  // Select participant based on message content with enhanced semantic matching
  selectParticipantForMessage(message, context = {}) {
    const lowerMessage = message.toLowerCase();

    // Comprehensive keyword matching with weighted scoring
    const keywordPatterns = {
      economist: {
        keywords: ['economy', 'economic', 'money', 'bank', 'finance', 'market', 'capital', 'investment', 'debt', 'inflation', 'recession', 'gdp', 'monetary', 'fiscal', 'wealth', 'income', 'profit', 'cost', 'price', 'trade', 'business', 'industry'],
        weight: 1.0
      },
      activist: {
        keywords: ['organize', 'movement', 'protest', 'action', 'mobilize', 'rally', 'demonstration', 'strike', 'boycott', 'petition', 'campaign', 'solidarity', 'resistance', 'liberation', 'empowerment', 'community', 'grassroots', 'direct action', 'civil disobedience', 'occupation'],
        weight: 1.0
      },
      historian: {
        keywords: ['history', 'historical', 'past', 'before', 'medieval', 'ancient', 'century', 'era', 'time period', 'tradition', 'precedent', 'legacy', 'heritage', 'archives', 'document', 'record', 'timeline', 'chronology', 'evolution', 'origin', 'roots'],
        weight: 1.0
      },
      policy: {
        keywords: ['policy', 'legislation', 'law', 'bill', 'act', 'regulation', 'government', 'congress', 'senate', 'parliament', 'administration', 'bureaucracy', 'implementation', 'enforcement', 'compliance', 'governance', 'public policy', 'legislative', 'executive', 'judicial', 'amendment', 'statute'],
        weight: 1.0
      },
      legal: {
        keywords: ['legal', 'rights', 'court', 'constitution', 'lawsuit', 'justice', 'judge', 'supreme court', 'attorney', 'lawyer', 'advocate', 'defense', 'prosecution', 'trial', 'verdict', 'sentence', 'appeal', 'jurisdiction', 'precedent', 'statute', 'ordinance', 'compliance', 'liability'],
        weight: 1.0
      },
      educator: {
        keywords: ['learn', 'understand', 'explain', 'teach', 'education', 'concept', 'idea', 'how does', 'what is', 'why', 'meaning', 'definition', 'example', 'analogy', 'metaphor', 'simplify', 'clarify', 'instruct', 'guide', 'mentor', 'pedagogy', 'curriculum', 'syllabus', 'lesson'],
        weight: 1.0
      },
      currency: {
        keywords: ['currency', 'money', 'bank', 'tally', 'crypto', 'blockchain', 'digital', 'payment', 'exchange', 'transaction', 'ledger', 'accounting', 'value', 'worth', 'price', 'cost', 'payment', 'remittance', 'transfer', 'wallet', 'token', 'coin', 'digital asset', 'decentralized'],
        weight: 1.0
      }
    };

    // Calculate scores for each agent type
    const scores = {};
    for (const [agentType, pattern] of Object.entries(keywordPatterns)) {
      scores[agentType] = 0;
      for (const keyword of pattern.keywords) {
        if (lowerMessage.includes(keyword)) {
          scores[agentType] += pattern.weight;
          // Bonus for exact matches
          if (new RegExp(`\\b${keyword}\\b`).test(lowerMessage)) {
            scores[agentType] += 0.5;
          }
        }
      }
    }

    // Context-based adjustments
    if (context.topic) {
      const topicAdjustments = {
        'monetary-reform': { economist: 2.0, currency: 1.5, policy: 1.2 },
        'worker-ownership': { activist: 2.0, economist: 1.5, policy: 1.2 },
        'universal-basic-income': { economist: 2.0, policy: 1.5, activist: 1.2 },
        'community-currencies': { currency: 2.0, economist: 1.5, activist: 1.2 },
        'cooperative-economics': { activist: 2.0, economist: 1.5, policy: 1.2 },
        'debt-abolition': { activist: 2.0, legal: 1.5, economist: 1.2 },
        'housing-justice': { activist: 2.0, policy: 1.5, legal: 1.2 },
        'tally-system': { currency: 2.0, economist: 1.5, policy: 1.2 }
      };

      if (topicAdjustments[context.topic]) {
        for (const [agentType, multiplier] of Object.entries(topicAdjustments[context.topic])) {
          if (scores[agentType]) {
            scores[agentType] *= multiplier;
          }
        }
      }
    }

    // Find the agent with the highest score
    let bestAgent = 'economist';
    let highestScore = scores.economist || 0;

    for (const [agentType, score] of Object.entries(scores)) {
      if (score > highestScore) {
        highestScore = score;
        bestAgent = agentType;
      }
    }

    // If no strong match, use fallback logic
    if (highestScore < 1.0) {
      // Check for question patterns
      if (/^(what|how|why|when|where|who|explain|tell me about)/i.test(message)) {
        return this.getParticipant('educator') || this.getParticipant('economist');
      }

      // Check for action-oriented language
      if (/\b(should|must|need to|have to|ought to)\b/i.test(message)) {
        return this.getParticipant('activist') || this.getParticipant('policy');
      }

      // Default fallback based on context
      if (context.topic === 'legal' || context.topic === 'policy') {
        return this.getParticipant('policy') || this.getParticipant('legal');
      }

      return this.getParticipant('economist');
    }

    return this.getParticipant(bestAgent);
  }

  // Get a random participant (for follow-ups)
  getRandomParticipant(excludeId = null) {
    const participants = Array.from(this.participants.values());
    const eligible = excludeId 
      ? participants.filter(p => p.id !== excludeId)
      : participants;
    
    if (eligible.length === 0) return participants[0];
    
    return eligible[Math.floor(Math.random() * eligible.length)];
  }

  // Generate response from selected participant
  async generateResponse(participantId, message, context, conversationHistory) {
    const participant = this.getParticipant(participantId);
    if (!participant) {
      throw new Error(`Participant with ID ${participantId} not found`);
    }
    
    return await participant.generateResponse(message, context, conversationHistory);
  }

  // Generate follow-up response
  async generateFollowUp(originalMessage, firstResponse, context, excludeParticipantId) {
    const participant = this.getRandomParticipant(excludeParticipantId);
    if (!participant) {
      return null;
    }
    
    return await participant.generateFollowUp(originalMessage, firstResponse, context);
  }
}

module.exports = AIParticipantManager;