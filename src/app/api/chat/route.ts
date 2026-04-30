import { NextResponse } from 'next/server';
import { generateChatResponse, Message } from '@/services/gemini';
import { PersonaId } from '@/lib/personas';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { messages, selectedPersona }: { messages: Message[]; selectedPersona: PersonaId } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'Messages are required.' }, { status: 400 });
    }

    if (!selectedPersona) {
      return NextResponse.json({ error: 'Persona selection is required.' }, { status: 400 });
    }

    const response = await generateChatResponse(messages, selectedPersona);

    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[API /api/chat] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
