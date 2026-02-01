import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

    // Build conversation history
    const conversationHistory: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      {
        role: 'system',
        content: `You are a strategic execution coach helping refine an idea into actionable steps.

CONTEXT:
- Original idea: "${idea}"
- Current action plan: ${JSON.stringify(currentPlan || [])}

Your job:
1. Listen to the user's feedback, questions, or new context
2. Adjust the action plan accordingly
3. Keep action points SPECIFIC, SMALL (15-60 min each), and IMMEDIATELY ACTIONABLE

IMPORTANT: 
- Detect the language of the user and respond in THE SAME LANGUAGE
- When updating the plan, return the FULL updated plan, not just changes
- Be conversational but concise
- If the user asks a question, answer it AND update the plan if relevant

Return JSON format:
{
  "response": "Your conversational response to the user",
  "action_points": [
    {
      "title": "string - clear actionable step",
      "time_estimate": "15min" | "30min" | "45min" | "1h",
      "category": "work" | "personal" | "learning" | "errands"
    }
  ],
  "plan_changed": true | false
}`,
      },
    ];

    // Add conversation history
    if (messages && messages.length > 0) {
      for (const msg of messages) {
        conversationHistory.push({
          role: msg.role,
          content: msg.content,
        });
      }
    }

    // Add current user message
    conversationHistory.push({
      role: 'user',
      content: userMessage,
    });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: conversationHistory,
      temperature: 0.5,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      return NextResponse.json({ 
        response: 'No pude procesar tu mensaje. Intenta de nuevo.',
        action_points: currentPlan || [],
        plan_changed: false 
      });
    }

    const parsed = JSON.parse(content);
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
