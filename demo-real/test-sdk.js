import { query } from '@instantlyeasy/claude-code-sdk-ts';

console.log('🔧 Testing Claude Code SDK directly...');

try {
  const testPrompt = 'Say hello';
  console.log('📝 Testing with prompt:', testPrompt);
  
  const responseGenerator = query(testPrompt);
  
  for await (const chunk of responseGenerator) {
    console.log('✅ Received chunk:', chunk);
    break; // Just test the first chunk
  }
  
  console.log('✅ SDK test completed successfully');
} catch (error) {
  console.error('❌ SDK test failed:', error);
  console.error('Error details:', {
    name: error.name,
    message: error.message,
    stack: error.stack,
    code: error.code,
    exitCode: error.exitCode,
    signal: error.signal
  });
}