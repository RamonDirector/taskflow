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

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a task extraction assistant. Given a voice transcript, extract individual actionable tasks. 
Rules:
- Each task should be a clear, concise action item
- Clean up the language (remove filler words, "um", "uh", etc.)
- If the transcript contains multiple tasks, separate them
- If a task is vague, make it slightly more specific while preserving the intent
- Return ONLY a JSON array of task title strings
- If no actionable tasks are found, return an empty array

Example input: "I need to buy groceries and also um call mom and uh don't forget to send that email to John about the project"
Example output: ["Buy groceries", "Call mom", "Send email to John about the project"]`,
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
    // Handle both { tasks: [...] } and direct array
    const tasks = Array.isArray(parsed) ? parsed : (parsed.tasks || []);

    return NextResponse.json({ tasks });
  } catch (error) {
    console.error('Task extraction error:', error);
    return NextResponse.json(
      { error: 'Failed to extract tasks' },
      { status: 500 }
    );
  }
}
