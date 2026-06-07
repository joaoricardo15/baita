import {
  ConditionOperator,
  DataType,
  ITask,
  ITaskCondition,
  VariableType,
} from '@baita/shared'
import JSZip from 'jszip'

import {
  getDataFromService,
  getValueFromInputVariable,
  OUTPUT_CODE,
} from './bot'

const zip = new JSZip()

const SERVICE_PREFIX = process.env.SERVICE_PREFIX || ''

export function sanitizeForCodeString(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/`/g, '\\`')
    .replace(/\$/g, '\\$')
}

export function getInputString(input: DataType = ''): string {
  return JSON.stringify(input)
    .replace(new RegExp(`"${OUTPUT_CODE}`, 'g'), '')
    .replace(new RegExp(`${OUTPUT_CODE}"`, 'g'), '')
}

export function getConditionsString(
  conditions?: ITaskCondition[][]
): string | undefined {
  return conditions
    ?.map((orConditions) =>
      orConditions
        .map((andCondition) => decodeCondition(andCondition))
        .join(' && ')
    )
    .map((x) => `(${x})`)
    .join(' || ')
}

export function decodeCondition(condition: ITaskCondition): string {
  const {
    operator,
    operand,
    comparisonOperand = { name: '', label: '', type: VariableType.constant },
  } = condition

  const stringOperand = getInputString(getValueFromInputVariable(operand))
  const stringComparison = getInputString(
    getValueFromInputVariable(comparisonOperand)
  )

  switch (operator) {
    case ConditionOperator.equals:
      return `${stringOperand} == ${stringComparison}`
    case ConditionOperator.notEquals:
      return `${stringOperand} != ${stringComparison}`
    case ConditionOperator.contains:
      return `${stringOperand}.includes(${stringComparison})`
    case ConditionOperator.startsWith:
      return `${stringOperand}.startsWith(${stringComparison})`
    case ConditionOperator.endsWith:
      return `${stringOperand}.endsWith(${stringComparison})`
    case ConditionOperator.exists:
      return `!!${stringOperand}`
    case ConditionOperator.doesNotExist:
      return `!${stringOperand}`
  }
}

export function getParseEventFunctionCode(): string {
  return `(() => {
    if (event.body) {
      try {
        if (event.isBase64Encoded &&
            event.headers['Content-type'] &&
            event.headers['Content-type'] === 'application/x-www-form-urlencoded'
          ) {
          const buffer = Buffer.from(event.body, 'base64');
          const bodyString = buffer.toString('ascii').replace(/&/g, ",").replace(/=/g, ":");
          const jsonBody = JSON.parse('{"' + decodeURI(bodyString) + '"}');
          return jsonBody;
        }
        else {
          return JSON.parse(event.body);
        }
      } catch (err) {
        return event.body;
      }
    } else {
      return event;
    }
  })()`
}

export function getBotSampleCode(userId: string, botId: string): string {
  const safeUserId = sanitizeForCodeString(userId)
  const safeBotId = sanitizeForCodeString(botId)

  return `
const { Lambda } = require('@aws-sdk/client-lambda');
const lambda = new Lambda();

module.exports.handler = async (event, context, callback) => {
  ////////////////////////////////////////////////////////////////////////////////
  // 1. Declare global variables

  const botId = '${safeBotId}';
  const userId = '${safeUserId}';

  ////////////////////////////////////////////////////////////////////////////////
  // 2. Get input from event and save it as outputData

  const inputData = event;

  const outputData = ${getParseEventFunctionCode()};

  ////////////////////////////////////////////////////////////////////////////////
  // 3. Publish trigger sample

  await lambda.invoke({
    FunctionName: '${SERVICE_PREFIX}-endpoint-task',
    Payload: JSON.stringify({
      direct: true,
      userId,
      task: { service: { name: 'trigger-sample', config: {} }, app: { config: {} } },
      resolvedInputData: {
        inputData,
        outputData,
        status: 'success',
        botId
      }
    })
  });

  ////////////////////////////////////////////////////////////////////////////////
  // 4. Return success

  callback(null, {
    statusCode: 200,
    headers: {
      'Content-type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({
      success: true
    })
  });
};
    `
}

export function getCompleteBotCode(
  userId: string,
  botId: string,
  tasks: ITask[]
): string {
  const safeUserId = sanitizeForCodeString(userId)
  const safeBotId = sanitizeForCodeString(botId)
  const safeTaskLabel = sanitizeForCodeString(tasks[0].service?.label || '')

  return `
const { Lambda } = require('@aws-sdk/client-lambda');
const lambda = new Lambda();

module.exports.handler = async (event, context, callback) => {
  ////////////////////////////////////////////////////////////////////////////////
  // 1. Declare global variables

  const botId = '${safeBotId}';
  const userId = '${safeUserId}';
  let logs = [], usage = 0, errorData, outputData;

  ////////////////////////////////////////////////////////////////////////////////
  // 2. Get input bot from event, and save it as task0_outputData

  const task0_inputData = event;

  const task0_outputData = ${getParseEventFunctionCode()};

  ////////////////////////////////////////////////////////////////////////////////
  // 3. Register fist log and increment usage

  usage += 1;
  logs.push({
    name: '${safeTaskLabel}',
    inputData: task0_inputData,
    outputData: task0_outputData,
    timestamp: Date.now(),
    status: 'success'
  });

  ////////////////////////////////////////////////////////////////////////////////
  // 4. Execute tasks

  try {
    ${getBotInnerCode(tasks)}
  } catch (err) {
    errorData = err.toString();
  }

  ////////////////////////////////////////////////////////////////////////////////
  // 5. Publish bot logs

  console.log(JSON.stringify({
    logs,
    usage,
    botId,
    userId,
    error: errorData,
    timestamp: Date.now()
  }));

  ////////////////////////////////////////////////////////////////////////////////
  // 6. Return success

  callback(null, {
    statusCode: 200,
    headers: {
      'Content-type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify({
      success: !errorData,
      data: errorData || outputData
    })
  });
};`
}

