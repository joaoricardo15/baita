import { ITask, ServiceName, ServiceType } from '@baita/shared'
import { FC, useMemo } from 'react'
import { useParams } from 'react-router-dom'

import { getBotInputs, useBot, useUpdateBot } from '@/hooks/useBots'

import ExtraOptions from './extraOptions'
import FilterConditions from './filterConditions'

const TaskOptions: FC<{
  taskIndex: number
}> = ({ taskIndex }) => {
  const { botId } = useParams()
  const { data: bot } = useBot(botId)
  const updateBotMutation = useUpdateBot()

  const task = bot?.tasks[taskIndex]

  const inputs = useMemo(
    () => (bot ? getBotInputs(bot.tasks) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bot?.tasks]
  )

  const updateTaskOptions = (fieldName: string, value: unknown) => {
    if (bot && task) {
      const updatedTask = { ...task, [fieldName]: value } as ITask
      const updatedTasks = [...bot.tasks]
      updatedTasks[taskIndex] = updatedTask
      updateBotMutation.mutate({
        botId: bot.botId,
        bot: { ...bot, tasks: updatedTasks },
      })
    }
  }

  return (
    <>
      {bot && task && (
        <>
          {/***** Filter conditions *****/}
          {task.service?.type !== ServiceType.trigger && task.conditions && (
            <FilterConditions
              task={task}
              taskIndex={taskIndex}
              inputs={inputs}
              onTaskFieldChange={updateTaskOptions}
            />
          )}

          {/***** Extra options *****/}
          <ExtraOptions
            task={task}
            onTaskFieldChange={updateTaskOptions}
            showReturnDataOption={
              bot.tasks[0].service?.name === ServiceName.webhook
            }
          />
        </>
      )}
    </>
  )
}

export default TaskOptions
