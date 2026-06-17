import {
  IConnection,
  IServiceApp,
  ITask,
  IVariable,
  MethodName,
  ServiceName,
  ServiceType,
} from '@baita/shared'
import { FC, useContext } from 'react'
import { useParams } from 'react-router-dom'

import { OptionsInput } from '@/components'
import { useBot, useUpdateBot } from '@/hooks/useBots'
import { AppsContext } from '@/providers/apps'
import { AuthContext } from '@/providers/auth'
import { computeRunUrl } from '@/utils/bot'
import { getLabels, Labels } from '@/utils/labels'

import IPhoneSetupGuide from './iphoneSetupGuide'
import NewConnection from './newConnection'
import PushNotificationService from './pushNotification'
import WebhookService from './webhook'

const TaskService: FC<{
  taskIndex: number
}> = ({ taskIndex }) => {
  const { botId } = useParams()
  const { services } = useContext(AppsContext)
  const { user } = useContext(AuthContext)
  const { data: bot } = useBot(botId)
  const updateBot = useUpdateBot()
  const userId = user?.userId || ''

  const task = bot?.tasks[taskIndex]

  const updateBotTask = (
    botId: string,
    taskIndex: number,
    updatedTask: ITask
  ) => {
    if (bot) {
      const updatedTasks = [...bot.tasks]
      updatedTasks[taskIndex] = updatedTask
      updateBot.mutate({ botId, bot: { ...bot, tasks: updatedTasks } })
    }
  }

  const onSelectService = (appService: IServiceApp | null) => {
    if (bot && task) {
      if (appService) {
        const sameApp = task.app?.appId === appService.app.appId
        updateBotTask(bot.botId, taskIndex, {
          taskId: task.taskId,
          app: appService.app,
          service: appService.service,
          inputData: [],
          connectionId: sameApp ? task.connectionId : undefined,
        })
      } else {
        updateBotTask(bot.botId, taskIndex, {
          taskId: task.taskId,
          inputData: [],
        })
      }
    }
  }

  const onSelectConnection = (appConnection: IConnection) => {
    if (bot && task) {
      updateBotTask(bot.botId, taskIndex, {
        ...task,
        connectionId: appConnection ? appConnection.connectionId : undefined,
      })
    }
  }

  const updateBotInputField = (fieldName: string, inputField: IVariable) => {
    if (bot && task) {
      const updatedInputData = [...task.inputData]
      const idx = updatedInputData.findIndex((x) => x.name === fieldName)
      if (idx >= 0) updatedInputData[idx] = inputField
      else updatedInputData.push(inputField)
      updateBotTask(bot.botId, taskIndex, {
        ...task,
        inputData: updatedInputData,
      })
    }
  }

  const refreshAfterConnection = () => {
    // No-op: useBot query will refetch automatically via queryClient
  }

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

          {/***** Webhook specific display (not for phoneEvent — URL is in the guide) *****/}
          {task.service?.name === ServiceName.webhook && (
            <WebhookService botId={bot.botId} userId={userId} />
          )}

          {/***** iPhone automation setup guide *****/}
          {task.service?.name === ServiceName.phoneEvent && (
            <IPhoneSetupGuide
              template="alarm-stopped"
              webhookUrl={computeRunUrl(bot.botId, userId)}
            />
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
