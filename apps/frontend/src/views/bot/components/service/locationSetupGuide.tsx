import {
  CheckCircle as CheckIcon,
  ContentCopy as CopyIcon,
  Error as ErrorIcon,
  MyLocation as LocationIcon,
} from '@mui/icons-material'
import { Button, CircularProgress, IconButton } from '@mui/material'
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

      {/* URL */}
      {ingestUrl && (
        <div
          className="p-2 rounded mb-3 d-flex align-items-center gap-2"
          style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}
        >
          <code
            style={{
              fontSize: '0.65rem',
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
              <CopyIcon style={{ fontSize: 14 }} />
            </IconButton>
          </CopyToClipboard>
        </div>
      )}

      {/* Setup steps */}
      <p className="mb-1 fw-bold" style={{ fontSize: '0.8rem', color: '#333' }}>
        {labels.stepsTitle}
      </p>
      <ol className="ps-3 mb-3" style={{ fontSize: '0.8rem' }}>
        {(labels._lang === 'pt' ? STEPS_PT : STEPS_EN).map((step, i) => (
          <li key={i} className="mb-1" style={{ color: '#444' }}>
            {step}
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
  'Open iPhone Shortcuts → Automation tab',
  'Tap "+" → "Arrive" (or "Leave") → pick a location',
  'Select "Run Immediately" → "New Blank Automation"',
  'Add action: "Get Current Location"',
  'Add action: "Get Contents of URL" → paste the URL above',
  'Tap ▸ to expand → Method: "POST" → Body: "JSON"',
  'Add field: Key "lat" → tap Value → select "Current Location" → "Latitude"',
  'Add field: Key "lng" → tap Value → select "Current Location" → "Longitude"',
  'Done!',
]

const STEPS_PT = [
  'Abra Atalhos do iPhone → aba Automação',
  'Toque "+" → "Chegar" (ou "Sair") → escolha local',
  'Selecione "Executar Imediatamente" → "Nova Automação"',
  'Adicione ação: "Obter Localização Atual"',
  'Adicione ação: "Obter Conteúdo do URL" → cole a URL acima',
  'Toque ▸ para expandir → Método: "POST" → Corpo: "JSON"',
  'Adicione campo: Chave "lat" → toque Valor → selecione "Localização Atual" → "Latitude"',
  'Adicione campo: Chave "lng" → toque Valor → selecione "Localização Atual" → "Longitude"',
  'Pronto!',
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
      'Track Mode detects places you visit and triggers your bots on arrival or departure.',
    stepsTitle: 'iPhone Shortcuts setup:',
    copied: 'Copied!',
    testButton: 'Test',
    testHint: 'Verify the connection works from this device',
    testLoading: 'Sending location...',
    testSuccess: 'Connection working! Point received.',
    tipsTitle: 'Tips:',
    tip1: '"Arrive" and "Leave" are separate — create one for each direction',
    tip2: 'Repeat for each place you want to track',
    tip3: 'You can also use OwnTracks app for continuous tracking',
    _lang: 'en',
  },
  pt: {
    title: 'Configuração do Track Mode',
    valueProp:
      'O Track Mode deteta os lugares que visita e dispara os seus bots na chegada ou partida.',
    stepsTitle: 'Configurar Atalhos do iPhone:',
    copied: 'Copiado!',
    testButton: 'Testar',
    testHint: 'Verifique se a conexão funciona a partir deste dispositivo',
    testLoading: 'A enviar localização...',
    testSuccess: 'Conexão a funcionar! Ponto recebido.',
    tipsTitle: 'Dicas:',
    tip1: '"Chegar" e "Sair" são separados — crie um para cada direção',
    tip2: 'Repita para cada lugar que quer rastrear',
    tip3: 'Também pode usar o app OwnTracks para rastreamento contínuo',
    _lang: 'pt',
  },
}

const labels = getLabels(LABELS)
