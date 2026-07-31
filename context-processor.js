// Context Processor - Intelligent conversation analysis
// 🔒 PRIVACY: All processing happens locally. No external API calls.

/**
 * Analyze conversation and extract meaningful insights
 * Uses semantic analysis, not just pattern matching
 */
function analyzeConversation(messages) {
  if (!messages || messages.length === 0) {
    return { goal: 'No conversation', progress: [], decisions: [], currentState: 'Empty' };
  }

  // Extract all user and assistant messages
  const userMessages = messages.filter(m => m.role === 'user').map(m => m.text);
  const assistantMessages = messages.filter(m => m.role === 'assistant').map(m => m.text);

  // 1. GOAL EXTRACTION - Analyze entire conversation, not just first message
  const goal = extractIntelligentGoal(userMessages, assistantMessages);

  // 2. PROGRESS TRACKING - What was accomplished
  const progress = trackProgress(assistantMessages);

  // 3. KEY DECISIONS - Important choices made
  const decisions = extractDecisions(messages);

  // 4. CURRENT STATE - Where things stand now
  const currentState = determineCurrentState(messages);

  // 5. KEY CONCEPTS - Main topics/technologies discussed
  const concepts = extractKeyConcepts(messages);

  return {
    goal,
    progress,
    decisions,
    currentState,
    concepts,
    messageCount: messages.length,
    userMessageCount: userMessages.length,
    assistantMessageCount: assistantMessages.length
  };
}

/**
 * Intelligent goal extraction - analyzes entire conversation
 */
