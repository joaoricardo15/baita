import { createContext, FC, ReactNode, useEffect, useState } from 'react'

import { IAppConnection } from '@baita/shared'
import { IContent, ITodoTask } from '@baita/shared'
import ApiRequest from '@/utils/requests'

export const UserContext = createContext<{
  connections: IAppConnection[] | undefined
  retrieveConnections: () => Promise<void>
  deleteConnection: (connectionId: string) => Promise<void>
  contents: IContent[] | undefined
  retrieveContent: () => Promise<void>
  reactToContent: (content: IContent, reaction: string) => Promise<void>
  popContent: () => void
  todoTasks: ITodoTask[] | undefined
  retrieveTodoTasks: () => Promise<void>
  updateTodoTasks: (tasks: ITodoTask[]) => Promise<ITodoTask[]>
  setTodoTasks: (tasks?: ITodoTask[]) => void
}>({
  connections: undefined,
  retrieveConnections: () => new Promise((resolve) => resolve()),
  deleteConnection: () => new Promise((resolve) => resolve()),
  contents: undefined,
  retrieveContent: () => new Promise((resolve) => resolve()),
  reactToContent: () => new Promise((resolve) => resolve()),
  popContent: () => undefined,
  todoTasks: undefined,
  retrieveTodoTasks: () => new Promise((resolve) => resolve()),
  updateTodoTasks: () => new Promise((resolve) => resolve([])),
  setTodoTasks: () => undefined,
})

const UserProvider: FC<{ children: ReactNode }> = ({ children }) => {
  const apiRequest = ApiRequest()
  const [connections, setConnections] = useState<IAppConnection[]>()
  const [contents, setContents] = useState<IContent[]>()
  const [todoTasks, setTodoTasks] = useState<ITodoTask[]>()

  const retrieveContent = () => {
    return apiRequest
      .getContent()
      .then((contents) =>
        setContents((prev) => (!prev ? contents : [...contents, ...prev]))
      )
      .catch(() => setContents([]))
  }

  const reactToContent = (content: IContent, reaction: string) => {
    return apiRequest.reactToContent(content, reaction)
  }

  const popContent = () => {
    contents?.pop()
    setContents(contents)

    if (contents && contents.length <= 3) {
      retrieveContent()
    }
  }

  const retrieveTodoTasks = () => {
    return apiRequest
      .getTodo()
      .then((todo) => setTodoTasks(todo?.tasks ?? []))
      .catch(() => setTodoTasks([]))
  }

  const updateTodoTasks = (tasks: ITodoTask[]) => {
    return apiRequest.updateTodo(tasks)
  }

  const retrieveConnections = () => {
    return apiRequest
      .getAppConnections()
      .then((connections) => {
        setConnections(connections)
      })
      .catch(() => setConnections([]))
  }

  const deleteConnection = (connectionId: string) => {
    return apiRequest.deleteConnection(connectionId).then(() => {
      setConnections((prev) =>
        prev?.filter((c) => String(c.connectionId) !== String(connectionId))
      )
    })
  }

  useEffect(() => {
    retrieveContent()
    retrieveTodoTasks()
    retrieveConnections()
  }, [])

  return (
    <UserContext.Provider
      value={{
        connections,
        retrieveConnections,
        deleteConnection,
        contents,
        retrieveContent,
        reactToContent,
        popContent,
        todoTasks,
        retrieveTodoTasks,
        updateTodoTasks,
        setTodoTasks: (tasks) => setTodoTasks(tasks),
      }}
    >
      {children}
    </UserContext.Provider>
  )
}

export default UserProvider
