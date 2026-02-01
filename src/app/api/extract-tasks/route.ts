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

    const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });

    const prompt = `You are a Brain Dump assistant that extracts BOTH actionable tasks AND creative ideas from voice transcripts.

Today is ${dayOfWeek}, ${today}.

IMPORTANT: Detect the language of the input and write in THE SAME LANGUAGE.

**TASK** = Something actionable that needs to be done
**IDEA** = A thought, concept, or creative notion to explore later

For TASKS: title, type:"task", category, due_date, priority
For IDEAS: title, type:"idea", category, priority (no due_date)

Categories: work, personal, health, finance, home, social, learning, errands

Rules:
- Extract EVERY distinct item
- Separate compound statements into multiple items
- Clean up filler words (um, uh, o sea)
- When uncertain, classify as IDEA

Return ONLY valid JSON:
{
  "items": [
    {"title": "string", "type": "task"|"idea", "category": "string", "due_date": "YYYY-MM-DD"|null, "priority": "high"|"medium"|"low"}
  ]
}

User input: ${text}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const content = response.text();
    
    if (!content) {
      return NextResponse.json({ items: [], tasks: [], ideas: [] });
    }

    let cleanContent = content.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleanContent);
    const items = parsed.items || [];
    
    const tasks = items.filter((item: { type: string }) => item.type === 'task');
    const ideas = items.filter((item: { type: string }) => item.type === 'idea');

    return NextResponse.json({ items, tasks, ideas });
  } catch (error) {
    console.error('Extraction error:', error);
    return NextResponse.json({ error: 'Failed to extract items' }, { status: 500 });
  }
}
