// Capsule Hub - Intelligent Context Compressor
// 🔒 All processing happens locally. Zero external calls.

/**
 * Extract and compress conversation into a compact context capsule
 * Goal: Capture the ESSENCE, not the raw text
 */
function createCapsule(messages, providerName) {
  if (!messages || messages.length === 0) {
    return null;
  }

  // 1. Extract core components
  const goal = extractCoreGoal(messages);
  const requirements = extractRequirements(messages);
  const decisions = extractKeyDecisions(messages);
  const progress = extractProgress(messages);
  const codeBlocks = extractAllCodeBlocks(messages);
  const currentState = extractCurrentState(messages);
  const constraints = extractConstraints(messages);

  // 2. Generate intelligent name
  const capsuleName = generateCapsuleName(goal, decisions, codeBlocks);

  // 3. Compress into structured capsule
  const capsuleText = compressToCapsule({
    goal,
    requirements,
    decisions,
    progress,
    codeBlocks,
    currentState,
    constraints,
    providerName,
    messageCount: messages.length
  });

  return {
    name: capsuleName,
    text: capsuleText,
    metadata: {
      goal,
      messageCount: messages.length,
      codeBlockCount: codeBlocks.length,
      timestamp: Date.now(),
      provider: providerName
    }
  };
}

/**
 * Extract the CORE goal - what user is actually trying to achieve
 */