export function getBotInnerCode(tasks: ITask[]): string {
  let innerCode = ''

  for (let i = 1; i < tasks.length; i++) {
    const task = tasks[i]

    try {
      const inputData = getDataFromService(
        task.service?.config.inputFields || [],
        task.inputData
      )

      const safeTaskLabel = sanitizeForCodeString(task.service?.label || '')

      innerCode += `
      ////////////////////////////////////////////////////////////////////////////////
      // Task ${i} ///////////////////////////////////////////////////////////////////
      ////////////////////////////////////////////////////////////////////////////////
      // Task: 4.${i}. Collect operation inputs

      ////////////////////////////////////////////////////////////////////////////////
      // 4.${i}.1. Collect operation inputs

      const task${i}_inputData = ${getInputString(inputData)};

      let task${i}_outputData;
      const task${i}_startedAt = Date.now();

      ////////////////////////////////////////////////////////////////////////////////
      // 4.${i}.2. Check conditions

      if (${getConditionsString(task.conditions) || true}) {
        ////////////////////////////////////////////////////////////////////////////////
        // 4.${i}.3. If condition passes, execute operation
${
  task.retryPolicy && task.retryPolicy.maxAttempts > 1
    ? `
        let task${i}_attempts = 0;
        const task${i}_maxAttempts = ${task.retryPolicy.maxAttempts};
        const task${i}_backoffMs = ${task.retryPolicy.backoffMs || 1000};
        let task${i}_lastError;
        while (task${i}_attempts < task${i}_maxAttempts) {
          task${i}_attempts++;
          try {`
    : ''
}
        const { Payload: task${i}_lambda_payload } = await lambda.invoke({
          FunctionName: '${SERVICE_PREFIX}-endpoint-task',
          Payload: JSON.stringify({
            direct: true,
            userId,
            task: {
              service: ${JSON.stringify(task.service || {})},
              app: ${JSON.stringify(task.app || {})},
              connectionId: ${task.connectionId || 'undefined'}
            },
            resolvedInputData: task${i}_inputData
          }),
        });

        ////////////////////////////////////////////////////////////////////////////////
        // 4.${i}.4. Parse results

        const task${i}_result = JSON.parse(Buffer.from(task${i}_lambda_payload).toString());

        const task${i}_success = task${i}_result.success;

        task${i}_outputData = task${i}_success && task${i}_result.data ? task${i}_result.data : { message: task${i}_result.message || task${i}_result.errorMessage || 'nothing for you this time : (' };
${
  task.retryPolicy && task.retryPolicy.maxAttempts > 1
    ? `
            if (task${i}_success) break;
            task${i}_lastError = task${i}_result.message;
          } catch (retryErr) {
            task${i}_lastError = retryErr.message || retryErr;
          }
          if (task${i}_attempts < task${i}_maxAttempts) {
            await new Promise(r => setTimeout(r, task${i}_backoffMs * task${i}_attempts));
          }
        }
        if (!task${i}_outputData) {
          task${i}_outputData = { message: task${i}_lastError || 'Max retries exceeded' };
        }`
    : ''
}

        ////////////////////////////////////////////////////////////////////////////////
        // 4.${i}.5. Add result to logs

        logs.push({
          timestamp: Date.now(),
          name: '${safeTaskLabel}',
          inputData: task${i}_inputData,
          outputData: task${i}_outputData,
          status: task${i}_success ? 'success' : 'fail',
          durationMs: Date.now() - task${i}_startedAt,
        });

        ////////////////////////////////////////////////////////////////////////////////
        // 4.${i}.6. If task executed successfully, increment usage

        if (task${i}_success) usage += 1;
    ${
      task.returnData
        ? `
        ////////////////////////////////////////////////////////////////////////////////
        // 4.${i}.7. If task property returnData equals true, set outputData to task result

        if (task${i}_success) outputData = task${i}_outputData;
        `
        : ''
    }
      } else {
        ////////////////////////////////////////////////////////////////////////////////
        // 4.${i}.8. If condition does not pass, add result to logs

        logs.push({
          timestamp: Date.now(),
          name: '${safeTaskLabel}',
          inputData: task${i}_inputData,
          outputData: task${i}_outputData,
          status: 'filtered',
          durationMs: Date.now() - task${i}_startedAt,
        });
      }`
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err)
      throw Error(`Error on task ${i}: ${message}`)
    }
  }

  return innerCode
}

export async function getCodeFile(code: string): Promise<Buffer> {
  zip.file('index.js', code)

  const archive = await zip.generateAsync({ type: 'base64' })

  return Buffer.from(archive, 'base64')
}
