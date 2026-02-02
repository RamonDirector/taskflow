import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Calculate relative dates
function getRelativeDates() {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const dayAfterTomorrow = new Date(today);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);
  
  // Get next weekdays
  const getNextWeekday = (dayIndex: number) => {
    const result = new Date(today);
    const currentDay = today.getDay();
    let daysToAdd = dayIndex - currentDay;
    if (daysToAdd <= 0) daysToAdd += 7;
    result.setDate(today.getDate() + daysToAdd);
    return result;
  };
  
  const nextMonday = getNextWeekday(1);
  const nextTuesday = getNextWeekday(2);
  const nextWednesday = getNextWeekday(3);
  const nextThursday = getNextWeekday(4);
  const nextFriday = getNextWeekday(5);
  const nextSaturday = getNextWeekday(6);
  const nextSunday = getNextWeekday(0);
  
  // Next week (start of next week)
  const startOfNextWeek = new Date(today);
  startOfNextWeek.setDate(today.getDate() + (7 - today.getDay() + 1));
  
  // End of this week (Sunday)
  const endOfThisWeek = new Date(today);
  endOfThisWeek.setDate(today.getDate() + (7 - today.getDay()));
  
  // End of this month
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  
  const formatDate = (d: Date) => d.toISOString().split('T')[0];
  
  return {
    today: formatDate(today),
    tomorrow: formatDate(tomorrow),
    dayAfterTomorrow: formatDate(dayAfterTomorrow),
    nextMonday: formatDate(nextMonday),
    nextTuesday: formatDate(nextTuesday),
    nextWednesday: formatDate(nextWednesday),
    nextThursday: formatDate(nextThursday),
    nextFriday: formatDate(nextFriday),
    nextSaturday: formatDate(nextSaturday),
    nextSunday: formatDate(nextSunday),
    startOfNextWeek: formatDate(startOfNextWeek),
    endOfThisWeek: formatDate(endOfThisWeek),
    endOfMonth: formatDate(endOfMonth),
    dayOfWeek: today.toLocaleDateString('en-US', { weekday: 'long' }),
    dayOfWeekES: today.toLocaleDateString('es-ES', { weekday: 'long' }),
  };
}

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }

    const dates = getRelativeDates();

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const prompt = `You are a Brain Dump extraction expert. Your job is to analyze LONG, RAMBLING voice transcripts (2-5 minutes of continuous talking) and extract EVERY actionable task and idea.

## DATE REFERENCE (use these exact dates)
Today: ${dates.dayOfWeek} (${dates.dayOfWeekES}), ${dates.today}
Tomorrow: ${dates.tomorrow}
Day after tomorrow: ${dates.dayAfterTomorrow}
This Friday: ${dates.nextFriday}
This weekend: ${dates.nextSaturday} - ${dates.nextSunday}
End of this week: ${dates.endOfThisWeek}
Next week (starts): ${dates.startOfNextWeek}
Next Monday: ${dates.nextMonday}
Next Tuesday: ${dates.nextTuesday}
Next Wednesday: ${dates.nextWednesday}
Next Thursday: ${dates.nextThursday}
Next Friday: ${dates.nextFriday}
End of month: ${dates.endOfMonth}

## DATE DETECTION RULES
Map these phrases to actual dates:
- "hoy", "today" → ${dates.today}
- "mañana", "tomorrow" → ${dates.tomorrow}
- "pasado mañana" → ${dates.dayAfterTomorrow}
- "el viernes", "this friday", "antes del viernes" → ${dates.nextFriday}
- "este finde", "este fin de semana" → ${dates.nextSaturday}
- "la semana que viene", "next week" → ${dates.startOfNextWeek}
- "el lunes", "el próximo lunes" → ${dates.nextMonday}
- "a final de mes", "end of month" → ${dates.endOfMonth}
- "cuando pueda", "algún día", "eventually" → null

## BRAIN DUMP EXTRACTION RULES

1. **SEPARATE compound statements**: "Tengo que llamar al dentista y también comprar el regalo de María" = 2 tasks

2. **CATCH everything**: Even brief mentions like "ah, y también..." count. Don't miss anything.

3. **DEDUPLICATE**: If the same thing is mentioned twice, keep only one (with the most context)

4. **INFER context**: 
   - "llamar al dentista" → category: health
   - "enviar propuesta al cliente" → category: work
   - "comprar regalo" → category: errands or personal

5. **DISTINGUISH task vs idea**:
   - TASK = Actionable with clear next step ("llamar", "comprar", "enviar", "ir a")
   - IDEA = Concept, thought, possibility ("sería bueno...", "podríamos...", "qué tal si...")

6. **TITLE RULES (CRITICAL)**:
   - 3-6 words MAXIMUM
   - Verb + object for tasks
   - Noun phrase for ideas
   - NO filler, NO context - just the essence
   
   GOOD: "Llamar al dentista"
   BAD: "Tengo que acordarme de llamar al dentista porque me duele la muela"

7. **PRIORITY inference**:
   - high: "urgente", "antes de", "hoy", deadline próximo, palabras de estrés
   - medium: fechas esta semana, importancia implícita
   - low: "cuando pueda", "algún día", sin fecha

## CATEGORIES (pick the most specific one)
- work, meetings, email, calls, coding, writing — professional tasks
- personal, family, social, gifts — personal life
- health, fitness, medical — wellbeing
- finance, bills, shopping — money related
- home, maintenance — household
- learning, creative — growth & hobbies
- travel, errands — logistics

## LANGUAGE
Detect the language of the input and respond in THE SAME LANGUAGE (titles in input language).

## OUTPUT FORMAT
Return ONLY valid JSON, no markdown:
{
  "items": [
    {
      "title": "Short 3-6 word title",
      "type": "task" | "idea",
      "category": "category",
      "due_date": "YYYY-MM-DD" | null,
      "priority": "high" | "medium" | "low",
      "context": "Brief context if relevant (optional)"
    }
  ]
}

## TRANSCRIPT TO ANALYZE:
${text}`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const content = response.text();
    
    if (!content) {
      return NextResponse.json({ items: [], tasks: [], ideas: [] });
    }

    let cleanContent = content.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    // Handle potential JSON parsing issues
    try {
      const parsed = JSON.parse(cleanContent);
      const items = parsed.items || [];
      
      // Post-process: ensure all items have required fields
      const processedItems = items.map((item: any) => ({
        title: item.title || 'Sin título',
        type: item.type === 'idea' ? 'idea' : 'task',
        category: item.category || 'personal',
        due_date: item.due_date || null,
        priority: ['high', 'medium', 'low'].includes(item.priority) ? item.priority : 'medium',
      }));
      
      const tasks = processedItems.filter((item: { type: string }) => item.type === 'task');
      const ideas = processedItems.filter((item: { type: string }) => item.type === 'idea');

      return NextResponse.json({ items: processedItems, tasks, ideas });
    } catch (parseError) {
      console.error('JSON parse error:', parseError, 'Content:', cleanContent);
      return NextResponse.json({ error: 'Failed to parse extraction result' }, { status: 500 });
    }
  } catch (error) {
    console.error('Extraction error:', error);
    return NextResponse.json({ error: 'Failed to extract items' }, { status: 500 });
  }
}
