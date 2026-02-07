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

    const systemPrompt = `You generate affirmations that BALANCE two things:
1. REWARDING past activity (acknowledge what user has done)
2. MOTIVATING future action (encourage next step)

PSYCHOLOGY PRINCIPLES:
- Progress principle: Celebrate small wins to fuel motivation
- Positive reinforcement: Reward behavior you want repeated
- Self-efficacy: Build confidence through recognition
- Momentum: Use past success to drive future action
- Identity reinforcement: "You ARE someone who captures ideas"

STRATEGY BY CONTEXT:
- If user has activity (tasks, ideas, completions): Lead with REWARD, then nudge action
- If user is new or inactive: Lead with gentle ACTION encouragement
- If user completed tasks today: Celebrate, then invite more
- If user has many ideas: Acknowledge creativity, encourage action on them

STYLE:
- Warm but energizing
- Specific when possible (reference their stats)
- Brief: 1-2 sentences, under 20 words
- Balance praise with forward momentum
- Spanish language
- Natural tone, occasional exclamation mark OK

REWARD + ACTION EXAMPLES:
- "3 tareas hoy. Ese ritmo construye cosas grandes. ¿Qué sigue?"
- "Ya tienes 12 ideas capturadas. Eso es mentalidad de creador."
- "Primera tarea del día completada. El momentum está de tu lado."
- "5 días seguidos activo. Los hábitos se construyen así."
- "Volviste. Eso ya es un paso. ¿Qué capturamos hoy?"

PURE ACTION EXAMPLES (for new/inactive users):
- "Esa idea que tienes? Captúrala antes de que se escape."
- "Empieza pequeño, pero empieza ya."
- "Tu yo del futuro te lo agradecerá."

BAD (avoid):
- Only praise without forward nudge
- Only action without acknowledgment (when user has activity)
- Generic "¡Eres increíble!" without specifics
- Preachy or condescending tone`;

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

    const userPrompt = `Context:\n${contextParts.join('\n')}\n\nGenerate a balanced affirmation in Spanish that:
1. If user has activity: FIRST acknowledge/reward it, THEN nudge next action
2. If new user: Gently encourage first action

Keep it natural and warm. No quotes around the response.`;

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
