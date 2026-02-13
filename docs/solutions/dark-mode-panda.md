# Dark Mode Panda: Solid Circle Pattern

## Problem
Kai (panda mascot) appears in empty states on dark backgrounds. The PNG assets have transparent backgrounds, making the panda look harsh/floating against dark surfaces.

## Solution
Add a blurred background circle behind the panda image — a soft glow that anchors it visually.

### Implementation
- CSS: `rounded-full` div with blur behind the panda `<Image>`
- Color varies by section:
  - **Dreams:** purple glow (`bg-purple-*/50`)
  - **Ideas & Tasks:** matcha glow (`bg-[#6b8f71]/50`)
- Blur amount creates a soft, ambient feel matching the Japanese aesthetic

## Trap: PWA Cache
After deploying this fix, Ramon reported still seeing the old version. PWA service workers cache aggressively — users may need to:
1. Close and reopen the app
2. Clear site data
3. Wait for the SW to update on next visit

A proper cache-busting strategy is still pending.

## Key Commit
`6320f4a`
