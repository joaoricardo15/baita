import '../feelings.scss'

import {
  getMoodDefinition,
  getMoodEmoji,
  IFeeling,
  TAG_ICONS,
} from '@baita/shared'
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  MoreVert as MoreVertIcon,
} from '@mui/icons-material'
import { Card } from '@mui/material'
import { FC } from 'react'

import { Menu } from '@/components'
import { getTimeDiffLabel } from '@/utils/date'
import { getLabels, Labels } from '@/utils/labels'

const FeelingCard: FC<{
  feeling: IFeeling
  placeName?: string
  onEdit: () => void
  onDelete: () => void
}> = ({ feeling, placeName, onEdit, onDelete }) => {
  const moodEmoji = feeling.mood ? getMoodEmoji(feeling.mood) : undefined
  const moodDef = feeling.mood ? getMoodDefinition(feeling.mood) : undefined

  return (
    <Card
      className="feeling-card"
      elevation={0}
      onClick={onEdit}
      style={
        moodDef
          ? ({
              '--card-accent': moodDef.color,
            } as React.CSSProperties)
          : undefined
      }
    >
      <div className="feeling-card__body">
        <div className="d-flex align-items-start">
          <div style={{ minWidth: 0, flex: 1 }}>
            <p className="feeling-card__content">
              {moodEmoji && `${moodEmoji} `}
              {feeling.content}
            </p>
            <div className="feeling-card__meta">
              <div className="feeling-card__tags">
                {placeName && (
                  <span className="feeling-card__place-chip">
                    📍 {placeName}
                  </span>
                )}
                {feeling.tags?.map((tag) => {
                  const icon = TAG_ICONS[tag]
                  return (
                    <span
                      key={tag}
                      className={`feeling-card__tag${icon ? ` feeling-card__tag--${tag}` : ''}`}
                    >
                      {icon && `${icon.emoji} `}
                      {tag}
                    </span>
                  )
                })}
              </div>
              <span className="feeling-card__time">
                {getTimeDiffLabel(feeling.updatedAt)}
              </span>
            </div>
          </div>

          <div
            className="feeling-card__menu"
            onClick={(e) => e.stopPropagation()}
          >
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
              <MoreVertIcon style={{ fontSize: 18 }} />
            </Menu>
          </div>
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
