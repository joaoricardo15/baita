import { ITask } from '../models/bot'

export interface AiMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface AiService {
  provider: 'chrome-ai'
  generate(messages: AiMessage[]): Promise<string>
}

const SYSTEM_PROMPT = `You are a bot builder assistant for Baita, a personal automation platform.
Users describe automations in natural language. You generate valid bot task definitions as JSON.

Available trigger services (first task only):
- webhook: receives HTTP data from external sources
- schedule: fires on a cron expression (e.g., "0 8 * * *" for daily at 8am)

Available action services (subsequent tasks):
- code-execute: runs JavaScript code. inputData needs a "code" field with the JS string.
- http-request: calls an external API. inputData needs: method, path, headers, bodyParams.
- method-execute: built-in methods. Config methodName options: getTodo, publishToFeed, sendNotification, httpRequest, oauth2Request.

Task structure:
{
  "taskId": <unique number, use Date.now() + index>,
  "service": { "type": "trigger"|"invoke", "name": "<service-name>", "label": "<display name>", "config": { "inputFields": [] } },
  "inputData": [{ "type": "text"|"output"|"code", "name": "<field-name>", "label": "<display>", "value": "<static value>" }],
  "returnData": true  // only on the last task if it should return output
}

To reference a previous task's output:
{ "type": "output", "name": "<field>", "label": "<display>", "outputIndex": <0-based task index>, "outputPath": "<dot.path.to.field>" }

Rules:
- First task MUST be a trigger (webhook or schedule)
- Generate valid JSON array of tasks (ITask[])
- Wrap response in a JSON code block: \`\`\`json ... \`\`\`
- If editing existing tasks, return the full updated array
- Keep it simple: use the minimum tasks needed`

export async function getAiService(): Promise<AiService | null> {
  if (await isChromeAiAvailable()) {
    return createChromeAiService()
  }
  return null
}

async function isChromeAiAvailable(): Promise<boolean> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ai = (window as any).ai
    if (!ai?.languageModel) return false
    const caps = await ai.languageModel.capabilities()
    return caps?.available === 'readily'
  } catch {
    return false
  }
}

function createChromeAiService(): AiService {
  return {
    provider: 'chrome-ai',
    async generate(messages: AiMessage[]): Promise<string> {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ai = (window as any).ai
      const session = await ai.languageModel.create({
        systemPrompt: SYSTEM_PROMPT,
      })
      const prompt = messages
        .filter((m) => m.role !== 'system')
        .map((m) => `${m.role}: ${m.content}`)
        .join('\n')
      return await session.prompt(prompt)
    },
  }
}

export function parseTasksFromResponse(response: string): ITask[] | null {
  const jsonMatch = response.match(/```json\s*([\s\S]*?)```/)
  const jsonStr = jsonMatch ? jsonMatch[1].trim() : response.trim()

  try {
    const parsed = JSON.parse(jsonStr)
    if (Array.isArray(parsed)) return parsed as ITask[]
    if (parsed.tasks && Array.isArray(parsed.tasks))
      return parsed.tasks as ITask[]
    return null
  } catch {
    return null
  }
}

export function buildMessagesWithContext(
  userMessage: string,
  existingTasks?: ITask[],
  history?: AiMessage[]
): AiMessage[] {
  const messages: AiMessage[] = []

  if (history) {
    messages.push(...history.filter((m) => m.role !== 'system'))
  }

  if (existingTasks && existingTasks.length > 1) {
    messages.push({
      role: 'user',
      content: `Current bot tasks:\n\`\`\`json\n${JSON.stringify(existingTasks, null, 2)}\n\`\`\`\nModify this bot based on my next message.`,
    })
  }

  messages.push({ role: 'user', content: userMessage })
  return messages
}
