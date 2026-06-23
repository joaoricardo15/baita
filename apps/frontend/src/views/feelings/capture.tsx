import './feelings.scss'

import { withAuthenticationRequired } from '@auth0/auth0-react'
import { IFeeling, Mood, TAG_ICONS } from '@baita/shared'
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material'
import { FC, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { Loading } from '@/components'
import { useFeelings, useSaveFeeling } from '@/hooks/useFeelings'
import { LINKS } from '@/router'
import { getLabels, Labels } from '@/utils/labels'

import MoodPicker from './components/moodPicker'
import TagInput from './components/tagInput'

const FeelingCapture: FC = () => {
  const navigate = useNavigate()
  const { feelingId } = useParams<{ feelingId: string }>()
  const [searchParams] = useSearchParams()
  const tagFromUrl = searchParams.get('tag')

  const { data: feelings } = useFeelings()
  const saveFeeling = useSaveFeeling()

  const existingFeeling = feelingId
    ? feelings?.find((f) => f.feelingId === feelingId)
    : undefined

  const [content, setContent] = useState('')
  const [mood, setMood] = useState<Mood | undefined>()
  const [tags, setTags] = useState<string[]>(tagFromUrl ? [tagFromUrl] : [])
  const [hasTyped, setHasTyped] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (existingFeeling) {
      setContent(existingFeeling.content)
      setMood(existingFeeling.mood as Mood | undefined)
      setTags(existingFeeling.tags || [])
      setHasTyped(true)
    }
  }, [existingFeeling])

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus()
    }
  }, [])

  const handleContentChange = (value: string) => {
    setContent(value)
    if (value.length > 0 && !hasTyped) {
      setHasTyped(true)
    }
  }

  const handleSave = () => {
    if (!content.trim()) return

    const feeling: IFeeling = {
      feelingId: feelingId || '',
      content: content.trim(),
      mood,
      tags: tags.length > 0 ? tags : undefined,
      createdAt: existingFeeling?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    saveFeeling.mutate(feeling)
    navigate(LINKS.feelings)
  }

  const handleBack = () => {
    navigate(LINKS.feelings)
  }

  const isDream = tags.includes('dream')
  const hasSpecialTag = Object.keys(TAG_ICONS).find((t) => tags.includes(t))
  const now = new Date()
  const timeStr = now.toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })

  const captureClass = [
    'feeling-capture',
    isDream && 'feeling-capture--dream',
    !isDream && hasSpecialTag === 'gratitude' && 'feeling-capture--gratitude',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={captureClass}>
      <div className="feeling-capture__header">
        <button
          type="button"
          className="feeling-capture__back"
          onClick={handleBack}
          aria-label="Go back"
        >
          <ArrowBackIcon />
        </button>
        <span className="feeling-capture__time">{timeStr}</span>
      </div>

      <textarea
        ref={textareaRef}
        className="feeling-capture__textarea"
        value={content}
        onChange={(e) => handleContentChange(e.target.value)}
        placeholder={labels.placeholder}
      />

      <div
        className={`feeling-capture__controls${hasTyped ? ' feeling-capture__controls--visible' : ''}`}
      >
        <MoodPicker value={mood} onChange={setMood} />
        <TagInput tags={tags} onChange={setTags} />
        <button
          type="button"
          className="feeling-capture__save"
          onClick={handleSave}
          disabled={!content.trim()}
        >
          {labels.save}
        </button>
      </div>
    </div>
  )
}

export default withAuthenticationRequired(FeelingCapture, {
  onRedirecting: () => <Loading />,
})

const LABELS: Labels = {
  en: {
    placeholder: 'What are you feeling?',
    save: 'Save feeling',
  },
  pt: {
    placeholder: 'O que você está sentindo?',
    save: 'Salvar sentimento',
  },
}

const labels = getLabels(LABELS)
