import { Divider } from '@mui/material'
import { FC, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'

import { ITask, IVariable } from '@baita/shared'
import { getBotInputs, useBot, useUpdateBot } from '@/hooks/useBots'
import CustomInputs from './customInputs'
import ServiceInputs from './serviceInputs'

const TaskInput: FC<{
  taskIndex: number
}> = ({ taskIndex }) => {
  const { botId } = useParams()
  const { data: bot } = useBot(botId)
  const updateBotMutation = useUpdateBot()

  const [task, setTask] = useState<ITask>()

  const updateBotTask = (updatedTask: ITask) => {
    if (bot) {
      const updatedTasks = [...bot.tasks]
      updatedTasks[taskIndex] = updatedTask
      updateBotMutation.mutate({
        botId: bot.botId,
        bot: { ...bot, tasks: updatedTasks },
      })
    }
  }

  const updateBotInputField = (inputField: IVariable) => {
    if (bot && task) {
      const inputDataIndex = task.inputData.findIndex(
        (x) => x.name === inputField.name
      )

      if (inputDataIndex >= 0) {
        task.inputData[inputDataIndex] = inputField
      } else {
        task.inputData.push(inputField)
      }

      updateBotTask(task)
    }
  }

  const updateBotCustomInputField = (
    customFieldId: number,
    inputField: IVariable
  ) => {
    if (bot && task) {
      const inputDataIndex = task.inputData.findIndex(
        (x) => x.customFieldId === customFieldId
      )

      if (inputDataIndex >= 0) {
        task.inputData[inputDataIndex] = inputField
      } else {
        task.inputData.push(inputField)
      }

      updateBotTask(task)
    }
  }

  const addBotInputField = (inputField: IVariable) => {
    if (bot && task) {
      task.inputData.push(inputField)
      updateBotTask(task)
    }
  }

  const deleteBotInputField = (customFieldId: number) => {
    if (bot && task) {
      task.inputData = task.inputData.filter(
        (x) => x.customFieldId !== customFieldId
      )
      updateBotTask(task)
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
          {/***** Service input fields *****/}
          {task.service?.config?.inputFields && (
            <ServiceInputs
              inputData={task.inputData}
              onInputFieldChange={updateBotInputField}
              serviceInputFields={task.service.config.inputFields.filter(
                (x) => !x.customFieldId
              )}
              outputFields={getBotInputs(bot.tasks).filter(
                (x) => x.outputIndex !== undefined && x.outputIndex < taskIndex
              )}
            />
          )}

          {/***** Custom input fields *****/}
          {task.service?.config?.customFields && (
            <>
              <Divider className="my-3" />
              <CustomInputs
                onAddInputField={addBotInputField}
                onDeleteInputField={deleteBotInputField}
                onInputFieldChange={updateBotCustomInputField}
                customInputFields={task.inputData.filter(
                  (x) => x.customFieldId
                )}
                outputFields={getBotInputs(bot.tasks).filter(
                  (x) =>
                    x.outputIndex !== undefined && x.outputIndex < taskIndex
                )}
              />
            </>
          )}
        </>
      )}
    </>
  )
}

export default TaskInput
