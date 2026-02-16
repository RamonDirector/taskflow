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

    const dates = getRelativeDates();

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

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

1. **COHESION FIRST (CRITICAL)**: Before splitting, determine if the user is describing ONE concept from multiple angles OR truly separate items.
   - ONE IDEA with multiple aspects: "I want to build a dating app that focuses on women, detects red/green flags, and analyzes photos" → **1 idea** with rich title and all aspects in context
   - MULTIPLE separate items: "I need to call the dentist and also I had this idea for a dating app" → **2 items** (task + idea)
   - **The test**: Do all aspects revolve around the SAME core concept? If yes → ONE item. If they're about different topics → separate items.
   - When keeping as ONE item: title captures the core concept (10-20 words), context captures ALL the details, features, and nuances the user mentioned

2. **SEPARATE compound statements** (only when truly different topics): "Tengo que llamar al dentista y también comprar el regalo de María" = 2 tasks

3. **CATCH everything**: Even brief mentions like "ah, y también..." count. Don't miss anything.

4. **DEDUPLICATE**: If the same thing is mentioned twice, keep only one (with the most context)

5. **INFER context**: 
   - "llamar al dentista" → category: health
   - "enviar propuesta al cliente" → category: work
   - "comprar regalo" → category: errands or personal

6. **DISTINGUISH task vs idea vs dream vs reminder** (VERY IMPORTANT):
   - TASK = Actionable with clear next step ("llamar", "comprar", "enviar", "ir a", "tengo que")
   - IDEA = Concept, thought, possibility ("sería bueno...", "podríamos...", "qué tal si...", "se me ocurrió")
   - DREAM = ONLY the sleep dream narration itself ("soñé que X" - X is the dream content)
   - REMINDER = Time-based reminder ("remind me", "recuérdame", "avísame", "a las X", "every morning", "cada mañana")
   
   ⚠️ **CRITICAL - DO NOT CLASSIFY EVERYTHING AS DREAM**: 
   - If input starts with "soñé que X" but THEN mentions tasks or ideas, you MUST separate them!
   - The word "soñé" at the start does NOT make everything a dream
   - Only the actual dream NARRATIVE is type "dream"
   - Everything else (tasks, ideas mentioned after) keeps its own type
   - ALWAYS analyze the FULL transcript and extract EACH distinct item separately

7. **TITLE RULES (CRITICAL)**:
   - TASKS: 3-6 words (verb + object, actionable)
   - IDEAS: 10-20 words (capture the full concept, keep important context)
   - NO filler words, but IDEAS should have enough detail to understand later
   
   TASK GOOD: "Llamar al dentista"
   TASK BAD: "Tengo que acordarme de llamar al dentista porque me duele la muela"
   
   IDEA GOOD: "App que conecta vecinos para compartir herramientas y reducir consumo"
   IDEA BAD: "App de vecinos" (too short, loses the essence)

8. **PRIORITY inference**:
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
      "title": "Short 3-6 word title (for dreams: capture the key imagery/narrative)",
      "type": "task" | "idea" | "dream" | "reminder",
      "reminder_time": "time string preserving day references (e.g. 'thursday 19:00', 'el jueves', 'next saturday', 'el próximo sábado', 'tomorrow 09:00', 'in 30 minutes', '15:00'). For meals: include 'dinner/cenar/lunch/comer' keyword if no explicit time. ALWAYS preserve the day of week from user input." | null,
      "recurring": true | false,
      "interval": "daily" | "weekly" | "every 2 hours" | null,
      "category": "category (for dreams use: dreams)",
      "due_date": "YYYY-MM-DD" | null,
      "priority": "high" | "medium" | "low",
      "context": "Brief context if relevant (optional, for dreams: fuller narrative)"
    }
  ],
  "connections": [
    {
      "from": 0,
      "to": 1,
      "reason": "Brief reason why they're related (same language as input)"
    }
  ]
}

