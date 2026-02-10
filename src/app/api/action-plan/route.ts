import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { checkAIAccess, incrementAIUsage } from '@/lib/ai/rate-limit';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
  try {
    // Check AI access (rate limiting + enabled check)
    const access = await checkAIAccess();
    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error, remaining: access.remaining },
        { status: 429 }
      );
    }

    const { idea, voiceContext } = await request.json();
    if (!idea) return NextResponse.json({ error: 'No idea provided' }, { status: 400 });

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    // Use voice context as primary input if available
    const contextSection = voiceContext 
      ? `ORIGINAL VOICE INPUT (primary context):
"${voiceContext}"

IDEA TITLE: "${idea}"`
      : `IDEA: "${idea}"`;

    const prompt = `You are an execution strategist helping a busy professional turn ideas into action.

${contextSection}

YOUR TASK:
Transform this raw thought into a clear, actionable plan. The user captured this idea on-the-go — they need concrete next steps they can execute immediately.

RULES:
1. MAXIMUM 5 STEPS — clarity beats exhaustiveness. Less is more.
2. Start with the SMALLEST possible first step (reduces friction to start)
3. Each step = ONE clear action (not multiple actions bundled)
4. Use verbs that imply completion: "Write", "Send", "Create", "Research", "Book"
5. Avoid vague steps like "Think about...", "Consider...", "Plan..."
6. Each step must be completable in <30 minutes
7. Time estimates: realistic, not optimistic
8. SAME LANGUAGE as the input

The goal: user sees the plan and can START IMMEDIATELY. 5 focused steps > 15 overwhelming ones.
Prioritize IMPACT over completeness. What are the 3-5 steps that move the needle most?

BAD STEP: "Research options and think about what you want"
GOOD STEP: "Google '3 best tools for X' and save top 3 links"

Return ONLY valid JSON:
{
  "action_points": [
    {"title": "Verb + specific action", "time_estimate": "15min"|"30min"|"45min"|"1h", "category": "work"|"personal"|"learning"|"errands"|"health"|"finance"}
  ]
}`;

    const result = await model.generateContent(prompt);
    const content = result.response.text();
    if (!content) return NextResponse.json({ action_points: [] });

    let cleanContent = content.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleanContent);

    // Increment usage counter
    if (access.userId) {
      await incrementAIUsage(access.userId);
    }

    return NextResponse.json({ action_points: parsed.action_points || [] });
  } catch (error) {
    console.error('Action plan error:', error);
    return NextResponse.json({ error: 'Failed to generate action plan' }, { status: 500 });
  }
}
