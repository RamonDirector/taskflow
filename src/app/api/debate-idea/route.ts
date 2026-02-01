import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

interface Message { role: 'user' | 'assistant'; content: string; }

export async function POST(request: NextRequest) {
  try {
    const { idea, currentPlan, messages, userMessage } = await request.json();
    if (!idea || !userMessage) return NextResponse.json({ error: 'Missing idea or message' }, { status: 400 });

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    let conversationContext = '';
    if (messages?.length > 0) {
      conversationContext = messages.map((m: Message) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n');
    }

    const prompt = `You are a strategic execution coach helping refine an idea into actionable steps.

CONTEXT:
- Original idea: "${idea}"
- Current plan: ${JSON.stringify(currentPlan || [])}
${conversationContext ? `\nHistory:\n${conversationContext}` : ''}

User says: "${userMessage}"

Rules:
- Detect language and respond in THE SAME LANGUAGE
- Keep steps SPECIFIC, SMALL (15-60 min), ACTIONABLE
- Return FULL updated plan if changed
- Be conversational but concise

Return ONLY valid JSON:
{
  "response": "Your reply",
  "action_points": [{"title": "step", "time_estimate": "30min", "category": "work"}],
  "plan_changed": true|false
}`;

    const result = await model.generateContent(prompt);
    const content = result.response.text();
    if (!content) return NextResponse.json({ response: 'Error', action_points: currentPlan || [], plan_changed: false });

    let cleanContent = content.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleanContent);
    return NextResponse.json({
      response: parsed.response || '',
      action_points: parsed.action_points || currentPlan || [],
      plan_changed: parsed.plan_changed || false,
    });
  } catch (error) {
    console.error('Debate error:', error);
    return NextResponse.json({ error: 'Failed to process debate' }, { status: 500 });
  }
}
