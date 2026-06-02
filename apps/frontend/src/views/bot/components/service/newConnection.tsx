import { Add as AddIcon } from '@mui/icons-material'
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material'
import { FC, useContext, useState } from 'react'
import { getConnectorByAppId } from '@baita/shared'

import { Button, OptionsInput } from '@/components'
import { IAppConnection } from '@baita/shared'
import { AuthContext } from '@/providers/auth'
import { NotificationContext } from '@/providers/notification'
import { UserContext } from '@/providers/user'
import { getLabels, Labels } from '@/utils/labels'
import { buildOAuthUrl } from '@/utils/oauth'
import ApiRequest from '@/utils/requests'
import { useOauthPopup } from '@/utils/useOauthPopup'

const NewConnection: FC<{
  botId: string
  appId: string
  connectionId?: string | number
  taskIndex: number
  onNewConnectionAttempt: () => void
  onSelectConnection: (appConnection: IAppConnection) => void
}> = ({
  botId,
  appId,
  connectionId,
  taskIndex,
  onNewConnectionAttempt,
  onSelectConnection,
}) => {
  const { user } = useContext(AuthContext)
  const { showSnack } = useContext(NotificationContext)
  const { connections, retrieveConnections } = useContext(UserContext)
  const apiRequest = ApiRequest()

  const connector = getConnectorByAppId(appId)

  const [apiKeyDialog, setApiKeyDialog] = useState(false)
  const [apiKeyValue, setApiKeyValue] = useState('')

  const openOauth = useOauthPopup((created) => {
    if (created) {
      showSnack(labels.newConnectionSuccess, 'success')
    } else {
      showSnack(labels.newConnectionCancelled, 'warning')
    }
    onNewConnectionAttempt()
  })

  const handleNewConnection = () => {
    if (!connector) return

    if (connector.auth.type === 'oauth2') {
      const state = `${appId}:${user?.userId}:${botId}:${taskIndex}:${connector.id}`
      openOauth(buildOAuthUrl(connector, state))
    } else if (connector.auth.type === 'userApiKey') {
      setApiKeyDialog(true)
      setApiKeyValue('')
    }
  }

  const handleApiKeySubmit = () => {
    if (!connector || !apiKeyValue.trim()) return

    apiRequest
      .createApiKeyConnection(connector.id, apiKeyValue.trim())
      .then(() => {
        showSnack(labels.newConnectionSuccess, 'success')
        retrieveConnections()
        setApiKeyDialog(false)
        onNewConnectionAttempt()
      })
      .catch(() => showSnack(labels.newConnectionError, 'error'))
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
        <Button
          type="text"
          color="primary"
          icon={<AddIcon />}
          onClick={handleNewConnection}
        >
          {labels.newConnection}
        </Button>
      </div>

      <Dialog
        open={apiKeyDialog}
        onClose={() => setApiKeyDialog(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          {labels.apiKeyTitle} {connector?.name}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            type="password"
            label={labels.apiKeyLabel}
            value={apiKeyValue}
            onChange={(e) => setApiKeyValue(e.target.value)}
            margin="dense"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setApiKeyDialog(false)}>
            {labels.cancel}
          </Button>
          <Button color="primary" onClick={handleApiKeySubmit}>
            {labels.connect}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default NewConnection

const LABELS: Labels = {
  en: {
    chooseAccount: 'Choose an account',
    newConnection: 'New connection',
    newConnectionSuccess: 'Connection created successfully',
    newConnectionCancelled: 'Connection was not completed',
    newConnectionError: 'Could not create connection',
    apiKeyTitle: 'Connect',
    apiKeyLabel: 'API Key',
    cancel: 'Cancel',
    connect: 'Connect',
  },
  pt: {
    chooseAccount: 'Escolha uma conta',
    newConnection: 'Nova conexão',
    newConnectionSuccess: 'Conexão criada com sucesso',
    newConnectionCancelled: 'Conexão não foi concluída',
    newConnectionError: 'Não foi possível criar a conexão',
    apiKeyTitle: 'Conectar',
    apiKeyLabel: 'Chave de API',
    cancel: 'Cancelar',
    connect: 'Conectar',
  },
}

const labels = getLabels(LABELS)
