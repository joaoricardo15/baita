import '../feelings.scss'

import { FC, KeyboardEvent, useState } from 'react'

const SUGGESTED_TAGS = ['dream', 'recurring', 'gratitude', 'reflection']

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

  const suggestionsToShow = SUGGESTED_TAGS.filter((t) => !tags.includes(t))

  return (
    <div className="tag-input">
      {tags.map((tag) => (
        <span
          key={tag}
          className={`tag-input__chip tag-input__chip--active${tag === 'dream' ? ' tag-input__chip--dream' : ''}`}
        >
          {tag === 'dream' && '✨ '}
          {tag}
          <button
            type="button"
            className="tag-input__chip-remove"
            onClick={() => removeTag(tag)}
            aria-label={`Remove ${tag}`}
          >
            &times;
          </button>
        </span>
      ))}
      {suggestionsToShow.map((tag) => (
        <button
          key={tag}
          type="button"
          className="tag-input__chip tag-input__chip--suggested"
          onClick={() => addTag(tag)}
        >
          {tag}
        </button>
      ))}
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
