const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, DeleteCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-east-1' }));

module.exports.handler = async (event) => {
    const connectionId = event.requestContext.connectionId;

    // Find which userId owns this connectionId
    const { Items } = await ddb.send(new QueryCommand({
        TableName: 'veda-ws-connections',
        IndexName: 'connectionId-index',
        KeyConditionExpression: 'connectionId = :c',
        ExpressionAttributeValues: { ':c': connectionId }
    }));

    if (Items?.length > 0) {
        await ddb.send(new DeleteCommand({
            TableName: 'veda-ws-connections',
            Key: { userId: Items[0].userId }
        }));
    }

    return { statusCode: 200, body: 'Disconnected' };
};
