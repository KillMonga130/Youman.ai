---
inclusion: always
---

# Halloween Theme Voice Guidelines

## Narrative Framework
The AI Humanizer is now "The Necromancer's Quill" - a tool that resurrects dead AI text and breathes life into it.

## Terminology Mapping

### Core Actions
- ❌ "Humanize" → ✅ "Resurrect"
- ❌ "Process" → ✅ "Ritual" or "Ceremony"
- ❌ "Transform" → ✅ "Transmute" or "Breathe life into"
- ❌ "Analyze" → ✅ "Divine" or "Detect spirits"

### UI Elements
- ❌ "AI Detection Score" → ✅ "Curse Level" or "Ghost Detector Reading"
- ❌ "Template" → ✅ "Spell" or "Incantation"
- ❌ "History" → ✅ "Graveyard" or "Crypt"
- ❌ "Settings" → ✅ "Ritual Chamber Settings"
- ❌ "Dashboard" → ✅ "Resurrection Chamber"

### Status Messages
- ❌ "Processing..." → ✅ "Summoning spirits..." / "Channeling energy..." / "Breathing life..."
- ❌ "Success!" → ✅ "Resurrection complete!" / "The text lives!"
- ❌ "Error" → ✅ "The ritual failed" / "Dark forces intervene"
- ❌ "Loading" → ✅ "Preparing the ritual..." / "Gathering necromantic power..."

### Stats & Metrics
- ❌ "Texts processed" → ✅ "Souls saved"
- ❌ "Success rate" → ✅ "Detection evasion rate"
- ❌ "Words processed" → ✅ "Necromancy power"
- ❌ "This month" → ✅ "Midnight sessions"

## Tone Guidelines

### Do's ✅
- Playful Halloween metaphors
- Professional underlying message
- Clear, understandable language
- Accessible to all users
- Maintain credibility

### Don'ts ❌
- Not childish or silly
- Not scary or disturbing
- Not confusing or unclear
- Not overdone (use sparingly)
- Not blocking functionality

## Example Copy

### Hero Section
```
The Necromancer's Quill
Resurrect AI text. Breathe life into the lifeless.

Your AI-generated content is dead on arrival. 
Detectors see right through it. Readers feel the emptiness.

We don't just rewrite. We resurrect.
```

### Button Labels
- "Begin Ritual" (instead of "Start")
- "Resurrect Text" (instead of "Humanize")
- "Exhume" (instead of "Restore" in history)
- "Cast Spell" (instead of "Apply Template")

### Error Messages
```typescript
const errorMessages = {
  emptyInput: "The ritual chamber is empty. Add some cursed text to resurrect.",
  apiError: "The spirits are restless. Try your ritual again.",
  rateLimitHit: "You've exhausted your necromancy power for today. Rest and return at midnight.",
  invalidText: "This text is already alive! No resurrection needed.",
  networkError: "The veil between worlds is too thick. Check your connection.",
}
```

### Success Messages
```typescript
const successMessages = {
  textResurrected: "Your text has been successfully resurrected!",
  lowDetection: "The ghost detector shows {score}% AI presence - nearly invisible to the mortal eye.",
  saved: "Buried in the graveyard for safekeeping.",
  exported: "Your resurrected text has been summoned to your device.",
}
```

## Implementation Notes

When generating UI text or code:
1. Check if the text is user-facing
2. Apply Halloween metaphor if appropriate
3. Ensure clarity is maintained
4. Keep tone playful but professional
5. Don't force metaphors where they don't fit

Example:
```tsx
// Good
<Button>Begin Ritual</Button>
<p>Summoning spirits...</p>

// Bad (too forced)
<Button>Necromantically Initiate</Button>
<p>The ethereal plane beckons...</p>
```
