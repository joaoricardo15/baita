import { FlashOnSharp as FlashOnSharpIcon } from '@mui/icons-material'
import { FC, useContext, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import { Button, Highlight, StatusChip, Text } from '@/components'
import { getTaskLabel, ITask, validateBot } from '@baita/shared'
import { useBot, useTestBotTask } from '@/hooks/useBots'
import { NotificationContext } from '@/providers/notification'
import { getTimeDiffLabel } from '@/utils/date'
import { getLabels, Labels } from '@/utils/labels'

const TaskTest: FC<{ taskIndex: number }> = ({ taskIndex }) => {
  const { botId } = useParams()
  const { data: bot } = useBot(botId)
  const testBotTask = useTestBotTask()
  const { showSnack, showLoading } = useContext(NotificationContext)

  const [task, setTask] = useState<ITask>()

  const testTask = (taskIndex: number) => {
    if (bot) {
      const { errors } = validateBot(bot)
      const stepLabel = getTaskLabel(taskIndex)
      const taskErrors = errors.filter((e) => e.startsWith(`${stepLabel}:`))
      if (taskErrors.length) {
        showSnack(taskErrors[0], 'warning')
        return
      }

      showLoading(true)
      testBotTask
        .mutateAsync({ bot, taskIndex })
        .then(() => {
          showSnack(labels.testSuccess, 'success')
        })
        .catch((err: { message?: string }) => {
          showSnack(err?.message || labels.testFail, 'error')
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
    testSuccess: 'Task executed successfully!',
    testFail: 'Task execution failed',
  },
  pt: {
    noOutputData: 'Nenhum dado de saída...',
    testSuccess: 'Tarefa executada com sucesso!',
    testFail: 'Falha na execução da tarefa',
  },
}

const labels = getLabels(LABELS)
