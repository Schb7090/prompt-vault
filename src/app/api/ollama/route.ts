import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
    try {
        const { prompt, model = 'llama3.2', ollamaUrl = 'http://localhost:11434' } = await request.json();

        if (!prompt) {
            return NextResponse.json({ error: 'Prompt content is required' }, { status: 400 });
        }

        const response = await fetch(`${ollamaUrl}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model, prompt, stream: false }),
        });

        if (!response.ok) {
            const text = await response.text();
            return NextResponse.json(
                { error: `Ollama returned ${response.status}: ${text}` },
                { status: response.status }
            );
        }

        const data = await response.json();
        return NextResponse.json({ response: data.response, model: data.model });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        if (
            message.includes('ECONNREFUSED') ||
            message.includes('fetch failed') ||
            message.includes('connect')
        ) {
            return NextResponse.json(
                { error: 'Cannot connect to Ollama. Make sure Ollama is running at the specified URL.' },
                { status: 503 }
            );
        }
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
