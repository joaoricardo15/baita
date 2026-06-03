import {
  Check as CheckIcon,
  IosShare as IosShareIcon,
  NotificationsActive as NotificationsActiveIcon,
  PhoneIphone as PhoneIphoneIcon,
} from '@mui/icons-material'
import { FC, useContext, useEffect, useState } from 'react'

import { Button, Text } from '@/components'
import { IVariable, VariableType } from '@baita/shared'
import { NotificationContext } from '@/providers/notification'
import { getLabels, Labels } from '@/utils/labels'
import {
  canUsePushNotifications,
  checkSubscriptionHealth,
  isInstalledPWA,
  isIOSDevice,
  subscribeToPush,
} from '@/utils/push'

type PushState =
  | 'loading'
  | 'ios-not-installed'
  | 'not-supported'
  | 'ready-to-ask'
  | 'denied'
  | 'subscribed'

const PushNotificationService: FC<{
  inputData: IVariable[]
  updateBotInputField: (fieldName: string, inputField: IVariable) => void
}> = ({ inputData: _inputData, updateBotInputField }) => {
  const [state, setState] = useState<PushState>('loading')
  const { showSnack } = useContext(NotificationContext)

  const storeSubscription = (subscription: PushSubscription) => {
    const subscriptionJSON = JSON.stringify(subscription.toJSON())
    updateBotInputField('token', {
      name: 'token',
      label: 'Token',
      type: VariableType.constant,
      value: subscriptionJSON,
      sampleValue: subscriptionJSON,
    })
  }

  const requestPermission = async () => {
    const regs = await navigator.serviceWorker.getRegistrations()
    if (regs.length === 0) {
      showSnack(labels.noServiceWorker, 'warning')
      setState('not-supported')
      return
    }
    const subscription = await subscribeToPush()
    if (subscription) {
      setState('subscribed')
      storeSubscription(subscription)
      showSnack(labels.successSnack, 'success')
    } else {
      setState('denied')
    }
  }

  useEffect(() => {
    if (isIOSDevice() && !isInstalledPWA()) {
      setState('ios-not-installed')
      return
    }

    if (!canUsePushNotifications()) {
      setState('not-supported')
      return
    }

    if ('Notification' in window && Notification.permission === 'denied') {
      setState('denied')
      return
    }

    navigator.serviceWorker
      .getRegistrations()
      .then((regs) => {
        if (regs.length === 0) {
          setState('ready-to-ask')
          return
        }

        checkSubscriptionHealth()
          .then((subscription) => {
            if (subscription) {
              setState('subscribed')
              storeSubscription(subscription)
            } else {
              setState('ready-to-ask')
            }
          })
          .catch(() => {
            setState('ready-to-ask')
          })
      })
      .catch(() => {
        setState('ready-to-ask')
      })
  }, [])

  if (state === 'loading') return null

  if (state === 'ios-not-installed') {
    return (
      <div className="d-flex flex-column align-items-center mt-3 mx-3 p-3 rounded bg-light">
        <PhoneIphoneIcon color="primary" style={{ fontSize: 40 }} />
        <Text className="fw-bold mt-2">{labels.iosTitle}</Text>
        <Text className="text-center mt-1" style={{ fontSize: '0.85rem' }}>
          {labels.iosDescription}
        </Text>
        <div className="mt-3 text-start w-100" style={{ fontSize: '0.85rem' }}>
          <div className="d-flex align-items-center mb-2">
            <IosShareIcon
              style={{ fontSize: 18 }}
              className="me-2 text-primary"
            />
            <Text>{labels.iosStep1}</Text>
          </div>
          <div className="d-flex align-items-center mb-2">
            <Text
              className="me-2 text-primary fw-bold"
              style={{ width: 18, textAlign: 'center' }}
            >
              +
            </Text>
            <Text>{labels.iosStep2}</Text>
          </div>
          <div className="d-flex align-items-center">
            <CheckIcon style={{ fontSize: 18 }} className="me-2 text-primary" />
            <Text>{labels.iosStep3}</Text>
          </div>
        </div>
      </div>
    )
  }

  if (state === 'not-supported') {
    return (
      <div className="d-flex flex-column align-items-center mt-3 mx-3 p-3">
        <Text className="text-center">{labels.notSupported}</Text>
      </div>
    )
  }

  if (state === 'denied') {
    return (
      <div className="d-flex flex-column align-items-center mt-3 mx-3 p-3 rounded bg-light">
        <Text className="fw-bold">{labels.deniedTitle}</Text>
        <Text className="text-center mt-2" style={{ fontSize: '0.85rem' }}>
          {isIOSDevice() ? labels.deniedGuideIOS : labels.deniedGuideDesktop}
        </Text>
      </div>
    )
  }

  if (state === 'subscribed') {
    return (
      <div className="d-flex flex-column align-items-center mt-3 mx-3 p-2">
        <div className="d-flex align-items-center">
          <CheckIcon color="success" />
          <Text className="mx-2 fw-bold">{labels.subscribed}</Text>
        </div>
        <Text
          className="text-center mt-1"
          style={{ fontSize: '0.8rem', opacity: 0.7 }}
        >
          {labels.deviceNote}
        </Text>
      </div>
    )
  }

  return (
    <div className="d-flex flex-column align-items-center mt-3 mx-3 p-3 rounded bg-light">
      <NotificationsActiveIcon color="primary" style={{ fontSize: 36 }} />
      <Text className="fw-bold mt-2">{labels.askTitle}</Text>
      <Text className="text-center mt-1" style={{ fontSize: '0.85rem' }}>
        {labels.askDescription}
      </Text>
      <Button
        type="text"
        color="primary"
        className="mt-3"
        onClick={requestPermission}
      >
        {labels.enableButton}
      </Button>
    </div>
  )
}

