const strings = [
  'Hmm... activating brain cells...',
  'Let me think... did you just hear the gears grinding?',
  'Hang on, cranking the idea machine...',
  "Sure, let's work on that... prepare for lift off!",
  "Let's see... dusting off the crystal ball...",
  "I'm thinking... any smoke you see is purely coincidental!",
  'Rolling the dice of wisdom...',
  'Interesting, let me put on my detective hat...',
  'Unleashing the hounds of thought...',
  "Let's unpack this... hope there's no bubble wrap, I get distracted...",
  'Okay, processing... no, not your credit card!',
  "Alright, let's do this... there's no 'I' in team, but there's an 'AI'!",
  "Crunching the numbers... hope they don't crunch back!",
  "Just a moment... don't you wish we had a time machine?",
  "I'm on it... like white on rice!",
  "Hang on, I'm brewing some fresh thoughts...",
  'One sec, just juggling a few ideas...',
]

export function thinking() {
  const randomIndex = Math.floor(Math.random() * strings.length)
  return strings[randomIndex]
}
