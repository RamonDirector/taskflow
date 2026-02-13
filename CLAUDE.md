# CLAUDE.md — Hansei Project Intelligence

> Everything an AI agent needs to work effectively on this codebase.

---

## 1. Proyecto

**Hansei** (反省 — reflexión) es una app voice-first: hablas → la IA clasifica (Ideas/Tareas/Sueños) → plan de acción → ejecutas.

- **Repo:** github.com/RamonDirector/taskflow (PRIVATE)
- **Local:** /home/ubuntu/taskflow
- **Domain:** gethansei.com
- **Stack:** Next.js 14 + Supabase + Tailwind + Vercel
- **Deploy:** Auto-deploy on push to `main` via Vercel
- **Mascot:** Kai 🐼 (改 — cambio/transformación)

---

## 2. Arquitectura

```
Voice Input
    │
    ▼
Gemini 2.5 Flash (stable) ──── transcription + intent detection + classification
    │                           (single API call for brain dumps)
    │
    ├─ Brain dump? → classify → create tasks/ideas/dreams → done (1 call)
    │
    └─ Conversation? → needsSonnet() router
                          │
                ┌─────────┴─────────┐
                ▼                   ▼
          Gemini Flash          Sonnet 4
          (greetings,           (tool use,
           status queries,       coaching,
           short messages)       complex reasoning)
                                    │
                                    ▼
                              Tool execution
                              (CRUD tasks, etc.)
```

**Key services:**
- **Gemini 2.5 Flash** — All transcription + intent + classification. Always use STABLE versions.
- **Claude Sonnet 4** — Kai conversations via Anthropic API direct. Tool-calling agent.
- **Supabase** — Database + auth (Google OAuth + Magic Link)
- **Vercel** — Hosting + auto-deploy

---

## 3. Patrones Establecidos

### Smart Routing — `needsSonnet()`
- Regex-based router decides Gemini vs Sonnet per message
- Tier 1 (Gemini): greetings, short messages, status queries — fast & cheap
- Tier 2 (Sonnet): tool use, coaching, complex reasoning
- Gemini errors fall through to Sonnet (graceful degradation)
- ~60-70% of messages go through Gemini (cost savings)
- See: `docs/solutions/smart-routing.md`

### Intent Detection — Inverted Logic
- Detect brain dumps EXPLICITLY; everything else → conversation
- NOT "detect conversation" — detect the specific mode, default to chat
- See: `docs/solutions/intent-detection.md`

### ID-based Task References
- Context shows `[#42] "Comprar pan"` with numeric IDs
- Tools accept `task_id` (preferred) or `task_title` (fallback)
- `complete_task` orders by most-recent-first when matching by title
- `delete_task` refuses "borra todo" — asks for specifics (poka-yoke)

### ACI Tool Definitions
- Every tool has: **Use when** / **Don't use when** / **Examples**
- Based on Anthropic's finding: tool docs matter MORE than system prompts
- Absolute references (IDs) > fuzzy text matching

