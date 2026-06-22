import {
  CheckCircle as CheckIcon,
  ContentCopy as CopyIcon,
  Error as ErrorIcon,
  MyLocation as LocationIcon,
} from '@mui/icons-material'
import { Button, CircularProgress } from '@mui/material'
import { FC, useContext, useState } from 'react'
import { CopyToClipboard } from 'react-copy-to-clipboard'

import { NotificationContext } from '@/providers/notification'
import { getLabels, Labels } from '@/utils/labels'
import { testLocationConnection } from '@/utils/location'

type TestStatus = 'idle' | 'testing' | 'success' | 'error'

const LocationSetupGuide: FC<{
  ingestUrl: string
}> = ({ ingestUrl }) => {
  const { showSnack } = useContext(NotificationContext)
  const [testStatus, setTestStatus] = useState<TestStatus>('idle')
  const [testMessage, setTestMessage] = useState('')

  const steps = labels._lang === 'pt' ? STEPS_PT : STEPS_EN

  const handleTest = async () => {
    setTestStatus('testing')
    setTestMessage('')

    const result = await testLocationConnection(ingestUrl)

    if (result.success) {
      setTestStatus('success')
      setTestMessage(labels.testSuccess)
    } else {
      setTestStatus('error')
      const errorKey = result.message as keyof typeof ERROR_MESSAGES_EN
      const errors =
        labels._lang === 'pt' ? ERROR_MESSAGES_PT : ERROR_MESSAGES_EN
      setTestMessage(errors[errorKey] || errors.connection_failed)
    }
  }

  return (
    <div className="mt-3 p-3 rounded" style={{ background: '#f8f9fa' }}>
      {/* Header */}
      <div className="d-flex align-items-center mb-2">
        <LocationIcon
          style={{ fontSize: 20, marginRight: 8, color: '#22c55e' }}
        />
        <span className="fw-bold" style={{ fontSize: '0.85rem' }}>
          {labels.title}
        </span>
      </div>

      {/* Value prop */}
      <p
        className="mb-3"
        style={{ fontSize: '0.8rem', color: '#666', margin: 0 }}
      >
        {labels.valueProp}
      </p>

      {/* Setup steps */}
      <p className="mb-1 fw-bold" style={{ fontSize: '0.8rem', color: '#333' }}>
        {labels.stepsTitle}
      </p>
      <ol className="ps-3 mb-3" style={{ fontSize: '0.8rem' }}>
        {steps.map((step, i) => (
          <li key={i} className="mb-1" style={{ color: '#444' }}>
            {step}
            {i === 3 && ingestUrl && (
              <CopyToClipboard
                text={ingestUrl}
                onCopy={() => showSnack(labels.copied, 'success')}
              >
                <span
                  className="text-primary fw-bold d-inline-flex align-items-center"
                  style={{ cursor: 'pointer', marginLeft: 4, gap: 3 }}
                >
                  <CopyIcon style={{ fontSize: 13 }} />
                  {labels.tapToCopy}
                </span>
              </CopyToClipboard>
            )}
          </li>
        ))}
      </ol>

      {/* Test connection */}
      <div
        className="p-2 rounded d-flex align-items-center justify-content-between"
        style={{ background: '#fff', border: '1px solid #e5e7eb' }}
      >
        <div className="d-flex align-items-center gap-2">
          {testStatus === 'success' && (
            <CheckIcon style={{ fontSize: 18, color: '#22c55e' }} />
          )}
          {testStatus === 'error' && (
            <ErrorIcon style={{ fontSize: 18, color: '#ef4444' }} />
          )}
          {testStatus === 'testing' && <CircularProgress size={16} />}
          <span style={{ fontSize: '0.78rem', color: '#666' }}>
            {testStatus === 'idle' && labels.testHint}
            {testStatus === 'testing' && labels.testLoading}
            {(testStatus === 'success' || testStatus === 'error') &&
              testMessage}
          </span>
        </div>
        <Button
          size="small"
          variant="outlined"
          onClick={handleTest}
          disabled={testStatus === 'testing'}
          sx={{ fontSize: '0.72rem', minWidth: 'auto', px: 1.5 }}
        >
          {labels.testButton}
        </Button>
      </div>

      {/* Tips */}
      <div className="mt-3" style={{ fontSize: '0.75rem', color: '#888' }}>
        <p className="mb-1">
          <strong>{labels.tipsTitle}</strong>
        </p>
        <ul className="ps-3 mb-0">
          <li>{labels.tip1}</li>
          <li>{labels.tip2}</li>
          <li>{labels.tip3}</li>
        </ul>
      </div>
    </div>
  )
}

