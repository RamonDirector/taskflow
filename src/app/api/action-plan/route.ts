import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
  try {
    const { idea } = await request.json();
    if (!idea) return NextResponse.json({ error: 'No idea provided' }, { status: 400 });

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `You are a strategic execution coach. Break this idea into 3-5 small, immediately actionable steps.

IDEA: "${idea}"

Rules:
- Detect language and respond in THE SAME LANGUAGE
- Each step: 15-60 minutes max
- Steps must be SPECIFIC and CONCRETE
- Focus on FIRST actions to get started
- Make it achievable, not overwhelming

Return ONLY valid JSON:
{
  "action_points": [
    {"title": "Clear actionable step", "time_estimate": "15min"|"30min"|"45min"|"1h", "category": "work"|"personal"|"learning"|"errands"|"health"|"finance"}
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
