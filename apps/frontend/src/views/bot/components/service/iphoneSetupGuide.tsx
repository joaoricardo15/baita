import { PhoneIphone as PhoneIcon } from '@mui/icons-material'
import { FC } from 'react'

import { getLabels, Labels } from '@/utils/labels'

const TEMPLATES: Record<string, { steps: string[]; stepsPt: string[] }> = {
  'alarm-stopped': {
    steps: [
      'Open the Shortcuts app on your iPhone',
      'Tap the Automation tab at the bottom',
      'Tap "+" then choose "Alarm"',
      'Select "Is Stopped" → "Any Alarm" → Next',
      'Tap "New Blank Automation" → search "Get Contents of URL"',
      'Paste the webhook URL shown above',
      'Tap "Method" → change to "POST"',
      'Go back → turn OFF "Ask Before Running" → Done',
    ],
    stepsPt: [
      'Abra o app Atalhos no seu iPhone',
      'Toque na aba Automação na parte inferior',
      'Toque em "+" e escolha "Alarme"',
      'Selecione "É Parado" → "Qualquer Alarme" → Seguinte',
      'Toque "Nova Automação em Branco" → busque "Obter Conteúdo do URL"',
      'Cole a URL do webhook mostrada acima',
      'Toque em "Método" → mude para "POST"',
      'Volte → desative "Perguntar Antes de Executar" → OK',
    ],
  },
}

const IPhoneSetupGuide: FC<{
  template: string
}> = ({ template }) => {
  const templateData = TEMPLATES[template]
  if (!templateData) return null

  const steps =
    labels._lang === 'pt' ? templateData.stepsPt : templateData.steps

  return (
    <div className="mt-3 p-3 rounded" style={{ background: '#f8f9fa' }}>
      <div className="d-flex align-items-center mb-2">
        <PhoneIcon style={{ fontSize: 20, marginRight: 8, color: '#6366f1' }} />
        <span className="fw-bold" style={{ fontSize: '0.85rem' }}>
          {labels.title}
        </span>
      </div>
      <p
        className="mb-2"
        style={{ fontSize: '0.8rem', color: '#666', margin: 0 }}
      >
        {labels.description}
      </p>
      <ol className="ps-3 mb-0" style={{ fontSize: '0.8rem' }}>
        {steps.map((step, i) => (
          <li key={i} className="mb-1" style={{ color: '#444' }}>
            {step}
          </li>
        ))}
      </ol>
    </div>
  )
}

export default IPhoneSetupGuide

const LABELS: Labels = {
  en: {
    title: 'iPhone Shortcuts setup',
    description:
      'Create a personal automation in the Shortcuts app to connect your alarm:',
    _lang: 'en',
  },
  pt: {
    title: 'Configuração de Atalhos do iPhone',
    description:
      'Crie uma automação pessoal no app Atalhos para conectar seu alarme:',
    _lang: 'pt',
  },
}

const labels = getLabels(LABELS)
