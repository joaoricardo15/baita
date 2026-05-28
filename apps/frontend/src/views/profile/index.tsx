import { withAuthenticationRequired } from '@auth0/auth0-react'
import {
  CheckBox as CheckBoxIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Card,
} from '@mui/material'
import { FC, useContext, useEffect, useState } from 'react'
import { TypeAnimation } from 'react-type-animation'

import trophySrc from '../../assets/trophy.gif'
import { Loading, Skeleton, Text } from '../../components'
import { ITodoTask } from '../../models/user'
import { AuthContext } from '../../providers/auth'
import { UserContext } from '../../providers/user'
import { getTimeDiffLabel, isToday } from '../../utils/date'
import { getLabels, Labels } from '../../utils/labels'
import Avatar from './components/avatar'

export const ProfileComponent: FC = () => {
  const { user } = useContext(AuthContext)
  const { todoTasks } = useContext(UserContext)

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
  },
  pt: {
    doneTodayTasks: 'Tarefas feitas hoje:',
    dailyGoal: 'Parabéns, você atingiu sua cota diária 🎉🎉🎉',
  },
}

const labels = getLabels(LABELS)
