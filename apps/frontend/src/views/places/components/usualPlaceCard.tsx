import { IUsualPlace } from '@baita/shared'
import {
  Delete as DeleteIcon,
  LocationOn as LocationOnIcon,
  MoreVert as MoreVertIcon,
  Star as StarIcon,
} from '@mui/icons-material'
import { Card, Chip } from '@mui/material'
import { FC } from 'react'

import { Text } from '@/components'
import { Menu } from '@/components'
import { getLabels, Labels } from '@/utils/labels'

function formatRelativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return labels.justNow
  if (minutes < 60) return `${minutes}min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}

const CATEGORY_COLORS: Record<string, string> = {
  home: '#22c55e',
  work: '#3b82f6',
  frequent: '#f59e0b',
  new: '#8b5cf6',
  custom: '#6b7280',
}

const UsualPlaceCard: FC<{
  place: IUsualPlace
  onDelete: () => void
}> = ({ place, onDelete }) => {
  const color = CATEGORY_COLORS[place.category] || CATEGORY_COLORS.custom

  return (
    <Card className="p-2">
      <div className="d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center overflow-hidden">
          <div
            style={{ width: 60, minWidth: 60 }}
            className="m-3 d-flex align-items-center justify-content-center"
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: `linear-gradient(135deg, ${color}20, ${color}10)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <LocationOnIcon style={{ fontSize: 24, color }} />
            </div>
          </div>
          <div className="mx-2" style={{ minWidth: 0 }}>
            <Text className="fw-bold text-truncate">{place.name}</Text>
            <div className="d-flex align-items-center gap-1">
              <Text
                className="fw-light fs-6 text-truncate"
                style={{ color: '#666' }}
              >
                {place.visitCount} {labels.visits}
                {place.lastVisitAt && (
                  <span style={{ marginLeft: 4 }}>
                    · {formatRelativeTime(place.lastVisitAt)}
                  </span>
                )}
              </Text>
              {place.category !== 'new' && (
                <Chip
                  size="small"
                  label={labels[place.category] || place.category}
                  sx={{ height: 18, fontSize: 10 }}
                />
              )}
            </div>
          </div>
        </div>
        <div
          className="d-flex align-items-center"
          onClick={(e) => e.stopPropagation()}
        >
          {place.category === 'new' && (
            <StarIcon
              style={{ fontSize: 16, color: '#8b5cf6', marginRight: 4 }}
            />
          )}
          <Menu
            links={[
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

export default UsualPlaceCard

const LABELS: Labels = {
  en: {
    visits: 'visits',
    delete: 'Dismiss',
    home: 'Home',
    work: 'Work',
    frequent: 'Frequent',
    new: 'New',
    custom: 'Custom',
    justNow: 'now',
  },
  pt: {
    visits: 'visitas',
    delete: 'Descartar',
    home: 'Casa',
    work: 'Trabalho',
    frequent: 'Frequente',
    new: 'Novo',
    custom: 'Outro',
    justNow: 'agora',
  },
}

const labels = getLabels(LABELS)
