import {
  IBot,
  IBotTemplate,
  ITask,
  IVariable,
  validateBot,
} from '@baita/shared'
import {
  AutoFixHigh as AutoFixHighIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  FlashOnSharp as FlashOnSharpIcon,
  History as HistoryIcon,
  MoreVert as MoreVertIcon,
} from '@mui/icons-material'
import Axios from 'axios'
import { FC, useContext } from 'react'
import { useNavigate } from 'react-router-dom'

import Menu from '@/components/menu'
import {
  useDeleteBot,
  useDeployBot,
  usePublishBotTemplate,
} from '@/hooks/useBots'
import { AuthContext } from '@/providers/auth'
import { NotificationContext } from '@/providers/notification'
import { LINKS } from '@/router'
import { computeRunUrl } from '@/utils/bot'
import { getLabels, Labels } from '@/utils/labels'

import BotCard from './botCard'

const Bot: FC<{
  bot: IBot
}> = ({ bot }) => {
  const navigate = useNavigate()
  const { user, isAdmin } = useContext(AuthContext)
  const deleteBot = useDeleteBot()
  const deployBot = useDeployBot()
  const publishBotTemplate = usePublishBotTemplate()
  const { showLoading, showSnack } = useContext(NotificationContext)

  const onNavigateToBot = () => {
    navigate(LINKS.bot(bot.botId))
  }

  const onNavigateToLogs = () => {
    navigate(LINKS.logs(bot.botId))
  }

  const onDeleteBot = () => {
    showLoading(true)
    deleteBot
      .mutateAsync({ botId: bot.botId })
      .finally(() => showLoading(false))
  }

  const onDeployBot = () => {
    if (!bot.active) {
      const { errors } = validateBot(bot)
      if (errors.length) {
        showSnack(errors[0], 'warning')
        return
      }
    }
    showLoading(true)
    deployBot
      .mutateAsync({ ...bot, active: !bot.active })
      .catch((err: { message?: string }) => {
        const message = err?.message || labels.toggleError
        showSnack(message, 'error')
      })
      .finally(() => showLoading(false))
  }

  const onTestBot = (bot: IBot) => {
    const userId = user?.userId || ''
    const runUrl = computeRunUrl(bot.botId, userId)

    showLoading(true)
    Axios.post(runUrl)
      .then((result) => {
        if (result.data.success) {
          showSnack(labels.testSuccess, 'success')
        } else {
          showSnack(labels.testFail, 'error')
        }
      })
      .catch((error) =>
        showSnack(typeof error === 'string' ? error : labels.testFail, 'error')
      )
      .finally(() => showLoading(false))
  }

  const parseBotTemplate = (bot: IBot): IBotTemplate => ({
    name: bot.name,
    image: bot.image,
    modelId: bot.botId,
    author: user?.email || '',
    description: bot.description,
    tasks: bot.tasks.map((task: ITask) => ({
      ...task,
      sampleResult: undefined,
      inputData: task.inputData.map((input: IVariable) => ({
        ...input,
        sampleValue: undefined,
        value: input.type === 'output' ? undefined : input.value,
      })),
    })),
  })

  const onPublishModel = () => {
    showLoading(true)
    publishBotTemplate
      .mutateAsync(parseBotTemplate(bot))
      .then(() => showSnack(labels.publishSuccess, 'success'))
      .catch((error) =>
        showSnack(
          typeof error === 'string' ? error : labels.publishFail,
          'error'
        )
      )
      .finally(() => showLoading(false))
  }

  return (
    <BotCard
      name={bot.name}
      image={bot.image}
      active={bot.active}
      description={bot.description}
      onToggleBot={onDeployBot}
      actionComponent={
        <Menu
          links={[
            {
              label: labels.testButton,
              icon: <FlashOnSharpIcon color="secondary" />,
              onClick: () => onTestBot(bot),
              condition: bot.active,
            },
            {
              label: labels.editButton,
              icon: <EditIcon color="secondary" />,
              onClick: () => onNavigateToBot(),
            },
            {
              label: labels.logsButton,
              icon: <HistoryIcon color="secondary" />,
              onClick: () => onNavigateToLogs(),
            },
            {
              label: labels.publishButton,
              icon: <AutoFixHighIcon color="secondary" />,
              onClick: () => onPublishModel(),
              condition: isAdmin && !bot.modelId,
            },
            {
              label: labels.deleteButton,
              icon: <DeleteIcon color="secondary" />,
              onClick: () => onDeleteBot(),
            },
          ]}
        >
          <MoreVertIcon />
        </Menu>
      }
    />
  )
}

export default Bot

const LABELS: Labels = {
  en: {
    testButton: 'Test',
    testInactiveMessage: 'Bot is inactive',
    testSuccess: 'Test run successfully',
    testFail: 'Test failed',
    toggleError: 'Failed to toggle bot',
    editButton: 'Edit',
    logsButton: 'Logs',
    deleteButton: 'Delete',
    publishButton: 'Publish',
    publishSuccess: 'Model published successfully',
    publishFail: 'Model not published',
  },
  pt: {
    testButton: 'Testar',
    testInactiveMessage: 'Bot está inativado',
    testSuccess: 'Testado com sucesso',
    testFail: 'Testado com falha',
    toggleError: 'Falha ao alternar bot',
    editButton: 'Editar',
    logsButton: 'Logs',
    deleteButton: 'Deletar',
    publishButton: 'Publicar',
    publishSuccess: 'Modelo publicado com sucesso',
    publishFail: 'Modelo publicado com falha',
  },
}

const labels = getLabels(LABELS)
