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

const MOOD_COLORS: Record<string, string> = {
  calm: '#6366f1',
  happy: '#10b981',
  excited: '#ec4899',
  inspired: '#8b5cf6',
  anxious: '#f59e0b',
  scared: '#64748b',
  drained: '#78716c',
  ashamed: '#e11d48',
}

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
  style?: React.CSSProperties
}> = ({ feeling, onEdit, onDelete, style }) => {
  const moodColor = feeling.mood ? MOOD_COLORS[feeling.mood] : '#d1d5db'
  const isDream = feeling.tags?.includes('dream')

  return (
    <Card
      className={`p-2 feeling-card${isDream ? ' feeling-card--dream' : ''}`}
      style={{ '--mood-color': moodColor, ...style } as React.CSSProperties}
      onClick={onEdit}
    >
      <div className="d-flex justify-content-between align-items-center">
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className="d-flex align-items-center">
            <div
              style={{ width: 30, flexShrink: 0 }}
              className="m-2 d-flex align-items-center justify-content-center"
            >
              {feeling.mood ? (
                <span style={{ fontSize: '1.3rem' }}>
                  {MOOD_EMOJIS[feeling.mood]}
                </span>
              ) : (
                <span className="feeling-card__no-mood" />
              )}
            </div>
            <Text className="mx-1 feeling-card__content">
              {feeling.content}
            </Text>
          </div>

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
