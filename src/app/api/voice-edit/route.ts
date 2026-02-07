import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { checkAIAccess, incrementAIUsage } from '@/lib/ai/rate-limit';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Helper to format date for Google Calendar
function formatCalendarDate(date: string, time: string | null): string {
  const d = new Date(date);
  if (time) {
    const [hours, minutes] = time.split(':');
    d.setHours(parseInt(hours), parseInt(minutes), 0, 0);
  }
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

// Generate Google Calendar deep link
function generateCalendarLink(title: string, date: string, time: string | null, duration: number = 60): string {
  const startDate = formatCalendarDate(date, time);
  const endDate = formatCalendarDate(date, time);
  // Add duration to end time
  const endDateTime = new Date(date);
  if (time) {
    const [hours, minutes] = time.split(':');
    endDateTime.setHours(parseInt(hours) + Math.floor(duration / 60), parseInt(minutes) + (duration % 60), 0, 0);
  } else {
    endDateTime.setHours(endDateTime.getHours() + 1);
  }
  const end = endDateTime.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: title,
    dates: `${startDate}/${end}`,
  });
  
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
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

    const { editType, voiceInput, context } = await request.json();
    if (!editType || !voiceInput) return NextResponse.json({ error: 'Missing editType or voiceInput' }, { status: 400 });

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    
    // Get today's date for reference
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    // Get next weekday dates
    const getNextWeekday = (dayIndex: number) => {
      const result = new Date(today);
      const currentDay = today.getDay();
      let daysToAdd = dayIndex - currentDay;
      if (daysToAdd <= 0) daysToAdd += 7;
      result.setDate(today.getDate() + daysToAdd);
      return result.toISOString().split('T')[0];
    };

    let prompt = '';

    if (editType === 'task') {
      prompt = `You are a voice command interpreter for a task management app.

TODAY: ${todayStr}
TOMORROW: ${tomorrowStr}
NEXT MONDAY: ${getNextWeekday(1)}
NEXT TUESDAY: ${getNextWeekday(2)}
NEXT WEDNESDAY: ${getNextWeekday(3)}
NEXT THURSDAY: ${getNextWeekday(4)}
NEXT FRIDAY: ${getNextWeekday(5)}

TASK: "${context.taskTitle}"
CATEGORY: ${context.category || 'personal'}

USER VOICE COMMAND: "${voiceInput}"

Determine the user's INTENT and extract parameters.

POSSIBLE INTENTS:
- "edit" = Change task title, category, priority, or due date
- "calendar" = Add task to calendar (user mentions calendar, fecha, hora, evento)
- "complete" = Mark as done
- "delete" = Remove task
- "priority" = Change priority (urgente, alta, baja)

Return ONLY valid JSON:
{
  "intent": "edit" | "calendar" | "complete" | "delete" | "priority",
  "params": {
    // For "edit":
    "title": "new title or null",
    "category": "work|personal|health|finance|home|social|learning|errands|fitness|medical|shopping|travel|creative|email|calls|meetings|coding|writing|family|gifts|bills|maintenance or null",
    "due_date": "YYYY-MM-DD or null",
    "priority": "high|medium|low or null"
    
    // For "calendar":
    "date": "YYYY-MM-DD",
    "time": "HH:MM or null",
    "duration": 60
    
    // For "priority":
    "level": "high|medium|low"
  }
}`;
    } else if (editType === 'idea') {
      prompt = `Edit action plan based on voice input.
IDEA: "${context.ideaTitle}"
CURRENT PLAN: ${JSON.stringify(context.currentPlan || [])}
USER SAYS: "${voiceInput}"

Return ONLY valid JSON:
{
  "intent": "edit",
  "params": {
    "action_points": [{"title": "step", "time_estimate": "30min", "category": "work"}],
    "summary": "what changed"
  }
}`;
    } else if (editType === 'action-point') {
      prompt = `Edit this action step based on user's voice input. Return the updated step title.

CURRENT STEP: "${context.stepTitle}" (step ${context.stepIndex + 1} of ${context.totalSteps})
IDEA: "${context.ideaTitle}"
USER VOICE INPUT: "${voiceInput}"

Interpret what the user wants to change about this step and return the new title.

Return ONLY this exact JSON format (no markdown, no extra text):
{"intent":"edit","params":{"title":"the new step title here"}}`;
    } else {
      return NextResponse.json({ error: 'Invalid editType' }, { status: 400 });
    }

    const result = await model.generateContent(prompt);
    const content = result.response.text();
    if (!content) return NextResponse.json({ error: 'No response' }, { status: 500 });

    let cleanContent = content.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleanContent);
    
    // If intent is calendar, generate the deep link
    if (parsed.intent === 'calendar' && parsed.params?.date) {
      const calendarLink = generateCalendarLink(
        context.taskTitle,
        parsed.params.date,
        parsed.params.time || null,
        parsed.params.duration || 60
      );
      parsed.params.calendarLink = calendarLink;
    }

    // Increment usage counter
    if (access.userId) {
      await incrementAIUsage(access.userId);
    }

    return NextResponse.json({ 
      editType, 
      intent: parsed.intent,
      result: parsed.params || parsed 
    });
  } catch (error) {
    console.error('Voice edit error:', error);
    return NextResponse.json({ error: 'Failed to process voice edit' }, { status: 500 });
  }
}
