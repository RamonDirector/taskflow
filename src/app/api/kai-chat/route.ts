import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY!;

// Intent detection: is this a conversation with Kai or a brain dump?
function isConversation(text: string): boolean {
  const lower = text.toLowerCase().trim();
  
  // Questions
  if (lower.includes('?') || lower.startsWith('¿')) return true;
  
  // Direct Kai commands
  const kaiTriggers = [
    'kai', 'qué debería', 'que deberia', 'qué hago', 'que hago',
    'organiza', 'prioriza', 'cómo voy', 'como voy', 'resumen',
    'no sé por dónde', 'no se por donde', 'ayuda', 'ayúdame',
    'crea tarea', 'crea una tarea', 'nueva tarea',
    'qué tengo', 'que tengo', 'cuántas tareas', 'cuantas tareas',
    'tareas pendientes', 'tareas tengo', 'pendientes',
    'qué opinas', 'que opinas', 'qué piensas', 'que piensas',
    'borra', 'elimina', 'completa', 'mis tareas', 'mis ideas',
  ];
  
  for (const trigger of kaiTriggers) {
    if (lower.includes(trigger)) return true;
  }
  
  // Short inputs that look conversational (< 5 words, not a list)
  const words = lower.split(/\s+/);
  if (words.length <= 4 && !lower.includes(',') && !lower.includes('\n')) {
    // Could be conversational, but also could be a single task
    // Only treat as conversation if it has conversational markers
    const conversationalWords = ['hola', 'oye', 'hey', 'dime', 'gracias', 'vale', 'ok', 'bien', 'mal', 'sí', 'no'];
    if (conversationalWords.some(w => lower.includes(w))) return true;
  }
  
  return false;
}

export async function POST(request: NextRequest) {
  try {
    const { text, userId } = await request.json();
    
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
    
    // Fetch user context from Supabase
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    
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
${pendingTasks.slice(0, 10).map(t => `- "${t.title}" ${t.due_date === today ? '(HOY)' : ''} ${staleTasks.find(s => s.id === t.id) ? `(${Math.floor((Date.now() - new Date(t.created_at).getTime()) / 86400000)} días)` : ''} [prioridad: ${t.priority || 'normal'}]`).join('\n')}
${pendingTasks.length > 10 ? `...y ${pendingTasks.length - 10} más` : ''}

### Tareas completadas recientes (${completedTasks.length})
${completedTasks.slice(0, 5).map(t => `- "${t.title}"`).join('\n')}

### Ideas activas (${ideas.length})
${ideas.slice(0, 5).map(i => `- "${i.title}"`).join('\n')}

### Actividad última semana
- Tareas completadas: ${completedThisWeek}
- Brain dumps: ${brainDumpsThisWeek}

### Tareas estancadas (3+ días sin mover)
${staleTasks.length > 0 ? staleTasks.map(t => `- "${t.title}" (${Math.floor((Date.now() - new Date(t.created_at).getTime()) / 86400000)} días)`).join('\n') : 'Ninguna'}

### Foco de hoy
${todayTasks.length > 0 ? todayTasks.map(t => `- "${t.title}"`).join('\n') : 'Sin tareas para hoy'}
`.trim();

    // Build tools for Kai
    const tools = [
      {
        name: 'create_task',
        description: 'Crear una nueva tarea para el usuario. Usa cuando el usuario pide crear una tarea o cuando sugieres una acción concreta.',
        input_schema: {
          type: 'object',
          properties: {
            title: { type: 'string', description: 'Título de la tarea' },
            priority: { type: 'string', enum: ['high', 'medium', 'low'], description: 'Prioridad' },
            due_today: { type: 'boolean', description: 'Si la tarea es para hoy' },
          },
          required: ['title'],
        },
      },
      {
        name: 'complete_task',
        description: 'Completar una tarea existente. Usa cuando el usuario dice que ya hizo algo.',
        input_schema: {
          type: 'object',
          properties: {
            task_title: { type: 'string', description: 'Título (o parte) de la tarea a completar' },
          },
          required: ['task_title'],
        },
      },
      {
        name: 'delete_task',
        description: 'Eliminar una tarea. Usa cuando el usuario quiere quitar algo de su lista.',
        input_schema: {
          type: 'object',
          properties: {
            task_title: { type: 'string', description: 'Título (o parte) de la tarea a eliminar' },
          },
          required: ['task_title'],
        },
      },
    ];

    // Call Sonnet
    const systemPrompt = `Eres Kai, el panda asistente de Hansei. Eres un coach de productividad personal.

## Tu personalidad
- Directo, cálido pero no empalagoso
- Usas humor sutil cuando viene al caso
- Hablas en español, informal (tuteo)
- Respuestas CORTAS (1-3 frases máximo) — esto aparece en una burbuja pequeña
- Nunca uses emojis
- Si algo no es sobre productividad del usuario, rechaza amablemente: "Eso no es lo mío. ¿Hablamos de tus tareas?"

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
- Siempre sé accionable: no digas "podrías hacer X", di "haz X"

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
        system: systemPrompt,
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
          system: systemPrompt,
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
      const searchTitle = input.task_title as string;
      
      // Find matching task
      const { data: matches } = await supabase
        .from('tasks')
        .select('id, title')
        .eq('user_id', userId)
        .eq('type', 'task')
        .eq('completed', false)
        .ilike('title', `%${searchTitle}%`)
        .limit(1);
      
      if (!matches?.length) return `No encontré tarea con "${searchTitle}"`;
      
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
      const searchTitle = input.task_title as string;
      
      const { data: matches } = await supabase
        .from('tasks')
        .select('id, title')
        .eq('user_id', userId)
        .eq('type', 'task')
        .ilike('title', `%${searchTitle}%`)
        .limit(1);
      
      if (!matches?.length) return `No encontré tarea con "${searchTitle}"`;
      
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
    
    default:
      return 'Acción no reconocida';
  }
}

function determinePose(message: string, actions: Array<{ tool: string }>): string {
  const lower = message.toLowerCase();
  
  // Action taken → pointing (confident)
  if (actions.length > 0) return '/panda/new-pointing.png';
  
  // Encouraging / celebrating
  if (lower.includes('bien') || lower.includes('genial') || lower.includes('racha') || lower.includes('completaste'))
    return '/panda/new-celebrate.png';
  
  // Thinking / suggesting
  if (lower.includes('sugiero') || lower.includes('podrías') || lower.includes('prueba') || lower.includes('quizás'))
    return '/panda/new-thinking.png';
  
  // Nudging about stale tasks
  if (lower.includes('días') || lower.includes('estancad') || lower.includes('pendiente'))
    return '/panda/new-annoyed.png';
  
  // Out of scope
  if (lower.includes('no es lo mío') || lower.includes('no puedo'))
    return '/panda/new-shrug.png';
  
  // Default
  return '/panda/new-wave.png';
}
