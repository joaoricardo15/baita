import { withAuthenticationRequired } from '@auth0/auth0-react'
import {
  Add as AddIcon,
  CableOutlined as CableOutlinedIcon,
} from '@mui/icons-material'
import { Fab } from '@mui/material'
import { FC, useState } from 'react'

import { EmptyState, ListItem, Loading, Skeleton } from '@/components'
import { useConnections } from '@/hooks/useConnections'
import { getLabels, Labels } from '@/utils/labels'

import AddConnection from './components/addConnection'
import ConnectionCard from './components/connectionCard'

export const Connections: FC = () => {
  const { data: connections, isLoading: loading } = useConnections()
  const [showAdd, setShowAdd] = useState(false)

  if (loading || connections === undefined) {
    return <Skeleton elements={3} height={100} />
  }

  return (
    <>
      {connections.length === 0 ? (
        <EmptyState
          icon={<CableOutlinedIcon style={{ fontSize: 48 }} />}
          title={labels.empty}
          description={labels.emptyHint}
        />
      ) : (
        connections.map((connection, i) => (
          <ListItem key={String(connection.connectionId)} index={i}>
            <ConnectionCard connection={connection} />
          </ListItem>
        ))
      )}

      <Fab
        color="primary"
        onClick={() => setShowAdd(true)}
        sx={{ position: 'fixed', bottom: 24, right: 24 }}
      >
        <AddIcon />
      </Fab>

      <AddConnection open={showAdd} onClose={() => setShowAdd(false)} />
    </>
  )
}

export default withAuthenticationRequired(Connections, {
  onRedirecting: () => <Loading />,
})

const LABELS: Labels = {
  en: {
    empty: 'No connections yet',
    emptyHint: 'Connect your first app to get started',
    addConnection: 'Add connection',
  },
  pt: {
    empty: 'Nenhuma conexão ainda',
    emptyHint: 'Conecte seu primeiro app para começar',
    addConnection: 'Adicionar conexão',
  },
}

const labels = getLabels(LABELS)
