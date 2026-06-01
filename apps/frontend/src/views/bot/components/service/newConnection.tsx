import { Add as AddIcon } from '@mui/icons-material'
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from '@mui/material'
import { FC, useContext, useEffect, useRef, useState } from 'react'

import { Button, OptionsInput, TextInput } from '../../../../components'
import { IAppConnection } from '../../../../models/app'
import { AuthContext } from '../../../../providers/auth'
import { NotificationContext } from '../../../../providers/notification'
import { UserContext } from '../../../../providers/user'
import { createConnection } from '../../../../utils/connections'
import { getLabels, Labels } from '../../../../utils/labels'

function useOauthPopup(onClose: () => void) {
  const popupRef = useRef<Window | null>(null)
  const timerRef = useRef<number>()

  const open = (url: string) => {
    const width = 800
    const height = 600
    const left = window.screenX + (window.outerWidth - width) / 2
    const top = window.screenY + (window.outerHeight - height) / 2.5
    popupRef.current = window.open(
      url,
      '',
      `width=${width},height=${height},left=${left},top=${top}`
    )

    timerRef.current = window.setInterval(() => {
      if (!popupRef.current || popupRef.current.closed) {
        window.clearInterval(timerRef.current)
        onClose()
      }
    }, 700)
  }

  useEffect(() => {
    return () => {
      window.clearInterval(timerRef.current)
      popupRef.current?.close()
    }
  }, [])

  return open
}

const NewConnection: FC<{
  botId: string
  appId: string
  appName?: string
  appAuthUrl?: string
  appLoginUrl?: string
  connectionId?: string | number
  taskIndex: number
  onNewConnectionAttempt: () => void
  onSelectConnection: (appConnection: IAppConnection) => void
}> = ({
  botId,
  appId,
  appName,
  appAuthUrl,
  appLoginUrl,
  connectionId,
  taskIndex,
  onNewConnectionAttempt,
  onSelectConnection,
}) => {
  const { user } = useContext(AuthContext)
  const { showSnack } = useContext(NotificationContext)
  const { connections } = useContext(UserContext)

  const [connectionAuthInfo, setConnectionAuthInfo] = useState<{
    username?: string
    password?: string
    url?: string
  }>()

  const openOauth = useOauthPopup(onNewConnectionAttempt)

  const handleOauthClick = () => {
    const url = encodeURI(
      `${appAuthUrl}${appId}:${user?.userId}:${botId}:${taskIndex}:${(appName || '').toLowerCase()}`
    )
    openOauth(url)
    onNewConnectionAttempt()
  }

  const authenticateNewSystem = () => {
    if (connectionAuthInfo) {
      const { url, username, password } = connectionAuthInfo

      if (url && username && password) {
        createConnection(url, { username, password })
          .then(() => {
            showSnack(labels.newConnectionSuccess, 'success')
            setConnectionAuthInfo(undefined)
          })
          .catch(() => {
            showSnack(labels.newConnectionError, 'error')
            setConnectionAuthInfo((prevState) => ({
              ...prevState,
              username: '',
              password: '',
            }))
          })
      }
    }
  }

  const newConnectionHandler = () => {
    setConnectionAuthInfo({ url: appLoginUrl })
  }

  return (
    <>
      {connections &&
        connections.filter((x) => x.appId === appId).length > 0 && (
          <OptionsInput
            key={connectionId}
            className="mt-3"
            label={labels.chooseAccount}
            value={
              connectionId
                ? connections.find((x) => x.connectionId === connectionId)
                    ?.name || ''
                : ''
            }
            options={connections.filter((x) => x.appId === appId)}
            optionLabelPath={'name'}
            onChange={onSelectConnection}
          />
        )}

      <div className="d-flex justify-content-center mt-3">
        {appAuthUrl ? (
          <Button
            type="text"
            color="primary"
            icon={<AddIcon />}
            onClick={handleOauthClick}
          >
            {labels.newConnection}
          </Button>
        ) : appLoginUrl ? (
          <Button
            type="text"
            color="primary"
            icon={<AddIcon />}
            onClick={newConnectionHandler}
          >
            {labels.newConnection}
          </Button>
        ) : null}
      </div>
      <Dialog
        open={!!connectionAuthInfo}
        onClose={() => setConnectionAuthInfo(undefined)}
        maxWidth={false}
      >
        <DialogTitle>{labels.login}</DialogTitle>
        <DialogContent>
          <div style={{ width: 300 }}>
            <TextInput
              value={connectionAuthInfo?.username || ''}
              placeholder={labels.emailPlaceholder}
              onChange={(email) =>
                setConnectionAuthInfo((prev) => ({ ...prev, username: email }))
              }
            />
            <TextInput
              value={connectionAuthInfo?.password || ''}
              placeholder={labels.botNamePlaceholder}
              onChange={(password) =>
                setConnectionAuthInfo((prev) => ({ ...prev, password }))
              }
            />
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={authenticateNewSystem}>{labels.login}</Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default NewConnection

const LABELS: Labels = {
  en: {
    login: 'Login',
    emailPlaceholder: 'E-mail',
    botNamePlaceholder: 'Bot name',
    chooseAccount: 'Choice a account',
    newConnection: 'New connection',
    newConnectionError: 'Connection could not be created :(',
    newConnectionSuccess: 'Connection created successfully :)',
  },
  pt: {
    login: 'Entrar',
    emailPlaceholder: 'E-mail',
    botNamePlaceholder: 'Nome do Bot',
    chooseAccount: 'Escolha uma conta',
    newConnection: 'Nova conexão',
    newConnectionError: 'Conexão não pode ser criada :(',
    newConnectionSuccess: 'Conexão criada com sucesso :)',
  },
}

const labels = getLabels(LABELS)
