import './feelings.scss'

import { withAuthenticationRequired } from '@auth0/auth0-react'
import { IFeeling } from '@baita/shared'
import {
  Add as AddIcon,
  FavoriteBorder as FavoriteBorderIcon,
} from '@mui/icons-material'
import { FC } from 'react'
import { useNavigate } from 'react-router-dom'

import { Button, EmptyState, ListItem, Loading, Skeleton } from '@/components'
import { useDeleteFeeling, useFeelings } from '@/hooks/useFeelings'
import { LINKS } from '@/router'
import { getLabels, Labels } from '@/utils/labels'

import FeelingCard from './components/feelingCard'

interface DateGroup {
  label: string
  feelings: IFeeling[]
}

function groupByDate(
  feelings: IFeeling[],
  labels: Record<string, string>
): DateGroup[] {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)

  const groups: Map<string, IFeeling[]> = new Map()

  for (const feeling of feelings) {
    const date = new Date(feeling.createdAt)
    const dayStart = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    )

    let label: string
    if (dayStart.getTime() === today.getTime()) {
      label = labels.today
    } else if (dayStart.getTime() === yesterday.getTime()) {
      label = labels.yesterday
    } else {
      label = date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      })
    }

    const existing = groups.get(label)
    if (existing) {
      existing.push(feeling)
    } else {
      groups.set(label, [feeling])
    }
  }

  return Array.from(groups.entries()).map(([label, items]) => ({
    label,
    feelings: items,
  }))
}

export const Feelings: FC = () => {
  const navigate = useNavigate()
  const { data: feelings, isLoading: loading } = useFeelings()
  const deleteFeeling = useDeleteFeeling()

  const onNewFeeling = () => {
    navigate(LINKS.feelingNew)
  }

  const onEditFeeling = (feeling: IFeeling) => {
    navigate(LINKS.feeling(feeling.feelingId))
  }

  const onDeleteFeeling = (feelingId: string) => {
    deleteFeeling.mutate(feelingId)
  }

  const sorted = feelings
    ? [...feelings].sort((a, b) => b.createdAt - a.createdAt)
    : []

  const dateGroups = groupByDate(sorted, labels)

  return (
    <>
      {loading || !feelings ? (
        <Skeleton elements={3} height={100} />
      ) : feelings.length === 0 ? (
        <EmptyState
          icon={<FavoriteBorderIcon style={{ fontSize: 48 }} />}
          title={labels.emptyTitle}
          description={labels.emptyDescription}
        />
      ) : (
        <div className="feelings-list">
          {dateGroups.map((group) => (
            <div key={group.label} className="feelings-section">
              <div className="feelings-section__header">{group.label}</div>
              {group.feelings.map((feeling, index) => (
                <ListItem key={feeling.feelingId} index={index}>
                  <FeelingCard
                    feeling={feeling}
                    onEdit={() => onEditFeeling(feeling)}
                    onDelete={() => onDeleteFeeling(feeling.feelingId)}
                  />
                </ListItem>
              ))}
            </div>
          ))}
        </div>
      )}

      <div className="d-flex align-items-center justify-content-center mt-5">
        <Button
          type="text"
          color="primary"
          icon={<AddIcon />}
          onClick={onNewFeeling}
        >
          {labels.addFeeling}
        </Button>
      </div>
    </>
  )
}

export default withAuthenticationRequired(Feelings, {
  onRedirecting: () => <Loading />,
})

const LABELS: Labels = {
  en: {
    emptyTitle: 'How are you feeling?',
    emptyDescription:
      'Capture your feelings, dreams, and moments of gratitude.',
    addFeeling: 'How are you?',
    today: 'Today',
    yesterday: 'Yesterday',
  },
  pt: {
    emptyTitle: 'Como você está se sentindo?',
    emptyDescription:
      'Capture seus sentimentos, sonhos e momentos de gratidão.',
    addFeeling: 'Como você está?',
    today: 'Hoje',
    yesterday: 'Ontem',
  },
}

const labels = getLabels(LABELS)
