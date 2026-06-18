import '../feelings.scss'

import { Mood, MoodDefinition, MoodQuadrant, MOODS } from '@baita/shared'
import { FC, useCallback, useEffect, useRef, useState } from 'react'

import appConfig from '@/utils/config'

const CIRCLE_ORDER: MoodQuadrant[] = [
  'highPositive',
  'lowPositive',
  'lowNegative',
  'highNegative',
]

const circleItems: MoodDefinition[] = CIRCLE_ORDER.flatMap((quadrant) =>
  MOODS.filter((m) => m.quadrant === quadrant)
)

const PREVIEW_MOODS = [
  MOODS.find((m) => m.value === 'joyful')!,
  MOODS.find((m) => m.value === 'calm')!,
  MOODS.find((m) => m.value === 'anxious')!,
  MOODS.find((m) => m.value === 'sad')!,
]

const MoodPicker: FC<{
  value?: Mood
  onChange: (mood: Mood | undefined) => void
}> = ({ value, onChange }) => {
  const lang = appConfig.language
  const [expanded, setExpanded] = useState(false)
  const collapseTimer = useRef<ReturnType<typeof setTimeout>>()

  const selectedDef = value ? MOODS.find((m) => m.value === value) : undefined

  useEffect(() => {
    return () => {
      if (collapseTimer.current) clearTimeout(collapseTimer.current)
    }
  }, [])

  const handleSelect = useCallback(
    (mood: Mood | undefined) => {
      onChange(mood)
      if (mood) {
        if (collapseTimer.current) clearTimeout(collapseTimer.current)
        collapseTimer.current = setTimeout(() => setExpanded(false), 450)
      }
    },
    [onChange]
  )

  if (!expanded) {
    return (
      <button
        type="button"
        className={`mood-picker mood-picker--collapsed${selectedDef ? ' mood-picker--has-value' : ''}`}
        onClick={() => setExpanded(true)}
        aria-expanded={false}
        aria-label="Choose mood"
        style={
          selectedDef
            ? ({
                '--mood-color': selectedDef.color,
                '--mood-glow': selectedDef.glow,
              } as React.CSSProperties)
            : undefined
        }
      >
        {selectedDef ? (
          <span className="mood-picker__selected">
            <span className="mood-picker__selected-emoji">
              {selectedDef.emoji}
            </span>
            <span className="mood-picker__selected-label">
              {selectedDef.labels[lang] || selectedDef.labels.en}
            </span>
          </span>
        ) : (
          <span className="mood-picker__preview">
            {PREVIEW_MOODS.map((m) => (
              <span key={m.value} className="mood-picker__preview-emoji">
                {m.emoji}
              </span>
            ))}
          </span>
        )}
      </button>
    )
  }

  return (
    <div className="mood-picker mood-picker--expanded" aria-expanded={true}>
      <div className="mood-picker__ring">
        {circleItems.map((mood, i) => {
          const isSelected = value === mood.value
          return (
            <button
              key={mood.value}
              type="button"
              className={`mood-picker__item${isSelected ? ' mood-picker__item--selected' : ''}`}
              style={
                {
                  '--angle': `${i * 30 + 15}deg`,
                  ...(isSelected
                    ? {
                        '--mood-color': mood.color,
                        '--mood-glow': mood.glow,
                      }
                    : {}),
                } as React.CSSProperties
              }
              onClick={() => handleSelect(isSelected ? undefined : mood.value)}
              aria-label={mood.labels[lang] || mood.labels.en}
            >
              <span className="mood-picker__emoji">{mood.emoji}</span>
            </button>
          )
        })}
        {selectedDef && (
          <span className="mood-picker__ring-label">
            {selectedDef.labels[lang] || selectedDef.labels.en}
          </span>
        )}
      </div>
      <button
        type="button"
        className="mood-picker__collapse"
        onClick={() => setExpanded(false)}
        aria-label="Collapse mood picker"
      >
        <svg
          className="mood-picker__collapse-chevron"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
    </div>
  )
}

export default MoodPicker
