import { ITodoTask } from './todo.schema'

export const exampleTodo: ITodoTask[] = [
  {
    taskId: '1718000000001',
    title: 'Buy groceries',
    done: false,
    createdAt: 1718000000000,
    updatedAt: 1718000000000,
  },
  {
    taskId: '1718000000002',
    title: 'Schedule dentist appointment',
    done: false,
    createdAt: 1717900000000,
    updatedAt: 1717900000000,
  },
  {
    taskId: '1718000000003',
    title: 'Review pull request',
    done: true,
    createdAt: 1717800000000,
    updatedAt: 1717850000000,
  },
  {
    taskId: '1718000000004',
    title: 'Send invoice to client',
    done: true,
    createdAt: 1717700000000,
    updatedAt: 1717750000000,
  },
]
