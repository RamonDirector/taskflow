import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { idea } = await request.json();

    if (!idea) {
      return NextResponse.json({ error: 'No idea provided' }, { status: 400 });
    }

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `You are a strategic execution coach. Take this idea and break it into 3-5 small, immediately actionable steps.

IDEA: "${idea}"

IMPORTANT:
- Detect the language of the idea and respond in THE SAME LANGUAGE
- Each step should take 15-60 minutes max
- Steps should be SPECIFIC and CONCRETE (not vague)
- Focus on the FIRST actions to get started, not the entire project
- Make it feel achievable, not overwhelming

Return ONLY valid JSON (no markdown, no explanation):
{
  "action_points": [
    {
      "title": "Clear actionable step",
      "time_estimate": "15min" | "30min" | "45min" | "1h",
      "category": "work" | "personal" | "learning" | "errands" | "health" | "finance"
    }
  ]
}`,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== 'text' || !content.text) {
      return NextResponse.json({ action_points: [] });
    }

    let cleanContent = content.text.trim();
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
    return NextResponse.json({ action_points: parsed.action_points || [] });
  } catch (error) {
    console.error('Action plan error:', error);
    return NextResponse.json(
      { error: 'Failed to generate action plan' },
      { status: 500 }
    );
  }
}
