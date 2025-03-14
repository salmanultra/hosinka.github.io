const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
require('dotenv').config();

class GeminiAPI {
    constructor() {
        this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
        this.model = this.genAI.getGenerativeModel({ model: process.env.MODEL_NAME || "gemini-1.5-pro" });
    }

    // Basic configuration for the model
    getDefaultConfig() {
        return {
            temperature: parseFloat(process.env.TEMPERATURE) || 0.9,
            topK: parseInt(process.env.TOP_K) || 40,
            topP: parseFloat(process.env.TOP_P) || 0.95,
            maxOutputTokens: parseInt(process.env.MAX_OUTPUT_TOKENS) || 2048,
            safetySettings: [
                {
                    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                },
                {
                    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                },
                {
                    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                },
                {
                    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
                },
            ],
        };
    }

    // Text-only generation
    async generateText(prompt) {
        try {
            const result = await this.model.generateText({
                ...this.getDefaultConfig(),
                prompt,
            });
            return result.response.text();
        } catch (error) {
            console.error('Error generating text:', error);
            throw error;
        }
    }

    // Chat functionality
    async chat(messages) {
        try {
            const chat = this.model.startChat(this.getDefaultConfig());
            const result = await chat.sendMessage(messages);
            return result.response.text();
        } catch (error) {
            console.error('Error in chat:', error);
            throw error;
        }
    }

    // Multi-turn conversation
    async multiTurnConversation(messages) {
        try {
            const chat = this.model.startChat(this.getDefaultConfig());
            const responses = [];
            
            for (const message of messages) {
                const result = await chat.sendMessage(message);
                responses.push(result.response.text());
            }
            
            return responses;
        } catch (error) {
            console.error('Error in multi-turn conversation:', error);
            throw error;
        }
    }

    // Function calling capability
    async generateWithFunctions(prompt, functions) {
        try {
            const result = await this.model.generateText({
                ...this.getDefaultConfig(),
                prompt,
                tools: functions,
            });
            return result.response.text();
        } catch (error) {
            console.error('Error in function calling:', error);
            throw error;
        }
    }

    // Stream response
    async streamResponse(prompt) {
        try {
            const result = await this.model.generateText({
                ...this.getDefaultConfig(),
                prompt,
                streamingCallback: (chunk) => console.log(chunk),
            });
            return result;
        } catch (error) {
            console.error('Error in streaming:', error);
            throw error;
        }
    }

    // Multi-modal input processing (text + images)
    async processMultiModal(textPrompt, imageData) {
        try {
            const result = await this.model.generateText({
                ...this.getDefaultConfig(),
                prompt: [textPrompt, { inlineData: { data: imageData, mimeType: 'image/jpeg' } }],
            });
            return result.response.text();
        } catch (error) {
            console.error('Error in multi-modal processing:', error);
            throw error;
        }
    }

    // Embeddings generation
    async generateEmbeddings(text) {
        try {
            const embeddingModel = this.genAI.getGenerativeModel({ model: "embedding-001" });
            const result = await embeddingModel.embedText(text);
            return result.embedding;
        } catch (error) {
            console.error('Error generating embeddings:', error);
            throw error;
        }
    }
}

module.exports = GeminiAPI; 