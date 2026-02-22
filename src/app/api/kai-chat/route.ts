import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY || process.env.Claude_API_KEY || process.env.CLAUDE_KEY || process.env.SONNET_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Routing: determine if we need Sonnet (expensive) or Gemini (cheap)
function needsSonnet(text: string): boolean {
  const lower = text.toLowerCase().trim();
  const words = lower.split(/\s+/);
  
  // Greetings → Gemini
  if (/^(hola|hey|qu[eé] tal|buenas|buenos d[ií]as|good morning|hi|hello)[\s!?.]*$/i.test(lower)) return false;
  
  // Short acknowledgments → Gemini
  if (words.length <= 2 && !/\b(crea|borra|elimina|completa|prioriza)\b/i.test(lower)) return false;
  
  // Task CRUD actions + reminders → Sonnet (needs tools)
  if (/\b(crea|añade|pon|agrega|completa|termin[eé]|hice|borra|elimina|quita|remind|alarm|avisa|cancel|cambia|mueve)\b/i.test(lower)) return true;
  // Spanish accented words — \b doesn't work with accented chars in JS
  if (/(recu[eé]rd|recordar)/i.test(lower)) return true;
  
  // Ideas → Sonnet (needs tools)
  if (/\b(idea|what if|convert|convierte|transforma)\b/i.test(lower)) return true;
  if (/(se me ocurri[oó]|pens[eé] en|tengo una idea)/i.test(lower)) return true;
  
  // Dreams → Sonnet (needs tools)
  if (/\b(dream|nightmare|dreamed|dreamt|analiz|patrones?|patterns?)\b/i.test(lower)) return true;
  if (/(soñ[eé]|pesadilla|anoche soñ|mis sueños)/i.test(lower)) return true;
  
  // Reminders management → Sonnet
  if (/\b(reminders?|recordatorios?|alarma)/i.test(lower)) return true;
  
  // Coaching / prioritization questions → Sonnet (needs reasoning)
  if (/\b(qu[eé] (debo|hago|tengo|podr[ií]a)|c[oó]mo voy|sugi[eé]r|recomiend|prioriz|por d[oó]nde empiezo|ayuda)\b/i.test(lower)) return true;
  
  // Status / summary questions → Gemini can handle with context
  if (/\b(cu[aá]ntas?|resumen|estado|pendientes|lista)\b/i.test(lower)) return false;
  
  // Default: messages > 8 words likely need reasoning → Sonnet
  return words.length > 8;
}

// Intent detection: INVERTED — detect brain dumps, everything else goes to Kai
function isConversation(text: string): boolean {
  const lower = text.toLowerCase().trim();
  const words = lower.split(/\s+/);
  
  // === BRAIN DUMP patterns (NOT conversation) ===
  
  // Lists with commas or "y" connecting items → brain dump
  // "comprar leche, llamar dentista, enviar email"
  const commaItems = lower.split(',').map(s => s.trim()).filter(Boolean);
  if (commaItems.length >= 2) return false;
  
  // Multiple lines → brain dump
  if (text.trim().split('\n').filter(Boolean).length >= 2) return false;
  
  // Starts with action verb + object (task-like) and is long enough
  const taskVerbs = [
    'comprar', 'llamar', 'enviar', 'escribir', 'preparar', 'hacer', 'terminar',
    'revisar', 'leer', 'buscar', 'pagar', 'reservar', 'agendar', 'programar',
    'cocinar', 'limpiar', 'arreglar', 'instalar', 'configurar', 'actualizar',
    'mandar', 'recoger', 'devolver', 'cancelar', 'renovar', 'solicitar',
    'buy', 'call', 'send', 'write', 'prepare', 'finish', 'review', 'read',
  ];
  const firstWord = words[0]?.replace(/[^a-záéíóúñü]/g, '');
  if (taskVerbs.includes(firstWord) && words.length >= 2 && words.length <= 12) return false;
  
  // "Tengo que..." / "Necesito..." / "Hay que..." → task, not conversation
  if (lower.startsWith('tengo que ') || lower.startsWith('necesito ') || lower.startsWith('hay que ')) return false;
  
  // "Se me ocurrió..." / "Una idea:" → NOW goes to Kai (create_idea tool) instead of brain dump
  // if (lower.startsWith('se me ocurri') || lower.startsWith('una idea') || lower.startsWith('idea:')) return false;
  
  // "Soñé que..." → NOW goes to Kai (log_dream tool) instead of brain dump
  // if (lower.startsWith('soñé') || lower.startsWith('soñe') || lower.startsWith('anoche soñ')) return false;
  
  // === EVERYTHING ELSE → CONVERSATION with Kai ===
  return true;
}

