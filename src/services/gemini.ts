import { GoogleGenAI } from '@google/genai';
import { personas, PersonaId } from '@/lib/personas';

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY || '',
});

export interface Message {
  role: 'user' | 'model';
  content: string;
}

export interface ChatResponse {
  text: string;
  modelUsed: string;
}

const MODEL_FALLBACK_CHAIN = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-flash-lite-latest",
  "gemini-flash-latest",
];

export async function generateChatResponse(messages: Message[], personaId: PersonaId): Promise<ChatResponse> {
  const persona = personas[personaId];
  if (!persona) {
    throw new Error('Invalid persona selected.');
  }

  const formattedMessages = messages.map((msg) => ({
    role: msg.role,
    parts: [{ text: msg.content }],
  }));

  const config = {
    systemInstruction: persona.systemPrompt,
    temperature: 0.7,
  };

  // Try each model in the fallback chain
  for (const model of MODEL_FALLBACK_CHAIN) {
    try {
      console.log(`[Gemini API] Attempting with ${model}...`);
      
      const response = await ai.models.generateContent({
        model: model,
        contents: formattedMessages,
        config,
      });

      console.log(`[Gemini API] Successfully used ${model}`);
      return {
        text: response.text || '',
        modelUsed: model,
      };
    } catch (error: any) {
      const errorMessage = error?.message || String(error);
      const isRateLimitError = 
        errorMessage.includes('429') || 
        errorMessage.includes('RESOURCE_EXHAUSTED') ||
        errorMessage.includes('quota') ||
        errorMessage.includes('limit');
      
      console.warn(
        `[Gemini API] ${model} failed${isRateLimitError ? ' (API limit reached)' : ''}: ${errorMessage}`
      );
      
      // Continue to next model in chain
      continue;
    }
  }

  // If all models fail, throw error
  console.error(
    `[Gemini API] All models in fallback chain failed. Tried: ${MODEL_FALLBACK_CHAIN.join(', ')}`
  );
  throw new Error('Failed to generate response - all available models exhausted.');
}
