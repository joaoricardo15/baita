import { ITodoTask } from './todo.schema'

export const exampleTodo: ITodoTask[] = [
  {
    taskId: '1718000000001',
    title: 'Buy groceries',
    done: false,
    createdAt: '2024-06-10T10:13:20.000Z',
    updatedAt: '2024-06-10T10:13:20.000Z',
  },
  {
    taskId: '1718000000002',
    title: 'Schedule dentist appointment',
    done: false,
    createdAt: '2024-06-09T06:26:40.000Z',
    updatedAt: '2024-06-09T06:26:40.000Z',
  },
  {
    taskId: '1718000000003',
    title: 'Review pull request',
    done: true,
    createdAt: '2024-06-08T02:40:00.000Z',
    updatedAt: '2024-06-08T16:33:20.000Z',
  },
  {
    taskId: '1718000000004',
    title: 'Send invoice to client',
    done: true,
    createdAt: '2024-06-06T22:53:20.000Z',
    updatedAt: '2024-06-07T12:46:40.000Z',
  },
]