export default PushNotificationService

const LABELS: Labels = {
  en: {
    askTitle: 'Stay notified',
    askDescription:
      'Get notified on this device when your bot runs, completes a task, or needs attention.',
    enableButton: 'Enable notifications',
    successSnack: 'Notifications enabled for this device',
    noServiceWorker:
      'Service worker not available. Try the production app or build locally.',
    subscribed: 'Notifications active',
    deviceNote:
      'Notifications are sent to this device only. Enable on other devices separately.',
    deniedTitle: 'Notifications blocked',
    deniedGuideIOS:
      'To re-enable: open iPhone Settings → Notifications → Baita → toggle Allow Notifications on.',
    deniedGuideDesktop:
      'To re-enable: click the lock/tune icon in your browser address bar → Site settings → set Notifications to "Allow".',
    notSupported: 'Push notifications are not supported on this browser.',
    iosTitle: 'Install app first',
    iosDescription:
      'To receive notifications on iPhone, this app must be installed to your Home Screen.',
    iosStep1: 'Tap the Share button at the bottom',
    iosStep2: 'Tap "Add to Home Screen"',
    iosStep3: 'Open the app from your Home Screen',
  },
  pt: {
    askTitle: 'Fique informado',
    askDescription:
      'Receba notificações neste dispositivo quando seu bot executar, completar uma tarefa, ou precisar de atenção.',
    enableButton: 'Ativar notificações',
    successSnack: 'Notificações ativadas para este dispositivo',
    noServiceWorker:
      'Service worker não disponível. Use o app em produção ou faça build local.',
    subscribed: 'Notificações ativas',
    deviceNote:
      'Notificações são enviadas apenas para este dispositivo. Ative em outros dispositivos separadamente.',
    deniedTitle: 'Notificações bloqueadas',
    deniedGuideIOS:
      'Para reativar: abra Ajustes → Notificações → Baita → ative Permitir Notificações.',
    deniedGuideDesktop:
      'Para reativar: clique no ícone de cadeado na barra de endereço → Configurações do site → defina Notificações como "Permitir".',
    notSupported: 'Notificações push não são suportadas neste navegador.',
    iosTitle: 'Instale o app primeiro',
    iosDescription:
      'Para receber notificações no iPhone, o app precisa estar instalado na sua Tela Inicial.',
    iosStep1: 'Toque no botão Compartilhar na parte inferior',
    iosStep2: 'Toque em "Adicionar à Tela Inicial"',
    iosStep3: 'Abra o app pela sua Tela Inicial',
  },
}

const labels = getLabels(LABELS)