## CONNECTIONS RULES
- "from" and "to" are INDEX numbers of items in the items array (0-based)
- Only include connections when items are CLEARLY related (same topic, one enables the other, cause-effect)
- DO NOT force connections — if items are unrelated, return empty connections array
- Maximum 5 connections per brain dump
- Examples of valid connections:
  - Task "Preparar presentación" ↔ Idea "Aprender a hacer mejores slides" (same topic)
  - Task "Ir al gimnasio" ↔ Task "Comprar ropa deportiva" (one enables the other)
  - Idea "App de recetas" ↔ Task "Investigar APIs de nutrición" (research supports idea)

## COHESION EXAMPLES (STUDY THESE — MOST COMMON MISTAKE)

**Example: ONE idea explained in depth (DO NOT SPLIT)**
Input: "Se me ha ocurrido una app de citas que ayude a la gente a mejorar sus habilidades. Que se enfoque en las necesidades de las mujeres, que detecte red flags y green flags en los perfiles, y que analice las fotos según los objetivos del usuario."
Correct Output: **1 SINGLE idea** ✅
- { "title": "Dating app to improve dating skills with focus on women's needs", "type": "idea", "context": "App that focuses on women's needs, detects green and red flags in dating profiles, analyzes profile photos based on user goals. Differentiator: helps users actually improve, not just swipe." }
WRONG: Splitting into 4-5 separate ideas (one per feature) ❌

**Example: TRULY separate items**
Input: "Tengo que llamar al dentista. Ah y se me ocurrió una app de citas. También tengo que comprar leche."
Correct Output: **3 separate items** ✅
- { "title": "Llamar al dentista", "type": "task" }
- { "title": "App de citas", "type": "idea" }
- { "title": "Comprar leche", "type": "task" }

## MIXED INPUT EXAMPLES (STUDY THESE CAREFULLY)

**Example 1:**
Input: "Soñé que volaba sobre el mar. Ah y también tengo que llamar al dentista. Se me ocurrió una app para compartir sueños."
Correct Output: 3 SEPARATE items:
- { "title": "Volaba sobre el mar", "type": "dream" }
- { "title": "Llamar al dentista", "type": "task" }
- { "title": "App para compartir sueños", "type": "idea" }
WRONG: Putting everything as one dream item ❌

**Example 2:**
Input: "Anoche soñé con mi ex. Por cierto, tengo que comprar leche."
Correct Output: 2 SEPARATE items:
- { "title": "Soñé con mi ex", "type": "dream" }
- { "title": "Comprar leche", "type": "task" }
WRONG: Making both items dreams ❌

**Example 3:**
Input: "Soñé algo raro pero no me acuerdo. Quiero empezar a meditar."
Correct Output: 2 SEPARATE items:
- { "title": "Sueño raro que no recuerdo", "type": "dream" }
- { "title": "Empezar a meditar", "type": "idea" }

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
        type: ['task', 'idea', 'dream', 'reminder'].includes(item.type) ? item.type : 'idea',
        reminder_time: item.reminder_time || null,
        recurring: item.recurring || false,
        interval: item.interval || null,
        category: item.category || (item.type === 'dream' ? 'dreams' : 'personal'),
        due_date: item.due_date || null,
        priority: ['high', 'medium', 'low'].includes(item.priority) ? item.priority : 'medium',
        context: item.context || null,
      }));
      
      const tasks = processedItems.filter((item: { type: string }) => item.type === 'task');
      const ideas = processedItems.filter((item: { type: string }) => item.type === 'idea');
      const dreams = processedItems.filter((item: { type: string }) => item.type === 'dream');

      // Increment usage counter
      if (access.userId) {
        await incrementAIUsage(access.userId);
      }

      return NextResponse.json({ items: processedItems, tasks, ideas, dreams });
    } catch (parseError) {
      console.error('JSON parse error:', parseError, 'Content:', cleanContent);
      return NextResponse.json({ error: 'Failed to parse extraction result' }, { status: 500 });
    }
  } catch (error) {
    console.error('Extraction error:', error);
    return NextResponse.json({ error: 'Failed to extract items' }, { status: 500 });
  }
}
