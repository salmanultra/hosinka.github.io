const GeminiAPI = require('./geminiApi');
const fs = require('fs').promises;

async function runExamples() {
    const gemini = new GeminiAPI();

    try {
        // 1. Basic text generation
        console.log('\n1. Text Generation Example:');
        const textResult = await gemini.generateText('Explain quantum computing in simple terms.');
        console.log(textResult);

        // 2. Chat conversation
        console.log('\n2. Chat Example:');
        const chatResult = await gemini.chat('What are the best practices for writing clean code?');
        console.log(chatResult);

        // 3. Multi-turn conversation
        console.log('\n3. Multi-turn Conversation Example:');
        const conversationMessages = [
            'What is machine learning?',
            'Can you give me some examples of machine learning applications?',
            'How can I start learning machine learning?'
        ];
        const multiTurnResult = await gemini.multiTurnConversation(conversationMessages);
        console.log(multiTurnResult);

        // 4. Function calling
        console.log('\n4. Function Calling Example:');
        const functions = [
            {
                name: 'calculate',
                description: 'Performs mathematical calculations',
                parameters: {
                    type: 'object',
                    properties: {
                        operation: { type: 'string' },
                        numbers: { type: 'array', items: { type: 'number' } }
                    }
                }
            }
        ];
        const functionResult = await gemini.generateWithFunctions(
            'Calculate the average of numbers 10, 20, and 30',
            functions
        );
        console.log(functionResult);

        // 5. Streaming response
        console.log('\n5. Streaming Response Example:');
        await gemini.streamResponse('Write a short story about a time traveler.');

        // 6. Multi-modal processing (requires image)
        console.log('\n6. Multi-modal Processing Example:');
        // Note: You'll need to provide actual image data
        const imageBase64 = ''; // Add your base64 image data here
        if (imageBase64) {
            const multiModalResult = await gemini.processMultiModal(
                'Describe what you see in this image.',
                imageBase64
            );
            console.log(multiModalResult);
        }

        // 7. Embeddings
        console.log('\n7. Embeddings Example:');
        const embeddingResult = await gemini.generateEmbeddings('This is a test sentence for embeddings.');
        console.log('Embedding vector (first 5 dimensions):', embeddingResult.slice(0, 5));

    } catch (error) {
        console.error('Error running examples:', error);
    }
}

// Run all examples
runExamples(); 