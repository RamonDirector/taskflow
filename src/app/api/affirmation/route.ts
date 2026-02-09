import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { checkAIAccess, incrementAIUsage } from '@/lib/ai/rate-limit';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

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
      lastAction,
      lastItemTitle,
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

    const prompt = `You are a friendly panda mascot inviting the user to speak or type their thoughts.

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
- Any stats or achievements

Generate a short invitation prompt in Spanish for the user to speak or type what's on their mind. Just the prompt, nothing else.`;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const affirmation = response.text()?.trim() || 'Qué tienes en mente?';

    // Increment usage counter
    if (access.userId) {
      await incrementAIUsage(access.userId);
    }

    return NextResponse.json({ affirmation });
  } catch (error) {
    console.error('Affirmation generation error:', error);
    return NextResponse.json({ affirmation: 'Qué tienes en mente?' });
  }
}
