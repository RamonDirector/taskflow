import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { checkAIAccess, incrementAIUsage } from '@/lib/ai/rate-limit';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(request: NextRequest) {
  try {
    const access = await checkAIAccess();
    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error, remaining: access.remaining },
        { status: 429 }
      );
    }

    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await audioFile.arrayBuffer());
    const mimeType = audioFile.type || 'audio/webm';

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

    const result = await model.generateContent([
      { text: 'Transcribe this audio accurately. Return ONLY the transcription text, nothing else. Keep the original language.' },
      {
        inlineData: {
          mimeType,
          data: buffer.toString('base64'),
        },
      },
    ]);

    const response = await result.response;
    const text = response.text()?.trim() || '';

    if (access.userId) {
      await incrementAIUsage(access.userId);
    }

    return NextResponse.json({ text });
  } catch (error: any) {
    console.error('Transcribe error:', error);
    return NextResponse.json(
      { error: 'Transcription failed', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}
