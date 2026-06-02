import { withAuthenticationRequired } from '@auth0/auth0-react'
import { Add as AddIcon } from '@mui/icons-material'
import { FC, useContext, useEffect, useState } from 'react'

import { Button, Loading, Skeleton, TextInput } from '@/components'
import { UserContext } from '@/providers/user'
import { getLabels, Labels } from '@/utils/labels'
import ToDoList from './components/todoList'

export const ToDo: FC = () => {
  const { todoTasks, retrieveTodoTasks, updateTodoTasks, setTodoTasks } =
    useContext(UserContext)
  const [newTaskTitle, setNewTaskTitle] = useState('')

  const onNewTodoTitleChange = (value: string) => {
    setNewTaskTitle(value)
  }

  const onAddTodo = () => {
    if (todoTasks && newTaskTitle) {
      const doneTasks = todoTasks.filter((t) => t.done)
      const unDoneTasks = todoTasks.filter((t) => !t.done)

      const now = Date.now()

      const updatedTasks = [
        ...unDoneTasks,
        {
          taskId: now.toString(),
          done: false,
          title: newTaskTitle,
          createdAt: now,
          updatedAt: now,
        },
        ...doneTasks,
      ]
      setNewTaskTitle('')
      setTodoTasks(updatedTasks)
      updateTodoTasks(updatedTasks)
    }
  }

  useEffect(() => {
    retrieveTodoTasks()
  }, [])

  return (
    <>
      {!todoTasks ? (
        <div className="d-flex m-2">
          <Skeleton elements={5} width={36} height={36} />
          <Skeleton elements={5} height={36} className="w-100 mx-2" />
        </div>
      ) : (
        <div>
          <div style={{ maxHeight: '70vh', overflow: 'scroll' }}>
            <ToDoList
              tasks={todoTasks.filter((task) => !task.done)}
              onChange={(todoTasks) => {
                setTodoTasks(todoTasks)
                updateTodoTasks(todoTasks)
              }}
            />
          </div>
          <div
            style={{ marginTop: '10vh' }}
            className="d-flex justify-content-center mx-4"
          >
            <TextInput
              variant="fs-2 fw-bold"
              className="w-100"
              value={newTaskTitle}
              onChange={onNewTodoTitleChange}
              placeholder={
                !todoTasks.filter((task) => !task.done).length
                  ? labels.nextTask
                  : labels.anotherTask
              }
            />
            <Button
              iconButton
              disabled={!newTaskTitle}
              onClick={onAddTodo}
              icon={<AddIcon className="fs-1 text-primary" />}
            />
          </div>
        </div>
      )}
    </>
  )
}

export default withAuthenticationRequired(ToDo, {
  onRedirecting: () => <Loading />,
})

const LABELS: Labels = {
  en: {
    nextTask: 'Next thing to do here...',
    anotherTask: 'Another thing to do...',
    alreadyDone: 'Already done:',
  },
  pt: {
    nextTask: 'Próxima coisa a ser feita...',
    anotherTask: 'Outra coisa para fazer...',
    alreadyDone: 'Feito:',
  },
}

const labels = getLabels(LABELS)
