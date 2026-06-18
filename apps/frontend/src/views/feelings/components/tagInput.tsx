import '../feelings.scss'

import { SUGGESTED_TAGS, TAG_ICONS } from '@baita/shared'
import { FC, KeyboardEvent, useState } from 'react'

const MAX_SUGGESTIONS = 12

const TagInput: FC<{
  tags: string[]
  onChange: (tags: string[]) => void
}> = ({ tags, onChange }) => {
  const [input, setInput] = useState('')

  const addTag = (tag: string) => {
    const normalized = tag.trim().toLowerCase()
    if (normalized && !tags.includes(normalized)) {
      onChange([...tags, normalized])
    }
    setInput('')
  }

  const removeTag = (tag: string) => {
    onChange(tags.filter((t) => t !== tag))
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addTag(input)
    }
  }

  const suggestionsToShow = SUGGESTED_TAGS.filter(
    (t) => !tags.includes(t)
  ).slice(0, MAX_SUGGESTIONS)

  return (
    <div className="tag-input">
      {tags.map((tag) => {
        const icon = TAG_ICONS[tag]
        return (
          <span
            key={tag}
            className={`tag-input__chip tag-input__chip--active${icon ? ` tag-input__chip--${tag}` : ''}`}
          >
            {icon && `${icon.emoji} `}
            {tag}
            <button
              type="button"
              className="tag-input__chip-remove"
              onClick={() => removeTag(tag)}
              aria-label={`Remove ${tag}`}
            >
              <svg
                width="8"
                height="8"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              >
                <line x1="4" y1="4" x2="20" y2="20" />
                <line x1="20" y1="4" x2="4" y2="20" />
              </svg>
            </button>
          </span>
        )
      })}
      {suggestionsToShow.map((tag) => {
        const icon = TAG_ICONS[tag]
        return (
          <button
            key={tag}
            type="button"
            className="tag-input__chip tag-input__chip--suggested"
            onClick={() => addTag(tag)}
          >
            {icon && `${icon.emoji} `}
            {tag}
          </button>
        )
      })}
      <input
        className="tag-input__field"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="add..."
        size={6}
      />
    </div>
  )
}

export default TagInput
