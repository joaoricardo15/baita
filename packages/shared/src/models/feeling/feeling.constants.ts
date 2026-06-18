export const MOOD_QUADRANTS = {
  highPositive: {
    id: 'highPositive',
    color: '#F2C94C',
    glow: 'rgba(242, 201, 76, 0.3)',
  },
  lowPositive: {
    id: 'lowPositive',
    color: '#43C59E',
    glow: 'rgba(67, 197, 158, 0.3)',
  },
  highNegative: {
    id: 'highNegative',
    color: '#E85D5D',
    glow: 'rgba(232, 93, 93, 0.3)',
  },
  lowNegative: {
    id: 'lowNegative',
    color: '#4D8DFF',
    glow: 'rgba(77, 141, 255, 0.3)',
  },
} as const

export type MoodQuadrant = keyof typeof MOOD_QUADRANTS

export const MOOD_VALUES = [
  'joyful',
  'excited',
  'inspired',
  'calm',
  'grateful',
  'content',
  'anxious',
  'frustrated',
  'overwhelmed',
  'sad',
  'drained',
  'lonely',
] as const

export type Mood = (typeof MOOD_VALUES)[number]

export interface MoodDefinition {
  value: Mood
  emoji: string
  quadrant: MoodQuadrant
  color: string
  glow: string
  labels: {
    en: string
    pt: string
  }
}

export const MOODS: MoodDefinition[] = [
  {
    value: 'joyful',
    emoji: '😄',
    quadrant: 'highPositive',
    color: '#F2C94C',
    glow: 'rgba(242, 201, 76, 0.3)',
    labels: { en: 'Joyful', pt: 'Alegre' },
  },
  {
    value: 'excited',
    emoji: '🤩',
    quadrant: 'highPositive',
    color: '#FFDD67',
    glow: 'rgba(255, 221, 103, 0.3)',
    labels: { en: 'Excited', pt: 'Empolgado' },
  },
  {
    value: 'inspired',
    emoji: '🤗',
    quadrant: 'highPositive',
    color: '#FFE99A',
    glow: 'rgba(255, 233, 154, 0.3)',
    labels: { en: 'Inspired', pt: 'Inspirado' },
  },
  {
    value: 'calm',
    emoji: '😌',
    quadrant: 'lowPositive',
    color: '#43C59E',
    glow: 'rgba(67, 197, 158, 0.3)',
    labels: { en: 'Calm', pt: 'Calmo' },
  },
  {
    value: 'grateful',
    emoji: '🥰',
    quadrant: 'lowPositive',
    color: '#6EE7B7',
    glow: 'rgba(110, 231, 183, 0.3)',
    labels: { en: 'Grateful', pt: 'Grato' },
  },
  {
    value: 'content',
    emoji: '😊',
    quadrant: 'lowPositive',
    color: '#A7F3D0',
    glow: 'rgba(167, 243, 208, 0.3)',
    labels: { en: 'Content', pt: 'Satisfeito' },
  },
  {
    value: 'anxious',
    emoji: '😟',
    quadrant: 'highNegative',
    color: '#E85D5D',
    glow: 'rgba(232, 93, 93, 0.3)',
    labels: { en: 'Anxious', pt: 'Ansioso' },
  },
  {
    value: 'frustrated',
    emoji: '😤',
    quadrant: 'highNegative',
    color: '#F87171',
    glow: 'rgba(248, 113, 113, 0.3)',
    labels: { en: 'Frustrated', pt: 'Frustrado' },
  },
  {
    value: 'overwhelmed',
    emoji: '😵‍💫',
    quadrant: 'highNegative',
    color: '#FCA5A5',
    glow: 'rgba(252, 165, 165, 0.3)',
    labels: { en: 'Overwhelmed', pt: 'Sobrecarregado' },
  },
  {
    value: 'sad',
    emoji: '😢',
    quadrant: 'lowNegative',
    color: '#4D8DFF',
    glow: 'rgba(77, 141, 255, 0.3)',
    labels: { en: 'Sad', pt: 'Triste' },
  },
  {
    value: 'drained',
    emoji: '😩',
    quadrant: 'lowNegative',
    color: '#7BA3E8',
    glow: 'rgba(123, 163, 232, 0.3)',
    labels: { en: 'Drained', pt: 'Esgotado' },
  },
  {
    value: 'lonely',
    emoji: '🫥',
    quadrant: 'lowNegative',
    color: '#94A3B8',
    glow: 'rgba(148, 163, 184, 0.3)',
    labels: { en: 'Lonely', pt: 'Solitário' },
  },
]

export const MOOD_BY_VALUE: Record<Mood, MoodDefinition> = Object.fromEntries(
  MOODS.map((m) => [m.value, m])
) as Record<Mood, MoodDefinition>

export const MOOD_EMOJIS: Record<Mood, string> = Object.fromEntries(
  MOODS.map((m) => [m.value, m.emoji])
) as Record<Mood, string>

export function getMoodEmoji(mood: string): string | undefined {
  return MOOD_EMOJIS[mood as Mood]
}

export function getMoodDefinition(mood: string): MoodDefinition | undefined {
  return MOOD_BY_VALUE[mood as Mood]
}

export const TAG_CATEGORIES = {
  journaling: ['dream', 'gratitude', 'shame', 'reflection'],
  context: [
    'work',
    'relationship',
    'health',
    'exercise',
    'social',
    'family',
    'creative',
    'money',
  ],
} as const

export type TagCategory = keyof typeof TAG_CATEGORIES

export const SUGGESTED_TAGS: string[] = [
  ...TAG_CATEGORIES.journaling,
  ...TAG_CATEGORIES.context,
]

export const SPECIAL_TAGS: Record<string, { emoji: string }> = {
  dream: { emoji: '✨' },
  gratitude: { emoji: '🙏' },
  exercise: { emoji: '💪' },
  shame: { emoji: '🫣' },
}
