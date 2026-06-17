import {
  ContentCopy as CopyIcon,
  PhoneIphone as PhoneIcon,
} from '@mui/icons-material'
import { FC, useContext } from 'react'
import { CopyToClipboard } from 'react-copy-to-clipboard'

import { NotificationContext } from '@/providers/notification'
import { getLabels, Labels } from '@/utils/labels'

const IPhoneSetupGuide: FC<{
  template: string
  webhookUrl?: string
}> = ({ template, webhookUrl }) => {
  const { showSnack } = useContext(NotificationContext)
  const templateData = TEMPLATES[template]
  if (!templateData) return null

  const steps =
    labels._lang === 'pt' ? templateData.stepsPt : templateData.steps
  const urlStepIndex =
    labels._lang === 'pt'
      ? templateData.urlStepIndexPt
      : templateData.urlStepIndex

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
            {i === urlStepIndex && webhookUrl && (
              <CopyToClipboard
                text={webhookUrl}
                onCopy={() => showSnack(labels.copied, 'success')}
              >
                <span
                  className="text-primary fw-bold d-inline-flex align-items-center"
                  style={{
                    cursor: 'pointer',
                    marginLeft: 4,
                    gap: 3,
                  }}
                >
                  <CopyIcon style={{ fontSize: 13 }} />
                  {labels.tapToCopy}
                </span>
              </CopyToClipboard>
            )}
          </li>
        ))}
      </ol>
    </div>
  )
}

export default IPhoneSetupGuide

const TEMPLATES: Record<
  string,
  {
    steps: string[]
    stepsPt: string[]
    urlStepIndex: number
    urlStepIndexPt: number
  }
> = {
  'alarm-stopped': {
    steps: [
      'Open the Shortcuts app → Automation tab',
      'Tap "+" → choose "Alarm" → select "Is Stopped" → pick your alarm → Next',
      'Tap "Create New Shortcut" → search "Get Contents of URL"',
      'Paste this webhook URL into the URL field:',
      'Tap the chevron (>) on the action to expand it → change Method to "POST"',
      'Tap Done to save the automation',
      'Back in Automation list: tap your new automation → select "Run Immediately"',
    ],
    urlStepIndex: 3,
    stepsPt: [
      'Abra Atalhos → aba Automação',
      'Toque "+" → escolha "Alarme" → selecione "É Parado" → escolha o alarme → Seguinte',
      'Toque "Criar Novo Atalho" → busque "Obter Conteúdo do URL"',
      'Cole esta URL do webhook no campo URL:',
      'Toque no chevron (>) da ação para expandir → mude o Método para "POST"',
      'Toque OK para salvar a automação',
      'Na lista de Automações: toque na automação criada → selecione "Executar Imediatamente"',
    ],
    urlStepIndexPt: 3,
  },
}

const LABELS: Labels = {
  en: {
    title: 'iPhone Shortcuts setup',
    description:
      'Create a personal automation in the Shortcuts app to connect your alarm:',
    copied: 'URL copied',
    tapToCopy: 'Tap here to copy',
    _lang: 'en',
  },
  pt: {
    title: 'Configuração de Atalhos do iPhone',
    description:
      'Crie uma automação pessoal no app Atalhos para conectar seu alarme:',
    copied: 'URL copiada',
    tapToCopy: 'Toque aqui para copiar',
    _lang: 'pt',
  },
}

const labels = getLabels(LABELS)
