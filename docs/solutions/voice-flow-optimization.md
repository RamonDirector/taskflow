# Voice Flow Optimization: Single Gemini Call

## Problem
Original flow: Whisper (transcription) → separate intent detection → separate classification = 3 API calls per voice input. Slow and expensive.

## Solution
Replace Whisper with Gemini 2.5 Flash and combine all three operations into ONE call:

### Before (3 calls)
```
Audio → Whisper (transcribe) → Gemini (intent) → Gemini (classify)
```

### After (1 call for brain dumps, 2 for conversations)
```
Audio → Gemini Flash (transcribe + detect intent + classify)
         ├─ Brain dump → done (1 call total)
         └─ Conversation → Sonnet for response (2 calls total)
```

## How
Gemini 2.5 Flash accepts audio input directly. The prompt instructs it to:
1. Transcribe the audio
2. Determine if it's a brain dump or conversation
3. If brain dump: classify items (Idea/Task/Dream) and return structured JSON

All in a single inference pass.

## Impact
- Brain dumps: 3 calls → 1 call (67% reduction)
- Conversations: 3 calls → 2 calls (33% reduction)
- OpenAI/Whisper dependency fully eliminated
- Faster response time (single round-trip vs three)

## Trap
Always use **stable** Gemini model versions. Preview models expire without notice and will break production silently.
