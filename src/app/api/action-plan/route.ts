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

    const prompt = `You are a strategic execution coach. Create the best possible action plan to execute this idea.

${contextSection}

Rules:
- The voice input contains the user's raw thoughts — use it as the PRIMARY context
- Detect language and respond in THE SAME LANGUAGE as the input
- Include ALL the steps necessary to successfully execute the idea
- Each step should take 15-60 minutes max
- Steps must be SPECIFIC and CONCRETE (not vague)
- Order steps logically — what needs to happen first
- Make each step immediately actionable
- Capture nuances from the voice input that might not be in the title

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
