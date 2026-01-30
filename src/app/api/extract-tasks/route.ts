import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    const today = new Date().toISOString().split('T')[0];
    const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' });

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a Brain Dump task extraction assistant. Given a voice transcript (which may be a long monologue with multiple ideas), extract ALL actionable tasks with rich metadata.

Today is ${dayOfWeek}, ${today}.

For EACH task, extract:
1. **title**: Clear, concise action item (clean up filler words like "um", "uh", "like")
2. **category**: Auto-detect from content. One of: work, personal, health, finance, home, social, learning, errands
3. **due_date**: Parse natural language dates. Examples:
   - "tomorrow" → tomorrow's date
   - "next friday" → calculate the date
   - "before the weekend" → Friday's date
   - "this week" → end of this week
   - If no date mentioned → null
4. **priority**: Detect urgency from language:
   - "urgent", "ASAP", "critical", "need to", "must" → high
   - "should", "important" → medium  
   - "when I can", "eventually", "maybe" → low
   - Default → medium

Rules:
- Extract EVERY distinct task, even from long rambling monologues
- If someone mentions the same thing twice, only include it once
- Separate compound tasks: "call mom and buy groceries" → 2 tasks
- Clean up the language while preserving intent
- Be generous with extraction - it's better to extract too many than miss something

Return JSON format:
{
  "tasks": [
    {
      "title": "string",
      "category": "work|personal|health|finance|home|social|learning|errands",
      "due_date": "YYYY-MM-DD" or null,
      "priority": "high|medium|low"
    }
  ]
}

Example input: "Ok so tomorrow I really need to call the dentist, that's urgent, and uh I should probably buy Maria's birthday gift before Saturday, oh and when I have time I need to review that Barcelona proposal for work, the client is waiting..."

Example output:
{
  "tasks": [
    {"title": "Call the dentist", "category": "health", "due_date": "${getNextDay()}", "priority": "high"},
    {"title": "Buy Maria's birthday gift", "category": "personal", "due_date": "${getNextSaturday()}", "priority": "medium"},
    {"title": "Review Barcelona proposal for client", "category": "work", "due_date": null, "priority": "medium"}
  ]
}`,
        },
        {
          role: 'user',
          content: text,
        },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      return NextResponse.json({ tasks: [] });
    }

    const parsed = JSON.parse(content);
    const tasks = parsed.tasks || [];

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error('Task extraction error:', error);
    return NextResponse.json(
      { error: 'Failed to extract tasks' },
      { status: 500 }
    );
  }
}

// Helper to get tomorrow's date in prompt (for example)
function getNextDay(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

function getNextSaturday(): string {
  const d = new Date();
  const day = d.getDay();
  const daysUntilSaturday = (6 - day + 7) % 7 || 7;
  d.setDate(d.getDate() + daysUntilSaturday);
  return d.toISOString().split('T')[0];
}
