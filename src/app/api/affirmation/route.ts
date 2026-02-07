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
        { affirmation: 'Qué tienes en mente?', error: access.error },
        { status: 429 }
      );
    }

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

Your job is to generate a SHORT, INFORMAL prompt that encourages the user to tap the microphone.

RULES:
- Maximum 8 words. Very short.
- INFORMAL Spanish: Only use final question mark, NOT opening ¿
- Example: "Qué tienes en mente?" NOT "¿Qué tienes en mente?"
- Warm, friendly, casual tone.
- Vary the phrasing each time.
- No exclamation marks.

GOOD examples (informal, only final ?):
- "Qué tienes en mente?"
- "Cuéntame, qué hay de nuevo?"
- "Qué quieres capturar hoy?"
- "Te escucho. Qué hay?"
- "Alguna idea rondando?"
- "Qué tienes para hoy?"
- "Cuéntame qué estás pensando"
- "Qué quieres recordar?"
- "Algo en mente?"
- "Qué se te ocurre?"

BAD examples (avoid):
- "¿Qué tienes en mente?" (has opening ¿)
- "¡Sigue así!" (motivational)
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

    const affirmation = completion.choices[0]?.message?.content?.trim() || 'Qué tienes en mente?';

    // Increment usage counter
    if (access.userId) {
      await incrementAIUsage(access.userId);
    }

    return NextResponse.json({ affirmation });
  } catch (error) {
    console.error('Affirmation generation error:', error);
    return NextResponse.json({ affirmation: '¿Qué tienes en mente?' });
  }
}
