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
  if (/\b(crea|añade|pon|agrega|completa|termin[eé]|hice|borra|elimina|quita|remind|alarm|avisa)\b/i.test(lower)) return true;
  // Spanish accented words — \b doesn't work with accented chars in JS
  if (/(recu[eé]rd|recordar)/i.test(lower)) return true;
  
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
  
  // "Se me ocurrió..." / "Una idea:" → idea, brain dump
  if (lower.startsWith('se me ocurri') || lower.startsWith('una idea') || lower.startsWith('idea:')) return false;
  
  // "Soñé que..." → dream
  if (lower.startsWith('soñé') || lower.startsWith('soñe') || lower.startsWith('anoche soñ')) return false;
  
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
    
    // Parallel queries for context
    const [tasksRes, ideasRes, activityRes] = await Promise.all([
      supabase
        .from('tasks')
        .select('id, title, completed, type, priority, created_at, due_date, completed_at')
        .eq('user_id', userId)
        .eq('type', 'task')
        .is('parent_idea_id', null)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase
        .from('tasks')
        .select('id, title, type, created_at')
        .eq('user_id', userId)
        .eq('type', 'idea')
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('activity_log')
        .select('action, entity_type, metadata, created_at')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(30),
    ]);
    
    const tasks = tasksRes.data || [];
    const ideas = ideasRes.data || [];
    const activity = activityRes.data || [];
    
    // Build context
    const pendingTasks = tasks.filter(t => !t.completed);
    const completedTasks = tasks.filter(t => t.completed);
    const today = new Date().toISOString().split('T')[0];
    const todayTasks = pendingTasks.filter(t => t.due_date === today);
    
    // Stale tasks (pending > 3 days)
    const staleTasks = pendingTasks.filter(t => {
      const age = (Date.now() - new Date(t.created_at).getTime()) / (1000 * 60 * 60 * 24);
      return age > 3;
    });
    
    // Activity summary
    const last7Days = activity.filter(a => {
      const age = (Date.now() - new Date(a.created_at).getTime()) / (1000 * 60 * 60 * 24);
      return age <= 7;
    });
    const completedThisWeek = last7Days.filter(a => a.action === 'task_completed').length;
    const brainDumpsThisWeek = last7Days.filter(a => a.action === 'brain_dump').length;
    
    const contextBlock = `
## Tu contexto actual

### Tareas pendientes (${pendingTasks.length})
${pendingTasks.slice(0, 10).map(t => `- [#${t.id}] "${t.title}" ${t.due_date === today ? '(HOY)' : ''} ${staleTasks.find(s => s.id === t.id) ? `(${Math.floor((Date.now() - new Date(t.created_at).getTime()) / 86400000)} días)` : ''} [prioridad: ${t.priority || 'normal'}]`).join('\n')}
${pendingTasks.length > 10 ? `...y ${pendingTasks.length - 10} más` : ''}

### Tareas completadas recientes (${completedTasks.length})
${completedTasks.slice(0, 5).map(t => `- [#${t.id}] "${t.title}"`).join('\n')}

### Ideas activas (${ideas.length})
${ideas.slice(0, 5).map(i => `- [#${i.id}] "${i.title}"`).join('\n')}

### Actividad última semana
- Tareas completadas: ${completedThisWeek}
- Brain dumps: ${brainDumpsThisWeek}

### Tareas estancadas (3+ días sin mover)
${staleTasks.length > 0 ? staleTasks.map(t => `- [#${t.id}] "${t.title}" (${Math.floor((Date.now() - new Date(t.created_at).getTime()) / 86400000)} días)`).join('\n') : 'Ninguna'}

### Foco de hoy
${todayTasks.length > 0 ? todayTasks.map(t => `- [#${t.id}] "${t.title}"`).join('\n') : 'Sin tareas para hoy'}
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
If asked about something outside productivity: "That's not my thing. Shall we talk about your tasks?"`
          : `Eres Kai, el panda asistente de Hansei. Responde en español, informal (tuteo).
Máximo 2-3 líneas. Sin emojis. Directo y cálido.
Usa saltos de línea entre ideas. Usa **negrita** para tareas o palabras clave.
No uses listas con guiones ni números. No uses headers.
Si preguntan algo fuera de productividad: "Eso no es lo mío. ¿Hablamos de tus tareas?"`;
        const geminiPrompt = `${systemPrompt}

${contextBlock}

${isEnglish ? 'User' : 'Usuario'}: ${text}`;
        
        const geminiRes = await geminiModel.generateContent(geminiPrompt);
        const geminiText = geminiRes.response.text();
        const pose = determinePose(geminiText, []);
        
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
            trigger_at: { type: 'string', description: 'ISO 8601 datetime to trigger. Use this OR delay_minutes.' },
            recurring: { type: 'boolean', description: 'Whether this repeats. Default false.' },
            interval_hours: { type: 'number', description: 'Hours between recurrences. Only if recurring=true.' },
          },
          required: ['title'],
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
- If something isn't about user productivity, politely decline: "That's not my thing. Shall we talk about your tasks?"

## Response format
- USE LINE BREAKS between distinct ideas (each point on a new line)
- When listing tasks, put each on its own line
- Use **bold** for task names or keywords
- DON'T use dash lists (-) or numbered lists (1. 2. 3.)
- DON'T use markdown headers (#)
- Max 4 lines. If you need more, prioritize and leave less important stuff out

## What you can do
- Prioritize user's tasks
- Suggest what to do now
- Create, complete, or delete tasks
- Give activity summaries
- Push user to action (without being annoying)
- Detect stale tasks and suggest what to do with them

## What you CAN'T do
- Answer general questions (weather, news, jokes)
- Topics outside personal productivity
- Make up data you don't have`
      : `Eres Kai, el panda asistente de Hansei. Eres un coach de productividad personal.

## Tu personalidad
- Directo, cálido pero no empalagoso
- Usas humor sutil cuando viene al caso
- Hablas en español, informal (tuteo)
- Respuestas CORTAS (2-4 líneas máximo) — aparece en una burbuja de chat pequeña
- Nunca uses emojis
- Si algo no es sobre productividad del usuario, rechaza amablemente: "Eso no es lo mío. ¿Hablamos de tus tareas?"

## Formato de respuesta
- USA SALTOS DE LÍNEA entre ideas distintas (cada punto en línea nueva)
- Cuando listes tareas, pon cada una en su propia línea
- Usa **negrita** para nombres de tareas o palabras clave
- NO uses listas con guiones (-) ni numeradas (1. 2. 3.)
- NO uses markdown de headers (#)
- Máximo 4 líneas. Si necesitas más, prioriza y deja lo menos importante fuera

## Lo que puedes hacer
- Priorizar tareas del usuario
- Sugerir qué hacer ahora
- Crear, completar o eliminar tareas
- Dar resúmenes de actividad
- Empujar al usuario a la acción (sin ser pesado)
- Detectar tareas estancadas y sugerir qué hacer con ellas

## Lo que NO puedes hacer
- Responder preguntas generales (clima, noticias, chistes)
- Temas fuera de productividad personal
- Inventar datos que no tienes

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

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 300,
        system: fullSystemPrompt,
        tools,
        messages: [{ role: 'user', content: text }],
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
      // Build tool results and do follow-up
      const toolResults = [];
      for (const block of data.content) {
        if (block.type === 'tool_use') {
          const result = await executeTool(block.name, block.input, userId, supabase);
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: result,
          });
          actions.push({ tool: block.name, input: block.input, result });
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
          model: 'claude-sonnet-4-20250514',
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
    
    return NextResponse.json({
      type: 'conversation',
      message: kaiMessage,
      pose,
      actions: actions.map(a => ({ tool: a.tool, input: a.input })),
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

      const timeStr = triggerAt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
      return `Reminder "${title}" set for ${timeStr}${recurring ? ` (repeating every ${intervalHours}h)` : ''}`;
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
      lower.includes('avance') || lower.includes('dale') || lower.includes('vamos'))
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
