import { Alert, Modal, Snackbar } from '@mui/material'
import { createContext, FC, ReactNode, useState } from 'react'

import { Loading, Logo, Text } from '@/components'

type MessageType = 'success' | 'info' | 'warning' | 'error'

export const NotificationContext = createContext<{
  showSnack: (message: string, type?: MessageType) => void
  showModal: (title: string, body?: ReactNode, image?: string) => void
  showLoading: (loading: boolean) => void
}>({
  showSnack: () => undefined,
  showModal: () => undefined,
  showLoading: () => undefined,
})

const NotificationProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const [snack, setSnack] = useState<{
    message: string
    type: MessageType
  }>()

  const [modal, setModal] = useState<{
    title: string
    body?: ReactNode
    image?: string
  }>()

  const [loading, setLoading] = useState(false)

  return (
    <NotificationContext.Provider
      value={{
        showSnack: (message: string, type: MessageType = 'info') =>
          setSnack({ message, type }),
        showModal: (title: string, body?: ReactNode) =>
          setModal({ title, body }),
        showLoading: (loading: boolean) => setLoading(loading),
      }}
    >
      {loading && <Loading />}
      <Snackbar
        open={!!snack}
        autoHideDuration={3000}
        onClose={() => setSnack(undefined)}
      >
        {snack && <Alert severity={snack.type}>{snack.message}</Alert>}
      </Snackbar>
      <Modal open={!!modal} onClose={() => setModal(undefined)}>
        <div
          className="bg-white mt-5 p-4 rounded"
          style={{ maxWidth: 800, margin: 'auto' }}
        >
          <div className="d-flex">
            <Logo size={48} />
            <Text className="mx-1" type="h6" style={{ fontWeight: 700 }}>
              {modal?.title}
            </Text>
          </div>
          {modal?.body && (
            <div
              className="mt-2"
              style={{ maxHeight: 600, overflowY: 'scroll' }}
            >
              {modal?.body}
            </div>
          )}
          {modal?.image && (
            <img width="100%" alt="Bot front image" src={modal?.image} />
          )}
        </div>
      </Modal>
      {children}
    </NotificationContext.Provider>
  )
}

export default NotificationProvider
