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
        sorted.map((feeling, index) => (
          <ListItem key={feeling.feelingId} index={index}>
            <FeelingCard
              feeling={feeling}
              onEdit={() => onEditFeeling(feeling)}
              onDelete={() => onDeleteFeeling(feeling.feelingId)}
            />
          </ListItem>
        ))
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
  },
  pt: {
    emptyTitle: 'Como você está se sentindo?',
    emptyDescription:
      'Capture seus sentimentos, sonhos e momentos de gratidão.',
    addFeeling: 'Como você está?',
  },
}

const labels = getLabels(LABELS)
