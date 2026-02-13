# Intent Detection: Inverted Logic

## Problem
Detecting "is this a conversation?" is hard — conversations are open-ended and unpredictable. False positives route brain dumps to chat, losing the capture flow.

## Solution
**Invert the detection:** explicitly detect brain dumps, everything else defaults to conversation.

```
Input → Is this a brain dump? 
         ├─ YES → classify + create items (Gemini only)
         └─ NO  → conversation mode (Gemini or Sonnet)
```

## Why Inverted?
Brain dumps have clear signals:
- Multiple ideas in one message
- Task-like language ("tengo que", "necesito", "idea:")
- Stream-of-consciousness structure
- Lists or comma-separated items

Conversations do NOT have reliable signals — they can be anything. Trying to detect "conversation" leads to brittle heuristics.

## Implementation
Gemini Flash handles detection in the same call as transcription — zero extra latency. The classification prompt asks: "Is this a brain dump with multiple items to capture, or a conversational message?"

## Key Insight
Default to the more flexible mode (conversation). Only break out of it when you're confident about the specific mode (brain dump). This minimizes misclassification impact.
