/**
 * One-time migration script: standardize data formats.
 *
 * Run: npx tsx scripts/migrate-formats.ts --dry-run
 * Run for real: npx tsx scripts/migrate-formats.ts
 */
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import {
  CopyObjectCommand,
  DeleteObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3'
import { fromIni } from '@aws-sdk/credential-providers'
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  PutCommand,
  ScanCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb'
import { randomUUID } from 'crypto'

const REGION = 'us-east-1'
const TABLE = 'baita-backend-prod'
const BUCKET = 'baita-backend-prod-files'
const DRY_RUN = process.argv.includes('--dry-run')
const credentials = fromIni({ profile: 'baita' })

const ddb = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: REGION, credentials }),
  { marshallOptions: { removeUndefinedValues: true } }
)
const s3 = new S3Client({ region: REGION, credentials })

function isBase64PlaceId(id: string): boolean {
  return !id.includes('-') && id.length > 20
}

function numericToISO(ts: number): string {
  return new Date(ts).toISOString()
}

async function migratePlaces() {
  console.log('\n=== MIGRATING PLACES (base64 IDs → UUID) ===\n')

  const result = await ddb.send(
    new ScanCommand({
      TableName: TABLE,
      FilterExpression: 'contains(sortKey, :prefix)',
      ExpressionAttributeValues: { ':prefix': '#PLACE#' },
    })
  )

  const items = result.Items || []
  let migrated = 0

  for (const item of items) {
    const sk: string = item.sortKey
    const oldPlaceId = sk.replace('#PLACE#', '')

    if (!isBase64PlaceId(oldPlaceId)) {
      continue
    }

    const newPlaceId = randomUUID()
    const oldPictures: string[] = item.pictures || []
    const newPictures: string[] = []

    console.log(`  ${item.name}: ${oldPlaceId} → ${newPlaceId}`)

    for (const pic of oldPictures) {
      let newKey: string
      if (pic.startsWith(`${oldPlaceId}-`)) {
        const suffix = pic.slice(oldPlaceId.length + 1)
        newKey = `${newPlaceId}-${suffix}`
      } else if (pic.startsWith('_new-')) {
        const suffix = pic.slice('_new-'.length)
        newKey = `${newPlaceId}-${suffix}`
      } else {
        newKey = `${newPlaceId}-${pic}`
      }

      console.log(`    S3: ${pic} → ${newKey}`)
      if (!DRY_RUN) {
        try {
          await s3.send(
            new CopyObjectCommand({
              Bucket: BUCKET,
              CopySource: `${BUCKET}/${pic}`,
              Key: newKey,
            })
          )
          await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: pic }))
        } catch (err: unknown) {
          console.log(`    ⚠ S3 copy failed for ${pic}: ${err}`)
          newKey = pic
        }
      }
      newPictures.push(newKey)
    }

    const newItem = {
      ...item,
      sortKey: `#PLACE#${newPlaceId}`,
      placeId: newPlaceId,
      pictures: newPictures,
    }

    console.log(
      `    DDB: create #PLACE#${newPlaceId}, delete #PLACE#${oldPlaceId}`
    )
    if (!DRY_RUN) {
      await ddb.send(new PutCommand({ TableName: TABLE, Item: newItem }))
      await ddb.send(
        new DeleteCommand({
          TableName: TABLE,
          Key: { userId: item.userId, sortKey: sk },
        })
      )
    }
    migrated++
  }

  console.log(`\n  Migrated ${migrated} places${DRY_RUN ? ' (DRY RUN)' : ''}`)
}

async function migrateNewPrefixPlace() {
  console.log(
    '\n=== MIGRATING _NEW- PREFIX PLACE (_new- prefix → placeId prefix) ===\n'
  )

  const placeId = '00ab5797-5242-4adc-944c-55c70046bbd3'
  const oldKey = '_new-8bfcf27f-cc3c-4ae3-87b1-8a8d78102a60.jpg'
  const newKey = `${placeId}-8bfcf27f-cc3c-4ae3-87b1-8a8d78102a60.jpg`

  console.log(`  S3: ${oldKey} → ${newKey}`)
  if (!DRY_RUN) {
    await s3.send(
      new CopyObjectCommand({
        Bucket: BUCKET,
        CopySource: `${BUCKET}/${oldKey}`,
        Key: newKey,
      })
    )
    await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: oldKey }))
  }

  console.log(`  DDB: update pictures array`)
  if (!DRY_RUN) {
    const result = await ddb.send(
      new ScanCommand({
        TableName: TABLE,
        FilterExpression: 'sortKey = :sk',
        ExpressionAttributeValues: { ':sk': `#PLACE#${placeId}` },
      })
    )
    const item = result.Items?.[0]
    if (item) {
      await ddb.send(
        new UpdateCommand({
          TableName: TABLE,
          Key: { userId: item.userId, sortKey: item.sortKey },
          UpdateExpression: 'SET pictures = :pics',
          ExpressionAttributeValues: { ':pics': [newKey] },
        })
      )
    }
  }
  console.log(`  Done${DRY_RUN ? ' (DRY RUN)' : ''}`)
}

