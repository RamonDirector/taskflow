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
        { affirmation: 'The path is made by walking.', error: access.error },
        { status: 429 }
      );
    }

    const { context, locale = 'es' } = await request.json();
    
    const {
      userName,
      currentHour,
      dayOfWeek,
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

    const contextParts = [];
    if (timeContext) contextParts.push(`Time of day: ${timeContext}`);
    if (isWeekend) contextParts.push('It\'s the weekend');
    if (isMonday) contextParts.push('It\'s Monday - fresh start');
    if (isFriday) contextParts.push('It\'s Friday - week wrapping up');
    if (userName) contextParts.push(`User name: ${userName}`);
    
    if (completedToday > 0) contextParts.push(`✓ Completed ${completedToday} task(s) today - REWARD THIS`);
    if (totalIdeas > 0) contextParts.push(`Has ${totalIdeas} ideas captured total`);
    if (totalTasks > 0) contextParts.push(`Has ${totalTasks} tasks total`);
    if (totalIdeas > 10) contextParts.push('Active idea collector - acknowledge creativity');
    if (totalTasks === 0 && totalIdeas === 0) contextParts.push('NEW USER - no activity yet, focus on gentle encouragement');

    const lang = locale === 'en' ? 'English' : 'Spanish';

    const examples = locale === 'en'
      ? `GOOD EXAMPLES (short and punchy):
- "3 tasks today. Good pace."
- "12 ideas captured. Creator mindset."
- "Momentum is on your side."
- "That's already a habit."
- "You came back. That counts."
- "Your consistency speaks for itself."
- "Productive day."

FOR NEW USERS:
- "The first step is already taken."
- "Good day to create something."
- "Ideas come when you least expect them."`
      : `GOOD EXAMPLES (short and punchy):
- "3 tareas hoy. Buen ritmo."
- "12 ideas capturadas. Mentalidad de creador."
- "El momentum está contigo."
- "Eso ya es un hábito."
- "Volviste. Eso cuenta."
- "Tu constancia habla sola."
- "Día productivo."

FOR NEW USERS:
- "El primer paso ya está dado."
- "Buen día para crear algo."
- "Las ideas llegan cuando menos esperas."`;

    const prompt = `You generate REWARD-ONLY affirmations using positive psychology. NO call-to-action.

PURPOSE: Make the user feel good about what they've done. Build confidence and positive identity.
DO NOT include questions or action prompts - another element handles that.

PSYCHOLOGY PRINCIPLES:
- Progress principle: Celebrate small wins
- Positive reinforcement: Acknowledge behavior you want repeated
- Self-efficacy: Build confidence through recognition
- Identity reinforcement: "You ARE someone who..."

STYLE:
- Warm and affirming
- Very short: MAX 8-10 words
- Punchy, direct
- Statement, NOT a question
- NO call-to-action
- ${lang} language
- Natural, conversational tone

${examples}

BAD (avoid):
- Any question
- Action prompts
- Generic praise without specifics
- Anything that sounds like a command or invitation

Context:
${contextParts.join('\n')}

Generate a REWARD-ONLY affirmation in ${lang}. Acknowledge their progress or encourage gently. 
NO questions. NO call-to-action. Just a warm statement.
No quotes around the response. Just the affirmation text.`;

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const fallback = locale === 'en' ? 'The path is made by walking.' : 'El camino se hace al andar.';
    let affirmation = response.text()?.trim() || fallback;
    
    // Remove quotes if the AI added them
    affirmation = affirmation.replace(/^[""]|[""]$/g, '').trim();

    // Increment usage counter
    if (access.userId) {
      await incrementAIUsage(access.userId);
    }

    return NextResponse.json({ affirmation });
  } catch (error) {
    console.error('Daily affirmation error:', error);
    return NextResponse.json({ affirmation: 'The path is made by walking.' });
  }
}
