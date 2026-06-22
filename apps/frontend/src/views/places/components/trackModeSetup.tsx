import {
  CheckCircle as CheckIcon,
  Close as CloseIcon,
  ContentCopy as CopyIcon,
  Error as ErrorIcon,
  MyLocation as LocationIcon,
} from '@mui/icons-material'
import {
  AppBar,
  Button,
  CircularProgress,
  Dialog,
  IconButton,
  Toolbar,
  Typography,
} from '@mui/material'
import { FC, useContext, useState } from 'react'
import { CopyToClipboard } from 'react-copy-to-clipboard'

import { AuthContext } from '@/providers/auth'
import { NotificationContext } from '@/providers/notification'
import { getLabels, Labels } from '@/utils/labels'
import { getIngestUrl, testLocationConnection } from '@/utils/location'

type TestStatus = 'idle' | 'testing' | 'success' | 'error'

const TrackModeSetup: FC<{
  open: boolean
  onClose: () => void
}> = ({ open, onClose }) => {
  const { user } = useContext(AuthContext)
  const { showSnack } = useContext(NotificationContext)
  const [testStatus, setTestStatus] = useState<TestStatus>('idle')
  const [testMessage, setTestMessage] = useState('')

  const userId = user?.userId || ''
  const ingestUrl = userId ? getIngestUrl(userId) : ''
  const steps = labels._lang === 'pt' ? STEPS_PT : STEPS_EN

  const handleTest = async () => {
    setTestStatus('testing')
    setTestMessage('')

    const result = await testLocationConnection(ingestUrl)

    if (result.success) {
      setTestStatus('success')
      setTestMessage(labels.testSuccess)
      showSnack(labels.testSuccess, 'success')
    } else {
      setTestStatus('error')
      const errorKey = result.message as keyof typeof ERROR_MESSAGES_EN
      const errors =
        labels._lang === 'pt' ? ERROR_MESSAGES_PT : ERROR_MESSAGES_EN
      setTestMessage(errors[errorKey] || errors.connection_failed)
    }
  }

  return (
    <Dialog fullScreen open={open} onClose={onClose}>
      <AppBar sx={{ position: 'relative' }} color="transparent" elevation={0}>
        <Toolbar>
          <IconButton edge="start" onClick={onClose} aria-label="close">
            <CloseIcon />
          </IconButton>
          <Typography sx={{ ml: 1, flex: 1 }} variant="h6" component="div">
            {labels.title}
          </Typography>
        </Toolbar>
      </AppBar>

      <div className="p-4" style={{ maxWidth: 600, margin: '0 auto' }}>
        {/* Hero */}
        <div className="text-center mb-4">
          <LocationIcon
            style={{ fontSize: 48, color: '#22c55e', marginBottom: 12 }}
          />
          <Typography variant="body1" color="text.secondary">
            {labels.valueProp}
          </Typography>
        </div>

        {/* URL Section */}
        <div
          className="p-3 rounded mb-4"
          style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}
        >
          <Typography
            variant="caption"
            className="fw-bold d-block mb-1"
            color="text.secondary"
          >
            {labels.urlLabel}
          </Typography>
          <div className="d-flex align-items-center gap-2">
            <code
              style={{
                fontSize: '0.7rem',
                wordBreak: 'break-all',
                flex: 1,
                color: '#166534',
              }}
            >
              {ingestUrl}
            </code>
            <CopyToClipboard
              text={ingestUrl}
              onCopy={() => showSnack(labels.copied, 'success')}
            >
              <IconButton size="small" color="primary">
                <CopyIcon fontSize="small" />
              </IconButton>
            </CopyToClipboard>
          </div>
        </div>

        {/* Steps */}
        <Typography variant="subtitle2" className="mb-2">
          {labels.stepsTitle}
        </Typography>
        <ol className="ps-3 mb-4" style={{ fontSize: '0.85rem' }}>
          {steps.map((step, i) => (
            <li
              key={i}
              className="mb-2"
              style={{ color: '#444', lineHeight: 1.5 }}
            >
              {step}
            </li>
          ))}
        </ol>

        {/* Test Connection */}
        <div
          className="p-3 rounded mb-4"
          style={{ background: '#fafafa', border: '1px solid #e5e7eb' }}
        >
          <Typography variant="subtitle2" className="mb-2">
            {labels.testTitle}
          </Typography>
          <Typography variant="body2" color="text.secondary" className="mb-2">
            {labels.testDescription}
          </Typography>

          <Button
            variant="contained"
            onClick={handleTest}
            disabled={testStatus === 'testing'}
            startIcon={
              testStatus === 'testing' ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <LocationIcon />
              )
            }
            fullWidth
            sx={{ mb: 1 }}
          >
            {testStatus === 'testing' ? labels.testLoading : labels.testButton}
          </Button>

          {testStatus === 'success' && (
            <div className="d-flex align-items-center gap-1 mt-1">
              <CheckIcon style={{ fontSize: 16, color: '#22c55e' }} />
              <Typography variant="caption" color="success.main">
                {testMessage}
              </Typography>
            </div>
          )}
          {testStatus === 'error' && (
            <div className="d-flex align-items-center gap-1 mt-1">
              <ErrorIcon style={{ fontSize: 16, color: '#ef4444' }} />
              <Typography variant="caption" color="error">
                {testMessage}
              </Typography>
            </div>
          )}
        </div>

        {/* Tips */}
        <Typography variant="subtitle2" className="mb-1">
          {labels.tipsTitle}
        </Typography>
        <ul
          className="ps-3 mb-4"
          style={{ fontSize: '0.82rem', color: '#666' }}
        >
          <li className="mb-1">{labels.tip1}</li>
          <li className="mb-1">{labels.tip2}</li>
          <li className="mb-1">{labels.tip3}</li>
          <li className="mb-1">{labels.tip4}</li>
        </ul>
      </div>
    </Dialog>
  )
}

