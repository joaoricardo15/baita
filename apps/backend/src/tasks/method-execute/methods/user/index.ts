import { ITaskExecutionInput } from '@baita/shared'
import { IContent } from '@baita/shared'
import { validateContent } from '@baita/shared'
import Resource from '@/controllers/resource'
import User from '@/controllers/user'

export const getTodo = async (taskInput: ITaskExecutionInput<undefined>) => {
  try {
    const { userId } = taskInput

    const resource = new Resource(userId, 'todo')

    const data = await resource.read()

    return data
  } catch (err: unknown) {
    throw (err as Error).message || err
  }
}

interface IPublishFeed {
  content: IContent | IContent[]
}

export const publishToFeed = async (
  taskInput: ITaskExecutionInput<IPublishFeed>
) => {
  try {
    const { userId, inputData } = taskInput

    const contentList = Array.isArray(inputData.content)
      ? inputData.content
      : [inputData.content]

    validateContent(contentList)

    const user = new User()

    await user.publishContent(userId, contentList)

    return {
      message: 'Content published successfully.',
    }
  } catch (err: unknown) {
    throw (err as Error).message || err
  }
}
