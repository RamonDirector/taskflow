import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { checkAIAccess, incrementAIUsage } from '@/lib/ai/rate-limit';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Valid emotion tags
const VALID_EMOTIONS = ['anxiety', 'joy', 'confusion', 'fear', 'sadness', 'anger', 'peace', 'excitement', 'nostalgia', 'wonder'] as const;

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

    const { dream, voiceContext, locale = 'es', recentDreams = [] } = await request.json();
    if (!dream) return NextResponse.json({ error: 'No dream provided' }, { status: 400 });

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const dreamText = voiceContext || dream;

    // Build accumulated context from recent dreams
    let dreamHistoryBlock = '';
    if (recentDreams.length > 0) {
      const dreamEntries = recentDreams.map((d: { title: string; created_at: string; interpretation?: string; emotion?: string }, i: number) => {
        const date = new Date(d.created_at).toLocaleDateString(locale === 'en' ? 'en-US' : 'es-ES', { day: 'numeric', month: 'short' });
        const emotionTag = d.emotion ? ` [${d.emotion}]` : '';
        return `${i + 1}. (${date}${emotionTag}) "${d.title}"`;
      }).join('\n');

      dreamHistoryBlock = locale === 'en'
        ? `\n\nRECENT DREAM HISTORY (use to detect patterns, recurring symbols, and emotional trends):\n${dreamEntries}\n\nIf you notice recurring themes, symbols, or emotional patterns across these dreams, weave that insight into your interpretation. Example: "This is the third time water appears in your recent dreams — this recurring element suggests..."\n`
        : `\n\nHISTORIAL DE SUEÑOS RECIENTES (úsalo para detectar patrones, símbolos recurrentes y tendencias emocionales):\n${dreamEntries}\n\nSi notas temas recurrentes, símbolos o patrones emocionales entre estos sueños, integra esa observación en tu interpretación. Ejemplo: "Es la tercera vez que el agua aparece en tus sueños recientes — este elemento recurrente sugiere..."\n`;
    }

    const emotionInstruction = locale === 'en'
      ? `\n\nIMPORTANT: At the very end of your response, on a new line, output EXACTLY this format:
EMOTION: <one word from this list: ${VALID_EMOTIONS.join(', ')}>
Choose the single dominant emotion of the dream. This line will be parsed programmatically — do not add anything else on that line.`
      : `\n\nIMPORTANTE: Al final de tu respuesta, en una línea nueva, escribe EXACTAMENTE este formato:
EMOTION: <una palabra de esta lista: ${VALID_EMOTIONS.join(', ')}>
Elige la emoción dominante del sueño. Esta línea se procesará programáticamente — no añadas nada más en esa línea.`;

    // Evidence-based prompt grounded in research:
    // - Continuity Hypothesis: dreams reflect waking life, not hidden desires
    // - Threat Simulation Theory (Revonsuo): 66% of recurring dreams contain threats — adaptive function
    // - Hall/Van de Castle: quantitative dream content analysis (characters, interactions, emotions, settings)
    // - Gestalt: every dream element is a projection of the dreamer's psyche
    // - No universal symbols: meaning is always personal, never from a "dream dictionary"
    // - Pattern detection across dream history is the highest-value insight
    
    const hasHistory = recentDreams.length > 0;
    
    const prompt = locale === 'en'
      ? `You are an evidence-based dream analyst trained in modern neuroscience and psychology of dreaming.

YOUR THEORETICAL FOUNDATION:
1. **Continuity Hypothesis**: Dreams primarily reflect waking concerns, relationships, and emotional preoccupations — not hidden desires or prophecies.
2. **Threat Simulation Theory** (Revonsuo): Many dreams rehearse threatening scenarios as an evolved defense mechanism. If the dream contains threats (chasing, falling, conflict), acknowledge this adaptive function.
3. **Gestalt Perspective**: Every element in the dream (people, objects, settings) can be seen as a projection of an aspect of the dreamer's own psyche. Ask: "If you WERE the [element], what would you feel?"
4. **Hall/Van de Castle Content Analysis**: Pay attention to characters (known vs strangers), social interactions (aggressive vs friendly), emotions, and settings — these reveal patterns.

CRITICAL RULES:
- NEVER use "dream dictionary" interpretations. There are NO universal symbols. A snake means something different to a biologist than to someone with a phobia.
- Always ground interpretations in the dreamer's PERSONAL context. Connect to what might be happening in their life.
- Offer 2-3 possible readings, not one definitive meaning. Use "this might reflect..." or "one way to read this..."
- Include ONE Gestalt-style question: invite the dreamer to embody a dream element ("If you were the ocean in your dream, what would you be trying to say?")
- If the dream contains threats or anxiety, normalize it — 66% of recurring dreams contain threats. It's the brain rehearsing, not a warning.
- Keep it warm, conversational, and insightful — like a wise friend, not a clinical report.
${dreamHistoryBlock}
DREAM TO INTERPRET:
"${dreamText}"

Structure your response as flowing text (NOT bullet lists):
1. Open with what stands out most — the emotional core or central tension
2. Explore 2-3 key elements through the lenses above (continuity, Gestalt, threat simulation if relevant)
3. ${hasHistory ? 'Connect to patterns from previous dreams if any recurring themes appear' : 'Note any elements worth tracking if they recur in future dreams'}
4. Close with ONE reflective question that invites the dreamer to go deeper

Length: 150-250 words. Conversational tone. No headers or bold text in the output.${emotionInstruction}`
      : `Eres un analista de sueños basado en evidencia, formado en neurociencia moderna y psicología del sueño.

TU BASE TEÓRICA:
1. **Hipótesis de Continuidad**: Los sueños reflejan principalmente preocupaciones, relaciones y estados emocionales de la vida real — no deseos ocultos ni profecías.
2. **Teoría de Simulación de Amenazas** (Revonsuo): Muchos sueños ensayan escenarios amenazantes como mecanismo de defensa evolutivo. Si el sueño contiene amenazas (persecución, caída, conflicto), reconoce esta función adaptativa.
3. **Perspectiva Gestalt**: Cada elemento del sueño (personas, objetos, escenarios) puede verse como una proyección de un aspecto de la psique del soñador. Pregunta: "Si TÚ fueras el [elemento], ¿qué sentirías?"
4. **Análisis de Contenido Hall/Van de Castle**: Presta atención a los personajes (conocidos vs desconocidos), interacciones sociales (agresivas vs amigables), emociones y escenarios — revelan patrones.

REGLAS CRÍTICAS:
- NUNCA uses interpretaciones de "diccionario de sueños". NO existen símbolos universales. Una serpiente significa algo diferente para un biólogo que para alguien con fobia.
- Siempre basa las interpretaciones en el contexto PERSONAL del soñador. Conecta con lo que podría estar pasando en su vida.
- Ofrece 2-3 lecturas posibles, no un significado definitivo. Usa "esto podría reflejar..." o "una forma de leer esto..."
- Incluye UNA pregunta estilo Gestalt: invita al soñador a encarnar un elemento del sueño ("Si tú fueras el océano de tu sueño, ¿qué estarías intentando decir?")
- Si el sueño contiene amenazas o ansiedad, normalízalo — el 66% de los sueños recurrentes contienen amenazas. Es el cerebro ensayando, no una advertencia.
- Mantén un tono cálido, conversacional y perspicaz — como un amigo sabio, no un informe clínico.
${dreamHistoryBlock}
SUEÑO A INTERPRETAR:
"${dreamText}"

Estructura tu respuesta como texto fluido (NO listas con viñetas):
1. Abre con lo que más destaca — el núcleo emocional o la tensión central
2. Explora 2-3 elementos clave a través de las lentes anteriores (continuidad, Gestalt, simulación de amenazas si aplica)
3. ${hasHistory ? 'Conecta con patrones de sueños anteriores si hay temas recurrentes' : 'Señala elementos que valdría la pena rastrear si se repiten en futuros sueños'}
4. Cierra con UNA pregunta reflexiva que invite al soñador a profundizar

Extensión: 150-250 palabras. Tono conversacional. Sin encabezados ni negritas en la respuesta.${emotionInstruction}`;

    const result = await model.generateContent(prompt);
    let fullResponse = result.response.text();

    // Extract emotion tag from response
    let emotion: string | null = null;
    const emotionMatch = fullResponse.match(/^EMOTION:\s*(\w+)\s*$/m);
    if (emotionMatch && VALID_EMOTIONS.includes(emotionMatch[1].toLowerCase() as typeof VALID_EMOTIONS[number])) {
      emotion = emotionMatch[1].toLowerCase();
      // Remove the EMOTION line from the interpretation text
      fullResponse = fullResponse.replace(/\n?EMOTION:\s*\w+\s*$/, '').trim();
    }

    // Increment usage counter
    if (access.userId) {
      await incrementAIUsage(access.userId);
    }

    return NextResponse.json({ interpretation: fullResponse, emotion });
  } catch (error) {
    console.error('Dream interpretation error:', error);
    return NextResponse.json({ error: 'Failed to interpret dream' }, { status: 500 });
  }
}
