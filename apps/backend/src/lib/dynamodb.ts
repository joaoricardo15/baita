import { DynamoDB } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb'

export const ddb = DynamoDBDocument.from(new DynamoDB({}), {
  marshallOptions: { removeUndefinedValues: true },
})
