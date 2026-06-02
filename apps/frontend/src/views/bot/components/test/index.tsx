import { FlashOnSharp as FlashOnSharpIcon } from '@mui/icons-material'
import { FC, useContext, useEffect, useState } from 'react'

import { Button, Highlight, StatusChip, Text } from '@/components'
import { ITask } from '@baita/shared'
import { BotContext } from '@/providers/bot'
import { NotificationContext } from '@/providers/notification'
import { getTimeDiffLabel } from '@/utils/date'
import { getLabels, Labels } from '@/utils/labels'

const TaskTest: FC<{ taskIndex: number }> = ({ taskIndex }) => {
  const { bot, testBotTask } = useContext(BotContext)
  const { showSnack, showLoading } = useContext(NotificationContext)

  const [task, setTask] = useState<ITask>()

  const testTask = (taskIndex: number) => {
    if (bot) {
      showLoading(true)

      testBotTask(bot, taskIndex)
        .then(() => {
          showSnack('Task executed successfully!', 'success')
        })
        .catch((err) => {
          showSnack(`Task failed: ${err.message}`, 'error')
        })
        .finally(() => {
          showLoading(false)
        })
    }
  }

  useEffect(() => {
    if (bot) {
      setTask(bot.tasks[taskIndex])
    }
  }, [bot])

  return (
    <>
      {bot && task && (
        <>
          <div className="d-flex justify-content-between">
            {task.sampleResult ? (
              <div className="d-flex align-items-center">
                <StatusChip status={task.sampleResult.status} />
                <Text className="fw-bold text-primary mx-2">
                  {getTimeDiffLabel(task.sampleResult.timestamp)}
                </Text>
              </div>
            ) : (
              <div></div>
            )}
            <Button
              type="text"
              iconButton
              icon={<FlashOnSharpIcon color="primary" />}
              onClick={() => testTask(taskIndex)}
            ></Button>
          </div>
          {task.sampleResult && (
            <>
              {task.sampleResult.status === 'success' ? (
                <Highlight
                  className="mt-4"
                  data={task.sampleResult.outputData || {}}
                />
              ) : (
                <Text className="mt-4" color="error">
                  {String(task.sampleResult.outputData || labels.noOutputData)}
                </Text>
              )}
            </>
          )}
        </>
      )}
    </>
  )
}

export default TaskTest

const LABELS: Labels = {
  en: {
    noOutputData: 'No output data...',
  },
  pt: {
    noOutputData: 'Nenhum dado de saída...',
  },
}

const labels = getLabels(LABELS)
