import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ActionPoint {
  title: string;
  time_estimate: string;
  category: string;
}

export async function POST(request: NextRequest) {
  try {
    const { idea, currentPlan, messages, userMessage } = await request.json();

    if (!idea || !userMessage) {
      return NextResponse.json({ error: 'Missing idea or message' }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    // Build conversation context
    let conversationContext = '';
    if (messages && messages.length > 0) {
      conversationContext = messages.map((m: Message) => 
        `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`
      ).join('\n');
    }

    const prompt = `You are a strategic execution coach helping refine an idea into actionable steps.

CONTEXT:
- Original idea: "${idea}"
- Current action plan: ${JSON.stringify(currentPlan || [])}
${conversationContext ? `\nConversation history:\n${conversationContext}` : ''}

User's new input: "${userMessage}"

Your job:
1. Listen to the user's feedback, questions, or new context
2. Adjust the action plan accordingly
3. Keep action points SPECIFIC, SMALL (15-60 min each), and IMMEDIATELY ACTIONABLE

IMPORTANT: 
- Detect the language of the user and respond in THE SAME LANGUAGE
- When updating the plan, return the FULL updated plan, not just changes
- Be conversational but concise
- If the user asks a question, answer it AND update the plan if relevant

Return ONLY valid JSON (no markdown, no code blocks):
{
  "response": "Your conversational response to the user",
  "action_points": [
    {
      "title": "clear actionable step",
      "time_estimate": "15min" | "30min" | "45min" | "1h",
      "category": "work" | "personal" | "learning" | "errands"
    }
  ],
  "plan_changed": true | false
}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const content = response.text();

    if (!content) {
      return NextResponse.json({ 
        response: 'No pude procesar tu mensaje. Intenta de nuevo.',
        action_points: currentPlan || [],
        plan_changed: false 
      });
    }

    // Clean up response
    let cleanContent = content.trim();
    if (cleanContent.startsWith('```json')) {
      cleanContent = cleanContent.slice(7);
    } else if (cleanContent.startsWith('```')) {
      cleanContent = cleanContent.slice(3);
    }
    if (cleanContent.endsWith('```')) {
      cleanContent = cleanContent.slice(0, -3);
    }
    cleanContent = cleanContent.trim();

    const parsed = JSON.parse(cleanContent);
    return NextResponse.json({
      response: parsed.response || '',
      action_points: parsed.action_points || currentPlan || [],
      plan_changed: parsed.plan_changed || false,
    });
  } catch (error) {
    console.error('Debate error:', error);
    return NextResponse.json(
      { error: 'Failed to process debate' },
      { status: 500 }
    );
  }
}
