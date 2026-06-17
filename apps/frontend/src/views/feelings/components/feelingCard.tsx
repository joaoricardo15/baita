import '../feelings.scss'

import { IFeeling } from '@baita/shared'
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  MoreVert as MoreVertIcon,
} from '@mui/icons-material'
import { Card } from '@mui/material'
import { FC } from 'react'

import { Text } from '@/components'
import Menu from '@/components/menu'
import { getTimeDiffLabel } from '@/utils/date'
import { getLabels, Labels } from '@/utils/labels'

const MOOD_EMOJIS: Record<string, string> = {
  calm: '😌',
  happy: '😀',
  excited: '🤩',
  inspired: '🤔',
  anxious: '😟',
  scared: '😨',
  drained: '😩',
  ashamed: '🫣',
}

const FeelingCard: FC<{
  feeling: IFeeling
  onEdit: () => void
  onDelete: () => void
}> = ({ feeling, onEdit, onDelete }) => {
  const moodEmoji = feeling.mood ? MOOD_EMOJIS[feeling.mood] : undefined

  return (
    <Card className="p-2 feeling-card" onClick={onEdit}>
      <div className="d-flex justify-content-between align-items-center">
        <div style={{ minWidth: 0, flex: 1 }}>
          <Text className="feeling-card__content">
            {moodEmoji && `${moodEmoji} `}
            {feeling.content}
          </Text>
          <div className="feeling-card__meta">
            {feeling.tags?.map((tag) => (
              <span
                key={tag}
                className={`feeling-card__tag${tag === 'dream' ? ' feeling-card__tag--dream' : ''}`}
              >
                {tag === 'dream' && '✨ '}
                {tag}
              </span>
            ))}
            <span className="feeling-card__time">
              {getTimeDiffLabel(feeling.updatedAt)}
            </span>
          </div>
        </div>

        <div onClick={(e) => e.stopPropagation()}>
          <Menu
            links={[
              {
                label: labels.edit,
                icon: <EditIcon color="secondary" />,
                onClick: onEdit,
              },
              {
                label: labels.delete,
                icon: <DeleteIcon color="secondary" />,
                onClick: onDelete,
              },
            ]}
          >
            <MoreVertIcon />
          </Menu>
        </div>
      </div>
    </Card>
  )
}

export default FeelingCard

const LABELS: Labels = {
  en: {
    edit: 'Edit',
    delete: 'Delete',
  },
  pt: {
    edit: 'Editar',
    delete: 'Excluir',
  },
}

const labels = getLabels(LABELS)
