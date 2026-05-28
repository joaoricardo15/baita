import { Divider } from '@mui/material'
import { FC, useContext, useEffect, useState } from 'react'

import { ITask } from '../../../../models/bot'
import { IVariable } from '../../../../models/service'
import { BotContext } from '../../../../providers/bot'
import CustomInputs from './customInputs'
import ServiceInputs from './serviceInputs'

const TaskInput: FC<{
  taskIndex: number
}> = ({ taskIndex }) => {
  const { bot, getBotInputs, updateBotTask } = useContext(BotContext)

  const [task, setTask] = useState<ITask>()

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

      updateBotTask(bot.botId, taskIndex, task, false)
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

      updateBotTask(bot.botId, taskIndex, task, false)
    }
  }

  const addBotInputField = (inputField: IVariable) => {
    if (bot && task) {
      task.inputData.push(inputField)
      bot.tasks[taskIndex] = task

      updateBotTask(bot.botId, taskIndex, task)
    }
  }

  const deleteBotInputField = (customFieldId: number) => {
    if (bot && task) {
      task.inputData = task.inputData.filter(
        (x) => x.customFieldId !== customFieldId
      )

      updateBotTask(bot.botId, taskIndex, task)
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