async function deleteOrphanedS3() {
  console.log('\n=== DELETING ORPHANED S3 OBJECTS ===\n')

  const orphans = [
    '_new-eed7980d-7e56-4bd4-8640-e97e4d07cf41.jpg',
    'NTIuMzc1NjQ3MTAxNzQ1MjQ6NC45MDk3NjIzODk1MTg0NDQ=-992389e5-bc00-42fb-8fa4-e2fc82277e82.jpg',
  ]
  for (const key of orphans) {
    console.log(`  Deleting: ${key}`)
    if (!DRY_RUN) {
      await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
    }
  }
  console.log(`  Done${DRY_RUN ? ' (DRY RUN)' : ''}`)
}

async function migrateFeelingDates() {
  console.log('\n=== MIGRATING FEELING DATES (numeric → ISO) ===\n')

  const result = await ddb.send(
    new ScanCommand({
      TableName: TABLE,
      FilterExpression: 'contains(sortKey, :prefix)',
      ExpressionAttributeValues: { ':prefix': '#FEELING' },
    })
  )

  const items = result.Items || []
  let migrated = 0

  for (const item of items) {
    const createdAt = item.createdAt
    const updatedAt = item.updatedAt

    if (typeof createdAt !== 'number') continue

    const newCreatedAt = numericToISO(createdAt)
    const newUpdatedAt =
      typeof updatedAt === 'number' ? numericToISO(updatedAt) : updatedAt

    console.log(`  ${item.sortKey}: ${createdAt} → ${newCreatedAt}`)
    if (!DRY_RUN) {
      await ddb.send(
        new UpdateCommand({
          TableName: TABLE,
          Key: { userId: item.userId, sortKey: item.sortKey },
          UpdateExpression: 'SET createdAt = :ca, updatedAt = :ua',
          ExpressionAttributeValues: {
            ':ca': newCreatedAt,
            ':ua': newUpdatedAt,
          },
        })
      )
    }
    migrated++
  }

  console.log(`\n  Migrated ${migrated} feelings${DRY_RUN ? ' (DRY RUN)' : ''}`)
}

async function migrateConnectionDates() {
  console.log('\n=== MIGRATING CONNECTION DATES (numeric → ISO) ===\n')

  const result = await ddb.send(
    new ScanCommand({
      TableName: TABLE,
      FilterExpression: 'contains(sortKey, :prefix)',
      ExpressionAttributeValues: { ':prefix': '#CONNECTION' },
    })
  )

  const items = result.Items || []
  let migrated = 0

  for (const item of items) {
    const createdAt = item.createdAt

    if (typeof createdAt !== 'number') continue

    const newCreatedAt = numericToISO(createdAt)

    console.log(`  ${item.sortKey}: ${createdAt} → ${newCreatedAt}`)
    if (!DRY_RUN) {
      await ddb.send(
        new UpdateCommand({
          TableName: TABLE,
          Key: { userId: item.userId, sortKey: item.sortKey },
          UpdateExpression: 'SET createdAt = :ca',
          ExpressionAttributeValues: { ':ca': newCreatedAt },
        })
      )
    }
    migrated++
  }

  console.log(
    `\n  Migrated ${migrated} connections${DRY_RUN ? ' (DRY RUN)' : ''}`
  )
}

async function main() {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`  FORMAT MIGRATION${DRY_RUN ? ' (DRY RUN)' : ''}`)
  console.log(`${'='.repeat(60)}`)

  await migratePlaces()
  await migrateNewPrefixPlace()
  await deleteOrphanedS3()
  await migrateFeelingDates()
  await migrateConnectionDates()

  console.log(`\n${'='.repeat(60)}`)
  console.log(`  COMPLETE${DRY_RUN ? ' — run without --dry-run to apply' : ''}`)
  console.log(`${'='.repeat(60)}\n`)
}

main().catch((err) => {
  console.error('Migration failed:', err)
  process.exit(1)
})
