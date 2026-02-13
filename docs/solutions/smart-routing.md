# Smart Routing: Gemini Flash ↔ Sonnet

## Problem
Every Kai message going through Sonnet is expensive and slow. Most messages (greetings, status checks) don't need advanced reasoning.

## Solution
`needsSonnet()` — a regex-based router that classifies messages into tiers before calling any LLM.

### Tier 1: Gemini Flash (fast, cheap)
- Greetings ("hola", "hey", "buenos días")
- Short messages (< ~10 words, no task keywords)
- Status queries ("qué tengo pendiente", "cuántas tareas")

### Tier 2: Sonnet (powerful, expensive)
- Tool use triggers (create/complete/delete task keywords)
- Coaching requests ("ayúdame a", "qué debería")
- Complex reasoning (multi-step, ambiguous intent)

### Fallback
Gemini errors automatically fall through to Sonnet — graceful degradation, never a user-facing error.

## Impact
~60-70% of messages route through Gemini. Significant cost reduction with no UX degradation.

## Key Commit
`a0464db` — Smart routing + ID-based refs + ACI tools (single commit, all three patterns)

## Lessons
- Regex patterns are sufficient — no need for an ML classifier at this scale
- The fallback pattern is critical: if Gemini hallucinates or errors, Sonnet catches it
- Keep the router function pure and testable
