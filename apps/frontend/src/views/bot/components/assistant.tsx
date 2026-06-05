import { AutoAwesome as AiIcon, Send as SendIcon } from '@mui/icons-material'
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Paper,
  TextField,
  Typography,
} from '@mui/material'
import { FC, useState } from 'react'

import { IBot, ITask } from '@baita/shared'
import { useUpdateBot } from '@/hooks/useBots'
import {
  AiMessage,
  buildMessagesWithContext,
  buildRetryMessage,
  getAiService,
  parseTaskFromResponse,
} from '@/utils/ai'
import { getLabels, Labels } from '@/utils/labels'

const MAX_ATTEMPTS = 3

interface GenerateResult {
  success: boolean
  task?: ITask
  errors?: string[]
  rawResponse: string
}

async function generateAndValidate(
  service: { generate: (messages: AiMessage[]) => Promise<string> },
  messages: AiMessage[],
  taskIndex: number
): Promise<GenerateResult> {
  console.warn('[AI Assistant] Sending messages to LLM:', messages)
  const rawResponse = await service.generate(messages)
  console.warn('[AI Assistant] Raw LLM response:', rawResponse)

  const task = parseTaskFromResponse(rawResponse)
  console.warn('[AI Assistant] Parsed task:', task)

  if (!task) {
    return {
      success: false,
      errors: [
        'Failed to parse JSON. Output must be a single task object in a ```json code block.',
      ],
      rawResponse,
    }
  }

  if (!task.service) {
    return {
      success: false,
      errors: ['Task is missing "service" field.'],
      rawResponse,
    }
  }

  if (taskIndex === 0 && task.service.type !== 'trigger') {
    return {
      success: false,
      errors: ['First task must have service.type="trigger".'],
      rawResponse,
    }
  }

  if (taskIndex > 0 && task.service.type !== 'invoke') {
    return {
      success: false,
      errors: ['This task must have service.type="invoke".'],
      rawResponse,
    }
  }

  return { success: true, task, rawResponse }
}

const BotAssistant: FC<{ bot: IBot; task: ITask; taskIndex: number }> = ({
  bot,
  task,
  taskIndex,
}) => {
  const updateBot = useUpdateBot()
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [proposedTask, setProposedTask] = useState<ITask | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSend = async () => {
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    setLoading(true)
    setError(null)

    try {
      const service = await getAiService()
      if (!service) throw new Error('AI not available')

      let currentMessages = buildMessagesWithContext(userMessage, task)
      let lastResult: GenerateResult | null = null

      for (let i = 0; i < MAX_ATTEMPTS; i++) {
        lastResult = await generateAndValidate(
          service,
          currentMessages,
          taskIndex
        )

        console.warn(
          `[AI Assistant] Attempt ${i + 1}/${MAX_ATTEMPTS}`,
          lastResult.success ? 'SUCCESS' : 'FAILED',
          { errors: lastResult.errors }
        )

        if (lastResult.success && lastResult.task) {
          setProposedTask(lastResult.task)
          setDialogOpen(true)
          break
        }

        if (i < MAX_ATTEMPTS - 1) {
          currentMessages = [
            ...currentMessages,
            { role: 'assistant' as const, content: lastResult.rawResponse },
            buildRetryMessage(lastResult.rawResponse, lastResult.errors || []),
          ]
        }
      }

      if (lastResult && !lastResult.success) {
        setError(lastResult.errors?.[0] || labels.error)
      }
    } catch {
      setError(labels.error)
    } finally {
      setLoading(false)
    }
  }

  const handleApply = () => {
    if (!proposedTask) return
    const updatedTasks = [...bot.tasks]
    updatedTasks[taskIndex] = proposedTask
    updateBot.mutate({ botId: bot.botId, bot: { ...bot, tasks: updatedTasks } })
    setDialogOpen(false)
    setProposedTask(null)
  }

  return (
    <>
      <Paper
        elevation={3}
        sx={{
          position: 'fixed',
          bottom: 8,
          left: 8,
          right: 8,
          p: 1,
          borderRadius: 2,
          zIndex: 1000,
        }}
      >
        {error && (
          <Typography
            variant="caption"
            color="error"
            sx={{ display: 'block', mb: 0.5 }}
          >
            {error}
          </Typography>
        )}
        <Box className="d-flex align-items-center gap-1">
          <AiIcon fontSize="small" color="primary" sx={{ mx: 0.5 }} />
          <TextField
            fullWidth
            size="small"
            variant="standard"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
            placeholder={labels.inputPlaceholder}
            disabled={loading}
            InputProps={{ disableUnderline: true }}
          />
          {loading ? (
            <CircularProgress size={20} />
          ) : (
            <IconButton
              onClick={handleSend}
              disabled={!input.trim()}
              color="primary"
              size="small"
            >
              <SendIcon fontSize="small" />
            </IconButton>
          )}
        </Box>
      </Paper>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{labels.dialogTitle}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" className="mb-2">
            {labels.dialogBody}
          </Typography>
          <Paper
            variant="outlined"
            sx={{ p: 1.5, maxHeight: 300, overflow: 'auto' }}
          >
            <Typography
              variant="caption"
              component="pre"
              sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}
            >
              {JSON.stringify(proposedTask, null, 2)}
            </Typography>
          </Paper>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>{labels.cancel}</Button>
          <Button onClick={handleApply} variant="contained">
            {labels.apply}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

const LABELS: Labels = {
  en: {
    inputPlaceholder: 'Edit this task...',
    error: 'Something went wrong. Try again.',
    dialogTitle: 'Apply changes?',
    dialogBody: 'Review the modified task:',
    apply: 'Apply',
    cancel: 'Cancel',
  },
  pt: {
    inputPlaceholder: 'Editar esta tarefa...',
    error: 'Algo deu errado. Tente novamente.',
    dialogTitle: 'Aplicar mudanças?',
    dialogBody: 'Revise a tarefa modificada:',
    apply: 'Aplicar',
    cancel: 'Cancelar',
  },
}

const labels = getLabels(LABELS)

export default BotAssistant
