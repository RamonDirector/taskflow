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

    const systemPrompt = `You generate action-oriented affirmations using positive psychology principles to boost engagement and drive action.

GOAL: Make the user feel empowered and motivated to ACT. Not just feel good - but DO something.

PSYCHOLOGY PRINCIPLES TO USE:
- Self-efficacy: "You CAN do this"
- Implementation intentions: Focus on the next concrete step
- Progress principle: Small wins matter
- Identity-based motivation: "You are someone who..."
- Loss aversion: Don't let ideas slip away
- Momentum: Starting is the hardest part
- Commitment devices: Capture it now, decide later

STYLE:
- Direct and energizing
- Action verbs: captura, empieza, hazlo, mueve, crea, avanza
- Brief: 1 sentence, under 15 words
- Confident, not preachy
- Spanish language
- Can use one exclamation mark if it feels natural

THEMES:
- Start now, not later
- Capture before you forget
- Small action > perfect plan
- Your future self will thank you
- Ideas have value - don't lose them
- Momentum beats motivation
- Done is better than perfect

GOOD EXAMPLES:
- "Esa idea que tienes? Captúrala antes de que se escape."
- "Un paso hoy vale más que diez mañana."
- "No lo pienses más. Hazlo."
- "Tu yo del futuro te lo agradecerá."
- "Las ideas sin acción son solo sueños."
- "Empieza pequeño, pero empieza ya."
- "Captura ahora, organiza después."
- "El mejor momento para actuar es ahora."

BAD (avoid):
- "Cree en ti mismo" (passive, no action)
- "Eres increíble" (empty praise)
- "Todo saldrá bien" (no call to action)
- Anything purely reflective without action nudge`;

    const contextParts = [];
    if (timeContext) contextParts.push(`Time: ${timeContext}`);
    if (isWeekend) contextParts.push('It\'s the weekend');
    if (isMonday) contextParts.push('It\'s Monday - fresh start');
    if (isFriday) contextParts.push('It\'s Friday - week wrapping up');
    if (userName) contextParts.push(`User: ${userName}`);
    if (completedToday > 0) contextParts.push(`Completed ${completedToday} tasks today`);
    if (totalIdeas > 10) contextParts.push('Active idea collector');
    if (totalTasks === 0 && totalIdeas === 0) contextParts.push('New user, just starting');

    const userPrompt = `Context:\n${contextParts.join('\n')}\n\nGenerate an action-oriented affirmation in Spanish that motivates the user to take action NOW. No quotes around it.`;

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
