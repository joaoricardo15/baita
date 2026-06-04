import { getConnectorByAppId, IAppConnection } from '@baita/shared'
import {
  Delete as DeleteIcon,
  MoreVert as MoreVertIcon,
  Sync as SyncIcon,
} from '@mui/icons-material'
import { Card, Chip } from '@mui/material'
import { FC, useContext, useState } from 'react'

import { Text } from '@/components'
import Menu from '@/components/menu'
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

  const handleTest = () => {
    setHealthStatus('checking')
    apiRequest
      .healthCheckConnection(String(connection.connectionId))
      .then((result) => setHealthStatus(result.status as HealthStatus))
      .catch(() => setHealthStatus('error'))
  }

  const handleDelete = () => {
    deleteConnection(String(connection.connectionId))
      .then(() => showSnack(labels.deleteSuccess, 'success'))
      .catch(() => showSnack(labels.deleteError, 'error'))
  }

  const getStatusChip = () => {
    switch (healthStatus) {
      case 'checking':
        return (
          <Chip
            size="small"
            label={labels.checking}
            className="bg-white border border-secondary ms-2"
          />
        )
      case 'healthy':
        return (
          <Chip
            size="small"
            label={labels.healthy}
            className="bg-white border border-success ms-2"
          />
        )
      case 'expired':
      case 'error':
        return (
          <Chip
            size="small"
            label={healthStatus === 'expired' ? labels.expired : labels.error}
            className="text-white bg-danger ms-2"
          />
        )
      default:
        return null
    }
  }

  return (
    <>
      <Card className="p-2">
        <div className="d-flex justify-content-between align-items-center">
          <div className="d-flex align-items-center">
            {connector?.icon && (
              <div
                style={{ width: 30 }}
                className="m-2 d-flex align-items-center"
              >
                <img width={30} height={30} src={connector.icon} alt="" />
              </div>
            )}
            <div className="mx-2">
              <Text className="fw-bold">{connection.name}</Text>
              {connection.email && (
                <Text className="fw-light fs-6">{connection.email}</Text>
              )}
            </div>
          </div>
          <div className="d-flex align-items-center">
            {getStatusChip()}
            <Menu
              links={[
                {
                  label: labels.test,
                  icon: <SyncIcon color="secondary" />,
                  onClick: handleTest,
                },
                {
                  label: labels.delete,
                  icon: <DeleteIcon color="secondary" />,
                  onClick: handleDelete,
                },
              ]}
            >
              <MoreVertIcon />
            </Menu>
          </div>
        </div>
      </Card>
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
    delete: 'Excluir',
    deleteSuccess: 'Conexao excluida',
    deleteError: 'Nao foi possivel excluir a conexao',
  },
}

const labels = getLabels(LABELS)
