import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { checkAIAccess, incrementAIUsage } from '@/lib/ai/rate-limit';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    // Check AI access (rate limiting + enabled check)
    const access = await checkAIAccess();
    if (!access.allowed) {
      return NextResponse.json(
        { affirmation: 'El camino se hace al andar.', error: access.error },
        { status: 429 }
      );
    }

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

    const systemPrompt = `You generate REWARD-ONLY affirmations using positive psychology. NO call-to-action.

PURPOSE: Make the user feel good about what they've done. Build confidence and positive identity.
DO NOT include questions or action prompts - another element handles that.

PSYCHOLOGY PRINCIPLES:
- Progress principle: Celebrate small wins
- Positive reinforcement: Acknowledge behavior you want repeated
- Self-efficacy: Build confidence through recognition
- Identity reinforcement: "You ARE someone who..."

STYLE:
- Warm and affirming
- Specific when possible (reference their stats)
- Brief: 1 sentence, under 15 words
- Statement, NOT a question
- NO call-to-action, NO "¿Qué sigue?", NO prompts to do more
- Spanish language
- Natural tone

GOOD EXAMPLES (reward only):
- "3 tareas hoy. Ese ritmo construye cosas grandes."
- "Ya tienes 12 ideas capturadas. Mentalidad de creador."
- "Primera tarea del día completada. El momentum está contigo."
- "5 días seguidos activo. Eso ya es un hábito."
- "Volviste. Eso ya es un paso."
- "Cada idea capturada es una semilla plantada."
- "Tu constancia habla por sí sola."

FOR NEW USERS (gentle encouragement, still no question):
- "Las mejores ideas empiezan con un primer paso."
- "Hoy es buen día para capturar algo nuevo."
- "Tu próxima gran idea puede llegar en cualquier momento."

BAD (avoid):
- "¿Qué sigue?" or any question
- "¿Qué capturamos hoy?" or action prompts
- Generic "¡Eres increíble!" without specifics
- Anything that sounds like a command or invitation`;

    const contextParts = [];
    if (timeContext) contextParts.push(`Time of day: ${timeContext}`);
    if (isWeekend) contextParts.push('It\'s the weekend');
    if (isMonday) contextParts.push('It\'s Monday - fresh start');
    if (isFriday) contextParts.push('It\'s Friday - week wrapping up');
    if (userName) contextParts.push(`User name: ${userName}`);
    
    // Activity stats for rewarding
    if (completedToday > 0) contextParts.push(`✓ Completed ${completedToday} task(s) today - REWARD THIS`);
    if (totalIdeas > 0) contextParts.push(`Has ${totalIdeas} ideas captured total`);
    if (totalTasks > 0) contextParts.push(`Has ${totalTasks} tasks total`);
    if (totalIdeas > 10) contextParts.push('Active idea collector - acknowledge creativity');
    if (totalTasks === 0 && totalIdeas === 0) contextParts.push('NEW USER - no activity yet, focus on gentle encouragement');

    const userPrompt = `Context:\n${contextParts.join('\n')}\n\nGenerate a REWARD-ONLY affirmation in Spanish. Acknowledge their progress or encourage gently. 
NO questions. NO call-to-action. Just a warm statement.
No quotes around the response.`;

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

    // Increment usage counter
    if (access.userId) {
      await incrementAIUsage(access.userId);
    }

    return NextResponse.json({ affirmation });
  } catch (error) {
    console.error('Daily affirmation error:', error);
    return NextResponse.json({ affirmation: 'El camino se hace al andar.' });
  }
}
