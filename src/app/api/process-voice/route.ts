import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { checkAIAccess, incrementAIUsage } from '@/lib/ai/rate-limit';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Calculate relative dates
function getRelativeDates() {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfterTomorrow = new Date(today);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
  
  const getNextWeekday = (dayIndex: number) => {
    const result = new Date(today);
    const currentDay = today.getDay();
    let daysToAdd = dayIndex - currentDay;
    if (daysToAdd <= 0) daysToAdd += 7;
    result.setDate(today.getDate() + daysToAdd);
    return result;
  };
  
  const nextMonday = getNextWeekday(1);
  const nextFriday = getNextWeekday(5);
  const nextSaturday = getNextWeekday(6);
  const nextSunday = getNextWeekday(0);
  const startOfNextWeek = new Date(today);
  startOfNextWeek.setDate(today.getDate() + (7 - today.getDay() + 1));
  const endOfThisWeek = new Date(today);
  endOfThisWeek.setDate(today.getDate() + (7 - today.getDay()));
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  
  const f = (d: Date) => d.toISOString().split('T')[0];
  
  return {
    today: f(today), tomorrow: f(tomorrow), dayAfterTomorrow: f(dayAfterTomorrow),
    nextMonday: f(nextMonday), nextFriday: f(nextFriday),
    nextSaturday: f(nextSaturday), nextSunday: f(nextSunday),
    startOfNextWeek: f(startOfNextWeek), endOfThisWeek: f(endOfThisWeek), endOfMonth: f(endOfMonth),
    dayOfWeek: today.toLocaleDateString('en-US', { weekday: 'long' }),
    dayOfWeekES: today.toLocaleDateString('es-ES', { weekday: 'long' }),
  };
}

export async function POST(request: NextRequest) {
  try {
    const access = await checkAIAccess();
    if (!access.allowed) {
      return NextResponse.json({ error: access.error, remaining: access.remaining }, { status: 429 });
    }

    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const textInput = formData.get('text') as string | null;

    if (!audioFile && !textInput) {
      return NextResponse.json({ error: 'No audio or text provided' }, { status: 400 });
    }

    const dates = getRelativeDates();
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const prompt = `You are a Brain Dump extraction expert. ${audioFile ? 'Listen to this audio recording and' : 'Read this text and'} extract EVERY actionable task, idea, and dream.

## STEP 1: TRANSCRIBE (if audio)
First, transcribe the audio accurately. Include the transcription in your response.

## STEP 2: EXTRACT & CLASSIFY

## DATE REFERENCE
Today: ${dates.dayOfWeek} (${dates.dayOfWeekES}), ${dates.today}
Tomorrow: ${dates.tomorrow} | Day after: ${dates.dayAfterTomorrow}
This Friday: ${dates.nextFriday} | Weekend: ${dates.nextSaturday}-${dates.nextSunday}
Next week: ${dates.startOfNextWeek} | Next Monday: ${dates.nextMonday}
End of month: ${dates.endOfMonth}

## DATE MAPPING
"hoy/today" → ${dates.today} | "mañana/tomorrow" → ${dates.tomorrow}
"pasado mañana" → ${dates.dayAfterTomorrow} | "el viernes" → ${dates.nextFriday}
"este finde" → ${dates.nextSaturday} | "la semana que viene" → ${dates.startOfNextWeek}
"cuando pueda/algún día" → null

## EXTRACTION RULES
1. SEPARATE compound statements into individual items
2. CATCH everything — even brief mentions ("ah, y también...")
3. DEDUPLICATE — keep the one with most context
4. TASK = Actionable ("llamar", "comprar", "enviar", "tengo que")
5. IDEA = Concept/possibility ("sería bueno", "podríamos", "se me ocurrió")
6. DREAM = ONLY sleep dream narration ("soñé que X")
7. If "soñé que X" then mentions tasks/ideas → SEPARATE them (dream + tasks)

## TITLE RULES
- TASKS: 3-6 words (verb + object)
- IDEAS: 10-20 words (capture full concept with context)

## PRIORITY
- high: "urgente", "hoy", deadline words
- medium: this week, implicit importance
- low: "cuando pueda", no date

## CATEGORIES
work, meetings, email, calls, coding, writing, personal, family, social, gifts, health, fitness, medical, finance, bills, shopping, home, maintenance, learning, creative, travel, errands

## LANGUAGE
Respond in THE SAME LANGUAGE as the input.

## OUTPUT FORMAT
Return ONLY valid JSON, no markdown:
{
  "transcription": "Full transcription of the audio (or echo of text input)",
  "items": [
    {
      "title": "Short title",
      "type": "task" | "idea" | "dream",
      "category": "category",
      "due_date": "YYYY-MM-DD" | null,
      "priority": "high" | "medium" | "low",
      "context": "Brief context if relevant"
    }
  ],
  "connections": [
    { "from": 0, "to": 1, "reason": "Why related" }
  ]
}

## CONNECTIONS RULES
- from/to = item index (0-based)
- Only CLEARLY related items (same topic, enables other, cause-effect)
- Empty array if unrelated. Max 5.

${textInput ? `## TEXT TO ANALYZE:\n${textInput}` : '## AUDIO ATTACHED - Listen and transcribe first, then extract.'}`;

    // Build content parts
    const parts: any[] = [{ text: prompt }];

    if (audioFile) {
      const buffer = Buffer.from(await audioFile.arrayBuffer());
      const mimeType = audioFile.type || 'audio/webm';
      parts.push({
        inlineData: {
          mimeType,
          data: buffer.toString('base64'),
        },
      });
    }

    const result = await model.generateContent(parts);
    const response = await result.response;
    const content = response.text();

    if (!content) {
      return NextResponse.json({ items: [], transcription: '' });
    }

    let cleanContent = content.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

    try {
      const parsed = JSON.parse(cleanContent);
      
      const processedItems = (parsed.items || []).map((item: any) => ({
        title: item.title || 'Sin título',
        type: ['task', 'idea', 'dream'].includes(item.type) ? item.type : 'idea',
        category: item.category || (item.type === 'dream' ? 'dreams' : 'personal'),
        due_date: item.due_date || null,
        priority: ['high', 'medium', 'low'].includes(item.priority) ? item.priority : 'medium',
        context: item.context || null,
      }));

      const connections = (parsed.connections || []).filter((c: any) =>
        typeof c.from === 'number' && typeof c.to === 'number' &&
        c.from < processedItems.length && c.to < processedItems.length
      );

      if (access.userId) {
        await incrementAIUsage(access.userId);
      }

      return NextResponse.json({
        transcription: parsed.transcription || '',
        items: processedItems,
        connections,
        tasks: processedItems.filter((i: any) => i.type === 'task'),
        ideas: processedItems.filter((i: any) => i.type === 'idea'),
        dreams: processedItems.filter((i: any) => i.type === 'dream'),
      });
    } catch (parseError) {
      console.error('JSON parse error:', parseError, 'Content:', cleanContent);
      return NextResponse.json({ error: 'Failed to parse result' }, { status: 500 });
    }
  } catch (error: any) {
    console.error('Process voice error:', error);
    return NextResponse.json(
      { error: 'Failed to process', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}
