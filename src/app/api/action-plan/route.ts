import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { idea } = await request.json();

    if (!idea || typeof idea !== 'string') {
      return NextResponse.json({ error: 'No idea provided' }, { status: 400 });
    }

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a strategic execution coach. Your job is to break down ideas into clear, actionable first steps.

IMPORTANT: Detect the language of the input and respond in THE SAME LANGUAGE.

Given an idea, generate 3-5 concrete action points that are:
1. **Immediately actionable** - can be done TODAY
2. **Specific** - no vague "research" or "think about" steps
3. **Small** - each takes 15-60 minutes max
4. **Sequential** - ordered by what should come first
5. **Momentum-building** - early wins to build confidence

Focus on the FIRST steps only. Don't plan the whole project - just what's needed to START.

Examples of GOOD action points:
- "Escribir 3 ideas de nombre para el proyecto en una nota"
- "Buscar 2 competidores y anotar qué hacen bien"
- "Crear carpeta del proyecto y documento con la idea principal"
- "Enviar mensaje a [persona] preguntando su opinión"

Examples of BAD action points:
- "Investigar el mercado" (too vague)
- "Desarrollar el MVP" (too big)
- "Pensar en la estrategia" (not actionable)

Return JSON:
{
  "action_points": [
    {
      "title": "string - clear actionable step",
      "time_estimate": "15min" | "30min" | "45min" | "1h",
      "category": "work" | "personal" | "learning" | "errands"
    }
  ]
}`,
        },
        {
          role: 'user',
          content: idea,
        },
      ],
      temperature: 0.4,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      return NextResponse.json({ action_points: [] });
    }

    const parsed = JSON.parse(content);
    return NextResponse.json({ action_points: parsed.action_points || [] });
  } catch (error) {
    console.error('Action plan error:', error);
    return NextResponse.json(
      { error: 'Failed to generate action plan' },
      { status: 500 }
    );
  }
}
