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

  try {
    // Try primary model first
    const primaryModel = 'gemini-2.5-flash';
    console.log(`[Gemini API] Attempting with ${primaryModel}...`);
    
    const response = await ai.models.generateContent({
      model: primaryModel,
      contents: formattedMessages,
      config,
    });

    return {
      text: response.text || '',
      modelUsed: primaryModel,
    };
  } catch (error) {
    console.warn('[Gemini API] Primary model failed, falling back to gemini-2.5-pro...', error);
    
    // Fallback model
    const fallbackModel = 'gemini-2.5-pro';
    console.log(`[Gemini API] Attempting with ${fallbackModel}...`);
    
    try {
      const fallbackResponse = await ai.models.generateContent({
        model: fallbackModel,
        contents: formattedMessages,
        config,
      });

      return {
        text: fallbackResponse.text || '',
        modelUsed: fallbackModel,
      };
    } catch (fallbackError) {
      console.error('[Gemini API] Both primary and fallback models failed:', fallbackError);
      throw new Error('Failed to generate response from AI models.');
    }
  }
}
