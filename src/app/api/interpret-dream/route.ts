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

    const prompt = locale === 'en'
      ? `You are an expert dream analyst combining multiple interpretive traditions:

- **Jungian psychology**: archetypes, shadow, anima/animus, the collective unconscious
- **Universal symbolism**: symbols that transcend cultures (water = emotions, flying = freedom, etc.)
- **Personal connection**: how the dream might relate to the dreamer's current life

Your style:
- Reflective and warm, never dogmatic
- Offer possibilities ("this could mean..."), not absolute truths
- Ask questions that invite personal reflection
- Acknowledge that the dreamer knows their inner life best
${dreamHistoryBlock}
DREAM TO INTERPRET:
"${dreamText}"

Provide an interpretation in English that includes:
1. **Key symbols** identified in the dream
2. **Possible meanings** from different perspectives
3. **Reflective questions** for the dreamer to explore more deeply
4. **Core message** - a synthesis of what the dream might be communicating
${recentDreams.length > 0 ? '5. **Pattern connections** - if any recurring themes connect this dream to previous ones' : ''}

Format: flowing natural text, not rigid lists. As if speaking with someone in an analysis session.
Length: 150-250 words.${emotionInstruction}`
      : `Eres un analista de sueños experto que combina múltiples tradiciones interpretativas:

- **Psicología junguiana**: arquetipos, sombra, anima/animus, el inconsciente colectivo
- **Simbolismo universal**: símbolos que trascienden culturas (agua = emociones, volar = libertad, etc.)
- **Conexión personal**: cómo el sueño podría relacionarse con la vida actual del soñador

Tu estilo:
- Reflexivo y cálido, nunca dogmático
- Ofreces posibilidades ("esto podría significar..."), no verdades absolutas
- Haces preguntas que invitan a la reflexión personal
- Reconoces que el soñador es quien mejor conoce su vida interior
${dreamHistoryBlock}
SUEÑO A INTERPRETAR:
"${dreamText}"

Proporciona una interpretación en español que incluya:
1. **Símbolos clave** identificados en el sueño
2. **Posibles significados** desde diferentes perspectivas
3. **Preguntas reflexivas** para que el soñador explore más profundamente
4. **Mensaje central** - una síntesis de lo que el sueño podría estar comunicando
${recentDreams.length > 0 ? '5. **Conexiones de patrones** - si hay temas recurrentes que conectan este sueño con los anteriores' : ''}

Formato: texto fluido y natural, no listas rígidas. Como si hablaras con alguien en una sesión de análisis.
Extensión: 150-250 palabras.${emotionInstruction}`;

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
