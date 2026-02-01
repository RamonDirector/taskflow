import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ActionPoint {
  title: string;
  time_estimate: string;
  category: string;
}

export async function POST(request: NextRequest) {
  try {
    const { 
      editType, // 'idea' | 'task' | 'action-point'
      voiceInput,
      context // varies by editType
    } = await request.json();

    if (!editType || !voiceInput) {
      return NextResponse.json({ error: 'Missing editType or voiceInput' }, { status: 400 });
    }

    let systemPrompt = '';
    let responseFormat: { type: 'json_object' } | { type: 'text' } = { type: 'json_object' };

    switch (editType) {
      case 'idea':
        // Regenerate entire action plan for an idea based on new voice input
        systemPrompt = `You are a strategic execution coach. The user wants to modify their action plan.

ORIGINAL IDEA: "${context.ideaTitle}"
CURRENT PLAN: ${JSON.stringify(context.currentPlan || [])}

Based on the user's voice input, generate a NEW action plan.

Rules:
- Each step should be SPECIFIC and SMALL (15-60 min max)
- Keep 3-5 steps total
- Detect language from user input and respond in SAME language
- Steps should be immediately actionable

Return JSON:
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
        // Edit a specific step in the plan
        systemPrompt = `You are helping edit a specific action step.

PARENT IDEA: "${context.ideaTitle}"
STEP TO EDIT: "${context.stepTitle}"
STEP INDEX: ${context.stepIndex + 1} of ${context.totalSteps}

Based on the user's voice input, provide the updated step.

Rules:
- Keep it SPECIFIC and actionable
- Time estimate: 15min, 30min, 45min, or 1h
- Detect language and respond in same language

Return JSON:
{
  "title": "Updated step title",
  "time_estimate": "15min" | "30min" | "45min" | "1h",
  "category": "work" | "personal" | "learning" | "errands" | "health" | "finance"
}`;
        break;

      case 'task':
        // Edit a standalone task
        systemPrompt = `You are helping edit a task based on voice input.

CURRENT TASK: "${context.taskTitle}"
CATEGORY: "${context.category}"

Based on the user's voice input, provide the updated task details.

Rules:
- Keep it clear and actionable
- Maintain same category unless user explicitly changes it
- Detect language and respond in same language
- If user mentions a due date, parse it

Return JSON:
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

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: voiceInput },
      ],
      temperature: 0.5,
      response_format: responseFormat,
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      return NextResponse.json({ error: 'No response from AI' }, { status: 500 });
    }

    const parsed = JSON.parse(content);
    return NextResponse.json({ editType, result: parsed });

  } catch (error) {
    console.error('Voice edit error:', error);
    return NextResponse.json(
      { error: 'Failed to process voice edit' },
      { status: 500 }
    );
  }
}
