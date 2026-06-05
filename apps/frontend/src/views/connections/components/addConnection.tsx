import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItemButton,
  ListItemText,
  ListSubheader,
  TextField,
} from '@mui/material'
import { FC, useContext, useState } from 'react'
import { IConnectorManifest, getAllConnectors } from '@baita/shared'
import { useQueryClient } from '@tanstack/react-query'

import { Button } from '@/components'
import { useCreateConnection } from '@/hooks/useConnections'
import { AuthContext } from '@/providers/auth'
import { NotificationContext } from '@/providers/notification'
import { getLabels, Labels } from '@/utils/labels'
import { buildOAuthUrl } from '@/utils/oauth'
import { useOauthPopup } from '@/utils/useOauthPopup'

const AddConnection: FC<{ open: boolean; onClose: () => void }> = ({
  open,
  onClose,
}) => {
  const { user } = useContext(AuthContext)
  const { showSnack } = useContext(NotificationContext)
  const queryClient = useQueryClient()
  const createConnection = useCreateConnection()

  const connectors = getAllConnectors()

  const [apiKeyDialog, setApiKeyDialog] = useState<IConnectorManifest | null>(
    null
  )
  const [apiKeyValue, setApiKeyValue] = useState('')

  const openOauth = useOauthPopup((created) => {
    showSnack(
      created ? labels.success : labels.cancelled,
      created ? 'success' : 'warning'
    )
    onClose()
  })

  const handleConnect = (connectorId: string) => {
    const connector = connectors.find((c) => c.id === connectorId)
    if (!connector) return

    if (connector.auth.type === 'oauth2') {
      const state = `${connector.appId}:${user?.userId}::0:${connectorId}`
      openOauth(buildOAuthUrl(connector, state))
    } else if (connector.auth.type === 'userApiKey') {
      setApiKeyDialog(connector)
      setApiKeyValue('')
    }
  }

  const handleApiKeySubmit = () => {
    if (!apiKeyDialog || !apiKeyValue.trim()) return

    createConnection.mutate(
      { connectorId: apiKeyDialog.id, apiKey: apiKeyValue.trim() },
      {
        onSuccess: () => {
          showSnack(labels.success, 'success')
          queryClient.invalidateQueries({ queryKey: ['connections'] })
          setApiKeyDialog(null)
          onClose()
        },
        onError: () => showSnack(labels.error, 'error'),
      }
    )
  }

  const grouped = connectors.reduce(
    (acc, connector) => {
      if (!acc[connector.category]) acc[connector.category] = []
      acc[connector.category].push(connector)
      return acc
    },
    {} as Record<string, typeof connectors>
  )

  return (
    <>
      <Dialog
        open={open && !apiKeyDialog}
        onClose={onClose}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>{labels.title}</DialogTitle>
        <DialogContent>
          <List>
            {Object.entries(grouped).map(([category, items]) => (
              <div key={category}>
                <ListSubheader>{category}</ListSubheader>
                {items
                  .filter(
                    (c) =>
                      c.auth.type === 'oauth2' || c.auth.type === 'userApiKey'
                  )
                  .map((connector) => (
                    <ListItemButton
                      key={connector.id}
                      onClick={() => handleConnect(connector.id)}
                    >
                      {connector.icon && (
                        <img
                          src={connector.icon}
                          alt=""
                          style={{ width: 20, height: 20, marginRight: 10 }}
                        />
                      )}
                      <ListItemText primary={connector.name} />
                    </ListItemButton>
                  ))}
              </div>
            ))}
          </List>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!apiKeyDialog}
        onClose={() => setApiKeyDialog(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          {labels.apiKeyTitle} {apiKeyDialog?.name}
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
          <Button onClick={() => setApiKeyDialog(null)}>{labels.cancel}</Button>
          <Button color="primary" onClick={handleApiKeySubmit}>
            {labels.connect}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default AddConnection

const LABELS: Labels = {
  en: {
    title: 'Add Connection',
    success: 'Connection created successfully',
    cancelled: 'Connection was not completed',
    error: 'Could not create connection',
    apiKeyTitle: 'Connect',
    apiKeyLabel: 'API Key',
    cancel: 'Cancel',
    connect: 'Connect',
  },
  pt: {
    title: 'Adicionar Conexão',
    success: 'Conexão criada com sucesso',
    cancelled: 'Conexão não foi concluída',
    error: 'Não foi possível criar a conexão',
    apiKeyTitle: 'Conectar',
    apiKeyLabel: 'Chave de API',
    cancel: 'Cancelar',
    connect: 'Conectar',
  },
}

const labels = getLabels(LABELS)
