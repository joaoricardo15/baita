import { FC, useContext, useEffect, useRef, useState } from 'react'

import { OptionsInput } from '../../../../components'
import { IAppConnection } from '../../../../models/app'
import { ITask } from '../../../../models/bot'
import {
  IServiceApp,
  IVariable,
  MethodName,
  ServiceName,
  ServiceType,
} from '../../../../models/service'
import { AppsContext } from '../../../../providers/apps'
import { BotContext } from '../../../../providers/bot'
import { NotificationContext } from '../../../../providers/notification'
import { UserContext } from '../../../../providers/user'
import { getLabels, Labels } from '../../../../utils/labels'
import NewConnection from './newConnection'
import PushNotificationService from './pushNotification'
import WebhookService from './webhook'

const TaskService: FC<{
  taskIndex: number
}> = ({ taskIndex }) => {
  const { services } = useContext(AppsContext)
  const { bot, getBot, updateBotTask } = useContext(BotContext)
  const { showSnack } = useContext(NotificationContext)
  const { retrieveConnections } = useContext(UserContext)

  const [task, setTask] = useState<ITask>()

  const onSelectService = (appService: IServiceApp) => {
    if (bot && task) {
      if (appService) {
        const updatedTask = {
          ...task,
          app: appService.app,
          service: appService.service,
          sampleResult: undefined,
        }
        if (appService.service.config.customFields) {
          updatedTask.inputData = []
        }

        updateBotTask(bot.botId, taskIndex, updatedTask)
      } else {
        const updatedTask = {
          taskId: task.taskId,
          inputData: [],
        }

        updateBotTask(bot.botId, taskIndex, updatedTask)
      }
    }
  }

  const onSelectConnection = (appConnection: IAppConnection) => {
    if (bot && task) {
      task.connectionId = appConnection ? appConnection.connectionId : undefined
      updateBotTask(bot.botId, taskIndex, task)
    }
  }

  const updateBotInputField = (fieldName: string, inputField: IVariable) => {
    if (bot && task) {
      const inputDataIndex = task.inputData.findIndex(
        (x) => x.name === fieldName
      )

      if (inputDataIndex >= 0) {
        task.inputData[inputDataIndex] = inputField
      } else {
        task.inputData.push(inputField)
      }

      updateBotTask(bot.botId, taskIndex, task)
    }
  }

  const pollRef = useRef(false)

  const pollBot = () => {
    if (bot) {
      pollRef.current = true
      let attempts = 0

      const check = () => {
        if (!pollRef.current) return
        getBot(bot.botId).then(() => {
          attempts++
          if (attempts >= 20) pollRef.current = false
          else if (pollRef.current) setTimeout(check, 1000)
        })
      }

      setTimeout(check, 2000)
    }
  }

  useEffect(() => {
    if (bot) {
      setTask(bot.tasks[taskIndex])
    }
  }, [bot])

  useEffect(() => {
    if (pollRef.current && task?.connectionId) {
      pollRef.current = false
      retrieveConnections()
      showSnack(labels.newConnectionSuccess, 'success')
    }
  }, [task?.connectionId])

  return (
    <>
      {bot && task && (
        <div className="d-block w-100">
          {/***** Service information *****/}
          <OptionsInput
            label={labels.chooseService}
            value={task.service?.label || ''}
            onChange={onSelectService}
            groupLabelPath={'app.name'}
            optionLabelPath={'service.label'}
            options={
              taskIndex === 0
                ? services.filter((x) => x.service.type === ServiceType.trigger)
                : services.filter((x) => x.service.type !== ServiceType.trigger)
            }
          />

          {/***** Account information *****/}
          {task.app?.config.auth?.url && (
            <NewConnection
              botId={bot.botId}
              taskIndex={taskIndex}
              appId={task.app?.appId}
              appName={task.app?.name}
              connectionId={task.connectionId}
              appAuthUrl={task.app?.config?.authorizeUrl}
              appLoginUrl={task.app?.config?.loginUrl}
              onSelectConnection={onSelectConnection}
              onNewConnectionAttempt={pollBot}
            />
          )}

          {/***** Webhook specific display *****/}
          {task.service?.name === ServiceName.webhook && (
            <WebhookService triggerUrl={bot.triggerUrl} />
          )}

          {/***** Push notification specific display *****/}
          {task.service?.config?.methodName === MethodName.sendNotification && (
            <PushNotificationService
              inputData={task.inputData}
              updateBotInputField={updateBotInputField}
            />
          )}
        </div>
      )}
    </>
  )
}

export default TaskService

const LABELS: Labels = {
  en: {
    chooseService: 'Choose a task',
    newConnectionSuccess: 'Connection created successfully :)',
  },
  pt: {
    chooseService: 'Escolha uma tarefa',
    newConnectionSuccess: 'Conexão criada com sucesso :)',
  },
}

const labels = getLabels(LABELS)
