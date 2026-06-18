import '../feelings.scss'

import {
  Mood,
  MOOD_QUADRANTS,
  MoodDefinition,
  MoodQuadrant,
  MOODS,
} from '@baita/shared'
import { FC } from 'react'

import appConfig from '@/utils/config'

const groupByQuadrant = (moods: MoodDefinition[]) => {
  const groups: Record<MoodQuadrant, MoodDefinition[]> = {
    highPositive: [],
    lowPositive: [],
    highNegative: [],
    lowNegative: [],
  }
  for (const mood of moods) {
    groups[mood.quadrant].push(mood)
  }
  return groups
}

const quadrantGroups = groupByQuadrant(MOODS)

const MoodPicker: FC<{
  value?: Mood
  onChange: (mood: Mood | undefined) => void
}> = ({ value, onChange }) => {
  const lang = appConfig.language

  const renderQuadrant = (quadrant: MoodQuadrant, moods: MoodDefinition[]) => (
    <div
      className={`mood-picker__quadrant mood-picker__quadrant--${quadrant}`}
      style={
        {
          '--quadrant-color': MOOD_QUADRANTS[quadrant].color,
          '--quadrant-glow': MOOD_QUADRANTS[quadrant].glow,
        } as React.CSSProperties
      }
    >
      {moods.map((mood) => (
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
          aria-label={mood.labels[lang] || mood.labels.en}
        >
          <span className="mood-picker__emoji">{mood.emoji}</span>
          <span className="mood-picker__label">
            {mood.labels[lang] || mood.labels.en}
          </span>
        </button>
      ))}
    </div>
  )

  return (
    <div className="mood-picker">
      {renderQuadrant('highNegative', quadrantGroups.highNegative)}
      {renderQuadrant('highPositive', quadrantGroups.highPositive)}
      {renderQuadrant('lowNegative', quadrantGroups.lowNegative)}
      {renderQuadrant('lowPositive', quadrantGroups.lowPositive)}
    </div>
  )
}

export default MoodPicker
