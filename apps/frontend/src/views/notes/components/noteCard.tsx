import { INote } from '@baita/shared'
import {
  Delete as DeleteIcon,
  Edit as EditIcon,
  InterestsOutlined as InterestsOutlinedIcon,
  MoreVert as MoreVertIcon,
} from '@mui/icons-material'
import { Card } from '@mui/material'
import { FC } from 'react'

import { Text } from '@/components'
import Menu from '@/components/menu'
import { getTimeDiffLabel } from '@/utils/date'
import { getLabels, Labels } from '@/utils/labels'

const NoteCard: FC<{
  note: INote
  onEdit: () => void
  onDelete: () => void
}> = ({ note, onEdit, onDelete }) => {
  return (
    <Card className="p-2">
      <div className="d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center">
          <div style={{ width: 30 }} className="m-2 d-flex align-items-center">
            <InterestsOutlinedIcon
              style={{ width: 30, height: 30 }}
              color="secondary"
            />
          </div>
          <div className="mx-2" style={{ minWidth: 0, flex: 1 }}>
            <Text className="fw-bold" style={{ lineBreak: 'anywhere' }}>
              {note.title.length > 60
                ? `${note.title.substring(0, 60)}...`
                : note.title}
            </Text>
            <Text className="fw-light fs-6">
              {getTimeDiffLabel(note.updatedAt)}
            </Text>
          </div>
        </div>
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
    </Card>
  )
}

export default NoteCard

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
