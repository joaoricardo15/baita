import Resource from 'src/controllers/resource'
import User from 'src/controllers/user'
import { ITaskExecutionInput } from 'src/models/bot/interface'
import { IContent } from 'src/models/user/interface'
import { validateContent } from 'src/models/user/validation'

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
