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
  History as HistoryIcon,
  MoreVert as MoreVertIcon,
  SendSharp as TriggerIcon,
} from '@mui/icons-material'
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from '@mui/material'
import Axios from 'axios'
import { FC, useContext, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { Button } from '@/components'
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

  const [triggerOpen, setTriggerOpen] = useState(false)
  const [triggerBody, setTriggerBody] = useState('')
  const [triggerError, setTriggerError] = useState(false)

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

  const onOpenTrigger = () => {
    const sample = bot.triggerSamples?.[0]?.inputData
    setTriggerBody(JSON.stringify(sample || {}, null, 2))
    setTriggerError(false)
    setTriggerOpen(true)
  }

  const onTriggerBodyChange = (value: string) => {
    setTriggerBody(value)
    try {
      JSON.parse(value)
      setTriggerError(false)
    } catch {
      setTriggerError(true)
    }
  }

  const onConfirmTrigger = () => {
    let body: object
    try {
      body = JSON.parse(triggerBody)
    } catch {
      setTriggerError(true)
      return
    }

    setTriggerOpen(false)
    const userId = user?.userId || ''
    const runUrl = computeRunUrl(bot.botId, userId)

    showLoading(true)
    Axios.post(runUrl, body)
      .then((result) => {
        if (result.data.success) {
          showSnack(labels.triggerSuccess, 'success')
        } else {
          showSnack(labels.triggerFail, 'error')
        }
      })
      .catch((error) =>
        showSnack(
          typeof error === 'string' ? error : labels.triggerFail,
          'error'
        )
      )
      .finally(() => showLoading(false))
  }

  const parseBotTemplate = (bot: IBot): IBotTemplate => ({
    name: bot.name,
    image: bot.image,
    templateId: bot.botId,
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
    <>
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
                label: labels.triggerButton,
                icon: <TriggerIcon color="secondary" />,
                onClick: onOpenTrigger,
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
                condition: isAdmin && !bot.templateId,
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

      <Dialog
        open={triggerOpen}
        onClose={() => setTriggerOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>{labels.triggerDialogTitle}</DialogTitle>
        <DialogContent>
          <textarea
            value={triggerBody}
            onChange={(e) => onTriggerBodyChange(e.target.value)}
            spellCheck={false}
            style={{
              width: '100%',
              minHeight: 200,
              fontFamily: 'monospace',
              fontSize: '0.875rem',
              padding: 12,
              border: triggerError ? '1px solid red' : '1px solid #ccc',
              borderRadius: 4,
              resize: 'vertical',
              outline: 'none',
            }}
          />
          {triggerError && (
            <p style={{ color: 'red', fontSize: '0.75rem', marginTop: 4 }}>
              {labels.triggerInvalidJson}
            </p>
          )}
        </DialogContent>
        <DialogActions>
          <Button type="text" onClick={() => setTriggerOpen(false)}>
            {labels.triggerCancel}
          </Button>
          <Button
            type="text"
            color="primary"
            onClick={onConfirmTrigger}
            disabled={triggerError}
          >
            {labels.triggerButton}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default Bot

const LABELS: Labels = {
  en: {
    triggerButton: 'Trigger',
    triggerSuccess: 'Bot triggered successfully',
    triggerFail: 'Trigger failed',
    triggerDialogTitle: 'Trigger with payload',
    triggerInvalidJson: 'Invalid JSON',
    triggerCancel: 'Cancel',
    toggleError: 'Failed to toggle bot',
    editButton: 'Edit',
    logsButton: 'Logs',
    deleteButton: 'Delete',
    publishButton: 'Publish',
    publishSuccess: 'Model published successfully',
    publishFail: 'Model not published',
  },
  pt: {
    triggerButton: 'Disparar',
    triggerSuccess: 'Bot disparado com sucesso',
    triggerFail: 'Falha ao disparar',
    triggerDialogTitle: 'Disparar com payload',
    triggerInvalidJson: 'JSON invalido',
    triggerCancel: 'Cancelar',
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
