import { withAuthenticationRequired } from '@auth0/auth0-react'
import {
  CheckBox as CheckBoxIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Card,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from '@mui/material'
import { FC, useContext, useEffect, useState } from 'react'
import { TypeAnimation } from 'react-type-animation'

import trophySrc from '@/assets/trophy.gif'
import { Button, Loading, Skeleton, Text } from '@/components'
import { ITodoTask } from '@baita/shared'
import { useDeleteUser } from '@/hooks/useUser'
import { useTodo } from '@/hooks/useTodo'
import { AuthContext } from '@/providers/auth'
import { NotificationContext } from '@/providers/notification'
import { getTimeDiffLabel, isToday } from '@/utils/date'
import { getLabels, Labels } from '@/utils/labels'
import Avatar from './components/avatar'

export const ProfileComponent: FC = () => {
  const { user, logout } = useContext(AuthContext)
  const { showLoading } = useContext(NotificationContext)
  const { data: todoTasks } = useTodo()
  const deleteUser = useDeleteUser()

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [statistics, setStatistics] = useState<{
    doneTasks: ITodoTask[]
    doneToday: ITodoTask[]
    dailyGoal: boolean
  }>()

  useEffect(() => {
    if (todoTasks) {
      const doneTasks = todoTasks.filter((t) => t.done)
      const doneToday = doneTasks.filter((t) => isToday(t.updatedAt))

      setStatistics({
        doneTasks,
        doneToday,
        dailyGoal: doneToday.length >= 3,
      })
    }
  }, [todoTasks])

  const onDeleteAccount = () => {
    setDeleteDialogOpen(false)
    showLoading(true)
    deleteUser
      .mutateAsync()
      .then(() => logout())
      .catch(() => showLoading(false))
  }

  return (
    <div className="mt-5">
      <Avatar
        picture={user?.picture || ''}
        email={user?.email || ''}
        name={user?.name || ''}
      />
      <div className="mt-4">
        {!statistics ? (
          <Skeleton />
        ) : (
          <div className="">
            {statistics.dailyGoal && (
              <Card className="mb-4">
                <img
                  className="w-100"
                  alt="Daily trophy"
                  style={{ marginTop: -100, marginBottom: -100 }}
                  src={trophySrc}
                />
                <TypeAnimation
                  cursor={false}
                  className="fs-2 text-secondary fw-bolder m-4"
                  sequence={[2000, 'Congrats', 1000, labels.dailyGoal]}
                />
              </Card>
            )}
            <Accordion disabled={statistics.doneToday.length === 0}>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <div className="d-flex align-items-center">
                  <Text className="fw-bold">{labels.doneTodayTasks}</Text>
                  <Text className="mx-2 fs-2">
                    {statistics.doneToday.length}
                  </Text>
                </div>
              </AccordionSummary>
              <AccordionDetails>
                {statistics.doneToday.map((t) => (
                  <div
                    key={t.taskId}
                    className="d-flex align-items-center justify-content-between"
                  >
                    <div className=" d-flex align-items-center ">
                      <CheckBoxIcon color="secondary" className="fs-5" />
                      <Text className="fs-6 mx-1">{t.title}</Text>
                    </div>
                    <Text className="fs-6 text-info">
                      ({getTimeDiffLabel(t.updatedAt)})
                    </Text>
                  </div>
                ))}
              </AccordionDetails>
            </Accordion>
          </div>
        )}
      </div>

      <div className="d-flex justify-content-center mt-5">
        <Button
          type="text"
          color="error"
          icon={<DeleteIcon />}
          onClick={() => setDeleteDialogOpen(true)}
        >
          {labels.deleteAccount}
        </Button>
      </div>

      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>{labels.deleteTitle}</DialogTitle>
        <DialogContent>
          <DialogContentText>{labels.deleteWarning}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            {labels.cancel}
          </Button>
          <Button color="error" onClick={onDeleteAccount}>
            {labels.confirmDelete}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  )
}

export default withAuthenticationRequired(ProfileComponent, {
  onRedirecting: () => <Loading />,
})

const LABELS: Labels = {
  en: {
    doneTodayTasks: 'Tasks done today:',
    dailyGoal: 'Congrats, you have reached your daily goal 🎉🎉🎉',
    deleteAccount: 'Delete account',
    deleteTitle: 'Delete your account?',
    deleteWarning:
      'This action is permanent. All your bots, connections, data, and account will be deleted forever.',
    cancel: 'Cancel',
    confirmDelete: 'Delete forever',
  },
  pt: {
    doneTodayTasks: 'Tarefas feitas hoje:',
    dailyGoal: 'Parabéns, você atingiu sua cota diária 🎉🎉🎉',
    deleteAccount: 'Deletar conta',
    deleteTitle: 'Deletar sua conta?',
    deleteWarning:
      'Esta ação é permanente. Todos os seus bots, conexões, dados e conta serão deletados para sempre.',
    cancel: 'Cancelar',
    confirmDelete: 'Deletar para sempre',
  },
}

const labels = getLabels(LABELS)
