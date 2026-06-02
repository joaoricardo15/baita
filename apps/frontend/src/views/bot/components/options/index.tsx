import { FC, useContext, useEffect, useState } from 'react'

import { ITask } from '@baita/shared'
import { ServiceName, ServiceType } from '@baita/shared'
import { BotContext } from '@/providers/bot'
import ExtraOptions from './extraOptions'
import FilterConditions from './filterConditions'

const TaskOptions: FC<{
  taskIndex: number
}> = ({ taskIndex }) => {
  const { bot, getBotInputs, updateBotTask } = useContext(BotContext)

  const [task, setTask] = useState<ITask>()

  const updateTaskOptions = (fieldName: string, value: any) => {
    if (bot) {
      const updatedTask = { ...task, [fieldName]: value } as ITask
      updateBotTask(bot.botId, taskIndex, updatedTask, false)
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