export async function POST(request: NextRequest) {
  try {
    const { text, userId, accessToken, locale = 'es' } = await request.json();
    const isEnglish = locale === 'en';
    
    if (!text?.trim()) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 });
    }
    
    // Check if this is a conversation or brain dump
    if (!isConversation(text)) {
      return NextResponse.json({ type: 'brain_dump' });
    }
    
    if (!ANTHROPIC_API_KEY) {
      console.error('Missing API key. ANTHROPIC_API_KEY:', !!process.env.ANTHROPIC_API_KEY, 'CLAUDE_API_KEY:', !!process.env.CLAUDE_API_KEY);
      return NextResponse.json({ error: 'Anthropic API key not configured', debug: 'no_key' }, { status: 500 });
    }
    
    const useSonnet = needsSonnet(text);
    
    // Fetch user context from Supabase — use user's access token for RLS
    const supabaseOptions = accessToken 
      ? { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
      : {};
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, supabaseOptions);
    
    // Service role client for saving conversations (bypasses RLS)
    const serviceSupabase = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || '');

    // Parallel queries for rich context — leverage Sonnet 4.6's 1M context window
    const [tasksRes, ideasRes, dreamsRes, remindersRes, activityRes, conversationsRes] = await Promise.all([
      supabase
        .from('tasks')
        .select('id, title, completed, type, priority, created_at, due_date, completed_at')
        .eq('user_id', userId)
        .eq('type', 'task')
        .is('parent_idea_id', null)
        .order('created_at', { ascending: false })
        .limit(30),
      supabase
        .from('tasks')
        .select('id, title, type, created_at, voice_context')
        .eq('user_id', userId)
        .eq('type', 'idea')
        .order('created_at', { ascending: false })
        .limit(15),
      supabase
        .from('tasks')
        .select('id, title, created_at, interpretation, emotion, voice_context')
        .eq('user_id', userId)
        .eq('type', 'dream')
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('reminders')
        .select('id, title, schedule_type, trigger_at, next_trigger, interval_ms, active')
        .eq('user_id', userId)
        .eq('active', true)
        .order('next_trigger', { ascending: true })
        .limit(10),
      supabase
        .from('activity_log')
        .select('action, entity_type, metadata, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50),
      supabase
        .from('kai_conversations')
        .select('user_message, kai_response, tools_used, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20),
    ]);
    
    const tasks = tasksRes.data || [];
    const ideas = ideasRes.data || [];
    const dreams = dreamsRes.data || [];
    const reminders = remindersRes.data || [];
    const activity = activityRes.data || [];
    const conversations = (conversationsRes.data || []).reverse(); // chronological order

    // Fetch user timezone from Supabase metadata (parallel fetch done, now get tz)
    let userTimezone = 'UTC';
    try {
      const { data: { user: authUser } } = await serviceSupabase.auth.admin.getUserById(userId);
      userTimezone = (authUser as any)?.user_metadata?.timezone || 'UTC';
    } catch {
      // fallback to UTC
    }

    // Build rich context
    const pendingTasks = tasks.filter(t => !t.completed);
    const completedTasks = tasks.filter(t => t.completed);
    const now = new Date();
    // Use user's local date, not UTC (critical for users in negative-offset timezones like Hawaii)
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: userTimezone }).format(now); // en-CA = YYYY-MM-DD
    const todayTasks = pendingTasks.filter(t => t.due_date === today);
    
    // Stale tasks (pending > 3 days)
    const staleTasks = pendingTasks.filter(t => {
      const age = (Date.now() - new Date(t.created_at).getTime()) / (1000 * 60 * 60 * 24);
      return age > 3;
    });
    
    // Activity analysis
    const last7Days = activity.filter(a => {
      const age = (Date.now() - new Date(a.created_at).getTime()) / (1000 * 60 * 60 * 24);
      return age <= 7;
    });
    const last24h = activity.filter(a => {
      const age = (Date.now() - new Date(a.created_at).getTime()) / (1000 * 60 * 60);
      return age <= 24;
    });
    const completedThisWeek = last7Days.filter(a => a.action === 'task_completed').length;
    const brainDumpsThisWeek = last7Days.filter(a => a.action === 'brain_dump').length;
    const completedToday = last24h.filter(a => a.action === 'task_completed').length;
    const createdToday = last24h.filter(a => a.action === 'task_created').length;
    
    // Streak calculation: consecutive days with at least 1 completed task
    const completionDays = new Set(
      activity
        .filter(a => a.action === 'task_completed')
        .map(a => new Date(a.created_at).toISOString().split('T')[0])
    );
    let streak = 0;
    const checkDate = new Date(now);
    for (let i = 0; i < 30; i++) {
      const dayStr = checkDate.toISOString().split('T')[0];
      if (completionDays.has(dayStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else if (i === 0) {
        // Today might not have completions yet, check yesterday
        checkDate.setDate(checkDate.getDate() - 1);
        continue;
      } else {
        break;
      }
    }
    
    // Most productive hour (from activity log)
    const hourCounts: Record<number, number> = {};
    activity.filter(a => a.action === 'task_completed').forEach(a => {
      const hour = new Date(a.created_at).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });
    const peakHour = Object.entries(hourCounts).sort(([,a], [,b]) => b - a)[0];
    
    // Completion rate this week
    const createdThisWeek = last7Days.filter(a => a.action === 'task_created').length;
    const completionRate = createdThisWeek > 0 ? Math.round((completedThisWeek / createdThisWeek) * 100) : 0;
    
    // Recently completed tasks (last 3 days) for conversational awareness
    const recentCompleted = completedTasks
      .filter(t => t.completed_at && (Date.now() - new Date(t.completed_at).getTime()) < 3 * 86400000)
      .slice(0, 5);
    
    // Format reminders for context — always use user's timezone, not server UTC
    const reminderContext = reminders.length > 0 
      ? reminders.map(r => {
          const triggerDate = new Date(r.next_trigger);
          const timeStr = triggerDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: userTimezone });
          const triggerLocalDate = new Intl.DateTimeFormat('en-CA', { timeZone: userTimezone }).format(triggerDate);
          const dateStr = triggerLocalDate === today ? 'today' : triggerDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: userTimezone });
          const recStr = r.schedule_type === 'recurring' && r.interval_ms 
            ? ` (recurring every ${Math.round(r.interval_ms / 3600000)}h)` 
            : '';
          return `- [R#${r.id}] "${r.title}" → ${dateStr} ${timeStr}${recStr}`;
        }).join('\n')
      : 'No active reminders';
    
    // Format dreams for context (emotional awareness)
    const dreamContext = dreams.length > 0
      ? dreams.slice(0, 5).map(d => {
          const dateStr = new Date(d.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          const emotionStr = d.emotion ? ` [${d.emotion}]` : '';
          return `- "${d.title}" (${dateStr})${emotionStr}`;
        }).join('\n')
      : 'No dreams recorded yet';
    
    // Format ideas with voice context for richer understanding
    const ideaContext = ideas.length > 0
      ? ideas.slice(0, 10).map(i => {
          const dateStr = new Date(i.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          const voiceStr = i.voice_context ? ` — context: "${i.voice_context.slice(0, 80)}"` : '';
          return `- [#${i.id}] "${i.title}" (${dateStr})${voiceStr}`;
        }).join('\n')
      : 'No ideas yet';
    
    // Current local time for Claude (so it generates correct trigger_at ISO strings)
    const userLocalTimeStr = now.toLocaleString('en-US', {
      timeZone: userTimezone,
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true,
    });
    const userUtcOffsetStr = now.toLocaleString('en-US', { timeZone: userTimezone, timeZoneName: 'short' }).split(' ').pop() || userTimezone;

    const contextBlock = `
## User's full context

### Current time (user's local timezone)
- Local time: ${userLocalTimeStr} (${userTimezone} / ${userUtcOffsetStr})
- Today's date: ${today}
- When setting reminder trigger_at: convert user's stated local time to UTC ISO 8601. Example: if user says "3pm" in ${userTimezone}, compute the correct UTC equivalent.

### Today's focus (${todayTasks.length} tasks)
${todayTasks.length > 0 ? todayTasks.map(t => `- [#${t.id}] "${t.title}" [${t.priority || 'normal'}]`).join('\n') : 'No tasks scheduled for today'}

### All pending tasks (${pendingTasks.length})
${pendingTasks.slice(0, 15).map(t => `- [#${t.id}] "${t.title}" ${t.due_date === today ? '(TODAY)' : t.due_date ? `(due ${t.due_date})` : ''} ${staleTasks.find(s => s.id === t.id) ? `⚠ stale ${Math.floor((Date.now() - new Date(t.created_at).getTime()) / 86400000)} days` : ''} [${t.priority || 'normal'}]`).join('\n')}
${pendingTasks.length > 15 ? `...and ${pendingTasks.length - 15} more` : ''}

### Recently completed (last 3 days)
${recentCompleted.length > 0 ? recentCompleted.map(t => `- [#${t.id}] "${t.title}" ✓`).join('\n') : 'None recently'}

### Stale tasks (3+ days without progress)
${staleTasks.length > 0 ? staleTasks.map(t => `- [#${t.id}] "${t.title}" (${Math.floor((Date.now() - new Date(t.created_at).getTime()) / 86400000)} days old)`).join('\n') : 'None — all tasks are fresh'}

### Active reminders
${reminderContext}

### Ideas (${ideas.length})
${ideaContext}

### Recent dreams
${dreamContext}

### User stats & patterns
- Streak: ${streak} consecutive days completing tasks
- Today: ${completedToday} completed, ${createdToday} created
- This week: ${completedThisWeek} completed, ${brainDumpsThisWeek} brain dumps
- Completion rate (7d): ${completionRate}%${createdThisWeek === 0 ? ' (no tasks created)' : ''}
${peakHour ? `- Most productive hour: ${parseInt(peakHour[0])}:00 (${peakHour[1]} tasks completed)` : ''}
- Total pending: ${pendingTasks.length} tasks, ${ideas.length} ideas
`.trim();

    // === TIER 1: Gemini Flash for simple responses (no tools needed) ===
    if (!useSonnet) {
      try {
        const geminiModel = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const systemPrompt = isEnglish 
          ? `You are Kai, the panda assistant of Hansei. Respond in English, casual tone.
Max 2-3 lines. No emojis. Direct and warm.
Use line breaks between ideas. Use **bold** for tasks or keywords.
Don't use dash lists or numbered lists. No headers.
You know the user's tasks, ideas, dreams, reminders, and stats — reference them naturally.
If they have a streak, mention it. If they ask how they're doing, use their real data.
NEVER say "ready to chat about anything" or similar generic phrases — you can ONLY help with tasks, ideas, dreams, and reminders.
For greetings, reference their actual data: "You've got 3 tasks pending" or "Your streak is 5 days strong."
If asked about something outside productivity: "That's not my thing. Want to check your tasks?"`
          : `Eres Kai, el panda asistente de Hansei. Responde en español, informal (tuteo).
Máximo 2-3 líneas. Sin emojis. Directo y cálido.
Usa saltos de línea entre ideas. Usa **negrita** para tareas o palabras clave.
No uses listas con guiones ni números. No uses headers.
Conoces las tareas, ideas, sueños, recordatorios y stats del usuario — referenciarlos naturalmente.
Si tiene una racha activa, menciónala. Si pregunta cómo va, usa sus datos reales.
NUNCA digas "listo para charlar" o frases genéricas — SOLO puedes ayudar con tareas, ideas, sueños y recordatorios.
Para saludos, referencia sus datos reales: "Tienes 3 tareas pendientes" o "Llevas 5 días de racha."
Si preguntan algo fuera de productividad: "Eso no es lo mío. ¿Vemos tus tareas?"`;
        // Build conversation history for Gemini (last 10 for token efficiency)
        const recentConvos = conversations.slice(-10).map(c => {
          const timeAgo = getTimeAgo(new Date(c.created_at), isEnglish);
          return `${isEnglish ? 'User' : 'Usuario'} (${timeAgo}): ${c.user_message}\nKai: ${c.kai_response}`;
        }).join('\n\n');
        
        const geminiPrompt = `${systemPrompt}

${contextBlock}

${recentConvos ? `## Recent conversation history\n${recentConvos}\n\n` : ''}${isEnglish ? 'User' : 'Usuario'}: ${text}`;
        
        const geminiRes = await geminiModel.generateContent(geminiPrompt);
        let geminiText = geminiRes.response.text();
        // Strip Gemini preamble artifacts ("Here is the prompt:", "Here's a response:", etc.)
        geminiText = geminiText.replace(/^(here\s*(is|are)\s*(the|a|my)?\s*(prompt|response|reply|answer)[:\s]*\n?)/i, '').trim();
        geminiText = geminiText.replace(/^(how about[:\s]*\n?|here you go[:\s]*\n?|sure[,!:\s]*\n?)/i, '').trim();
        const pose = determinePose(geminiText, []);
        
        // Save conversation (fire-and-forget, don't block response)
        saveConversation(serviceSupabase, userId, text, geminiText, [], 'gemini', locale).catch(() => {});
        
        return NextResponse.json({
          type: 'conversation',
          message: geminiText,
          pose,
          actions: [],
          model: 'gemini',
        });
      } catch (geminiError) {
        console.error('Gemini fallback to Sonnet:', geminiError);
        // Fall through to Sonnet
      }
    }
    
    // === TIER 2: Sonnet for complex responses (tools, reasoning, coaching) ===
    
    // Build tools for Kai — ACI optimized per Anthropic best practices
    const tools = [
      {
        name: 'create_task',
        description: `Crear una nueva tarea para el usuario.

Usa cuando:
- El usuario pide explícitamente crear/añadir una tarea
- El usuario acepta una sugerencia tuya ("sí, ponla")
- "recuérdame X" o "añade X a mi lista"

NO uses cuando:
- El usuario habla de algo que YA hizo → usa complete_task
- Mención vaga sin intención de crear ("debería hacer X algún día") → solo responde
- El input ya se detectó como brain dump → no llegarás aquí

Ejemplos:
- "crea una tarea para llamar al dentista" → title: "Llamar al dentista"
- "pon comprar pan como prioridad alta para hoy" → title: "Comprar pan", priority: "high", due_today: true`,
        input_schema: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Título claro y accionable. Empieza con verbo.' },
            priority: { type: 'string', enum: ['high', 'medium', 'low'], description: 'Prioridad. Default: medium si no se especifica.' },
            due_today: { type: 'boolean', description: 'true si el usuario dice "hoy" o implica urgencia inmediata.' },
          },
          required: ['title'],
        },
      },
      {
        name: 'complete_task',
        description: `Marcar una tarea existente como completada.

Usa cuando:
- El usuario dice que ya hizo algo: "ya llamé al dentista", "hecho", "listo"
- El usuario confirma que terminó una tarea específica

NO uses cuando:
- No hay tarea pendiente que coincida → responde "no encuentro esa tarea"
- El usuario quiere ELIMINAR (no completar) una tarea → usa delete_task

Usa task_id (del contexto [#ID]) siempre que sea posible. Fallback a task_title si no hay ID claro.
Si hay varias coincidencias por título, completa la más antigua (probablemente la que el usuario quiere cerrar).`,
        input_schema: {
          type: 'object',
          properties: {
            task_id: { type: 'string', description: 'ID de la tarea del contexto (ej: "42"). Preferido sobre título.' },
            task_title: { type: 'string', description: 'Título parcial como fallback si no hay ID claro.' },
          },
          required: [],
        },
      },
      {
        name: 'delete_task',
        description: `Eliminar una tarea de la lista.

Usa cuando:
- El usuario quiere quitar algo: "borra X", "elimina X", "quita X de mi lista"

NO uses cuando:
- El usuario dice "borra todo/todas" → NO ejecutar, responde "¿cuáles exactamente?"
- El usuario completó la tarea (la hizo) → usa complete_task
- No hay match claro → pregunta cuál tarea se refiere

Usa task_id siempre que sea posible. Si hay varias coincidencias por título, PREGUNTA cuál.`,
        input_schema: {
          type: 'object',
          properties: {
            task_id: { type: 'string', description: 'ID de la tarea del contexto (ej: "42"). Preferido sobre título.' },
            task_title: { type: 'string', description: 'Título parcial como fallback si no hay ID claro.' },
          },
          required: [],
        },
      },
      {
        name: 'set_reminder',
        description: `Set a reminder for the user at a specific time.

Use when:
- "remind me to X at 3pm" or "remind me in 2 hours"
- "set a reminder for tomorrow morning"
- User explicitly asks to be reminded about something

Don't use when:
- User wants to create a task (use create_task instead)
- User wants to complete something
- No clear time/schedule specified — ask when

Examples:
- "remind me to call the dentist at 3pm" → title: "Call the dentist", trigger_at: today 3pm
- "remind me in 2 hours to check email" → title: "Check email", delay_minutes: 120
- "remind me every day at 9am to meditate" → title: "Meditate", trigger_at: tomorrow 9am, recurring: true, interval_hours: 24`,
        input_schema: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'What to remind about. Clear and actionable.' },
            delay_minutes: { type: 'number', description: 'Minutes from now to trigger. Use this OR trigger_at.' },
            trigger_at: { type: 'string', description: 'ISO 8601 datetime in UTC (ends with Z). Convert user\'s local time to UTC using the timezone in context. E.g. if user is HST (UTC-10) and says 3pm, use "...T01:00:00.000Z" (next day UTC). NEVER use delay_minutes and trigger_at together.' },
            recurring: { type: 'boolean', description: 'Whether this repeats. Default false.' },
            interval_hours: { type: 'number', description: 'Hours between recurrences. Only if recurring=true.' },
          },
          required: ['title'],
        },
      },
      // === IDEAS TOOLS ===
      {
        name: 'create_idea',
        description: `Save a new idea for the user.

Use when:
- "I just thought of something..." or "What if we..."
- "Idea: ..." or "Se me ocurrió..."
- User shares a concept, business idea, or creative thought

Don't use when:
- It's a concrete task with a deadline → use create_task
- It's a reminder → use set_reminder
- User is just chatting, not capturing an idea

Examples:
- "What if I built an app for dog walkers?" → title: "App for dog walkers"
- "Se me ocurrió hacer un podcast de finanzas" → title: "Podcast de finanzas"`,
        input_schema: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Clear, concise idea title.' },
            voice_context: { type: 'string', description: 'Extra context the user provided about the idea. Capture their exact words/reasoning.' },
          },
          required: ['title'],
        },
      },
      {
        name: 'convert_idea_to_task',
        description: `Convert an existing idea into an actionable task.

Use when:
- "Let's do the X idea" or "Convert my idea about X into a task"
- "I want to start working on X" (where X is a known idea)
- User decides to act on an idea they previously captured

Don't use when:
- The idea doesn't exist in their list → tell them
- User wants to keep it as an idea → don't convert

Finds the idea by ID or title match, creates a task linked to it.`,
        input_schema: {
          type: 'object',
          properties: {
            idea_id: { type: 'string', description: 'ID of the idea from context [#ID]. Preferred.' },
            idea_title: { type: 'string', description: 'Partial title match as fallback.' },
            task_title: { type: 'string', description: 'Title for the new task. If not provided, uses the idea title.' },
            due_today: { type: 'boolean', description: 'Set as today\'s focus.' },
          },
          required: [],
        },
      },
      {
        name: 'delete_idea',
        description: `Delete an idea from the board.

Use when:
- "Delete/remove the idea about X"
- "That idea isn't relevant anymore"

Don't use when:
- User wants to convert it to a task → use convert_idea_to_task
- Ambiguous which idea → ask for clarification`,
        input_schema: {
          type: 'object',
          properties: {
            idea_id: { type: 'string', description: 'ID from context [#ID]. Preferred.' },
            idea_title: { type: 'string', description: 'Partial title match as fallback.' },
          },
          required: [],
        },
      },
      // === DREAMS TOOLS ===
      {
        name: 'log_dream',
        description: `Log a dream the user describes.

Use when:
- "Last night I dreamed that..." or "Anoche soñé que..."
- "I had a nightmare about..." or "Tuve una pesadilla..."
- User describes any dream experience

Don't use when:
- User talks about goals/aspirations ("my dream is to...") → that's an idea or conversation
- User asks about dream interpretation → use analyze_dreams instead

Capture the full description as voice_context. Generate a short title.`,
        input_schema: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Short dream title (3-6 words). E.g. "Flying over the ocean"' },
            description: { type: 'string', description: 'Full dream description as told by the user. Preserve their words.' },
            emotion: { type: 'string', description: 'Primary emotion detected: joy, fear, anxiety, confusion, sadness, anger, peace, excitement, nostalgia, neutral' },
          },
          required: ['title', 'description'],
        },
      },
      {
        name: 'analyze_dreams',
        description: `Analyze patterns across the user's recent dreams.

Use when:
- "What patterns do you see in my dreams?"
- "Am I dreaming about the same things?"
- "What do my dreams say about me?"
- "Analyze my dreams"

Don't use when:
- User is logging a new dream → use log_dream
- User has no dreams recorded → tell them to start logging

Returns analysis based on actual dream data in context. Focus on emotions, recurring themes, and temporal patterns. Be thoughtful, not mystical.`,
        input_schema: {
          type: 'object',
          properties: {
            period_days: { type: 'number', description: 'How many days back to analyze. Default: 30' },
          },
          required: [],
        },
      },
      // === REMINDERS MANAGEMENT TOOLS ===
      {
        name: 'list_reminders',
        description: `List the user's active reminders.

Use when:
- "What reminders do I have?" or "¿Qué recordatorios tengo?"
- "Show my reminders" or "List my alarms"

Don't use when:
- User wants to create a reminder → use set_reminder
- User wants to cancel one → use cancel_reminder

Returns formatted list from context. No DB call needed — use the reminders already in context.`,
        input_schema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'cancel_reminder',
        description: `Cancel/deactivate an active reminder.

Use when:
- "Cancel the reminder about X"
- "Remove my X alarm"
- "I don't need the X reminder anymore"

Don't use when:
- User wants to edit the time → use edit_reminder
- Ambiguous which reminder → ask for clarification`,
        input_schema: {
          type: 'object',
          properties: {
            reminder_id: { type: 'string', description: 'ID from context [R#ID]. Preferred.' },
            reminder_title: { type: 'string', description: 'Partial title match as fallback.' },
          },
          required: [],
        },
      },
      {
        name: 'edit_reminder',
        description: `Change the time or frequency of an existing reminder.

Use when:
- "Change my X reminder to 5pm"
- "Make the X reminder daily instead"
- "Push my X reminder to tomorrow"

Don't use when:
- User wants to cancel → use cancel_reminder
- User wants a new reminder → use set_reminder`,
        input_schema: {
          type: 'object',
          properties: {
            reminder_id: { type: 'string', description: 'ID from context [R#ID]. Preferred.' },
            reminder_title: { type: 'string', description: 'Partial title match as fallback.' },
            new_time: { type: 'string', description: 'New trigger time. ISO 8601 or relative ("5pm", "tomorrow 9am").' },
            recurring: { type: 'boolean', description: 'Change to recurring or one-time.' },
            interval_hours: { type: 'number', description: 'New interval in hours if making recurring.' },
          },
          required: [],
        },
      },
    ];

    // Call Sonnet
    const sonnetSystemPrompt = isEnglish 
      ? `You are Kai, the panda assistant of Hansei. You are a personal productivity coach.

## Your personality
- Direct, warm but not cheesy
- Use subtle humor when appropriate
- Speak in English, casual tone
- SHORT responses (2-4 lines max) — appears in a small chat bubble
- Never use emojis
- NEVER say "ready to chat about anything" or generic phrases — you can ONLY help with tasks, ideas, dreams, and reminders
- For greetings, reference their actual data: "You've got 3 tasks pending" or "Your streak is 5 days strong"
- If something isn't about user productivity, politely decline: "That's not my thing. Want to check your tasks?"

## Response format
- USE LINE BREAKS between distinct ideas (each point on a new line)
- When listing tasks, put each on its own line
- Use **bold** for task names or keywords
- DON'T use dash lists (-) or numbered lists (1. 2. 3.)
- DON'T use markdown headers (#)
- Max 4 lines. If you need more, prioritize and leave less important stuff out

## What you can do
- Prioritize user's tasks based on context
- Suggest what to do now — use their stats, streak, and patterns
- Create, complete, or delete tasks
- Set reminders
- Give personalized activity summaries ("you've been on a 5-day streak!")
- Push user to action (without being annoying)
- Detect stale tasks and suggest what to do with them
- Reference their ideas and suggest turning them into tasks
- Notice dream patterns and emotions (if relevant to their mood)
- Celebrate streaks and progress — this is a companion, not just a tool
- Use completion rate and peak hours for smart suggestions ("you're most productive at 10am")

## What you CAN'T do
- Answer general questions (weather, news, jokes)
- Topics outside personal productivity
- Make up data you don't have

## Context intelligence
You have access to the user's full context: tasks, ideas, dreams, reminders, stats, and patterns.
You also have CONVERSATION MEMORY — you remember previous chats with this user.
USE this context proactively:
- Reference things the user told you before ("last time you mentioned X, how did that go?")
- If they have a streak going, mention it when encouraging them
- If an idea has been sitting for days, suggest turning it into a task
- If they ask "how am I doing?", give a data-driven answer with their stats
- If they completed a lot today, celebrate it
- If their completion rate is low, gently nudge
- Reference specific task/idea names — it shows you know them
- NEVER say "I don't have memory" or "I can't remember" — you DO remember`
      : `Eres Kai, el panda asistente de Hansei. Eres un coach de productividad personal.

## Tu personalidad
- Directo, cálido pero no empalagoso
- Usas humor sutil cuando viene al caso
- Hablas en español, informal (tuteo)
- Respuestas CORTAS (2-4 líneas máximo) — aparece en una burbuja de chat pequeña
- Nunca uses emojis
- NUNCA digas "listo para charlar" o frases genéricas — SOLO puedes ayudar con tareas, ideas, sueños y recordatorios
- Para saludos, referencia datos reales del usuario: "Tienes 3 pendientes" o "Llevas 5 días de racha"
- Si algo no es sobre productividad del usuario, rechaza amablemente: "Eso no es lo mío. ¿Vemos tus tareas?"

## Formato de respuesta
- USA SALTOS DE LÍNEA entre ideas distintas (cada punto en línea nueva)
- Cuando listes tareas, pon cada una en su propia línea
- Usa **negrita** para nombres de tareas o palabras clave
- NO uses listas con guiones (-) ni numeradas (1. 2. 3.)
- NO uses markdown de headers (#)
- Máximo 4 líneas. Si necesitas más, prioriza y deja lo menos importante fuera

## Lo que puedes hacer
- Priorizar tareas del usuario basándote en contexto
- Sugerir qué hacer ahora — usa sus stats, racha y patrones
- Crear, completar o eliminar tareas
- Poner recordatorios
- Dar resúmenes personalizados ("llevas una racha de 5 días!")
- Empujar al usuario a la acción (sin ser pesado)
- Detectar tareas estancadas y sugerir qué hacer con ellas
- Mencionar sus ideas y sugerir convertirlas en tareas
- Notar patrones en sus sueños y emociones (si es relevante)
- Celebrar rachas y progreso — eres un compañero, no solo una herramienta
- Usar tasa de completado y horas pico para sugerencias inteligentes ("rindes más a las 10am")

## Lo que NO puedes hacer
- Responder preguntas generales (clima, noticias, chistes)
- Temas fuera de productividad personal
- Inventar datos que no tienes

## Inteligencia contextual
Tienes acceso al contexto completo del usuario: tareas, ideas, sueños, recordatorios, stats y patrones.
También tienes MEMORIA DE CONVERSACIONES — recuerdas chats anteriores con este usuario.
USA este contexto proactivamente:
- Referencia cosas que el usuario te dijo antes ("la última vez mencionaste X, ¿cómo fue?")
- Si tiene una racha activa, menciónala al motivarle
- Si una idea lleva días sin moverse, sugiere convertirla en tarea
- Si pregunta "¿cómo voy?", da una respuesta con datos reales
- Si completó mucho hoy, celébralo
- Si su tasa de completado es baja, empuja con tacto
- Menciona nombres específicos de tareas/ideas — demuestra que le conoces
- NUNCA digas "no tengo memoria" o "no puedo recordar" — SÍ recuerdas

## Reglas
- Si el usuario pregunta "¿qué debería hacer?" → mira tareas de hoy y prioriza
- Si no hay tareas → sugiere un brain dump
- Si hay tareas estancadas → mencionarlas con tacto
- Siempre sé accionable: no digas "podrías hacer X", di "haz X"`;

    // Append rules for English too
    const rulesBlock = isEnglish ? `
## Rules
- If user asks "what should I do?" → look at today's tasks and prioritize
- If no tasks → suggest a brain dump
- If there are stale tasks → mention them tactfully
- Always be actionable: don't say "you could do X", say "do X"` : `
## Reglas
- Si el usuario pregunta "¿qué debería hacer?" → mira tareas de hoy y prioriza
- Si no hay tareas → sugiere un brain dump
- Si hay tareas estancadas → mencionarlas con tacto
- Siempre sé accionable: no digas "podrías hacer X", di "haz X"`;

    const fullSystemPrompt = `${sonnetSystemPrompt}
${rulesBlock}

${contextBlock}`;

    // Build multi-turn message history from recent conversations
    // Use last 15 conversations as actual user/assistant turns for natural continuity
    const messageHistory: Array<{ role: string; content: string }> = [];
    for (const conv of conversations.slice(-15)) {
      messageHistory.push({ role: 'user', content: conv.user_message });
      messageHistory.push({ role: 'assistant', content: conv.kai_response });
    }
    // Add current message
    messageHistory.push({ role: 'user', content: text });

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 400,
        system: fullSystemPrompt,
        tools,
        messages: messageHistory,
      }),
    });
    
    if (!response.ok) {
      const err = await response.text();
      console.error('Anthropic error:', err);
      return NextResponse.json({ error: 'AI response failed' }, { status: 500 });
    }
    
    const data = await response.json();
    
    // Process response — extract text and tool calls
    let kaiMessage = '';
    const actions: Array<{ tool: string; input: Record<string, unknown>; result?: string }> = [];
    
    for (const block of data.content) {
      if (block.type === 'text') {
        kaiMessage += block.text;
      } else if (block.type === 'tool_use') {
        // Execute tool
        const toolResult = await executeTool(block.name, block.input, userId, supabase);
        actions.push({ tool: block.name, input: block.input, result: toolResult });
      }
    }
    
    // If there were tool uses but no text, do a follow-up call
    if (!kaiMessage && actions.length > 0) {
      kaiMessage = actions.map(a => a.result).join('. ');
    }
    
    // If Sonnet wants to use tools and also respond, handle the tool_use stop_reason
    if (data.stop_reason === 'tool_use') {
      // Build tool results from already-executed actions (don't re-execute!)
      const toolResults = [];
      let actionIdx = 0;
      for (const block of data.content) {
        if (block.type === 'tool_use') {
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: actions[actionIdx]?.result || 'Done',
          });
          actionIdx++;
        }
      }
      
      // Follow-up call with tool results
      const followUp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY!,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 200,
          system: fullSystemPrompt,
          tools,
          messages: [
            { role: 'user', content: text },
            { role: 'assistant', content: data.content },
            { role: 'user', content: toolResults },
          ],
        }),
      });
      
      if (followUp.ok) {
        const followUpData = await followUp.json();
        kaiMessage = '';
        for (const block of followUpData.content) {
          if (block.type === 'text') kaiMessage += block.text;
        }
      }
    }
    
    // Determine Kai's pose based on response
    const pose = determinePose(kaiMessage, actions);
    
    // Save conversation (fire-and-forget)
    const toolsSummary = actions.map(a => ({ tool: a.tool, input: a.input }));
    saveConversation(serviceSupabase, userId, text, kaiMessage, toolsSummary, 'sonnet', locale).catch(() => {});
    
    return NextResponse.json({
      type: 'conversation',
      message: kaiMessage,
      pose,
      actions: toolsSummary,
    });
    
  } catch (error) {
    console.error('Kai chat error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

async function executeTool(
  name: string,
  input: Record<string, unknown>,
  userId: string,
  supabase: ReturnType<typeof createClient>
): Promise<string> {
  switch (name) {
    case 'create_task': {
      const title = input.title as string;
      const priority = (input.priority as string) || 'medium';
      const dueToday = input.due_today as boolean;
      const dueDate = dueToday ? new Date().toISOString().split('T')[0] : null;
      
      const { error } = await supabase.from('tasks').insert({
        user_id: userId,
        title,
        type: 'task',
        priority,
        completed: false,
        due_date: dueDate,
      });
      
      if (error) return `Error creando tarea: ${error.message}`;
      
      // Log activity
      await supabase.from('activity_log').insert({
        user_id: userId,
        action: 'task_created',
        entity_type: 'task',
        metadata: { title, source: 'kai_chat' },
      });
      
      return `Tarea "${title}" creada${dueToday ? ' para hoy' : ''}`;
    }
    
    case 'complete_task': {
      const taskId = input.task_id as string | undefined;
      const searchTitle = input.task_title as string | undefined;
      
      // Find matching task — prefer ID, fallback to title search
      let matches;
      if (taskId) {
        const res = await supabase
          .from('tasks')
          .select('id, title')
          .eq('id', taskId)
          .eq('user_id', userId)
          .eq('completed', false)
          .limit(1);
        matches = res.data;
      } else if (searchTitle) {
        const res = await supabase
          .from('tasks')
          .select('id, title')
          .eq('user_id', userId)
          .eq('type', 'task')
          .eq('completed', false)
          .ilike('title', `%${searchTitle}%`)
          .order('created_at', { ascending: false })
          .limit(1);
        matches = res.data;
      }
      
      if (!matches?.length) return `No encontré esa tarea pendiente`;
      
      const task = matches[0];
      await supabase.from('tasks').update({ 
        completed: true, 
        completed_at: new Date().toISOString() 
      }).eq('id', task.id);
      
      await supabase.from('activity_log').insert({
        user_id: userId,
        action: 'task_completed',
        entity_type: 'task',
        entity_id: task.id,
        metadata: { source: 'kai_chat' },
      });
      
      return `Tarea "${task.title}" completada`;
    }
    
    case 'delete_task': {
      const taskId = input.task_id as string | undefined;
      const searchTitle = input.task_title as string | undefined;
      
      // Find matching task — prefer ID, fallback to title search
      let matches;
      if (taskId) {
        const res = await supabase
          .from('tasks')
          .select('id, title')
          .eq('id', taskId)
          .eq('user_id', userId)
          .limit(1);
        matches = res.data;
      } else if (searchTitle) {
        const res = await supabase
          .from('tasks')
          .select('id, title')
          .eq('user_id', userId)
          .eq('type', 'task')
          .ilike('title', `%${searchTitle}%`)
          .limit(1);
        matches = res.data;
      }
      
      if (!matches?.length) return `No encontré esa tarea`;
      
      const task = matches[0];
      await supabase.from('tasks').delete().eq('id', task.id);
      
      await supabase.from('activity_log').insert({
        user_id: userId,
        action: 'task_deleted',
        entity_type: 'task',
        entity_id: task.id,
        metadata: { source: 'kai_chat' },
      });
      
      return `Tarea "${task.title}" eliminada`;
    }
    
    case 'set_reminder': {
      const title = input.title as string;
      const delayMinutes = input.delay_minutes as number | undefined;
      const triggerAtStr = input.trigger_at as string | undefined;
      const recurring = input.recurring as boolean || false;
      const intervalHours = input.interval_hours as number | undefined;

      let triggerAt: Date;
      if (delayMinutes) {
        triggerAt = new Date(Date.now() + delayMinutes * 60 * 1000);
      } else if (triggerAtStr) {
        triggerAt = new Date(triggerAtStr);
      } else {
        // Default: 1 hour from now
        triggerAt = new Date(Date.now() + 60 * 60 * 1000);
      }

      const intervalMs = recurring && intervalHours ? intervalHours * 60 * 60 * 1000 : null;

      // Use service role to bypass RLS for insert
      const serviceSupabase = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || '');

      const { error } = await serviceSupabase.from('reminders').insert({
        user_id: userId,
        title,
        schedule_type: recurring ? 'recurring' : 'once',
        trigger_at: triggerAt.toISOString(),
        next_trigger: triggerAt.toISOString(),
        interval_ms: intervalMs,
        active: true,
        source: 'kai',
      });

      if (error) return `Error setting reminder: ${error.message}`;

      // userTimezone already fetched at route level — use it directly
      const timeStr = triggerAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: userTimezone });
      return `Reminder "${title}" set for ${timeStr}${recurring ? ` (repeating every ${intervalHours}h)` : ''}`;
    }

    // === IDEAS ===
    case 'create_idea': {
      const title = input.title as string;
      const voiceContext = input.voice_context as string | undefined;

      const { error } = await supabase.from('tasks').insert({
        user_id: userId,
        title,
        voice_context: voiceContext || null,
        type: 'idea',
        category: 'personal',
        priority: 'medium',
        completed: false,
        position_x: 150 + Math.random() * 400,
        position_y: 150 + Math.random() * 200,
      });

      if (error) return `Error creating idea: ${error.message}`;

      await supabase.from('activity_log').insert({
        user_id: userId,
        action: 'idea_created',
        entity_type: 'idea',
        metadata: { title, source: 'kai_chat' },
      });

      return `Idea "${title}" saved`;
    }

    case 'convert_idea_to_task': {
      const ideaId = input.idea_id as string | undefined;
      const ideaTitle = input.idea_title as string | undefined;
      const taskTitle = input.task_title as string | undefined;
      const dueToday = input.due_today as boolean;

      // Find the idea
      let matches;
      if (ideaId) {
        const res = await supabase
          .from('tasks')
          .select('id, title')
          .eq('id', ideaId)
          .eq('user_id', userId)
          .eq('type', 'idea')
          .limit(1);
        matches = res.data;
      } else if (ideaTitle) {
        const res = await supabase
          .from('tasks')
          .select('id, title')
          .eq('user_id', userId)
          .eq('type', 'idea')
          .ilike('title', `%${ideaTitle}%`)
          .order('created_at', { ascending: false })
          .limit(1);
        matches = res.data;
      }

      if (!matches?.length) return `Idea not found`;

      const idea = matches[0];
      const finalTitle = taskTitle || idea.title;
      const dueDate = dueToday ? new Date().toISOString().split('T')[0] : null;

      const { error } = await supabase.from('tasks').insert({
        user_id: userId,
        title: finalTitle,
        type: 'task',
        priority: 'medium',
        completed: false,
        due_date: dueDate,
        parent_idea_id: idea.id,
      });

      if (error) return `Error converting idea: ${error.message}`;

      await supabase.from('activity_log').insert({
        user_id: userId,
        action: 'idea_converted',
        entity_type: 'idea',
        entity_id: idea.id,
        metadata: { title: finalTitle, source: 'kai_chat' },
      });

      return `Idea "${idea.title}" converted to task "${finalTitle}"${dueToday ? ' (today)' : ''}`;
    }

    case 'delete_idea': {
      const ideaId = input.idea_id as string | undefined;
      const ideaTitle = input.idea_title as string | undefined;

      let matches;
      if (ideaId) {
        const res = await supabase.from('tasks').select('id, title').eq('id', ideaId).eq('user_id', userId).eq('type', 'idea').limit(1);
        matches = res.data;
      } else if (ideaTitle) {
        const res = await supabase.from('tasks').select('id, title').eq('user_id', userId).eq('type', 'idea').ilike('title', `%${ideaTitle}%`).limit(1);
        matches = res.data;
      }

      if (!matches?.length) return `Idea not found`;

      const idea = matches[0];
      // Delete children first, then the idea
      await supabase.from('tasks').delete().eq('parent_idea_id', idea.id);
      const { error } = await supabase.from('tasks').delete().eq('id', idea.id);
      
      if (error) {
        // Fallback: mark as completed
        await supabase.from('tasks').update({ completed: true, completed_at: new Date().toISOString() }).eq('id', idea.id);
      }

      await supabase.from('activity_log').insert({
        user_id: userId,
        action: 'idea_deleted',
        entity_type: 'idea',
        entity_id: idea.id,
        metadata: { source: 'kai_chat' },
      });

      return `Idea "${idea.title}" deleted`;
    }

    // === DREAMS ===
    case 'log_dream': {
      const title = input.title as string;
      const description = input.description as string;
      const emotion = input.emotion as string | undefined;

      const { data: dreamData, error } = await supabase.from('tasks').insert({
        user_id: userId,
        title,
        voice_context: description,
        type: 'dream',
        category: 'dreams',
        priority: 'medium',
        completed: false,
        ...(emotion ? { emotion } : {}),
      }).select().single();

      if (error) return `Error logging dream: ${error.message}`;

      await supabase.from('activity_log').insert({
        user_id: userId,
        action: 'dream_logged',
        entity_type: 'dream',
        metadata: { title, emotion, source: 'kai_chat' },
      });

      return `Dream "${title}" logged${emotion ? ` (${emotion})` : ''}`;
    }

    case 'analyze_dreams': {
      // This tool doesn't need DB — Kai uses the dream context already in the system prompt
      // Just return a signal that Kai should analyze based on context
      return `ANALYZE_DREAMS_FROM_CONTEXT`;
    }

    // === REMINDERS MANAGEMENT ===
    case 'list_reminders': {
      // Kai already has reminders in context — just signal to format them nicely
      return `LIST_REMINDERS_FROM_CONTEXT`;
    }

    case 'cancel_reminder': {
      const reminderId = input.reminder_id as string | undefined;
      const reminderTitle = input.reminder_title as string | undefined;

      const svc = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || '');
      
      let matches;
      if (reminderId) {
        const res = await svc.from('reminders').select('id, title').eq('id', reminderId).eq('user_id', userId).eq('active', true).limit(1);
        matches = res.data;
      } else if (reminderTitle) {
        const res = await svc.from('reminders').select('id, title').eq('user_id', userId).eq('active', true).ilike('title', `%${reminderTitle}%`).limit(1);
        matches = res.data;
      }

      if (!matches?.length) return `Reminder not found`;

      const reminder = matches[0];
      await svc.from('reminders').update({ active: false }).eq('id', reminder.id);

      return `Reminder "${reminder.title}" cancelled`;
    }

    case 'edit_reminder': {
      const reminderId = input.reminder_id as string | undefined;
      const reminderTitle = input.reminder_title as string | undefined;
      const newTime = input.new_time as string | undefined;
      const recurring = input.recurring as boolean | undefined;
      const intervalHours = input.interval_hours as number | undefined;

      const svc = createClient(SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || '');

      let matches;
      if (reminderId) {
        const res = await svc.from('reminders').select('id, title').eq('id', reminderId).eq('user_id', userId).eq('active', true).limit(1);
        matches = res.data;
      } else if (reminderTitle) {
        const res = await svc.from('reminders').select('id, title').eq('user_id', userId).eq('active', true).ilike('title', `%${reminderTitle}%`).limit(1);
        matches = res.data;
      }

      if (!matches?.length) return `Reminder not found`;

      const reminder = matches[0];
      const updates: Record<string, unknown> = {};

      if (newTime) {
        const newTrigger = new Date(newTime);
        if (!isNaN(newTrigger.getTime())) {
          updates.trigger_at = newTrigger.toISOString();
          updates.next_trigger = newTrigger.toISOString();
        }
      }
      if (recurring !== undefined) {
        updates.schedule_type = recurring ? 'recurring' : 'once';
      }
      if (intervalHours) {
        updates.interval_ms = intervalHours * 60 * 60 * 1000;
      }

      if (Object.keys(updates).length === 0) return `Nothing to update`;

      await svc.from('reminders').update(updates).eq('id', reminder.id);

      return `Reminder "${reminder.title}" updated`;
    }

    default:
      return 'Acción no reconocida';
  }
}

function determinePose(message: string, actions: Array<{ tool: string }>): string {
  const lower = message.toLowerCase();
  
  // Action taken → pointing (confident)
  if (actions.length > 0) return '/panda/new-pointing.png';
  
  // Encouraging / celebrating — check FIRST (positive tone overrides everything)
  if (lower.includes('puedes') || lower.includes('bien') || lower.includes('genial') || 
      lower.includes('racha') || lower.includes('completaste') || lower.includes('excelente') ||
      lower.includes('avance') || lower.includes('dale') || lower.includes('vamos') ||
      lower.includes('streak') || lower.includes('great') || lower.includes('awesome') ||
      lower.includes('nice') || lower.includes('completed') || lower.includes('progress') ||
      lower.includes('keep it up') || lower.includes('on fire'))
    return '/panda/new-celebrate.png';
  
  // Out of scope
  if (lower.includes('no es lo mío') || lower.includes('no puedo'))
    return '/panda/new-shrug.png';
  
  // Thinking / suggesting
  if (lower.includes('sugiero') || lower.includes('podrías') || lower.includes('prueba') || 
      lower.includes('quizás') || lower.includes('prioriza') || lower.includes('empieza'))
    return '/panda/new-thinking.png';
  
  // Nudging — only when tone is clearly negative (stale, forgotten)
  if (lower.includes('estancad') || lower.includes('olvidad') || lower.includes('sin mover'))
    return '/panda/new-neutral.png';
  
  // Default — friendly wave
  return '/panda/new-wave.png';
}

// Save conversation to DB for memory continuity
async function saveConversation(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  userMessage: string,
  kaiResponse: string,
  toolsUsed: Array<{ tool: string; input: unknown }>,
  model: string,
  locale: string,
) {
  try {
    await supabase.from('kai_conversations').insert({
      user_id: userId,
      user_message: userMessage,
      kai_response: kaiResponse,
      tools_used: toolsUsed,
      model,
      locale,
    });
    
    // Cleanup: keep only last 100 conversations per user
    const { data: oldConvos } = await supabase
      .from('kai_conversations')
      .select('id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(100, 200);
    
    if (oldConvos && oldConvos.length > 0) {
      const idsToDelete = oldConvos.map(c => c.id);
      await supabase
        .from('kai_conversations')
        .delete()
        .in('id', idsToDelete);
    }
  } catch (err) {
    console.error('Failed to save conversation:', err);
  }
}

// Human-readable relative time
function getTimeAgo(date: Date, isEnglish: boolean): string {
  const diffMs = Date.now() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMin < 1) return isEnglish ? 'just now' : 'ahora';
  if (diffMin < 60) return isEnglish ? `${diffMin}m ago` : `hace ${diffMin}m`;
  if (diffHours < 24) return isEnglish ? `${diffHours}h ago` : `hace ${diffHours}h`;
  if (diffDays === 1) return isEnglish ? 'yesterday' : 'ayer';
  if (diffDays < 7) return isEnglish ? `${diffDays}d ago` : `hace ${diffDays}d`;
  return date.toLocaleDateString(isEnglish ? 'en-US' : 'es-ES', { month: 'short', day: 'numeric' });
}
