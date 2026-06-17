import '../feelings.scss'

import { FC } from 'react'

type Mood =
  | 'calm'
  | 'happy'
  | 'excited'
  | 'inspired'
  | 'anxious'
  | 'scared'
  | 'drained'
  | 'ashamed'

const MOODS: {
  value: Mood
  emoji: string
  label: string
  color: string
  glow: string
}[] = [
  {
    value: 'calm',
    emoji: '😌',
    label: 'Calm',
    color: '#6366f1',
    glow: 'rgba(99, 102, 241, 0.3)',
  },
  {
    value: 'happy',
    emoji: '😀',
    label: 'Happy',
    color: '#10b981',
    glow: 'rgba(16, 185, 129, 0.3)',
  },
  {
    value: 'excited',
    emoji: '🤩',
    label: 'Excited',
    color: '#ec4899',
    glow: 'rgba(236, 72, 153, 0.3)',
  },
  {
    value: 'inspired',
    emoji: '🤔',
    label: 'Inspired',
    color: '#8b5cf6',
    glow: 'rgba(139, 92, 246, 0.3)',
  },
  {
    value: 'anxious',
    emoji: '😟',
    label: 'Anxious',
    color: '#f59e0b',
    glow: 'rgba(245, 158, 11, 0.3)',
  },
  {
    value: 'scared',
    emoji: '😨',
    label: 'Scared',
    color: '#64748b',
    glow: 'rgba(100, 116, 139, 0.3)',
  },
  {
    value: 'drained',
    emoji: '😩',
    label: 'Drained',
    color: '#78716c',
    glow: 'rgba(120, 113, 108, 0.3)',
  },
  {
    value: 'ashamed',
    emoji: '🫣',
    label: 'Ashamed',
    color: '#e11d48',
    glow: 'rgba(225, 29, 72, 0.3)',
  },
]

const MoodPicker: FC<{
  value?: Mood
  onChange: (mood: Mood | undefined) => void
}> = ({ value, onChange }) => {
  return (
    <div className="mood-picker">
      {MOODS.map((mood) => (
        <button
          key={mood.value}
          type="button"
          className={`mood-picker__item${value === mood.value ? ' mood-picker__item--selected' : ''}`}
          style={
            value === mood.value
              ? ({
                  '--mood-color': mood.color,
                  '--mood-glow': mood.glow,
                } as React.CSSProperties)
              : undefined
          }
          onClick={() =>
            onChange(value === mood.value ? undefined : mood.value)
          }
          aria-label={mood.label}
        >
          <span className="mood-picker__emoji">{mood.emoji}</span>
          <span className="mood-picker__label">{mood.label}</span>
        </button>
      ))}
    </div>
  )
}

export default MoodPicker
