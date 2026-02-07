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
      totalIdeas,
      totalTasks,
      completedToday,
      streak,
      lastAction, // 'idea_created' | 'task_completed' | 'plan_created' | 'first_idea' | 'first_task' | 'returned' | null
      lastItemTitle, // title of the last idea/task if relevant
      daysSinceLastActivity,
    } = context;

    // Build context string for the AI
    const contextParts = [];
    
    if (userName) contextParts.push(`User's name: ${userName}`);
    if (totalIdeas !== undefined) contextParts.push(`Total ideas captured: ${totalIdeas}`);
    if (totalTasks !== undefined) contextParts.push(`Total tasks: ${totalTasks}`);
    if (completedToday !== undefined) contextParts.push(`Tasks completed today: ${completedToday}`);
    if (streak !== undefined && streak > 0) contextParts.push(`Current streak: ${streak} days`);
    if (lastAction) contextParts.push(`Last action: ${lastAction}`);
    if (lastItemTitle) contextParts.push(`Last item title: "${lastItemTitle}"`);
    if (daysSinceLastActivity !== undefined && daysSinceLastActivity > 1) {
      contextParts.push(`Days since last activity: ${daysSinceLastActivity}`);
    }

    const systemPrompt = `You are the voice of a friendly panda mascot in a productivity app called Hansei (Japanese for self-reflection).

Your job is to generate a SHORT, natural, encouraging message for the user based on their context.

RULES:
- Maximum 15 words. Brevity is key.
- Be warm but not cheesy. No exclamation marks unless truly warranted.
- Sound like a supportive friend, not a corporate app.
- Reference their specific actions/data when relevant.
- Vary your tone: sometimes motivational, sometimes casual, sometimes reflective.
- If they have a streak, acknowledge consistency.
- If they're returning after inactivity, welcome them back gently.
- If they completed tasks, acknowledge the action.
- If they captured ideas, encourage the creative flow.
- Use the user's name occasionally (not every time).
- Spanish language only.

BAD examples (too generic/robotic):
- "¡Sigue así, campeón!"
- "¡Eres increíble!"
- "¡Gran trabajo!"

GOOD examples (natural/specific):
- "3 tareas hoy. Buen ritmo."
- "Tu idea de la app tiene potencial. Dale forma."
- "5 días seguidos. Esto ya es hábito, Ramon."
- "De vuelta. Seguimos."
- "Primera tarea del día. Así se empieza."`;

    const userPrompt = contextParts.length > 0 
      ? `Context:\n${contextParts.join('\n')}\n\nGenerate a short, natural affirmation in Spanish.`
      : `No specific context available. Generate a gentle, welcoming message in Spanish for someone opening the app.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 50,
      temperature: 0.8,
    });

    const affirmation = completion.choices[0]?.message?.content?.trim() || '¿Qué tienes en mente?';

    return NextResponse.json({ affirmation });
  } catch (error) {
    console.error('Affirmation generation error:', error);
    return NextResponse.json({ affirmation: '¿Qué tienes en mente?' });
  }
}
