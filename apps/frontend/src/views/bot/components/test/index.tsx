import { getTaskLabel, IBot, validateBot } from '@baita/shared'
import { FlashOnSharp as FlashOnSharpIcon } from '@mui/icons-material'
import { FC, useContext } from 'react'
import { useParams } from 'react-router-dom'

import { Button, Highlight, StatusChip, Text } from '@/components'
import { useBot, useTestBotTask } from '@/hooks/useBots'
import { NotificationContext } from '@/providers/notification'
import { getTimeDiffLabel } from '@/utils/date'
import { getLabels, Labels } from '@/utils/labels'

const TaskTest: FC<{ taskIndex: number }> = ({ taskIndex }) => {
  const { botId } = useParams()
  const { data: bot } = useBot(botId)
  const testBotTask = useTestBotTask()
  const { showSnack, showLoading } = useContext(NotificationContext)

  const task = bot?.tasks[taskIndex]

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
        .then((updatedBot: IBot) => {
          const result = updatedBot.tasks[taskIndex]?.sampleResult
          if (result?.status === 'fail') {
            showSnack(labels.testFail, 'error')
          } else if (!result?.outputData) {
            showSnack(labels.noData, 'info')
          } else {
            showSnack(labels.testSuccess, 'success')
          }
        })
        .catch((err: { message?: string }) => {
          showSnack(err?.message || labels.testFail, 'error')
        })
        .finally(() => {
          showLoading(false)
        })
    }
  }

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
          {task.sampleResult &&
            (task.sampleResult.outputData ? (
              <Highlight className="mt-4" data={task.sampleResult.outputData} />
            ) : (
              <Text className="mt-4 text-secondary fst-italic">
                {labels.noData}
              </Text>
            ))}
        </>
      )}
    </>
  )
}

export default TaskTest

const LABELS: Labels = {
  en: {
    noData: 'No data received yet — send a request to the trigger URL',
    testSuccess: 'Task executed successfully!',
    testFail: 'Task execution failed',
  },
  pt: {
    noData: 'Nenhum dado recebido ainda — envie uma requisição para a URL',
    testSuccess: 'Tarefa executada com sucesso!',
    testFail: 'Falha na execução da tarefa',
  },
}

const labels = getLabels(LABELS)