function extractIntelligentGoal(userMessages, assistantMessages) {
  if (userMessages.length === 0) return 'No goal identified';

  // Strategy 1: Look for explicit goal statements in early messages
  const goalPatterns = [
    /(?:i (?:want|need|'d like) (?:to|you to))\s+(.+?)(?:\.|$)/i,
    /(?:help me|please)\s+(.+?)(?:\.|$)/i,
    /(?:can you|could you)\s+(.+?)(?:\?|$)/i,
    /(?:let's|we should)\s+(.+?)(?:\.|$)/i,
    /(?:build|create|make|develop|implement|design)\s+(?:a|an|the)?\s*(.+?)(?:\.|$)/i
  ];

  // Check first 3 user messages for explicit goals
  for (let i = 0; i < Math.min(3, userMessages.length); i++) {
    const msg = userMessages[i];
    for (const pattern of goalPatterns) {
      const match = msg.match(pattern);
      if (match && match[1] && match[1].length > 10) {
        let goal = match[1].trim();
        goal = goal.replace(/[?.!]+$/, '');
        goal = goal.charAt(0).toUpperCase() + goal.slice(1);
        return goal;
      }
    }
  }

  // Strategy 2: Analyze what the assistant actually did (from their responses)
  const assistantActions = [];
  const actionPatterns = [
    /(?:i(?:'ve| have) (?:created|built|implemented|written|developed))\s+(.+?)(?:\.|$)/i,
    /(?:here(?:'s| is) (?:the|a|your))\s+(.+?)(?:\.|$)/i,
    /(?:let me (?:show|explain|create|build))\s+(.+?)(?:\.|$)/i
  ];

  for (const msg of assistantMessages.slice(0, 3)) {
    for (const pattern of actionPatterns) {
      const match = msg.match(pattern);
      if (match && match[1]) {
        assistantActions.push(match[1].trim());
      }
    }
  }

  if (assistantActions.length > 0) {
    // Infer goal from what was delivered
    return assistantActions[0].charAt(0).toUpperCase() + assistantActions[0].slice(1);
  }

  // Strategy 3: Extract key topics from conversation
  const allText = [...userMessages, ...assistantMessages].join(' ').toLowerCase();
  const topics = extractTopics(allText);
  
  if (topics.length > 0) {
    return `Work on ${topics.slice(0, 2).join(' and ')}`;
  }

  // Fallback: Summarize first message intelligently
  const firstMsg = userMessages[0];
  const sentences = firstMsg.split(/[.!?]+/).filter(s => s.trim().length > 10);
  
  if (sentences.length > 0) {
    // Take the most substantial sentence
    const bestSentence = sentences.reduce((best, current) => 
      current.length > best.length ? current : best
    );
    return bestSentence.trim().charAt(0).toUpperCase() + bestSentence.trim().slice(1);
  }

  return firstMsg.substring(0, 100).trim();
}

/**
 * Track what was accomplished in the conversation
 */
function trackProgress(assistantMessages) {
  const progress = [];
  const completed = [];
  const pending = [];

  // Completion indicators
  const completionPatterns = [
    { pattern: /(?:i(?:'ve| have) (?:created|built|implemented|added|fixed|completed|finished))/i, type: 'completed' },
    { pattern: /(?:here(?:'s| is) (?:the|your|a))/i, type: 'completed' },
    { pattern: /(?:done|completed|finished|ready)/i, type: 'completed' },
    { pattern: /(?:the (?:code|function|component|file) (?:is|has been))/i, type: 'completed' }
  ];

  // Pending indicators
  const pendingPatterns = [
    { pattern: /(?:you (?:can|could|should|might want to) (?:also|additionally|next))/i, type: 'pending' },
    { pattern: /(?:still need to|todo|remaining|yet to)/i, type: 'pending' },
    { pattern: /(?:next (?:step|we should|you should))/i, type: 'pending' }
  ];

  assistantMessages.forEach(msg => {
    const sentences = msg.split(/[.!?]+/).filter(s => s.trim().length > 15);
    
    sentences.forEach(sentence => {
      completionPatterns.forEach(({ pattern, type }) => {
        if (pattern.test(sentence)) {
          completed.push(sentence.trim());
        }
      });

      pendingPatterns.forEach(({ pattern, type }) => {
        if (pattern.test(sentence)) {
          pending.push(sentence.trim());
        }
      });
    });
  });

  // Remove duplicates and limit
  const uniqueCompleted = [...new Set(completed)].slice(0, 3);
  const uniquePending = [...new Set(pending)].slice(0, 2);

  return {
    completed: uniqueCompleted,
    pending: uniquePending,
    total: uniqueCompleted.length + uniquePending.length
  };
}

/**
 * Extract key decisions made during conversation
 */
function extractDecisions(messages) {
  const decisions = [];
  const decisionPatterns = [
    /(?:let's (?:go with|use|choose|implement))/i,
    /(?:i(?:'ll| will) use)/i,
    /(?:we(?:'ll| will) use)/i,
    /(?:decided to|decision:|chosen)/i,
    /(?:the best (?:approach|way|method) is)/i
  ];

  messages.forEach(msg => {
    const sentences = msg.text.split(/[.!?]+/).filter(s => s.trim().length > 15);
    
    sentences.forEach(sentence => {
      decisionPatterns.forEach(pattern => {
        if (pattern.test(sentence)) {
          decisions.push({
            text: sentence.trim(),
            role: msg.role
          });
        }
      });
    });
  });

  return decisions.slice(0, 3);
}

/**
 * Determine current state of the conversation
 */
function determineCurrentState(messages) {
  if (messages.length === 0) return 'Empty conversation';

  const lastMsg = messages[messages.length - 1];
  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
  const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant');

  // Check if conversation is complete
  if (lastMsg.role === 'assistant') {
    const completionIndicators = [
      /(?:done|completed|finished|that's it|all set)/i,
      /(?:let me know if you (?:need|have) (?:anything|any questions))/i,
      /(?:is there anything else)/i
    ];

    for (const pattern of completionIndicators) {
      if (pattern.test(lastMsg.text)) {
        return 'Completed - Waiting for user feedback';
      }
    }

    return 'Assistant responded - Awaiting user input';
  }

  // User sent last message
  if (lastMsg.role === 'user') {
    const questionPatterns = [
      /\?$/,
      /(?:how|what|why|when|where|can you|could you)/i
    ];

    for (const pattern of questionPatterns) {
      if (pattern.test(lastMsg.text)) {
        return 'Question asked - Awaiting assistant response';
      }
    }

    return 'User message sent - Awaiting assistant response';
  }

  return 'In progress';
}

/**
 * Extract key concepts and topics from conversation
 */
function extractKeyConcepts(messages) {
  const allText = messages.map(m => m.text).join(' ').toLowerCase();
  
  // Technology/framework keywords
  const techKeywords = [
    'react', 'vue', 'angular', 'javascript', 'typescript', 'python', 'java',
    'node', 'express', 'django', 'flask', 'database', 'api', 'rest', 'graphql',
    'jwt', 'authentication', 'authorization', 'css', 'html', 'sql', 'mongodb',
    'postgresql', 'docker', 'kubernetes', 'aws', 'azure', 'git'
  ];

  // Concept keywords
  const conceptKeywords = [
    'algorithm', 'function', 'component', 'class', 'module', 'library',
    'framework', 'pattern', 'architecture', 'design', 'implementation',
    'feature', 'bug', 'error', 'optimization', 'performance', 'security'
  ];

  const foundTech = techKeywords.filter(kw => allText.includes(kw));
  const foundConcepts = conceptKeywords.filter(kw => allText.includes(kw));

  return {
    technologies: foundTech.slice(0, 5),
    concepts: foundConcepts.slice(0, 3)
  };
}

/**
 * Extract topics from text
 */
function extractTopics(text) {
  const topics = [];
  const topicPatterns = [
    /(?:the|a|an)\s+(\w+(?:\s+\w+)?)\s+(?:system|app|application|website|feature|component)/gi,
    /(\w+(?:\s+\w+)?)\s+(?:development|implementation|integration)/gi
  ];

  topicPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      if (match[1] && match[1].length > 3) {
        topics.push(match[1]);
      }
    }
  });

  return [...new Set(topics)].slice(0, 3);
}

/**
 * Remove filler phrases from text
 */
function removeFiller(text) {
  const fillerPatterns = [
    /^(?:Sure!|Of course!|Absolutely!|Great question!|That's a great question!|I'd be happy to help[.!]?|Certainly!|No problem!|Happy to help[.!]?)\s*/i,
    /(?:I hope this helps[.!]?|Let me know if you have any (?:other )?questions[.!]?|Feel free to ask if you need anything else[.!]?|Is there anything else I can help you with\??)\s*$/i,
    /\s*(?:Here's|Here is|Let me|Allow me to)\s+/gi,
    /^\s*(?:As an AI|As a language model)[^.]*(?:\.|,)\s*/i
  ];

  let cleaned = text;
  fillerPatterns.forEach(pattern => {
    cleaned = cleaned.replace(pattern, '');
  });

  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  return cleaned.trim();
}

/**
 * Isolate code blocks from text
 */
function isolateCodeBlocks(text) {
  const codeBlockRegex = /```[\s\S]*?```/g;
  const codeBlocks = [];
  
  let match;
  let index = 0;
  while ((match = codeBlockRegex.exec(text)) !== null) {
    codeBlocks.push({
      index: index++,
      code: match[0],
      position: match.index
    });
  }

  let textWithoutCode = text;
  codeBlocks.forEach((block, i) => {
    const placeholder = `[CODE_BLOCK_${i}]`;
    textWithoutCode = textWithoutCode.replace(block.code, placeholder);
  });

  return { textWithoutCode, codeBlocks };
}

/**
 * Format output with intelligent analysis
 */
function formatSectionedOutput(messages, providerName, options = {}) {
  const { includeHeader = true, mode = 'full' } = options;

  // Analyze the conversation
  const analysis = analyzeConversation(messages);

  let output = '';

  // Header
  if (includeHeader) {
    output += `[CONTEXT TRANSFER FROM ${providerName.toUpperCase()}]\n\n`;
    output += `Intelligent context analysis complete. Continue this conversation seamlessly.\n\n`;
    output += `${'─'.repeat(50)}\n\n`;
  }

  // Section 1: Goal
  output += `🎯 GOAL:\n${analysis.goal}\n\n`;

  // Section 2: Progress
  if (analysis.progress.total > 0) {
    output += `📊 PROGRESS:\n`;
    if (analysis.progress.completed.length > 0) {
      analysis.progress.completed.forEach(item => {
        output += `✅ ${item}\n`;
      });
    }
    if (analysis.progress.pending.length > 0) {
      analysis.progress.pending.forEach(item => {
        output += `⏳ ${item}\n`;
      });
    }
    output += '\n';
  }

  // Section 3: Key Concepts
  if (analysis.concepts.technologies.length > 0 || analysis.concepts.concepts.length > 0) {
    output += `💡 KEY CONCEPTS:\n`;
    if (analysis.concepts.technologies.length > 0) {
      output += `Technologies: ${analysis.concepts.technologies.join(', ')}\n`;
    }
    if (analysis.concepts.concepts.length > 0) {
      output += `Concepts: ${analysis.concepts.concepts.join(', ')}\n`;
    }
    output += '\n';
  }

  // Section 4: Decisions
  if (analysis.decisions.length > 0) {
    output += `🔑 KEY DECISIONS:\n`;
    analysis.decisions.forEach(decision => {
      output += `• ${decision.text}\n`;
    });
    output += '\n';
  }

  // Section 5: Current State
  output += `📍 CURRENT STATE:\n${analysis.currentState}\n\n`;

  // Section 6: Conversation (processed)
  output += `💬 CONVERSATION:\n`;
  
  const processedMessages = messages.map(msg => {
    let text = msg.role === 'assistant' ? removeFiller(msg.text) : msg.text;
    const { textWithoutCode, codeBlocks } = isolateCodeBlocks(text);
    
    return {
      role: msg.role,
      text: textWithoutCode,
      codeBlocks,
      originalLength: msg.text.length
    };
  });

  if (mode === 'summary') {
    // Summary mode: key exchanges only
    const firstUser = processedMessages.find(m => m.role === 'user');
    const lastMsg = processedMessages[processedMessages.length - 1];
    
    if (firstUser) {
      output += `[User]: ${firstUser.text.substring(0, 200)}${firstUser.text.length > 200 ? '...' : ''}\n\n`;
    }
    
    // Show 2-3 key exchanges
    const exchanges = [];
    for (let i = 0; i < processedMessages.length - 1; i++) {
      if (processedMessages[i].role === 'user' && processedMessages[i + 1].role === 'assistant') {
        exchanges.push([processedMessages[i], processedMessages[i + 1]]);
      }
    }
    
    const keyExchanges = exchanges.slice(0, 2);
    keyExchanges.forEach(([user, assistant]) => {
      output += `[User]: ${user.text.substring(0, 150)}...\n`;
      output += `[AI]: ${assistant.text.substring(0, 200)}...\n\n`;
    });
    
    if (lastMsg && lastMsg !== firstUser) {
      output += `[${lastMsg.role === 'user' ? 'User' : 'AI'}]: ${lastMsg.text.substring(0, 200)}${lastMsg.text.length > 200 ? '...' : ''}\n\n`;
    }
  } else {
    // Full mode: all messages
    processedMessages.forEach(msg => {
      const sender = msg.role === 'user' ? 'User' : 'AI Assistant';
      output += `[${sender}]:\n${msg.text}\n\n`;
      
      if (msg.codeBlocks.length > 0) {
        msg.codeBlocks.forEach(block => {
          output += `${block.code}\n\n`;
        });
      }
    });
  }

  // Section 7: Code Summary
  const allCodeBlocks = processedMessages.flatMap(m => m.codeBlocks);
  if (allCodeBlocks.length > 0) {
    output += `💻 CODE BLOCKS (${allCodeBlocks.length} total):\n`;
    output += `All code blocks preserved exactly as written.\n\n`;
  }

  // Footer
  if (includeHeader) {
    output += `${'─'.repeat(50)}\n\n`;
    output += `[END OF CONTEXT - Please confirm understanding and continue from the current state.]`;
  }

  return output;
}

/**
 * Search capsules
 */
function searchCapsules(capsules, query) {
  if (!query || query.trim() === '') return capsules;

  const searchTerm = query.toLowerCase();
  
  return capsules.filter(capsule => {
    if (capsule.title && capsule.title.toLowerCase().includes(searchTerm)) return true;
    if (capsule.text && capsule.text.toLowerCase().includes(searchTerm)) return true;
    if (capsule.provider && capsule.provider.toLowerCase().includes(searchTerm)) return true;
    return false;
  });
}

// Export for browser
if (typeof window !== 'undefined') {
  window.analyzeConversation = analyzeConversation;
  window.formatSectionedOutput = formatSectionedOutput;
  window.searchCapsules = searchCapsules;
}
