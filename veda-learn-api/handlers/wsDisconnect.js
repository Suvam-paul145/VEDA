// veda-learn-api/handlers/wsDisconnect.js
'use strict';

const { DynamoDBClient, DeleteItemCommand } = require('@aws-sdk/client-dynamodb');

const dynamo = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });

module.exports.handler = async (event) => {
    const connectionId = event.requestContext.connectionId;

    try {
        await dynamo.send(new DeleteItemCommand({
            TableName: 'veda-ws-connections',
            Key: { connectionId: { S: connectionId } },
        }));

        console.log(`[wsDisconnect] connectionId=${connectionId} removed`);
        return { statusCode: 200, body: 'Disconnected' };
    } catch (err) {
        // Non-fatal — log and move on
        console.error('[wsDisconnect] DynamoDB error:', err.message);
        return { statusCode: 200, body: 'Disconnected (cleanup failed)' };
    }
};
