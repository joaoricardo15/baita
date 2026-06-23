import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from '@mui/material'
import { FC, useContext, useState } from 'react'

import * as mutations from '@/api/mutations'
import { AuthContext } from '@/providers/auth'
import { NotificationContext } from '@/providers/notification'
import { computeRunUrl } from '@/utils/bot'
import { getLabels, Labels } from '@/utils/labels'

import Button from './button'

const TriggerDialog: FC<{
  open: boolean
  botId: string
  initialPayload?: unknown
  onClose: () => void
}> = ({ open, botId, initialPayload, onClose }) => {
  const { user } = useContext(AuthContext)
  const { showLoading, showSnack } = useContext(NotificationContext)
  const [body, setBody] = useState('')
  const [error, setError] = useState(false)

  const handleOpen = () => {
    setBody(JSON.stringify(initialPayload || {}, null, 2))
    setError(false)
  }

  const handleBodyChange = (value: string) => {
    setBody(value)
    try {
      JSON.parse(value)
      setError(false)
    } catch {
      setError(true)
    }
  }

  const handleConfirm = () => {
    let parsed: object
    try {
      parsed = JSON.parse(body)
    } catch {
      setError(true)
      return
    }

    onClose()
    const userId = user?.userId || ''
    const runUrl = computeRunUrl(botId, userId)

    showLoading(true)
    mutations
      .triggerBotRun(runUrl, parsed)
      .then((result) => {
        if (result.data.success) {
          showSnack(labels.triggerSuccess, 'success')
        } else {
          showSnack(labels.triggerFail, 'error')
        }
      })
      .catch((err) =>
        showSnack(typeof err === 'string' ? err : labels.triggerFail, 'error')
      )
      .finally(() => showLoading(false))
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      TransitionProps={{ onEnter: handleOpen }}
    >
      <DialogTitle>{labels.triggerDialogTitle}</DialogTitle>
      <DialogContent>
        <textarea
          value={body}
          onChange={(e) => handleBodyChange(e.target.value)}
          spellCheck={false}
          style={{
            width: '100%',
            minHeight: 200,
            fontFamily: 'monospace',
            fontSize: '0.875rem',
            padding: 12,
            border: error ? '1px solid red' : '1px solid #ccc',
            borderRadius: 4,
            resize: 'vertical',
            outline: 'none',
          }}
        />
        {error && (
          <p style={{ color: 'red', fontSize: '0.75rem', marginTop: 4 }}>
            {labels.triggerInvalidJson}
          </p>
        )}
      </DialogContent>
      <DialogActions>
        <Button type="text" onClick={onClose}>
          {labels.triggerCancel}
        </Button>
        <Button
          type="text"
          color="primary"
          onClick={handleConfirm}
          disabled={error}
        >
          {labels.triggerButton}
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default TriggerDialog

const LABELS: Labels = {
  en: {
    triggerButton: 'Trigger',
    triggerSuccess: 'Bot triggered successfully',
    triggerFail: 'Trigger failed',
    triggerDialogTitle: 'Trigger with payload',
    triggerInvalidJson: 'Invalid JSON',
    triggerCancel: 'Cancel',
  },
  pt: {
    triggerButton: 'Disparar',
    triggerSuccess: 'Bot disparado com sucesso',
    triggerFail: 'Falha ao disparar',
    triggerDialogTitle: 'Disparar com payload',
    triggerInvalidJson: 'JSON invalido',
    triggerCancel: 'Cancelar',
  },
}

const labels = getLabels(LABELS)
