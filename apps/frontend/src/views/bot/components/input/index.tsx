import { ITask, IVariable } from '@baita/shared'
import { Divider } from '@mui/material'
import { FC, useMemo } from 'react'
import { useParams } from 'react-router-dom'

import { getBotInputs, useBot, useUpdateBot } from '@/hooks/useBots'

import CustomInputs from './customInputs'
import ServiceInputs from './serviceInputs'

const TaskInput: FC<{
  taskIndex: number
}> = ({ taskIndex }) => {
  const { botId } = useParams()
  const { data: bot } = useBot(botId)
  const updateBotMutation = useUpdateBot()

  const task = bot?.tasks[taskIndex]

  const outputFields = useMemo(
    () =>
      bot
        ? getBotInputs(bot.tasks).filter(
            (x) => x.outputIndex !== undefined && x.outputIndex < taskIndex
          )
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [bot?.tasks, taskIndex]
  )

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
      const updatedInputData = [...task.inputData]
      const inputDataIndex = updatedInputData.findIndex(
        (x) => x.name === inputField.name
      )

      if (inputDataIndex >= 0) {
        updatedInputData[inputDataIndex] = inputField
      } else {
        updatedInputData.push(inputField)
      }

      updateBotTask({ ...task, inputData: updatedInputData })
    }
  }

  const updateBotCustomInputField = (
    customFieldId: number,
    inputField: IVariable
  ) => {
    if (bot && task) {
      const updatedInputData = [...task.inputData]
      const inputDataIndex = updatedInputData.findIndex(
        (x) => x.customFieldId === customFieldId
      )

      if (inputDataIndex >= 0) {
        updatedInputData[inputDataIndex] = inputField
      } else {
        updatedInputData.push(inputField)
      }

      updateBotTask({ ...task, inputData: updatedInputData })
    }
  }

  const addBotInputField = (inputField: IVariable) => {
    if (bot && task) {
      updateBotTask({ ...task, inputData: [...task.inputData, inputField] })
    }
  }

  const deleteBotInputField = (customFieldId: number) => {
    if (bot && task) {
      updateBotTask({
        ...task,
        inputData: task.inputData.filter(
          (x) => x.customFieldId !== customFieldId
        ),
      })
    }
  }

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
              outputFields={outputFields}
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
                outputFields={outputFields}
              />
            </>
          )}
        </>
      )}
    </>
  )
}

export default TaskInput
