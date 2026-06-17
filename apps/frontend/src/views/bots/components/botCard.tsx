import { Card, Switch } from '@mui/material'
import { FC, ReactNode } from 'react'

import { Text } from '@/components'
import { getLabels, Labels } from '@/utils/labels'

const BotCard: FC<{
  name: string
  image?: string
  active?: boolean
  description?: string
  onToggleBot: () => void
  actionComponent?: ReactNode
}> = ({
  name,
  image,
  active = false,
  description,
  onToggleBot,
  actionComponent,
}) => {
  return (
    <Card className="p-2">
      <div className="d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center overflow-hidden">
          <div style={{ width: 60, minWidth: 60 }} className="m-3">
            {image ? (
              <img width={60} src={image} alt="Bot front image" />
            ) : (
              <span
                style={{
                  display: 'block',
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  border: '2px dashed #d1d5db',
                  margin: '0 auto',
                }}
              />
            )}
          </div>
          <div className="mx-2" style={{ minWidth: 0 }}>
            <div className="d-flex align-items-center">
              {name ? (
                <Text className="fw-bold text-truncate">{name}</Text>
              ) : (
                <Text>{labels.noName}</Text>
              )}
              <Switch checked={active} onChange={onToggleBot} size="small" />
            </div>
            {description && (
              <Text className="fw-light fs-6 text-truncate">{description}</Text>
            )}
          </div>
        </div>
        {actionComponent}
      </div>
    </Card>
  )
}

export default BotCard

const LABELS: Labels = {
  en: {
    noName: 'No name bot',
  },
  pt: {
    noName: 'Bot sem nome',
  },
}

const labels = getLabels(LABELS)
