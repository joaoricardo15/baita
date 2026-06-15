process.env.CORE_TABLE = 'test-table'
process.env.SERVICE_API_URL = 'https://api.baita.help'
process.env.FILES_BUCKET = 'test-bucket'

import {
  DeleteCommand,
  DynamoDBDocument,
  GetCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb'
import { mockClient } from 'aws-sdk-client-mock'

const ddbMock = mockClient(DynamoDBDocument)

import Connection from '../connection'

beforeEach(() => {
  ddbMock.reset()
})

describe('Connection.listConnections', () => {
  it('returns all connections for a user', async () => {
    ddbMock.on(QueryCommand).resolves({
      Items: [
        { connectionId: 'c1', name: 'Gmail' },
        { connectionId: 'c2', name: 'Pipedrive' },
      ],
    })

    const connection = new Connection()
    const result = await connection.listConnections('user1')

    expect(result).toHaveLength(2)
  })
})

describe('Connection.createConnection', () => {
  it('throws on missing connectorId', async () => {
    const connection = new Connection()
    await expect(
      connection.createConnection('user1', '', 'key123')
    ).rejects.toThrow('Missing required fields')
  })

  it('throws on missing apiKey', async () => {
    const connection = new Connection()
    await expect(
      connection.createConnection('user1', 'news-api', '')
    ).rejects.toThrow('Missing required fields')
  })

  it('throws on invalid connector', async () => {
    const connection = new Connection()
    await expect(
      connection.createConnection('user1', 'nonexistent', 'key123')
    ).rejects.toThrow('Invalid connector or auth type')
  })
})

describe('Connection.getConnectionDetails', () => {
  it('throws when connection not found', async () => {
    ddbMock.on(GetCommand).resolves({ Item: undefined })

    const connection = new Connection()
    await expect(
      connection.getConnectionDetails('user1', 'c1')
    ).rejects.toThrow('Connection not found')
  })

  it('redacts credentials and returns linked bots', async () => {
    ddbMock.on(GetCommand).resolves({
      Item: {
        connectionId: 'c1',
        connectorId: 'google',
        credentials: { access_token: 'secret' },
        name: 'My Google',
      },
    })
    ddbMock.on(QueryCommand).resolves({
      Items: [
        { botId: 'bot1', name: 'Bot One', tasks: [{ connectionId: 'c1' }] },
        { botId: 'bot2', name: 'Bot Two', tasks: [{ connectionId: 'other' }] },
      ],
    })

    const connection = new Connection()
    const result = await connection.getConnectionDetails('user1', 'c1')

    expect(result.connection).not.toHaveProperty('credentials')
    expect(result.connection.connectionId).toBe('c1')
    expect(result.linkedBots).toHaveLength(1)
    expect(result.linkedBots[0].botId).toBe('bot1')
  })
})

describe('Connection.deleteConnection', () => {
  it('throws when connection not found', async () => {
    ddbMock.on(GetCommand).resolves({ Item: undefined })

    const connection = new Connection()
    await expect(connection.deleteConnection('user1', 'c1')).rejects.toThrow(
      'Connection not found'
    )
  })

  it('cleans bot references before deleting', async () => {
    ddbMock.on(GetCommand).resolves({
      Item: { connectionId: 'c1', name: 'Test' },
    })
    ddbMock.on(QueryCommand).resolves({
      Items: [
        {
          botId: 'bot1',
          tasks: [
            { connectionId: 'c1', service: 'gmail' },
            { connectionId: 'other', service: 'drive' },
          ],
        },
      ],
    })
    ddbMock.on(UpdateCommand).resolves({ Attributes: {} })
    ddbMock.on(DeleteCommand).resolves({})

    const connection = new Connection()
    await connection.deleteConnection('user1', 'c1')

    const updateCalls = ddbMock.commandCalls(UpdateCommand)
    expect(updateCalls).toHaveLength(1)
    const values = updateCalls[0].args[0].input.ExpressionAttributeValues
    const tasksValue = values?.[':value0'] as Array<Record<string, unknown>>
    expect(tasksValue[0].connectionId).toBeUndefined()
    expect(tasksValue[1].connectionId).toBe('other')

    const deleteCalls = ddbMock.commandCalls(DeleteCommand)
    expect(deleteCalls).toHaveLength(1)
  })

  it('skips update when no bots reference the connection', async () => {
    ddbMock.on(GetCommand).resolves({
      Item: { connectionId: 'c1', name: 'Test' },
    })
    ddbMock.on(QueryCommand).resolves({
      Items: [{ botId: 'bot1', tasks: [{ connectionId: 'other' }] }],
    })
    ddbMock.on(DeleteCommand).resolves({})

    const connection = new Connection()
    await connection.deleteConnection('user1', 'c1')

    const updateCalls = ddbMock.commandCalls(UpdateCommand)
    expect(updateCalls).toHaveLength(0)

    const deleteCalls = ddbMock.commandCalls(DeleteCommand)
    expect(deleteCalls).toHaveLength(1)
  })
})
