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
                  width: 60,
                  height: 60,
                  borderRadius: 8,
                  objectFit: 'cover',
                }}
              />
            ) : (
              <LocationOnIcon style={{ fontSize: 32, color: '#bbb' }} />
            )}
          </div>
          <div className="mx-2" style={{ minWidth: 0 }}>
            <Text className="fw-bold text-truncate">{place.name}</Text>
            {place.description && (
              <Text className="fw-light fs-6 text-truncate">
                {place.description}
              </Text>
            )}
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