export default LocationSetupGuide

const STEPS_EN = [
  'Open the iPhone Shortcuts app → Automation tab',
  'Tap "+" → choose "Arrive" (or "Leave") → select a location on the map',
  'Adjust the radius circle to cover the area',
  'Tap "New Blank Automation" → add "Get Current Location" → then add "Get Contents of URL" and paste this URL:',
  'Expand the action → set Method to "POST" → add Body as JSON',
  'In JSON body: {"points":[{"lat": insert Latitude, "lng": insert Longitude, "timestamp": insert Current Date}],"source":"shortcuts"}',
  'Tap Done → in Automation list, select "Run Immediately"',
]

const STEPS_PT = [
  'Abra Atalhos no iPhone → aba Automação',
  'Toque "+" → escolha "Chegar" (ou "Sair") → selecione um local no mapa',
  'Ajuste o raio do círculo para cobrir a área desejada',
  'Toque "Nova Automação" → adicione "Obter Localização" → depois "Obter Conteúdo do URL" e cole esta URL:',
  'Expanda a ação → mude Método para "POST" → adicione Corpo como JSON',
  'No corpo JSON: {"points":[{"lat": insira Latitude, "lng": insira Longitude, "timestamp": insira Data Atual}],"source":"shortcuts"}',
  'Toque OK → na lista de Automações, selecione "Executar Imediatamente"',
]

const ERROR_MESSAGES_EN: Record<string, string> = {
  permission_denied:
    'Location permission denied. Allow location access to test.',
  position_unavailable: 'Could not determine your position. Try again.',
  timeout: 'Location request timed out. Try again.',
  connection_failed:
    'Could not reach the server. Check your internet connection.',
  unknown_error: 'Something went wrong. Try again.',
}

const ERROR_MESSAGES_PT: Record<string, string> = {
  permission_denied:
    'Permissão de localização negada. Permita o acesso para testar.',
  position_unavailable:
    'Não foi possível determinar sua posição. Tente novamente.',
  timeout: 'Tempo esgotado. Tente novamente.',
  connection_failed:
    'Não foi possível conectar ao servidor. Verifique a conexão.',
  unknown_error: 'Algo deu errado. Tente novamente.',
}

const LABELS: Labels = {
  en: {
    title: 'Track Mode Setup',
    valueProp:
      'Track Mode detects places you visit, how you move between them, and triggers your bots on arrival or departure.',
    stepsTitle: 'iPhone Shortcuts setup:',
    copied: 'URL copied!',
    tapToCopy: 'Copy URL',
    testButton: 'Test',
    testHint: 'Verify the connection works from this device',
    testLoading: 'Sending location...',
    testSuccess: 'Connection working! Point received.',
    tipsTitle: 'Tips:',
    tip1: 'Create one automation per place you want to track',
    tip2: 'Tracked places appear in Places → Usual tab',
    tip3: 'You can also use OwnTracks app for continuous tracking',
    _lang: 'en',
  },
  pt: {
    title: 'Configuração do Track Mode',
    valueProp:
      'O Track Mode detecta os lugares que visita, como se move entre eles, e dispara os seus bots na chegada ou partida.',
    stepsTitle: 'Configurar Atalhos do iPhone:',
    copied: 'URL copiada!',
    tapToCopy: 'Copiar URL',
    testButton: 'Testar',
    testHint: 'Verifique se a conexão funciona a partir deste dispositivo',
    testLoading: 'A enviar localização...',
    testSuccess: 'Conexão a funcionar! Ponto recebido.',
    tipsTitle: 'Dicas:',
    tip1: 'Crie uma automação por lugar que quer rastrear',
    tip2: 'Lugares detetados aparecem em Lugares → aba Habituais',
    tip3: 'Também pode usar o app OwnTracks para rastreamento contínuo',
    _lang: 'pt',
  },
}

const labels = getLabels(LABELS)
