import { IGuide } from '@baita/shared'
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  Map as MapIcon,
  MoreVert as MoreVertIcon,
  Share as ShareIcon,
} from '@mui/icons-material'
import { Card } from '@mui/material'
import { FC } from 'react'

import { Text } from '@/components'
import { Menu } from '@/components'
import { getLabels, Labels } from '@/utils/labels'

const GuideCard: FC<{
  guide: IGuide
  onEdit: () => void
  onShare: () => void
  onDelete: () => void
}> = ({ guide, onEdit, onShare, onDelete }) => {
  return (
    <Card className="p-2" onClick={onEdit}>
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
                background: 'linear-gradient(135deg, #eef2ff, #e8e0ff)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MapIcon style={{ fontSize: 24, color: '#6366f1' }} />
            </div>
          </div>
          <div className="mx-2" style={{ minWidth: 0 }}>
            <Text className="fw-bold text-truncate">{guide.name}</Text>
            <Text
              className="fw-light fs-6 text-truncate"
              style={{ color: '#666' }}
            >
              {guide.placeIds.length}{' '}
              {guide.placeIds.length === 1 ? labels.place : labels.places}
            </Text>
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
                label: labels.share,
                icon: <ShareIcon color="secondary" />,
                onClick: onShare,
                condition: guide.placeIds.length >= 1,
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

export default GuideCard

const LABELS: Labels = {
  en: {
    edit: 'Edit',
    share: 'Share',
    delete: 'Delete',
    place: 'place',
    places: 'places',
  },
  pt: {
    edit: 'Editar',
    share: 'Compartilhar',
    delete: 'Excluir',
    place: 'lugar',
    places: 'lugares',
  },
}

const labels = getLabels(LABELS)
