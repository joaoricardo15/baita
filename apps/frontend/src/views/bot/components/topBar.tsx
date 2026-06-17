import { validateBot } from '@baita/shared'
import {
  ArrowBack as ArrowBackIcon,
  AutoFixHigh as AutoFixHighIcon,
  CloudDone as CloudDoneIcon,
  CloudOff as CloudOffIcon,
  Delete as DeleteIcon,
  History as HistoryIcon,
  MoreVert as MoreVertIcon,
  SendSharp as TriggerIcon,
} from '@mui/icons-material'
import { Switch } from '@mui/material'
import { FC, useContext, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { Button, TextInput } from '@/components'
import Menu from '@/components/menu'
import TriggerDialog from '@/components/triggerDialog'
import {
  useBot,
  useDeleteBot,
  useDeployBot,
  useUpdateBot,
} from '@/hooks/useBots'
import { useBotSaveStatus } from '@/hooks/useBotSaveStatus'
import { AuthContext } from '@/providers/auth'
import { NotificationContext } from '@/providers/notification'
import { LINKS } from '@/router'
import { getLabels, Labels } from '@/utils/labels'

const TopBar: FC<{
  name: string
  image?: string
  description?: string
  isActive: boolean
}> = ({ name, description, image, isActive }) => {
  const { botId } = useParams()
  const navigate = useNavigate()
  const { isAdmin } = useContext(AuthContext)
  const { showLoading, showSnack } = useContext(NotificationContext)
  const { data: bot } = useBot(botId)
  const updateBot = useUpdateBot()
  const deployBot = useDeployBot()
  const deleteBot = useDeleteBot()
  const saveStatus = useBotSaveStatus()

  const [botName, setBotName] = useState(name)
  const [botDescription, setBotDescription] = useState(description)
  const [botImage, setBotImage] = useState(image)
  const [triggerOpen, setTriggerOpen] = useState(false)

  const onNameChange = (name: string) => {
    if (bot && name !== bot.name) {
      updateBot.mutate({ botId: bot.botId, bot: { ...bot, name } })
    }
  }

  const onDescriptionChange = (description?: string) => {
    if (bot && description !== bot.description) {
      updateBot.mutate({ botId: bot.botId, bot: { ...bot, description } })
    }
  }

  const onImageChange = (image?: string) => {
    if (bot && image !== bot.image) {
      updateBot.mutate({ botId: bot.botId, bot: { ...bot, image } })
    }
  }

  const onToggleBot = () => {
    if (bot) {
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
  }

  const onDeleteBot = () => {
    if (bot) {
      showLoading(true)
      deleteBot
        .mutateAsync({ botId: bot.botId })
        .then(() => navigate(LINKS.bots))
        .finally(() => showLoading(false))
    }
  }

  const menuLinks = [
    {
      label: labels.triggerButton,
      icon: <TriggerIcon color="secondary" />,
      onClick: () => setTriggerOpen(true),
      condition: isActive,
    },
    {
      label: labels.logsButton,
      icon: <HistoryIcon color="secondary" />,
      onClick: () => bot && navigate(LINKS.logs(bot.botId)),
    },
    {
      label: labels.publishButton,
      icon: <AutoFixHighIcon color="secondary" />,
      onClick: () => {},
      condition: isAdmin && !bot?.templateId,
    },
    {
      label: labels.deleteButton,
      icon: <DeleteIcon color="secondary" />,
      onClick: onDeleteBot,
    },
  ]

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mx-2">
        <div className="d-flex align-items-center overflow-hidden">
          <Button
            iconButton
            onClick={() => navigate(LINKS.bots)}
            icon={<ArrowBackIcon color="secondary" />}
          />
          <TextInput
            value={botName}
            fitContent
            variant="fw-bold text-primary"
            placeholder={labels.namePlaceholder}
            onChange={setBotName}
            onBlur={() => onNameChange(botName)}
          />
          <Switch checked={isActive} onChange={onToggleBot} size="small" />
          <div
            className="d-flex align-items-center ms-1"
            style={{ width: 20, minWidth: 20 }}
          >
            {saveStatus === 'saved' && (
              <CloudDoneIcon
                color="success"
                style={{ fontSize: 18 }}
                className="animate-fade-in-out"
              />
            )}
            {saveStatus === 'error' && (
              <CloudOffIcon color="error" style={{ fontSize: 18 }} />
            )}
          </div>
        </div>
        <Menu links={menuLinks}>
          <MoreVertIcon />
        </Menu>
      </div>
      <div className="d-flex align-items-center">
        {botImage && (
          <div style={{ width: 50 }} className="m-3">
            <img width={50} src={botImage} alt="Bot icon" />
          </div>
        )}
        <div className="w-100">
          <TextInput
            className="mx-2"
            variant="text-primary"
            value={botDescription}
            placeholder={labels.description}
            onChange={(value) => setBotDescription(value)}
            onBlur={() => onDescriptionChange(botDescription)}
          />
          <TextInput
            className="mx-2"
            variant="fs-6 text-primary"
            value={botImage}
            placeholder={labels.icon}
            onChange={(value) => setBotImage(value)}
            onBlur={() => onImageChange(botImage)}
          />
        </div>
      </div>

      {bot && (
        <TriggerDialog
          open={triggerOpen}
          botId={bot.botId}
          initialPayload={bot.triggerSamples?.[0]?.inputData}
          onClose={() => setTriggerOpen(false)}
        />
      )}
    </>
  )
}

export default TopBar

const LABELS: Labels = {
  en: {
    namePlaceholder: "Bot's name",
    toggleError: 'Failed to deploy bot',
    description: 'Description',
    icon: 'Icon url',
    triggerButton: 'Trigger',
    logsButton: 'Logs',
    deleteButton: 'Delete',
    publishButton: 'Publish',
  },
  pt: {
    namePlaceholder: 'Nome do bot',
    toggleError: 'Falha ao alternar bot',
    description: 'Descrição',
    icon: 'Url do ícone',
    triggerButton: 'Disparar',
    logsButton: 'Logs',
    deleteButton: 'Deletar',
    publishButton: 'Publicar',
  },
}

const labels = getLabels(LABELS)
