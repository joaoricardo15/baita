export interface IUser {
  userId: string
  name: string
  email: string
  picture: string
}

export interface IContent {
  contentId: string
  date: string
  header: string
  body?: string
  source?: string
  image?: string
  url?: string
  likes?: number
  comments?: number
  author: {
    name: string
    accountName?: string
    description?: string
    image?: string
    url?: string
    location?: string
    followers?: number
  }
}

export interface ITodo {
  userId: string
  tasks: ITodoTask[]
}

export interface ITodoTask {
  taskId: string
  title: string
  body?: string
  done: boolean
  createdAt: number
  updatedAt: number
}
