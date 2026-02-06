import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

interface Idea {
  id: string;
  title: string;
  voice_context?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { text, ideas } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    if (!ideas || !Array.isArray(ideas) || ideas.length === 0) {
      return NextResponse.json({ match: null, isNewIdea: true });
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // Create a summary of existing ideas
    const ideasSummary = ideas.map((idea: Idea, index: number) => 
      `[${index}] "${idea.title}"${idea.voice_context ? ` — Context: "${idea.voice_context.slice(0, 200)}..."` : ''}`
    ).join('\n');

    const prompt = `You are an Idea Matching expert. Your job is to determine if a new voice input is RELATED to an existing idea or if it's completely NEW.

## EXISTING IDEAS:
${ideasSummary}

## NEW INPUT:
"${text}"

## MATCHING RULES:

1. **MATCH if**: The new input adds context, details, or thoughts about an existing idea
   - Same topic/project
   - Builds upon previous idea
   - Adds new angle to existing concept
   - Mentions something clearly related

2. **DON'T MATCH if**: 
   - Completely different topic
   - Generic/vague connection (both about "work" is NOT enough)
   - The user is clearly talking about something new

3. **BE CONSERVATIVE**: Only match if you're >80% confident they're related. When in doubt, treat as new.

4. **CONFIDENCE THRESHOLD**: 
   - high (>90%): Clear continuation or addition to existing idea
   - medium (70-90%): Probably related but could be separate
   - low (<70%): Weak connection, better as new idea

## OUTPUT FORMAT
Return ONLY valid JSON:
{
  "matchedIndex": number | null,  // Index of matched idea, or null if new
  "confidence": "high" | "medium" | "low",
  "reason": "Brief explanation of why matched or why new",
  "isAddition": true | false  // true if adding to existing, false if new idea
}

If confidence is "low" or "medium", set matchedIndex to null (create new idea instead).`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const content = response.text();
    
    if (!content) {
      return NextResponse.json({ match: null, isNewIdea: true });
    }

    let cleanContent = content.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    try {
      const parsed = JSON.parse(cleanContent);
      
      // Only return a match if confidence is high
      if (parsed.confidence === 'high' && parsed.matchedIndex !== null && parsed.matchedIndex < ideas.length) {
        return NextResponse.json({
          match: ideas[parsed.matchedIndex],
          matchedIndex: parsed.matchedIndex,
          confidence: parsed.confidence,
          reason: parsed.reason,
          isNewIdea: false,
        });
      }
      
      return NextResponse.json({
        match: null,
        confidence: parsed.confidence,
        reason: parsed.reason,
        isNewIdea: true,
      });
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      return NextResponse.json({ match: null, isNewIdea: true });
    }
  } catch (error) {
    console.error('Match idea error:', error);
    return NextResponse.json({ match: null, isNewIdea: true });
  }
}
