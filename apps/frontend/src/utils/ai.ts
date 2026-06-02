import { ITask } from '@baita/shared'

export interface AiMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

interface AiService {
  provider: 'chrome-ai'
  generate(messages: AiMessage[]): Promise<string>
}

const SYSTEM_PROMPT = `You ONLY output JSON. No text. No explanations. Respond with a single JSON object in a \`\`\`json code block.`

const TASK_INSTRUCTIONS = `You modify a task's inputData. Output ONLY the complete modified task as JSON in a \`\`\`json code block. NO text.

HOW TO FILL inputData:
Copy ALL fields from service.config.inputFields into the inputData array. Keep every property (name, label, type, required, options, description) and ADD a "value" field to each based on the user's request.

Example: if service.config.inputFields is:
[{"name":"expression","options":[{"value":"rate(10 minutes)","label":"Run every 10 minutes"},{"value":"rate(30 minutes)","label":"Run every 30 minutes"}],"label":"Expression","type":"options","required":true},{"name":"timeZone","label":"Time Zone","type":"user","required":true}]

And user says "every 10 minutes", then inputData should be:
[{"name":"expression","options":[{"value":"rate(10 minutes)","label":"Run every 10 minutes"},{"value":"rate(30 minutes)","label":"Run every 30 minutes"}],"label":"Expression","type":"options","required":true,"value":"rate(10 minutes)"},{"name":"timeZone","label":"Time Zone","type":"user","required":true,"value":"Europe/Amsterdam"}]

Rules:
- Copy the FULL field object from inputFields into inputData (keep options, label, required, description, etc.)
- ADD "value" with the appropriate value based on user request
- For type "options": value must be one of the option values listed
- For type "user": value is user-provided text
- For type "constant"/"environment": value is already defined in the field, keep it
- Keep taskId, app, and service unchanged`

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
    if (ai?.canCreateGenericSession) {
      const availability = await ai.canCreateGenericSession()
      return availability === 'readily'
    }
    if (ai?.languageModel) {
      const caps = await ai.languageModel.capabilities()
      return caps?.available === 'readily'
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof (window as any).LanguageModel !== 'undefined') {
      return true
    }
    return false
  } catch {
    return false
  }
}

function createChromeAiService(): AiService {
  return {
    provider: 'chrome-ai',
    async generate(messages: AiMessage[]): Promise<string> {
      const prompt = messages
        .filter((m) => m.role !== 'system')
        .map((m) => `${m.role}: ${m.content}`)
        .join('\n')

      console.warn(
        `[AI Assistant] Prompt to Nano (${prompt.length} chars):`,
        prompt
      )

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ai = (window as any).ai
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const LM = (window as any).LanguageModel

      if (LM?.create) {
        const session = await LM.create({
          systemPrompt: SYSTEM_PROMPT,
          expectedOutputLanguages: ['en'],
        })
        return await session.prompt(prompt)
      }
      if (ai?.createGenericSession) {
        const session = await ai.createGenericSession({
          systemPrompt: SYSTEM_PROMPT,
        })
        return await session.prompt(prompt)
      }
      const session = await ai.languageModel.create({
        systemPrompt: SYSTEM_PROMPT,
      })
      return await session.prompt(prompt)
    },
  }
}

export function parseTaskFromResponse(response: string): ITask | null {
  const jsonMatch = response.match(/```json\s*([\s\S]*?)```/)
  const jsonStr = jsonMatch ? jsonMatch[1].trim() : response.trim()

  try {
    const parsed = JSON.parse(jsonStr)
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as ITask
    }
    if (Array.isArray(parsed) && parsed.length === 1) {
      return parsed[0] as ITask
    }
    return null
  } catch {
    return null
  }
}

export function buildMessagesWithContext(
  userMessage: string,
  task: ITask,
  history?: AiMessage[]
): AiMessage[] {
  const messages: AiMessage[] = []

  if (history) {
    messages.push(...history.filter((m) => m.role !== 'system'))
  }

  const { sampleResult: _sr, sampleConfigHash: _sh, ...stripped } = task
  const strippedInputData = stripped.inputData?.map(
    ({ sampleValue: _sv, ...rest }) => rest
  )
  const taskJson = JSON.stringify({ ...stripped, inputData: strippedInputData })

  const inputFields = task.service?.config?.inputFields
  const fieldsInfo = inputFields
    ? `\n\nThis task's service.config.inputFields (copy these into inputData and add "value" to each):\n${JSON.stringify(inputFields)}`
    : ''

  messages.push({
    role: 'user',
    content: `${TASK_INSTRUCTIONS}${fieldsInfo}\n\nCurrent task:\n\`\`\`json\n${taskJson}\n\`\`\`\n\nUser request: ${userMessage}`,
  })

  return messages
}

export function buildRetryMessage(
  _rawResponse: string,
  errors: string[]
): AiMessage {
  const errorList = errors.map((e) => `- ${e}`).join('\n')
  return {
    role: 'user',
    content: `Your previous response had errors:\n${errorList}\n\nFix these issues and return the corrected task JSON object. Output ONLY JSON in a \`\`\`json code block.`,
  }
}
