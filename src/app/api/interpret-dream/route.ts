import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
  try {
    const { dream, voiceContext } = await request.json();
    if (!dream) return NextResponse.json({ error: 'No dream provided' }, { status: 400 });

    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    const dreamText = voiceContext || dream;

    const prompt = `Eres un analista de sueños experto que combina múltiples tradiciones interpretativas:

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

    return NextResponse.json({ interpretation });
  } catch (error) {
    console.error('Dream interpretation error:', error);
    return NextResponse.json({ error: 'Failed to interpret dream' }, { status: 500 });
  }
}
