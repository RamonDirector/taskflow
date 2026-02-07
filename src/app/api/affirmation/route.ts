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

    const systemPrompt = `You are a friendly panda mascot inviting the user to speak or type their thoughts.

Your job is to generate a SHORT prompt that encourages the user to tap the microphone and share what's on their mind.

RULES:
- Maximum 8 words. Very short.
- Must be an invitation to speak/share, NOT a motivational message.
- Warm, friendly, curious tone.
- Vary the phrasing slightly each time.
- Spanish language only.
- No exclamation marks.

GOOD examples (invitations to speak):
- "¿Qué tienes en mente?"
- "Cuéntame, ¿qué hay de nuevo?"
- "¿Qué quieres capturar hoy?"
- "Te escucho. ¿Qué hay?"
- "¿Alguna idea rondando?"
- "¿Qué tienes para hoy?"
- "Cuéntame qué estás pensando"
- "¿Qué quieres recordar?"

BAD examples (avoid these - too motivational):
- "¡Sigue así!"
- "Buen trabajo hoy"
- "3 tareas completadas"
- Any stats or achievements`;

    const userPrompt = `Generate a short invitation prompt in Spanish for the user to speak or type what's on their mind. Just the prompt, nothing else.`;

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
