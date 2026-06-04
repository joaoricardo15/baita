import { FC, useContext, useEffect, useState } from 'react'

import { OptionsInput } from '@/components'
import {
  IAppConnection,
  IServiceApp,
  ITask,
  IVariable,
  MethodName,
  ServiceName,
  ServiceType,
} from '@baita/shared'
import { AppsContext } from '@/providers/apps'
import { BotContext } from '@/providers/bot'
import { getLabels, Labels } from '@/utils/labels'
import NewConnection from './newConnection'
import PushNotificationService from './pushNotification'
import WebhookService from './webhook'

const TaskService: FC<{
  taskIndex: number
}> = ({ taskIndex }) => {
  const { services } = useContext(AppsContext)
  const { bot, getBot, updateBotTask } = useContext(BotContext)

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

  const refreshAfterConnection = () => {
    if (bot) {
      getBot(bot.botId)
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
        <div className="d-block w-100">
          {/***** Service information *****/}
          <OptionsInput
            label={labels.chooseService}
            value={task.service?.label || ''}
            onChange={onSelectService}
            groupLabelPath={'app.name'}
            optionLabelPath={'service.label'}
            renderGroup={(params) => {
              const filteredServices =
                taskIndex === 0
                  ? services.filter(
                      (x) => x.service.type === ServiceType.trigger
                    )
                  : services.filter(
                      (x) => x.service.type !== ServiceType.trigger
                    )
              const appIcon = filteredServices.find(
                (s) => s.app.name === params.group
              )?.app.icon

              return (
                <li key={params.key}>
                  <div className="d-flex align-items-center px-3 py-2 bg-light">
                    {appIcon && (
                      <img
                        src={appIcon}
                        alt=""
                        className="me-2"
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 4,
                          objectFit: 'contain',
                        }}
                      />
                    )}
                    <span className="fw-bold" style={{ fontSize: '0.85rem' }}>
                      {params.group}
                    </span>
                  </div>
                  <ul className="p-0 m-0">{params.children}</ul>
                </li>
              )
            }}
            renderOption={(props, option: IServiceApp) => (
              <li
                {...props}
                style={{
                  ...props.style,
                  padding: '10px 16px 10px 32px',
                }}
              >
                <div>
                  <div style={{ fontWeight: 500, fontSize: '0.9rem' }}>
                    {option.service.label}
                  </div>
                  {option.service.description && (
                    <div
                      style={{
                        fontSize: '0.75rem',
                        color: '#888',
                        marginTop: 2,
                      }}
                    >
                      {option.service.description}
                    </div>
                  )}
                </div>
              </li>
            )}
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
              connectionId={task.connectionId}
              onSelectConnection={onSelectConnection}
              onNewConnectionAttempt={refreshAfterConnection}
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
