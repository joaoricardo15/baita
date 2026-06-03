import { FlashOnSharp as FlashOnSharpIcon } from '@mui/icons-material'
import { Card, IconButton, Switch } from '@mui/material'
import { FC, ReactNode, useState } from 'react'

import { Text } from '@/components'
import { getLabels, Labels } from '@/utils/labels'

const BotCard: FC<{
  name: string
  image?: string
  active?: boolean
  description?: string
  onToggleBot: () => void
  onTestBot?: () => void
  actionComponent?: ReactNode
}> = ({
  name,
  image,
  active = false,
  description,
  onToggleBot,
  onTestBot,
  actionComponent,
}) => {
  const [highlight, setHighlight] = useState(false)

  const handleToggle = () => {
    if (!active) {
      setTimeout(() => {
        setHighlight(true)
        setTimeout(() => setHighlight(false), 1500)
      }, 500)
    }
    onToggleBot()
  }

  return (
    <Card className="p-2">
      <div className="d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center">
          {image && (
            <div style={{ width: 60 }} className="m-3">
              <img width={60} src={image} alt="Bot front image" />
            </div>
          )}
          <div className="mx-2">
            <div className="d-flex align-items-center">
              {name ? (
                <Text className="fw-bold align-self-center">{name}</Text>
              ) : (
                <Text>{labels.noName}</Text>
              )}
              <Switch checked={active} onChange={handleToggle} />
            </div>
            {description && (
              <Text className="fw-light fs-6">{description}</Text>
            )}
          </div>
        </div>
        <div className="d-flex align-items-center">
          {active && onTestBot && (
            <IconButton
              size="small"
              onClick={onTestBot}
              color="secondary"
              className={highlight ? 'animate-pulse-once' : undefined}
            >
              <FlashOnSharpIcon />
            </IconButton>
          )}
          {actionComponent}
        </div>
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
