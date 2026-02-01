import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    const today = new Date().toISOString().split('T')[0];
    const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' });

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

    const prompt = `You are a Brain Dump assistant that extracts BOTH actionable tasks AND creative ideas from voice transcripts.

Today is ${dayOfWeek}, ${today}.

IMPORTANT: Detect the language of the input and write in THE SAME LANGUAGE.

For each item in the transcript, determine if it's a TASK or an IDEA:

**TASK** = Something actionable that needs to be done
- "I need to call mom" → TASK
- "Remember to buy groceries" → TASK
- "Finish the report by Friday" → TASK

**IDEA** = A thought, concept, or creative notion to explore later
- "What if we built an app that..." → IDEA
- "It would be cool to try..." → IDEA
- "I've been thinking about starting..." → IDEA
- "Maybe we could..." → IDEA

For TASKS, extract:
1. **title**: Clear, concise action item (clean up filler words)
2. **type**: "task"
3. **category**: work, personal, health, finance, home, social, learning, errands
4. **due_date**: Parse natural language dates or null
5. **priority**: high, medium, low (default: medium)

For IDEAS, extract:
1. **title**: The core concept/thought
2. **type**: "idea"
3. **category**: business, product, content, lifestyle, learning, creative, other
4. **due_date**: null (ideas don't have due dates)
5. **priority**: Based on excitement/potential (high = "this could be huge", medium = interesting, low = random thought)

Rules:
- Extract EVERY distinct item from the transcript
- Separate compound statements into multiple items
- Clean up filler words (um, uh, like, eh, o sea)
- ALWAYS match the input language
- When uncertain, classify as IDEA (better to capture than lose)

Return ONLY valid JSON format (no markdown, no code blocks):
{
  "items": [
    {
      "title": "string",
      "type": "task" | "idea",
      "category": "string",
      "due_date": "YYYY-MM-DD" | null,
      "priority": "high" | "medium" | "low"
    }
  ]
}

User input: ${text}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const content = response.text();
    
    if (!content) {
      return NextResponse.json({ items: [], tasks: [], ideas: [] });
    }

    // Clean up response - remove markdown code blocks if present
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
    const items = parsed.items || [];
    
    // Separate tasks and ideas for backward compatibility
    const tasks = items.filter((item: { type: string }) => item.type === 'task');
    const ideas = items.filter((item: { type: string }) => item.type === 'idea');

    return NextResponse.json({ items, tasks, ideas });
  } catch (error) {
    console.error('Extraction error:', error);
    return NextResponse.json(
      { error: 'Failed to extract items' },
      { status: 500 }
    );
  }
}
