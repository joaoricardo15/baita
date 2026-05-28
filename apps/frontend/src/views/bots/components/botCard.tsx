import { Card, Switch } from '@mui/material'
import { FC, ReactNode } from 'react'

import { Text } from '../../../components'
import { getLabels, Labels } from '../../../utils/labels'

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
      <div className="d-flex justify-content-between">
        <div className="d-flex">
          {image && (
            <div style={{ width: 60 }} className="m-3">
              <img width={60} src={image} alt="Bot front image" />
            </div>
          )}
          <div className="mx-2" style={{ margin: 'auto' }}>
            <div className="d-flex align-items-center">
              {name ? (
                <Text className="fw-bold align-self-center">{name}</Text>
              ) : (
                <Text>{labels.noName}</Text>
              )}
              <Switch checked={active} onChange={onToggleBot} />
            </div>
            {description && (
              <Text className="fw-light fs-6">{description}</Text>
            )}
          </div>
        </div>
        {actionComponent}
      </div>

      {/* TODO: Implement input fields logic */}
      {/* <Divider />
      {tasks.map((task) => (
        <div key={task.taskId}>
          {task.inputData
            .filter((input) => input.type === 'text')
            .map((input, inputIndex) => (
              <TextInput
                key={inputIndex}
                label={input.name}
                variant={'standard'}
                value={input.value as string}
                onChange={(value) => {
                  updateBotInputField(task, inputIndex, { ...input, value })
                }}
              />
            ))}
        </div>
      ))} */}
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