export default TrackModeSetup

const STEPS_EN = [
  'Open the iPhone Shortcuts app → go to the Automation tab',
  'Tap "+" → choose "Arrive" (or "Leave") → pick a location on the map',
  'Adjust the blue circle to set how close you need to be',
  'Tap "New Blank Automation" → add action "Get Current Location"',
  'Add a second action: "Get Contents of URL" → paste the URL shown above',
  'Tap the chevron (>) to expand → set Method to "POST" → add Request Body as "JSON"',
  'In the JSON body, type: {"points":[{"lat": then insert the Latitude variable, "lng": insert Longitude, "timestamp": insert Current Date as Unix timestamp}],"source":"shortcuts"}',
  'Tap "Done" → back in the list, tap your automation → choose "Run Immediately"',
]

const STEPS_PT = [
  'Abra o app Atalhos do iPhone → vá para a aba Automação',
  'Toque "+" → escolha "Chegar" (ou "Sair") → escolha um local no mapa',
  'Ajuste o círculo azul para definir a proximidade',
  'Toque "Nova Automação" → adicione a ação "Obter Localização Atual"',
  'Adicione segunda ação: "Obter Conteúdo do URL" → cole a URL acima',
  'Toque no chevron (>) → mude Método para "POST" → adicione Corpo como "JSON"',
  'No corpo JSON, escreva: {"points":[{"lat": insira a variável Latitude, "lng": insira Longitude, "timestamp": insira Data Atual como Unix}],"source":"shortcuts"}',
  'Toque "OK" → na lista, toque na automação → escolha "Executar Imediatamente"',
]

const ERROR_MESSAGES_EN: Record<string, string> = {
  permission_denied:
    'Location permission denied. Allow access in your browser settings.',
  position_unavailable: 'Could not determine your position. Try again.',
  timeout: 'Location request timed out. Try again.',
  connection_failed: 'Could not reach the server. Check your internet.',
  unknown_error: 'Something went wrong. Try again.',
}

const ERROR_MESSAGES_PT: Record<string, string> = {
  permission_denied:
    'Permissão de localização negada. Permita nas configurações do navegador.',
  position_unavailable:
    'Não foi possível determinar sua posição. Tente novamente.',
  timeout: 'Tempo esgotado. Tente novamente.',
  connection_failed:
    'Não foi possível conectar ao servidor. Verifique sua internet.',
  unknown_error: 'Algo deu errado. Tente novamente.',
}

const LABELS: Labels = {
  en: {
    title: 'Track Mode',
    valueProp:
      'Automatically detect places you visit, how you move between them, and trigger automations on arrival or departure.',
    urlLabel: 'Your tracking URL (keep this private):',
    copied: 'URL copied!',
    stepsTitle: 'Setup with iPhone Shortcuts',
    testTitle: 'Test the connection',
    testDescription:
      'Send your current location to verify everything is connected correctly.',
    testButton: 'Send test location',
    testLoading: 'Sending...',
    testSuccess: 'Connection verified! Location received.',
    tipsTitle: 'Good to know',
    tip1: 'Create one automation per place you want to track (home, work, gym...)',
    tip2: 'Tracked places will appear automatically in Places → Usual tab',
    tip3: 'The system detects new places and sends you a notification to save them',
    tip4: 'For continuous tracking, use the OwnTracks app (HTTP mode) with the same URL',
    _lang: 'en',
  },
  pt: {
    title: 'Track Mode',
    valueProp:
      'Detete automaticamente os lugares que visita, como se move entre eles, e dispare automações na chegada ou partida.',
    urlLabel: 'A sua URL de rastreamento (mantenha privada):',
    copied: 'URL copiada!',
    stepsTitle: 'Configurar com Atalhos do iPhone',
    testTitle: 'Testar a conexão',
    testDescription:
      'Envie a sua localização atual para verificar se está tudo conectado.',
    testButton: 'Enviar localização de teste',
    testLoading: 'A enviar...',
    testSuccess: 'Conexão verificada! Localização recebida.',
    tipsTitle: 'Bom saber',
    tip1: 'Crie uma automação por lugar que quer rastrear (casa, trabalho, ginásio...)',
    tip2: 'Lugares detetados aparecerão automaticamente em Lugares → aba Habituais',
    tip3: 'O sistema deteta novos lugares e envia-lhe uma notificação para os guardar',
    tip4: 'Para rastreamento contínuo, use o app OwnTracks (modo HTTP) com a mesma URL',
    _lang: 'pt',
  },
}

const labels = getLabels(LABELS)