function extractCoreGoal(messages) {
  const userMsgs = messages.filter(m => m.role === 'user').map(m => m.text);
  
  if (userMsgs.length === 0) return 'No goal identified';

  // Analyze ALL user messages to understand the true objective
  const allUserText = userMsgs.join(' ').toLowerCase();
  
  // Look for explicit goal statements
  const goalPatterns = [
    /(?:i (?:want|need|'d like) (?:to|you to))\s+(.+?)(?:\.|$)/i,
    /(?:help me|please)\s+(.+?)(?:\.|$)/i,
    /(?:build|create|make|develop|implement|design)\s+(?:a|an|the)?\s*(.+?)(?:\.|$)/i,
    /(?:can you|could you)\s+(.+?)(?:\?|$)/i
  ];

  // Check first 5 user messages (not just first)
  for (let i = 0; i < Math.min(5, userMsgs.length); i++) {
    for (const pattern of goalPatterns) {
      const match = userMsgs[i].match(pattern);
      if (match && match[1] && match[1].length > 10 && match[1].length < 200) {
        let goal = match[1].trim();
        goal = goal.replace(/[?.!]+$/, '');
        return goal.charAt(0).toUpperCase() + goal.slice(1);
      }
    }
  }

  // Extract key topics from entire conversation
  const topics = extractTopicsFromConversation(allUserText);
  if (topics.length > 0) {
    return topics.join(', ');
  }

  // Fallback: Most substantial user message
  const substantial = userMsgs
    .filter(m => m.length > 20)
    .sort((a, b) => b.length - a.length);
  
  if (substantial.length > 0) {
    const msg = substantial[0];
    const sentences = msg.split(/[.!?]+/).filter(s => s.trim().length > 15);
    if (sentences.length > 0) {
      return sentences[0].trim();
    }
  }

  return 'Conversation context';
}

/**
 * Extract user requirements and constraints
 */
function extractRequirements(messages) {
  const requirements = [];
  const requirementPatterns = [
    /(?:it (?:should|must|needs to|has to))\s+(.+?)(?:\.|$)/i,
    /(?:make sure|ensure)\s+(.+?)(?:\.|$)/i,
    /(?:i need|we need)\s+(.+?)(?:\.|$)/i,
    /(?:requirement:|spec:)\s*(.+?)(?:\.|$)/i
  ];

  messages.forEach(msg => {
    if (msg.role === 'user') {
      const sentences = msg.text.split(/[.!?]+/).filter(s => s.trim().length > 10);
      sentences.forEach(sentence => {
        requirementPatterns.forEach(pattern => {
          const match = sentence.match(pattern);
          if (match && match[1]) {
            requirements.push(match[1].trim());
          }
        });
      });
    }
  });

  return [...new Set(requirements)].slice(0, 5);
}

/**
 * Extract key decisions made
 */
function extractKeyDecisions(messages) {
  const decisions = [];
  const decisionPatterns = [
    /(?:let's (?:go with|use|choose|implement))\s+(.+?)(?:\.|$)/i,
    /(?:i(?:'ll| will) use)\s+(.+?)(?:\.|$)/i,
    /(?:we(?:'ll| will) use)\s+(.+?)(?:\.|$)/i,
    /(?:decided to|decision:|chosen:?)\s*(.+?)(?:\.|$)/i,
    /(?:the best (?:approach|way|method) is)\s+(.+?)(?:\.|$)/i
  ];

  messages.forEach(msg => {
    const sentences = msg.text.split(/[.!?]+/).filter(s => s.trim().length > 15);
    sentences.forEach(sentence => {
      decisionPatterns.forEach(pattern => {
        const match = sentence.match(pattern);
        if (match && match[1] && match[1].length > 10) {
          decisions.push(match[1].trim());
        }
      });
    });
  });

  return [...new Set(decisions)].slice(0, 5);
}

/**
 * Extract what has been accomplished
 */
function extractProgress(messages) {
  const completed = [];
  const pending = [];

  const completedPatterns = [
    /(?:i(?:'ve| have) (?:created|built|implemented|added|fixed|completed|finished|written))\s+(.+?)(?:\.|$)/i,
    /(?:here(?:'s| is) (?:the|your|a))\s+(.+?)(?:\.|$)/i,
    /(?:the (?:code|function|component|file) (?:is|has been))\s+(.+?)(?:\.|$)/i,
    /(?:done[.!]|completed[.!]|finished[.!]|ready[.!])/i
  ];

  const pendingPatterns = [
    /(?:you (?:can|could|should|might want to) (?:also|additionally|next))\s+(.+?)(?:\.|$)/i,
    /(?:still need to|todo|remaining|yet to)\s+(.+?)(?:\.|$)/i,
    /(?:next (?:step|we should|you should))\s+(.+?)(?:\.|$)/i
  ];

  messages.forEach(msg => {
    if (msg.role === 'assistant') {
      const sentences = msg.text.split(/[.!?]+/).filter(s => s.trim().length > 15);
      sentences.forEach(sentence => {
        completedPatterns.forEach(pattern => {
          const match = sentence.match(pattern);
          if (match && match[1]) {
            completed.push(match[1].trim());
          } else if (pattern.test(sentence) && !match) {
            completed.push(sentence.trim());
          }
        });

        pendingPatterns.forEach(pattern => {
          const match = sentence.match(pattern);
          if (match && match[1]) {
            pending.push(match[1].trim());
          }
        });
      });
    }
  });

  return {
    completed: [...new Set(completed)].slice(0, 5),
    pending: [...new Set(pending)].slice(0, 3)
  };
}

/**
 * Extract ALL code blocks from entire conversation
 */
function extractAllCodeBlocks(messages) {
  const codeBlocks = [];
  const codeRegex = /```[\s\S]*?```/g;

  messages.forEach(msg => {
    let match;
    while ((match = codeRegex.exec(msg.text)) !== null) {
      codeBlocks.push({
        code: match[0],
        role: msg.role
      });
    }
  });

  return codeBlocks;
}

/**
 * Extract current state of conversation
 */
function extractCurrentState(messages) {
  if (messages.length === 0) return 'Empty';

  const lastMsg = messages[messages.length - 1];
  
  if (lastMsg.role === 'assistant') {
    const completionIndicators = [
      /(?:done|completed|finished|that's it|all set)/i,
      /(?:let me know if you (?:need|have) (?:anything|any questions))/i,
      /(?:is there anything else)/i
    ];

    for (const pattern of completionIndicators) {
      if (pattern.test(lastMsg.text)) {
        return 'Task completed, awaiting feedback';
      }
    }

    return 'Implementation provided, awaiting user review';
  }

  if (lastMsg.role === 'user') {
    if (/\?/.test(lastMsg.text)) {
      return 'Question asked, awaiting response';
    }
    return 'User input provided, awaiting response';
  }

  return 'In progress';
}

/**
 * Extract constraints and limitations mentioned
 */
function extractConstraints(messages) {
  const constraints = [];
  const constraintPatterns = [
    /(?:don't|do not|cannot|can't|shouldn't)\s+(.+?)(?:\.|$)/i,
    /(?:limitation:|constraint:|restriction:)\s*(.+?)(?:\.|$)/i,
    /(?:must not|avoid)\s+(.+?)(?:\.|$)/i
  ];

  messages.forEach(msg => {
    const sentences = msg.text.split(/[.!?]+/).filter(s => s.trim().length > 10);
    sentences.forEach(sentence => {
      constraintPatterns.forEach(pattern => {
        const match = sentence.match(pattern);
        if (match && match[1]) {
          constraints.push(match[1].trim());
        }
      });
    });
  });

  return [...new Set(constraints)].slice(0, 3);
}

/**
 * Extract topics from conversation
 */
function extractTopicsFromConversation(text) {
  const techKeywords = [
    'react', 'vue', 'angular', 'javascript', 'typescript', 'python', 'java',
    'node', 'express', 'django', 'flask', 'database', 'api', 'rest', 'graphql',
    'jwt', 'authentication', 'authorization', 'css', 'html', 'sql', 'mongodb',
    'postgresql', 'docker', 'kubernetes', 'aws', 'git', 'neural network',
    'machine learning', 'ai', 'deep learning', 'algorithm'
  ];

  const found = techKeywords.filter(kw => text.includes(kw));
  return found.slice(0, 3);
}

/**
 * Generate intelligent capsule name
 */
function generateCapsuleName(goal, decisions, codeBlocks) {
  // Strategy 1: Use goal if it's concise and meaningful
  if (goal && goal.length > 10 && goal.length < 80) {
    // Clean up the goal for use as name
    let name = goal
      .replace(/^(to |build |create |make |implement )/i, '')
      .replace(/[.!?]+$/, '')
      .trim();
    
    if (name.length > 50) {
      name = name.substring(0, 47) + '...';
    }
    
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  // Strategy 2: Extract from decisions
  if (decisions.length > 0) {
    const decision = decisions[0];
    let name = decision.substring(0, 50);
    if (decision.length > 50) name += '...';
    return name;
  }

  // Strategy 3: Use code context
  if (codeBlocks.length > 0) {
    return `Code Session (${codeBlocks.length} blocks)`;
  }

  // Fallback
  return `Capsule ${new Date().toLocaleDateString()}`;
}

/**
 * Compress everything into a compact capsule format
 */
function compressToCapsule(data) {
  let capsule = '';

  // Header
  capsule += `[CONTEXT CAPSULE from ${data.providerName}]\n`;
  capsule += `[${data.messageCount} messages compressed]\n\n`;

  // Goal
  capsule += `## OBJECTIVE\n${data.goal}\n\n`;

  // Requirements (if any)
  if (data.requirements.length > 0) {
    capsule += `## REQUIREMENTS\n`;
    data.requirements.forEach(req => {
      capsule += `- ${req}\n`;
    });
    capsule += '\n';
  }

  // Decisions (if any)
  if (data.decisions.length > 0) {
    capsule += `## KEY DECISIONS\n`;
    data.decisions.forEach(dec => {
      capsule += `- ${dec}\n`;
    });
    capsule += '\n';
  }

  // Progress
  if (data.progress.completed.length > 0 || data.progress.pending.length > 0) {
    capsule += `## PROGRESS\n`;
    data.progress.completed.forEach(item => {
      capsule += `✅ ${item}\n`;
    });
    data.progress.pending.forEach(item => {
      capsule += `⏳ ${item}\n`;
    });
    capsule += '\n';
  }

  // Constraints (if any)
  if (data.constraints.length > 0) {
    capsule += `## CONSTRAINTS\n`;
    data.constraints.forEach(con => {
      capsule += `- ${con}\n`;
    });
    capsule += '\n';
  }

  // Current State
  capsule += `## CURRENT STATE\n${data.currentState}\n\n`;

  // Code Blocks
  if (data.codeBlocks.length > 0) {
    capsule += `## CODE (${data.codeBlocks.length} blocks)\n`;
    data.codeBlocks.forEach((block, i) => {
      capsule += `${block.code}\n\n`;
    });
  }

  // Footer
  capsule += `\n[END CAPSULE - Continue from current state]`;

  return capsule;
}

/**
 * Search capsules
 */
function searchCapsules(capsules, query) {
  if (!query || query.trim() === '') return capsules;
  const searchTerm = query.toLowerCase();
  
  return capsules.filter(capsule => {
    if (capsule.name && capsule.name.toLowerCase().includes(searchTerm)) return true;
    if (capsule.text && capsule.text.toLowerCase().includes(searchTerm)) return true;
    return false;
  });
}

// Export for browser
if (typeof window !== 'undefined') {
  window.createCapsule = createCapsule;
  window.searchCapsules = searchCapsules;
}
