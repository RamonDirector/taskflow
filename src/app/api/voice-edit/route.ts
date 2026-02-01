import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { 
      editType,
      voiceInput,
      context
    } = await request.json();

    if (!editType || !voiceInput) {
      return NextResponse.json({ error: 'Missing editType or voiceInput' }, { status: 400 });
    }

    let prompt = '';

    switch (editType) {
      case 'idea':
        prompt = `You are a strategic execution coach. The user wants to modify their action plan.

ORIGINAL IDEA: "${context.ideaTitle}"
CURRENT PLAN: ${JSON.stringify(context.currentPlan || [])}

User's voice input: "${voiceInput}"

Based on the user's voice input, generate a NEW action plan.

Rules:
- Each step should be SPECIFIC and SMALL (15-60 min max)
- Keep 3-5 steps total
- Detect language from user input and respond in SAME language
- Steps should be immediately actionable

Return ONLY valid JSON (no markdown, no explanation):
{
  "action_points": [
    {
      "title": "Clear actionable step",
      "time_estimate": "15min" | "30min" | "45min" | "1h",
      "category": "work" | "personal" | "learning" | "errands" | "health" | "finance"
    }
  ],
  "summary": "Brief explanation of what changed"
}`;
        break;

      case 'action-point':
        prompt = `You are helping edit a specific action step.

PARENT IDEA: "${context.ideaTitle}"
STEP TO EDIT: "${context.stepTitle}"
STEP INDEX: ${context.stepIndex + 1} of ${context.totalSteps}

User's voice input: "${voiceInput}"

Based on the user's voice input, provide the updated step.

Rules:
- Keep it SPECIFIC and actionable
- Time estimate: 15min, 30min, 45min, or 1h
- Detect language and respond in same language

Return ONLY valid JSON (no markdown, no explanation):
{
  "title": "Updated step title",
  "time_estimate": "15min" | "30min" | "45min" | "1h",
  "category": "work" | "personal" | "learning" | "errands" | "health" | "finance"
}`;
        break;

      case 'task':
        prompt = `You are helping edit a task based on voice input.

CURRENT TASK: "${context.taskTitle}"
CATEGORY: "${context.category}"

User's voice input: "${voiceInput}"

Based on the user's voice input, provide the updated task details.

Rules:
- Keep it clear and actionable
- Maintain same category unless user explicitly changes it
- Detect language and respond in same language
- If user mentions a due date, parse it

Return ONLY valid JSON (no markdown, no explanation):
{
  "title": "Updated task title",
  "category": "work" | "personal" | "learning" | "errands" | "health" | "finance" | "home" | "social",
  "due_date": "YYYY-MM-DD" or null,
  "priority": "high" | "medium" | "low"
}`;
        break;

      default:
        return NextResponse.json({ error: 'Invalid editType' }, { status: 400 });
    }

    const message = await anthropic.messages.create({
      model: 'claude-opus-4-5-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = message.content[0];
    if (content.type !== 'text' || !content.text) {
      return NextResponse.json({ error: 'No response from AI' }, { status: 500 });
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
    return NextResponse.json({ editType, result: parsed });

  } catch (error) {
    console.error('Voice edit error:', error);
    return NextResponse.json(
      { error: 'Failed to process voice edit' },
      { status: 500 }
    );
  }
}
