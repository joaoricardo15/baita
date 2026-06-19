import { IPlace } from '@baita/shared'
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  LocationOn as LocationOnIcon,
  MoreVert as MoreVertIcon,
} from '@mui/icons-material'
import { Card } from '@mui/material'
import { FC } from 'react'

import { Text } from '@/components'
import Menu from '@/components/menu'
import { FILES_BASE_URL } from '@/utils/config'
import { getLabels, Labels } from '@/utils/labels'

const PlaceCard: FC<{
  place: IPlace
  onEdit: () => void
  onDelete: () => void
}> = ({ place, onEdit, onDelete }) => {
  const thumbnail = place.pictures[0]

  return (
    <Card className="p-2" onClick={onEdit}>
      <div className="d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center overflow-hidden">
          <div
            style={{ width: 60, minWidth: 60 }}
            className="m-3 d-flex align-items-center justify-content-center"
          >
            {thumbnail ? (
              <img
                src={`${FILES_BASE_URL}/${encodeURIComponent(thumbnail)}`}
                alt={place.name}
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  objectFit: 'cover',
                }}
              />
            ) : (
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: 'linear-gradient(135deg, #f0fdf4, #e0f2fe)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <LocationOnIcon style={{ fontSize: 24, color: '#22c55e' }} />
              </div>
            )}
          </div>
          <div className="mx-2" style={{ minWidth: 0 }}>
            <Text className="fw-bold text-truncate">{place.name}</Text>
            <Text
              className="fw-light fs-6 text-truncate"
              style={{ color: '#666' }}
            >
              {place.description ||
                `${place.position.lat.toFixed(2)}, ${place.position.lng.toFixed(2)}`}
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

export default PlaceCard

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
