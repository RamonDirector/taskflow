import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
  try {
    const { idea, voiceContext } = await request.json();
    if (!idea) return NextResponse.json({ error: 'No idea provided' }, { status: 400 });

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

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
1. Start with the SMALLEST possible first step (reduces friction to start)
2. Each step = ONE clear action (not multiple actions bundled)
3. Use verbs that imply completion: "Write", "Send", "Create", "Research", "Book"
4. Avoid vague steps like "Think about...", "Consider...", "Plan..."
5. Include ALL steps needed — give a complete mental model of what to do
6. Time estimates: realistic, not optimistic
7. SAME LANGUAGE as the input

The goal: user sees the plan and instantly knows the FULL path from idea to done.

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
    return NextResponse.json({ action_points: parsed.action_points || [] });
  } catch (error) {
    console.error('Action plan error:', error);
    return NextResponse.json({ error: 'Failed to generate action plan' }, { status: 500 });
  }
}
