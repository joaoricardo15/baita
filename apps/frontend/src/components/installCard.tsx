import { Close as CloseIcon, GetApp as GetAppIcon } from '@mui/icons-material'
import { Card } from '@mui/material'
import { FC, useEffect, useState } from 'react'

import { getLabels, Labels } from '@/utils/labels'
import { Button, Text } from '.'

const InstallCard: FC = () => {
  const [installationEvent, setInstallationEvent] = useState<any>(null)

  const installApp = () => {
    installationEvent.prompt()
    installationEvent.userChoice.then((choiceResult: any) => {
      if (choiceResult.outcome === 'accepted') setInstallationEvent(null)
    })
  }

  const showInstallationPanel = (event: Event) => {
    event.preventDefault()
    setInstallationEvent(event)
  }

  const closePainel = () => {
    setInstallationEvent(null)
  }

  useEffect(() => {
    window.addEventListener('beforeinstallprompt', (e) =>
      showInstallationPanel(e)
    )
  }, [])

  return !installationEvent ? (
    <></>
  ) : (
    <Card
      style={{
        left: 10,
        right: 10,
        bottom: 10,
        padding: 10,
        zIndex: 1000,
        display: 'flex',
        position: 'fixed',
        alignItems: 'center',
      }}
    >
      <CloseIcon color="secondary" onClick={closePainel} />
      <Text
        style={{ flex: 1, fontSize: 10, marginRight: 10, textAlign: 'end' }}
      >
        {labels.installTitle}
      </Text>
      <Button icon={<GetAppIcon />} onClick={installApp}>
        {labels.installButton}
      </Button>
    </Card>
  )
}

export default InstallCard

const LABELS: Labels = {
  en: {
    installTitle: 'Have a complete mobile experience',
    installButton: 'Install',
  },
  pt: {
    installTitle: 'Tenha uma experiência mobile completa',
    installButton: 'Instalar',
  },
}

const labels = getLabels(LABELS)
