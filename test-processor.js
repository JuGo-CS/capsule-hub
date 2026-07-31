// Test script for context-processor.js
// Run with: node test-processor.js

const fs = require('fs');

// Load the processor
const processorCode = fs.readFileSync('context-processor.js', 'utf8');
eval(processorCode);

console.log('=== Testing Context Processor ===\n');

// Test 1: Simple conversation
console.log('Test 1: Simple coding conversation');
const testMessages1 = [
  { role: 'user', text: 'Help me build a React login form with validation' },
  { role: 'assistant', text: 'I\'ve created a login form component with email and password validation. Here\'s the code:\n```jsx\nconst LoginForm = () => { ... }\n```\nYou should also add error handling for failed login attempts.' },
  { role: 'user', text: 'Great! Can you add formik for form management?' },
  { role: 'assistant', text: 'Done! I\'ve integrated Formik with Yup validation. The form now handles all validation automatically.' }
];

const capsule1 = createCapsule(testMessages1, 'ChatGPT');
console.log('✓ Capsule created');
console.log(`  Name: ${capsule1.name}`);
console.log(`  Length: ${capsule1.text.length} chars`);
console.log(`  Messages: ${capsule1.metadata.messageCount}`);
console.log(`  Code blocks: ${capsule1.metadata.codeBlockCount}`);
console.log('');

// Test 2: Research conversation
console.log('Test 2: Research conversation');
const testMessages2 = [
  { role: 'user', text: 'Explain how neural networks work' },
  { role: 'assistant', text: 'Neural networks are computational models inspired by the human brain. They consist of layers of interconnected nodes (neurons) that process information...\n\nKey concepts:\n- Input layer receives data\n- Hidden layers process patterns\n- Output layer produces results\n\nLet me know if you have questions!' },
  { role: 'user', text: 'What about backpropagation?' },
  { role: 'assistant', text: 'Backpropagation is the algorithm used to train neural networks. It works by calculating the gradient of the loss function with respect to each weight...' }
];

const capsule2 = createCapsule(testMessages2, 'Claude');
console.log('✓ Capsule created');
console.log(`  Name: ${capsule2.name}`);
console.log(`  Goal: ${capsule2.metadata.goal}`);
console.log('');

// Test 3: Multiple code blocks
console.log('Test 3: Multiple code blocks');
const testMessages3 = [
  { role: 'user', text: 'Show me how to implement JWT authentication in Node.js' },
  { role: 'assistant', text: 'Here\'s the setup:\n```javascript\nconst jwt = require(\'jsonwebtoken\');\n```\n\nAnd the middleware:\n```javascript\nconst auth = (req, res, next) => { ... }\n```\n\nI\'ve implemented both token generation and validation.' },
  { role: 'user', text: 'Perfect! Add refresh tokens too' },
  { role: 'assistant', text: 'Done! Here\'s the refresh token logic:\n```javascript\nconst refreshToken = async (req, res) => { ... }\n```' }
];

const capsule3 = createCapsule(testMessages3, 'ChatGPT');
console.log('✓ Capsule created');
console.log(`  Name: ${capsule3.name}`);
console.log(`  Code blocks: ${capsule3.metadata.codeBlockCount}`);
console.log('');

// Test 4: Empty conversation
console.log('Test 4: Empty conversation (edge case)');
const capsule4 = createCapsule([], 'Test');
console.log(`✓ Returns: ${capsule4 === null ? 'null (correct)' : 'ERROR - should be null'}`);
console.log('');

// Test 5: Search functionality
console.log('Test 5: Search functionality');
const testCapsules = [
  { name: 'React Login Form', text: 'Building authentication' },
  { name: 'Neural Networks', text: 'Deep learning research' },
  { name: 'JWT Auth', text: 'Node.js authentication' }
];

const searchResults = searchCapsules(testCapsules, 'auth');
console.log(`✓ Search "auth": ${searchResults.length} results (expected 2)`);
console.log('');

// Test 6: Verify capsule structure
console.log('Test 6: Capsule structure validation');
const structure = capsule1.text;
const hasObjective = structure.includes('## OBJECTIVE');
const hasProgress = structure.includes('## PROGRESS');
const hasCode = structure.includes('## CODE');
const hasEnd = structure.includes('[END CAPSULE');

console.log(`✓ Has OBJECTIVE: ${hasObjective}`);
console.log(`✓ Has PROGRESS: ${hasProgress}`);
console.log(`✓ Has CODE: ${hasCode}`);
console.log(`✓ Has END marker: ${hasEnd}`);
console.log('');

console.log('=== All Tests Complete ===');
console.log('\nSample capsule output:\n');
console.log(capsule1.text);
