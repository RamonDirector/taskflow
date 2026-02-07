import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { checkAIAccess, incrementAIUsage } from '@/lib/ai/rate-limit';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
  try {
    // Check AI access (rate limiting + enabled check)
    const access = await checkAIAccess();
    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error, remaining: access.remaining },
        { status: 429 }
      );
    }

    const { text } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `You are a text structuring assistant. Your job is to take raw voice transcripts and organize them into clean, structured text.

CRITICAL RULES:
1. **PRESERVE ALL MAIN CONTENT** — Do NOT summarize or remove important information
2. **REMOVE FILLER WORDS** — Clean up: "o sea", "bueno", "eh", "um", "like", "you know", "sabes", "entonces", "pues", "básicamente", "literalmente", "tipo", "como que", etc.
3. **ORGANIZE, DON'T REDUCE** — Structure the content with headings, bullets, and sections
4. **KEEP THE ORIGINAL MEANING** — Every point the user made must be in the output (just cleaner)
5. **SAME LANGUAGE** — Output in the same language as the input

FORMAT:
- Use clear section headings if there are distinct topics
- Use bullet points for lists or multiple related points
- Use numbered lists for sequences or steps
- Keep paragraphs for narrative content
- Highlight key terms or important points with **bold**

STRUCTURE TEMPLATE:
## [Main Topic/Title]

### [Section 1 - if applicable]
- Point 1 with full detail
- Point 2 with full detail

### [Section 2 - if applicable]
- Point 1
- Point 2

[Continue with all content...]

---

If it's a simple, short input, just clean it up without forcing sections.
If it's a complex explanation, break it into logical parts.

VOICE TRANSCRIPT TO STRUCTURE:
${text}

OUTPUT (structured text, preserving ALL details):`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const structuredText = response.text();
    
    if (!structuredText) {
      return NextResponse.json({ error: 'Failed to structure text' }, { status: 500 });
    }

    // Increment usage counter
    if (access.userId) {
      await incrementAIUsage(access.userId);
    }

    return NextResponse.json({ 
      structured: structuredText.trim(),
      original: text 
    });
  } catch (error) {
    console.error('Structure text error:', error);
    return NextResponse.json({ error: 'Failed to structure text' }, { status: 500 });
  }
}
