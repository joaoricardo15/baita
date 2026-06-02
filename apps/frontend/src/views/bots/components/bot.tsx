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

import Menu from '../../../components/menu'
import { IBot, IBotModel } from '@baita/shared'
import { AuthContext } from '../../../providers/auth'
import { BotContext } from '../../../providers/bot'
import { NotificationContext } from '../../../providers/notification'
import { LINKS } from '../../../router'
import { getLabels, Labels } from '../../../utils/labels'
import BotCard from './botCard'

const Bot: FC<{
  bot: IBot
}> = ({ bot }) => {
  const navigate = useNavigate()
  const { user, isAdmin } = useContext(AuthContext)
  const { setBot, deleteBot, deployBot, publishBotModel } =
    useContext(BotContext)
  const { showLoading, showSnack } = useContext(NotificationContext)

  const onNavigateToBot = () => {
    setBot(bot)
    navigate(LINKS.bot(bot.botId))
  }

  const onNavigateToLogs = () => {
    setBot(bot)
    navigate(LINKS.logs(bot.botId))
  }

  const onDeleteBot = () => {
    showLoading(true)
    deleteBot(bot.botId, bot.apiId).then(() => showLoading(false))
  }

  const onDeployBot = () => {
    showLoading(true)
    deployBot({ ...bot, active: !bot.active }).then(() => showLoading(false))
  }

  const onTestBot = (bot: IBot) => {
    if (!bot.active) {
      showSnack(labels.testInactiveMessage)
    } else {
      showLoading(true)
      Axios.post(bot.triggerUrl)
        .then((result) => {
          if (result.data.success) {
            showSnack(labels.testSuccess, 'success')
          } else {
            showSnack(labels.testFail, 'error')
          }
        })
        .catch((error) =>
          showSnack(
            typeof error === 'string' ? error : labels.testFail,
            'error'
          )
        )
        .finally(() => showLoading(false))
    }
  }

  const parseModelBot = (bot: IBot): IBotModel => ({
    name: bot.name,
    image: bot.image,
    modelId: bot.botId,
    author: user?.email || '',
    description: bot.description,
    tasks: bot.tasks.map((task: any) => ({
      ...task,
      sampleResult: undefined,
      inputData: task.inputData.map((input: any) => ({
        ...input,
        sampleValue: undefined,
        value: input.type === 'output' ? undefined : input.value,
      })),
    })),
  })

  const onPublishModel = () => {
    showLoading(true)
    publishBotModel(parseModelBot(bot))
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
            },
            {
              label: labels.editButton,
              icon: <EditIcon color="secondary" />,
              onClick: () => onNavigateToBot(),
              condition: isAdmin && !bot.modelId,
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
    editButton: 'Editar',
    logsButton: 'Logs',
    deleteButton: 'Deletar',
    publishButton: 'Publicar',
    publishSuccess: 'Modelo publicado com sucesso',
    publishFail: 'Modelo publicado com falha',
  },
}

const labels = getLabels(LABELS)
