import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
  try {
    const { editType, voiceInput, context } = await request.json();
    if (!editType || !voiceInput) return NextResponse.json({ error: 'Missing editType or voiceInput' }, { status: 400 });

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    let prompt = '';

    switch (editType) {
      case 'idea':
        prompt = `Edit action plan based on voice input.
IDEA: "${context.ideaTitle}"
CURRENT PLAN: ${JSON.stringify(context.currentPlan || [])}
USER SAYS: "${voiceInput}"

Return ONLY valid JSON:
{"action_points": [{"title": "step", "time_estimate": "30min", "category": "work"}], "summary": "what changed"}`;
        break;
      case 'action-point':
        prompt = `Edit this step based on voice input.
STEP: "${context.stepTitle}" (${context.stepIndex + 1}/${context.totalSteps})
USER SAYS: "${voiceInput}"

Return ONLY valid JSON:
{"title": "updated step", "time_estimate": "30min", "category": "work"}`;
        break;
      case 'task':
        prompt = `Edit this task based on voice input.
TASK: "${context.taskTitle}" (${context.category})
USER SAYS: "${voiceInput}"

Return ONLY valid JSON:
{"title": "updated task", "category": "work", "due_date": null, "priority": "medium"}`;
        break;
      default:
        return NextResponse.json({ error: 'Invalid editType' }, { status: 400 });
    }

    const result = await model.generateContent(prompt);
    const content = result.response.text();
    if (!content) return NextResponse.json({ error: 'No response' }, { status: 500 });

    let cleanContent = content.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleanContent);
    return NextResponse.json({ editType, result: parsed });
  } catch (error) {
    console.error('Voice edit error:', error);
    return NextResponse.json({ error: 'Failed to process voice edit' }, { status: 500 });
  }
}
