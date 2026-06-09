import { FC } from 'react'
import { useParams } from 'react-router-dom'

import { ITask, ServiceName, ServiceType } from '@baita/shared'
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateTaskOptions = (fieldName: string, value: any) => {
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
              inputs={getBotInputs(bot.tasks)}
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
