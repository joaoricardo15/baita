import { IContent, ITaskExecutionInput, validateContent } from '@baita/shared'

import Resource from '@/controllers/resource'
import User from '@/controllers/user'

export const getTodo = async (taskInput: ITaskExecutionInput<undefined>) => {
  try {
    const { userId } = taskInput

    const resource = new Resource(userId, 'todo')

    const data = await resource.read()

    return data
  } catch (err: unknown) {
    throw err instanceof Error ? err : new Error(String(err))
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

    const { published, total } = await user.publishContent(userId, contentList)

    if (published === 0) {
      throw new Error(
        `No new content to publish (${total} items already seen).`
      )
    }

    return {
      message: `Published ${published} of ${total} items to feed.`,
    }
  } catch (err: unknown) {
    throw err instanceof Error ? err : new Error(String(err))
  }
}