### PixelBubble Response Format
- Renders **bold** and `\n` line breaks
- Text LEFT-aligned (not centered)
- Max height 200px with scroll overflow
- System prompt enforces: line breaks between ideas, bold task names, max 4 lines
- NO numbered lists or dash lists (doesn't fit aesthetic)

---

## 4. Decisiones de Diseño

### Visual Identity
- **Japanese aesthetic:** enso, sakura, matcha, bamboo
- **Color matcha:** `#6b8f71`
- **Landing gradient:** `from-[#f8faf8] via-white to-[#f0f5f0]`
- **Icons:** Heroicons, always `strokeWidth={1.5}`
- **NO emojis in UI** — jamás
- **NO decorative icons** — only functional

### UI Principles
1. In-place editing — no modals
2. Clean & minimal — no visual noise
3. Zero learning curve
4. Seamless transitions
5. Voice-first — mic is the center
6. Premium animations — with purpose

### Kai (Mascot) Guidelines
- Appears in: onboarding, home, empty states
- Messages: natural, don't force "Kai" in every phrase
- Assets: `/public/panda/` (wave, neutral, thinking, celebrate, annoyed, sleeping, shrug, pointing)
- Easter egg: multi-tap for sassy phrases + haptic + bounce
- **NanoBanana CANNOT replicate specific styles** — Ramon generates assets himself when style matters
- **Background removal:** floodfill from corners with fuzz 18% (NOT `-transparent white`)

### Dark Mode Panda
- Blurred background circle behind panda in empty states
- Dreams: purple glow / Ideas+Tasks: matcha glow
- See: `docs/solutions/dark-mode-panda.md`

---

## 5. Trampas Conocidas

### ⚠️ Gemini Model Versions
- **ALWAYS use stable versions** — preview models expire without warning
- Never hardcode preview model names (e.g. `gemini-2.5-flash-preview-04-17`)

### ⚠️ Vercel Environment Variables
- Changes in Vercel Dashboard **require a redeploy** to take effect
- Env vars are **case-sensitive**: the Anthropic key is `Claude_API_KEY` (mixed case)
- Always implement fallbacks: check `Claude_API_KEY`, `CLAUDE_API_KEY`, `ANTHROPIC_API_KEY`
- `.env.local` locally ≠ Vercel env vars — must sync manually

### ⚠️ PWA Cache
- Users may see stale versions after deploy
- PWA service worker caches aggressively
- Need cache-busting strategy (still pending)

### ⚠️ Background Removal (Panda Assets)
- Use **floodfill from corners** with fuzz 18%
- Do NOT use `-transparent white` (removes white inside the image too)

### ⚠️ NanoBanana Limitations
- Cannot replicate specific art styles
- Good for generic emojis/icons, bad for matching existing asset style
- When style consistency matters → Ramon generates manually

### ⚠️ Google OAuth
- Has been intermittently broken — monitor after changes
- Magic Link works as fallback

---

## 6. Convenciones

### Code
- **Commits:** Always in English
- **Components:** `src/components/`
- **API routes:** `src/app/api/`
- **Language:** TypeScript throughout

### Anthropic API Key
- Always check fallbacks: `Claude_API_KEY` → `CLAUDE_API_KEY` → `ANTHROPIC_API_KEY`
- The production key uses mixed case (`Claude_API_KEY`) — historical decision

### Design
- Evolve existing components over creating new ones
- Reuse existing UI patterns (e.g., reused input + PixelBubble for Kai chat, no new chat UI)
- Document strategy BEFORE executing — Ramon's preferred pattern

---

## 7. Base de Datos (Supabase)

### Tables
| Table | Purpose |
|-------|---------|
| `tasks` | Core tasks with `completed_at`, `parent_idea_id` |
| `activity_log` | User activity tracking |
| `waitlist` | Beta signup emails |
| `ai_rate_limits` | AI usage throttling |
| `beta_feedback` | Feedback form submissions (gethansei.com/feedback) |

### RLS Concerns
- `tasks` and `activity_log` need proper Row Level Security
- New User Monitor was disabled because RLS requires service role key
- Kai needs `accessToken` passthrough for authenticated Supabase calls

### Schema Notes
- `tasks.completed_at` — timestamp for completion tracking
- `tasks.parent_idea_id` — links action plan tasks to source idea
- Completed tasks: fade 60% opacity, auto-hide after 24h, "Completadas" tab

---

## 8. Roadmap Context

### Current: Voice Task Tracker
Voice → Classify → Action Plan → Track

### Next: Personal Agent (Kai evolution)
1. 🟢 Reminders + push notifications
2. 🟢 Web search
3. 🟢 Due dates
4. 🟡 Email (Resend API)
5. 🟡 Calendar (Google Calendar)
6. 🔴 WhatsApp (Twilio)
7. 🔴 Browser actions (Playwright)

**Key decision:** Build on Hansei stack, NOT OpenClaw — OpenClaw can't scale multi-tenant.

---

*Source of truth. Keep updated as the project evolves.*
