import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { checkAIAccess, incrementAIUsage } from '@/lib/ai/rate-limit';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

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

    const { dream, voiceContext, locale = 'es' } = await request.json();
    if (!dream) return NextResponse.json({ error: 'No dream provided' }, { status: 400 });

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const dreamText = voiceContext || dream;

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

DREAM TO INTERPRET:
"${dreamText}"

Provide an interpretation in English that includes:
1. **Key symbols** identified in the dream
2. **Possible meanings** from different perspectives
3. **Reflective questions** for the dreamer to explore more deeply
4. **Core message** - a synthesis of what the dream might be communicating

Format: flowing natural text, not rigid lists. As if speaking with someone in an analysis session.
Length: 150-250 words.`
      : `Eres un analista de sueños experto que combina múltiples tradiciones interpretativas:

- **Psicología junguiana**: arquetipos, sombra, anima/animus, el inconsciente colectivo
- **Simbolismo universal**: símbolos que trascienden culturas (agua = emociones, volar = libertad, etc.)
- **Conexión personal**: cómo el sueño podría relacionarse con la vida actual del soñador

Tu estilo:
- Reflexivo y cálido, nunca dogmático
- Ofreces posibilidades ("esto podría significar..."), no verdades absolutas
- Haces preguntas que invitan a la reflexión personal
- Reconoces que el soñador es quien mejor conoce su vida interior

SUEÑO A INTERPRETAR:
"${dreamText}"

Proporciona una interpretación en español que incluya:
1. **Símbolos clave** identificados en el sueño
2. **Posibles significados** desde diferentes perspectivas
3. **Preguntas reflexivas** para que el soñador explore más profundamente
4. **Mensaje central** - una síntesis de lo que el sueño podría estar comunicando

Formato: texto fluido y natural, no listas rígidas. Como si hablaras con alguien en una sesión de análisis.
Extensión: 150-250 palabras.`;

    const result = await model.generateContent(prompt);
    const interpretation = result.response.text();

    // Increment usage counter
    if (access.userId) {
      await incrementAIUsage(access.userId);
    }

    return NextResponse.json({ interpretation });
  } catch (error) {
    console.error('Dream interpretation error:', error);
    return NextResponse.json({ error: 'Failed to interpret dream' }, { status: 500 });
  }
}
