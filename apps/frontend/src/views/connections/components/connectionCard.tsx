import {
  CheckCircle as CheckCircleIcon,
  Delete as DeleteIcon,
  Error as ErrorIcon,
  ExpandMore as ExpandMoreIcon,
  Sync as SyncIcon,
} from '@mui/icons-material'
import {
  Chip,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
} from '@mui/material'
import { FC, useContext, useState } from 'react'
import { getConnectorByAppId } from '@baita/shared'

import { Button, Text } from '@/components'
import { IAppConnection } from '@baita/shared'
import { NotificationContext } from '@/providers/notification'
import { UserContext } from '@/providers/user'
import { getLabels, Labels } from '@/utils/labels'
import ApiRequest from '@/utils/requests'

type HealthStatus = 'idle' | 'checking' | 'healthy' | 'expired' | 'error'

const ConnectionCard: FC<{ connection: IAppConnection }> = ({ connection }) => {
  const apiRequest = ApiRequest()
  const { deleteConnection } = useContext(UserContext)
  const { showSnack } = useContext(NotificationContext)

  const connector = getConnectorByAppId(connection.appId)

  const [healthStatus, setHealthStatus] = useState<HealthStatus>('idle')
  const [expanded, setExpanded] = useState(false)
  const [linkedBots, setLinkedBots] =
    useState<{ botId: string; name: string }[]>()
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  const handleTest = () => {
    setHealthStatus('checking')
    apiRequest
      .healthCheckConnection(String(connection.connectionId))
      .then((result) => setHealthStatus(result.status as HealthStatus))
      .catch(() => setHealthStatus('error'))
  }

  const handleExpand = () => {
    if (!expanded && linkedBots === undefined) {
      apiRequest
        .getConnectionDetails(String(connection.connectionId))
        .then((details) => setLinkedBots(details.linkedBots))
        .catch(() => setLinkedBots([]))
    }
    setExpanded(!expanded)
  }

  const handleDelete = () => {
    deleteConnection(String(connection.connectionId))
      .then(() => showSnack(labels.deleteSuccess, 'success'))
      .catch(() => showSnack(labels.deleteError, 'error'))
    setShowDeleteDialog(false)
  }

  const getStatusChip = () => {
    switch (healthStatus) {
      case 'checking':
        return (
          <Chip
            size="small"
            icon={<SyncIcon className="animate-spin" />}
            label={labels.checking}
          />
        )
      case 'healthy':
        return (
          <Chip
            size="small"
            color="success"
            icon={<CheckCircleIcon />}
            label={labels.healthy}
          />
        )
      case 'expired':
      case 'error':
        return (
          <Chip
            size="small"
            color="error"
            icon={<ErrorIcon />}
            label={healthStatus === 'expired' ? labels.expired : labels.error}
          />
        )
      default:
        return null
    }
  }

  return (
    <>
      <div className="d-flex align-items-center p-2 mb-2 border rounded">
        <div
          className="flex-grow-1 d-flex align-items-center"
          onClick={handleExpand}
        >
          {connector?.icon && (
            <img
              src={connector.icon}
              alt=""
              style={{ width: 24, height: 24, marginRight: 10 }}
            />
          )}
          <div>
            <Text className="fw-bold">{connection.name}</Text>
            <Text type="body2" color="textSecondary">
              {connection.email}
            </Text>
          </div>
        </div>

        <div className="d-flex align-items-center gap-1">
          {getStatusChip()}
          <Button type="text" color="primary" onClick={handleTest}>
            {labels.test}
          </Button>
          <IconButton size="small" onClick={() => setShowDeleteDialog(true)}>
            <DeleteIcon color="secondary" />
          </IconButton>
          <IconButton size="small" onClick={handleExpand}>
            <ExpandMoreIcon
              style={{
                transform: expanded ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s',
              }}
            />
          </IconButton>
        </div>
      </div>

      <Collapse in={expanded}>
        <div className="px-3 pb-2">
          {connection.createdAt && (
            <Text type="body2" color="textSecondary">
              {labels.connectedAt}{' '}
              {new Date(connection.createdAt).toLocaleDateString()}
            </Text>
          )}
          {linkedBots && linkedBots.length > 0 && (
            <div className="mt-1">
              <Text type="body2" className="fw-bold">
                {labels.usedBy}
              </Text>
              {linkedBots.map((bot) => (
                <Text key={bot.botId} type="body2">
                  {bot.name}
                </Text>
              ))}
            </div>
          )}
          {linkedBots && linkedBots.length === 0 && (
            <Text type="body2" color="textSecondary" className="mt-1">
              {labels.notUsed}
            </Text>
          )}
        </div>
      </Collapse>

      <Dialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
      >
        <DialogTitle>{labels.deleteTitle}</DialogTitle>
        <DialogContent>
          <Text>
            {labels.deleteConfirm} <strong>{connection.name}</strong>?
          </Text>
          {linkedBots && linkedBots.length > 0 && (
            <Text color="error" className="mt-2">
              {labels.deleteWarning.replace(
                '{count}',
                String(linkedBots.length)
              )}
            </Text>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteDialog(false)}>
            {labels.cancel}
          </Button>
          <Button color="error" onClick={handleDelete}>
            {labels.delete}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}

export default ConnectionCard

const LABELS: Labels = {
  en: {
    test: 'Test',
    checking: 'Checking...',
    healthy: 'Connected',
    expired: 'Expired',
    error: 'Error',
    connectedAt: 'Connected on',
    usedBy: 'Used by:',
    notUsed: 'Not used by any bot',
    deleteTitle: 'Delete connection',
    deleteConfirm: 'Are you sure you want to delete',
    deleteWarning: 'Warning: this connection is used by {count} bot(s)',
    cancel: 'Cancel',
    delete: 'Delete',
    deleteSuccess: 'Connection deleted',
    deleteError: 'Could not delete connection',
  },
  pt: {
    test: 'Testar',
    checking: 'Verificando...',
    healthy: 'Conectado',
    expired: 'Expirado',
    error: 'Erro',
    connectedAt: 'Conectado em',
    usedBy: 'Usado por:',
    notUsed: 'Não usado por nenhum bot',
    deleteTitle: 'Excluir conexão',
    deleteConfirm: 'Tem certeza que deseja excluir',
    deleteWarning: 'Atenção: esta conexão é usada por {count} bot(s)',
    cancel: 'Cancelar',
    delete: 'Excluir',
    deleteSuccess: 'Conexão excluída',
    deleteError: 'Não foi possível excluir a conexão',
  },
}

const labels = getLabels(LABELS)
