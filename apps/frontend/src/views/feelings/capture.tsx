import './feelings.scss'

import { withAuthenticationRequired } from '@auth0/auth0-react'
import { generatePrefixedId, IFeeling, Mood, TAG_ICONS } from '@baita/shared'
import { ArrowBack as ArrowBackIcon } from '@mui/icons-material'
import { FC, useContext, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'

import { Loading } from '@/components'
import { useFeelings, useSaveFeeling } from '@/hooks/useFeelings'
import { useCreateUsualPlace } from '@/hooks/useUsualPlaces'
import { AuthContext } from '@/providers/auth'
import { LINKS } from '@/router'
import { getLabels, Labels } from '@/utils/labels'
import { getCurrentPosition, publishLocationPoint } from '@/utils/location'

import MoodPicker from './components/moodPicker'
import TagInput from './components/tagInput'

type LocationState =
  | { status: 'idle' }
  | { status: 'resolving' }
  | {
      status: 'matched'
      placeId: string
      placeName: string
      position: { lat: number; lng: number }
    }
  | { status: 'new'; position: { lat: number; lng: number } }
  | { status: 'failed' }

const FeelingCapture: FC = () => {
  const navigate = useNavigate()
  const { feelingId } = useParams<{ feelingId: string }>()
  const [searchParams] = useSearchParams()
  const tagFromUrl = searchParams.get('tag')
  const { user } = useContext(AuthContext)

  const { data: feelings } = useFeelings()
  const saveFeeling = useSaveFeeling()
  const createPlace = useCreateUsualPlace()

  const existingFeeling = feelingId
    ? feelings?.find((f) => f.feelingId === feelingId)
    : undefined

  const [content, setContent] = useState('')
  const [mood, setMood] = useState<Mood | undefined>()
  const [tags, setTags] = useState<string[]>(tagFromUrl ? [tagFromUrl] : [])
  const [hasTyped, setHasTyped] = useState(false)
  const [saving, setSaving] = useState(false)
  const [locationState, setLocationState] = useState<LocationState>({
    status: 'idle',
  })
  const [newPlaceName, setNewPlaceName] = useState('')
  const [showPlaceInput, setShowPlaceInput] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const placeInputRef = useRef<HTMLInputElement>(null)

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

  useEffect(() => {
    if (showPlaceInput && placeInputRef.current) {
      placeInputRef.current.focus()
    }
  }, [showPlaceInput])

  const handleContentChange = (value: string) => {
    setContent(value)
    if (value.length > 0 && !hasTyped) {
      setHasTyped(true)
      captureLocation()
    }
  }

  const captureLocation = async () => {
    const locationEnabled =
      localStorage.getItem('baita:location-journal') !== 'disabled'
    if (!locationEnabled || !user?.userId) return

    setLocationState({ status: 'resolving' })

    try {
      const pos = await getCurrentPosition(3000)
      const position = {
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
      }

      const result = await publishLocationPoint(user.userId, position)

      if (result.matchedPlace) {
        setLocationState({
          status: 'matched',
          placeId: result.matchedPlace.placeId,
          placeName: result.matchedPlace.name,
          position,
        })
      } else {
        setLocationState({ status: 'new', position })
      }
    } catch {
      setLocationState({ status: 'failed' })
    }
  }

  const handleSave = () => {
    if (!content.trim() || saving) return
    setSaving(true)

    const position =
      locationState.status === 'matched' || locationState.status === 'new'
        ? locationState.position
        : undefined

    let placeId: string | undefined
    let placeName: string | undefined

    if (locationState.status === 'matched') {
      placeId = locationState.placeId
      placeName = locationState.placeName
    } else if (
      locationState.status === 'new' &&
      newPlaceName.trim() &&
      position
    ) {
      const newId = generatePrefixedId('up')
      placeId = newId
      placeName = newPlaceName.trim()
      createPlace.mutate({
        placeId: newId,
        data: {
          usualPlaceId: newId,
          name: placeName,
          position,
          radiusM: 50,
          category: 'custom',
          visitCount: 1,
          score: 0.1,
        },
      })
    }

    const feeling: IFeeling = {
      feelingId: feelingId || '',
      content: content.trim(),
      mood,
      tags: tags.length > 0 ? tags : undefined,
      position,
      placeId,
      placeName,
      createdAt: existingFeeling?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    saveFeeling.mutate(feeling)
    navigate(LINKS.feelings)
  }

  const handleBack = () => {
    navigate(LINKS.feelings)
  }

  const handlePlaceNameSubmit = () => {
    if (!newPlaceName.trim()) {
      setShowPlaceInput(false)
      return
    }
    setShowPlaceInput(false)
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

  const renderLocationChip = () => {
    if (locationState.status === 'idle' || locationState.status === 'failed') {
      return null
    }

    if (locationState.status === 'resolving') {
      return (
        <span className="feeling-capture__location-chip feeling-capture__location-chip--resolving">
          📍
        </span>
      )
    }

    if (locationState.status === 'matched') {
      return (
        <span
          className="feeling-capture__location-chip"
          onClick={() =>
            setLocationState({
              status: 'new',
              position: locationState.position,
            })
          }
        >
          📍 {locationState.placeName} ×
        </span>
      )
    }

    if (locationState.status === 'new') {
      if (showPlaceInput) {
        return (
          <div className="feeling-capture__place-input">
            <span className="feeling-capture__place-input-icon">📍</span>
            <input
              ref={placeInputRef}
              type="text"
              className="feeling-capture__place-input-field"
              value={newPlaceName}
              onChange={(e) => setNewPlaceName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handlePlaceNameSubmit()
                if (e.key === 'Escape') setShowPlaceInput(false)
              }}
              onBlur={handlePlaceNameSubmit}
              placeholder={labels.placeName}
            />
          </div>
        )
      }

      if (newPlaceName) {
        return (
          <span
            className="feeling-capture__location-chip"
            onClick={() => setShowPlaceInput(true)}
          >
            📍 {newPlaceName}
          </span>
        )
      }

      return (
        <span
          className="feeling-capture__location-chip feeling-capture__location-chip--new"
          onClick={() => setShowPlaceInput(true)}
        >
          📍 {labels.namePlace}
        </span>
      )
    }

    return null
  }

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
        {renderLocationChip()}
        <MoodPicker value={mood} onChange={setMood} />
        <TagInput tags={tags} onChange={setTags} />
        <button
          type="button"
          className="feeling-capture__save"
          onClick={handleSave}
          disabled={!content.trim() || saving}
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
    namePlace: 'Name this place',
    placeName: 'Place name...',
  },
  pt: {
    placeholder: 'O que você está sentindo?',
    save: 'Salvar sentimento',
    namePlace: 'Nomear este local',
    placeName: 'Nome do local...',
  },
}

const labels = getLabels(LABELS)
