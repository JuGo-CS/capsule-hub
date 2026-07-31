// Context Processor - Intelligent context extraction and formatting
// 🔒 PRIVACY: All processing happens locally. No external API calls.

/**
 * A1 - Goal Extraction: Extract primary objective from first user message
 * Looks for patterns like "I want to...", "Help me...", "Build a...", etc.
 */
function extractGoal(messages) {
  const firstUserMsg = messages.find(m => m.role === 'user');
  if (!firstUserMsg) return 'No goal identified';

  const text = firstUserMsg.text.toLowerCase();
  
  // Common goal patterns
  const patterns = [
    /(?:i want to|i'd like to|i need to|help me|please)\s+(.+?)(?:\.|$)/i,
    /(?:build|create|make|develop|design|implement)\s+(.+?)(?:\.|$)/i,
    /(?:can you|could you|would you)\s+(.+?)(?:\?|$)/i,
    /(?:how (?:do|can|to)|what(?:'s| is) the (?:best )?way to)\s+(.+?)(?:\?|$)/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      // Clean up and return the goal
      let goal = match[1].trim();
      // Remove trailing question marks or periods
      goal = goal.replace(/[?.!]+$/, '');
      // Capitalize first letter
      goal = goal.charAt(0).toUpperCase() + goal.slice(1);
      return goal;
    }
  }

  // Fallback: return first 100 chars of first message
  return firstUserMsg.text.substring(0, 100).trim() + (firstUserMsg.text.length > 100 ? '...' : '');
}

/**
 * B1 - Filler Removal: Strip AI pleasantries and conversational filler
 */
function removeFiller(text) {
  // Common AI filler phrases to remove
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

  // Remove excessive newlines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  
  return cleaned.trim();
}

/**
 * B3 - Code Isolation: Extract and preserve code blocks exactly
 * Returns an object with { textWithoutCode, codeBlocks[] }
 */
function isolateCodeBlocks(text) {
  const codeBlockRegex = /```[\s\S]*?```/g;
  const codeBlocks = [];
  
  // Find all code blocks
  let match;
  let index = 0;
  while ((match = codeBlockRegex.exec(text)) !== null) {
    codeBlocks.push({
      index: index++,
      code: match[0],
      position: match.index
    });
  }

  // Replace code blocks with placeholders
  let textWithoutCode = text;
  codeBlocks.forEach((block, i) => {
    const placeholder = `[CODE_BLOCK_${i}]`;
    textWithoutCode = textWithoutCode.replace(block.code, placeholder);
  });

  return {
    textWithoutCode,
    codeBlocks
  };
}

/**
 * Detect progress indicators in assistant messages
 */
function detectProgress(messages) {
  const assistantMsgs = messages.filter(m => m.role === 'assistant');
  const progress = [];

  const completionPatterns = [
    /(?:done|completed?|finished|implemented?|created|built|added|fixed|resolved)/i,
    /(?:here(?:'s| is) the|I(?:'ve| have) (?:created|built|implemented|fixed))/i
  ];

  const pendingPatterns = [
    /(?:todo|still need to|next (?:step|we should)|remaining|yet to)/i,
    /(?:you (?:can|could|should) (?:also|additionally))/i
  ];

  assistantMsgs.forEach(msg => {
    const text = msg.text.toLowerCase();
    
    completionPatterns.forEach(pattern => {
      if (pattern.test(text)) {
        // Extract the sentence containing the completion
        const sentences = msg.text.split(/[.!?]+/);
        sentences.forEach(sentence => {
          if (pattern.test(sentence) && sentence.trim().length > 10) {
            progress.push({
              type: 'completed',
              text: sentence.trim()
            });
          }
        });
      }
    });

    pendingPatterns.forEach(pattern => {
      if (pattern.test(text)) {
        const sentences = msg.text.split(/[.!?]+/);
        sentences.forEach(sentence => {
          if (pattern.test(sentence) && sentence.trim().length > 10) {
            progress.push({
              type: 'pending',
              text: sentence.trim()
            });
          }
        });
      }
    });
  });

  // Remove duplicates
  const unique = [];
  const seen = new Set();
  progress.forEach(p => {
    const key = p.text.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(p);
    }
  });

  return unique.slice(0, 5); // Limit to 5 progress items
}

/**
 * C1 - Sectioned Output: Format context into structured sections
 */
function formatSectionedOutput(messages, providerName, options = {}) {
  const {
    includeHeader = true,
    mode = 'full'
  } = options;

  // Extract goal
  const goal = extractGoal(messages);

  // Detect progress
  const progress = detectProgress(messages);

  // Process all messages
  const processedMessages = messages.map(msg => {
    // Remove filler from assistant messages
    let text = msg.role === 'assistant' ? removeFiller(msg.text) : msg.text;
    
    // Isolate code blocks
    const { textWithoutCode, codeBlocks } = isolateCodeBlocks(text);
    
    return {
      role: msg.role,
      text: textWithoutCode,
      codeBlocks,
      originalLength: msg.text.length
    };
  });

  // Build sectioned output
  let output = '';

  // Header
  if (includeHeader) {
    output += `[CONTEXT TRANSFER FROM ${providerName.toUpperCase()}]\n\n`;
    output += `Continue this conversation seamlessly. The following is structured context:\n\n`;
    output += `${'─'.repeat(50)}\n\n`;
  }

  // Section 1: Goal
  output += `🎯 GOAL:\n${goal}\n\n`;

  // Section 2: Progress (if any)
  if (progress.length > 0) {
    output += `📊 PROGRESS:\n`;
    progress.forEach(p => {
      const icon = p.type === 'completed' ? '✅' : '⏳';
      output += `${icon} ${p.text}\n`;
    });
    output += '\n';
  }

  // Section 3: Conversation
  output += `💬 CONVERSATION:\n`;
  
  if (mode === 'summary') {
    // Summary mode: show first user message, key exchanges, and last message
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
    // Full mode: show all messages
    processedMessages.forEach(msg => {
      const sender = msg.role === 'user' ? 'User' : 'AI Assistant';
      output += `[${sender}]:\n${msg.text}\n\n`;
      
      // Add code blocks after the message
      if (msg.codeBlocks.length > 0) {
        msg.codeBlocks.forEach(block => {
          output += `${block.code}\n\n`;
        });
      }
    });
  }

  // Section 4: Code Summary
  const allCodeBlocks = processedMessages.flatMap(m => m.codeBlocks);
  if (allCodeBlocks.length > 0) {
    output += `💻 CODE BLOCKS (${allCodeBlocks.length} total):\n`;
    output += `All code blocks have been preserved exactly as written.\n\n`;
  }

  // Footer
  if (includeHeader) {
    output += `${'─'.repeat(50)}\n\n`;
    output += `[END OF CONTEXT - Please confirm understanding and respond to the last user message.]`;
  }

  return output;
}

/**
 * F1 - Full-Text Search: Search across all saved capsules
 */
function searchCapsules(capsules, query) {
  if (!query || query.trim() === '') {
    return capsules;
  }

  const searchTerm = query.toLowerCase();
  
  return capsules.filter(capsule => {
    // Search in title
    if (capsule.title && capsule.title.toLowerCase().includes(searchTerm)) {
      return true;
    }
    
    // Search in text content
    if (capsule.text && capsule.text.toLowerCase().includes(searchTerm)) {
      return true;
    }
    
    // Search in provider name
    if (capsule.provider && capsule.provider.toLowerCase().includes(searchTerm)) {
      return true;
    }
    
    return false;
  });
}

// Export functions for use in other files
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    extractGoal,
    removeFiller,
    isolateCodeBlocks,
    detectProgress,
    formatSectionedOutput,
    searchCapsules
  };
}
