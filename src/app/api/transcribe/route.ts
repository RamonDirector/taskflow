import { NextRequest, NextResponse } from 'next/server';
import OpenAI, { toFile } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
    }

    // Convert to buffer and create a proper file for OpenAI
    const buffer = Buffer.from(await audioFile.arrayBuffer());
    
    // Determine filename based on type
    const mimeType = audioFile.type || 'audio/webm';
    const ext = mimeType.includes('webm') ? 'webm' : 
                mimeType.includes('ogg') ? 'ogg' : 
                mimeType.includes('mp4') ? 'mp4' : 
                mimeType.includes('mpeg') ? 'mp3' : 'webm';
    
    const file = await toFile(buffer, `audio.${ext}`, { type: mimeType });

    const transcription = await openai.audio.transcriptions.create({
      file: file,
      model: 'whisper-1',
    });

    return NextResponse.json({ text: transcription.text });
  } catch (error: any) {
    console.error('Transcription error:', error);
    return NextResponse.json(
      { error: 'Failed to transcribe audio', details: error?.message || String(error) },
      { status: 500 }
    );
  }
}
