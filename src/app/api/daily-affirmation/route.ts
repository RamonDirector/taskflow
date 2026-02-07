import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { context } = await request.json();
    
    const {
      userName,
      currentHour, // 0-23
      dayOfWeek, // 0-6 (Sunday = 0)
      totalTasks,
      totalIdeas,
      completedToday,
    } = context;

    // Time of day context
    let timeContext = 'morning';
    if (currentHour >= 12 && currentHour < 18) timeContext = 'afternoon';
    else if (currentHour >= 18) timeContext = 'evening';

    // Day context
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isMonday = dayOfWeek === 1;
    const isFriday = dayOfWeek === 5;

    const systemPrompt = `You are a wise, gentle guide generating daily affirmations for a productivity app focused on self-reflection and intentional living.

STYLE:
- Poetic but not pretentious
- Brief: 1-2 sentences max (under 20 words total)
- Inspiring without being cheesy
- Mix philosophical wisdom with practical motivation
- Occasionally reference nature, growth, or Japanese concepts (wabi-sabi, kaizen, ikigai)
- Spanish language

THEMES TO ROTATE:
- Progress over perfection
- Small steps compound
- Self-compassion
- Intentional action
- Present moment awareness
- Creative confidence
- Rest as productivity
- Growth mindset
- Clarity through reflection

CONTEXT AWARENESS:
- Morning: energy, intention-setting, fresh starts
- Afternoon: momentum, focus, progress
- Evening: reflection, gratitude, winding down
- Weekend: rest, creativity, perspective
- Monday: new beginnings, energy
- Friday: completion, satisfaction, transition

EXAMPLES:
- "El progreso no se mide en pasos perfectos, sino en pasos dados."
- "Hoy no necesitas resolver todo. Solo el siguiente paso."
- "Tu mente es un jardín. Planta con intención."
- "Lo pequeño, hecho con constancia, se vuelve grande."
- "Descansar también es avanzar."
- "Una idea capturada es mejor que cien olvidadas."

BAD (avoid):
- "¡Tú puedes!" (too generic)
- "Hoy va a ser un gran día" (cliché)
- "Cree en ti mismo" (overused)
- Anything with exclamation marks`;

    const contextParts = [];
    if (timeContext) contextParts.push(`Time: ${timeContext}`);
    if (isWeekend) contextParts.push('It\'s the weekend');
    if (isMonday) contextParts.push('It\'s Monday - fresh start');
    if (isFriday) contextParts.push('It\'s Friday - week wrapping up');
    if (userName) contextParts.push(`User: ${userName}`);
    if (completedToday > 0) contextParts.push(`Completed ${completedToday} tasks today`);
    if (totalIdeas > 10) contextParts.push('Active idea collector');
    if (totalTasks === 0 && totalIdeas === 0) contextParts.push('New user, just starting');

    const userPrompt = `Context:\n${contextParts.join('\n')}\n\nGenerate a single, poetic daily affirmation in Spanish. No quotes around it.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 60,
      temperature: 0.9,
    });

    let affirmation = completion.choices[0]?.message?.content?.trim() || 'El camino se hace al andar.';
    
    // Remove quotes if the AI added them
    affirmation = affirmation.replace(/^[""]|[""]$/g, '').trim();

    return NextResponse.json({ affirmation });
  } catch (error) {
    console.error('Daily affirmation error:', error);
    return NextResponse.json({ affirmation: 'El camino se hace al andar.' });
  }
}
