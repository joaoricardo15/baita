/**
 * Cleanup stale E2E test users from Auth0 and DynamoDB.
 *
 * Run once to remove orphaned users from failed test runs:
 *   cd tests/e2e && npx tsx scripts/cleanup-stale-users.ts
 *
 * This searches Auth0 for users matching "e2e" pattern and deletes them
 * from both Auth0 and DynamoDB. Safe to run multiple times.
 *
 * Requires env vars:
 *   AUTH0_M2M_CLIENT_ID, AUTH0_M2M_CLIENT_SECRET
 *   (Get from: aws ssm get-parameter --name /baita/prod/auth0-m2m-client-id --with-decryption --profile baita --region us-east-1)
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { fromIni } from '@aws-sdk/credential-providers'
import {
  BatchWriteCommand,
  DynamoDBDocumentClient,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb'

const AUTH0_DOMAIN = 'dev-yc4pbydg.us.auth0.com'
const TABLE_NAME = 'baita-prod'

async function getAuth0ManagementToken(): Promise<string> {
  const clientId = process.env.AUTH0_M2M_CLIENT_ID
  const clientSecret = process.env.AUTH0_M2M_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    throw new Error(
      'Set AUTH0_M2M_CLIENT_ID and AUTH0_M2M_CLIENT_SECRET env vars'
    )
  }

  const res = await fetch(`https://${AUTH0_DOMAIN}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
      audience: `https://${AUTH0_DOMAIN}/api/v2/`,
    }),
  })
  const data = await res.json()
  return data.access_token
}

async function findStaleAuth0Users(
  token: string
): Promise<{ user_id: string; email: string }[]> {
  const users: { user_id: string; email: string }[] = []
  let page = 0
  const perPage = 50

  while (true) {
    const params = new URLSearchParams({
      q: 'email:*e2e*@baita.help',
      search_engine: 'v3',
      page: page.toString(),
      per_page: perPage.toString(),
    })
    const res = await fetch(`https://${AUTH0_DOMAIN}/api/v2/users?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const data = await res.json()

    users.push(
      ...data.map((u: { user_id: string; email: string }) => ({
        user_id: u.user_id,
        email: u.email,
      }))
    )

    if (data.length < perPage) break
    page++
  }

  return users
}

async function deleteAuth0User(token: string, userId: string): Promise<void> {
  await fetch(
    `https://${AUTH0_DOMAIN}/api/v2/users/${encodeURIComponent(userId)}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }
  )
}

async function deleteDynamoDBRecords(userId: string): Promise<number> {
  const client = new DynamoDBClient({
    region: 'us-east-1',
    credentials: fromIni({ profile: 'baita' }),
  })
  const ddb = DynamoDBDocumentClient.from(client)

  const { Items } = await ddb.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'userId = :userId',
      ExpressionAttributeValues: { ':userId': userId },
    })
  )

  if (!Items || Items.length === 0) return 0

  for (let i = 0; i < Items.length; i += 25) {
    const chunk = Items.slice(i, i + 25)
    await ddb.send(
      new BatchWriteCommand({
        RequestItems: {
          [TABLE_NAME]: chunk.map((item) => ({
            DeleteRequest: {
              Key: { userId: item.userId, sortKey: item.sortKey },
            },
          })),
        },
      })
    )
  }

  return Items.length
}

async function main() {
  const token = await getAuth0ManagementToken()
  const staleUsers = await findStaleAuth0Users(token)

  console.log(`\nFound ${staleUsers.length} stale E2E user(s):`)
  staleUsers.forEach((u) => console.log(`  ${u.email} (${u.user_id})`))

  if (staleUsers.length === 0) {
    console.log('Nothing to clean up!')
    return
  }

  for (const user of staleUsers) {
    const bareId = user.user_id.split('|')[1]
    console.log(`\nDeleting ${user.email} (${bareId})...`)

    const records = await deleteDynamoDBRecords(bareId)
    console.log(`  DynamoDB: ${records} records deleted`)

    await deleteAuth0User(token, user.user_id)
    console.log(`  Auth0: user deleted`)
  }

  console.log(`\nDone! Cleaned up ${staleUsers.length} stale user(s).`)
}

main().catch((err) => {
  console.error('Cleanup failed:', err.message || err)
  process.exit(1)
})
