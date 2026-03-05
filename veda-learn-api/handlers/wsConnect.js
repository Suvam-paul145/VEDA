const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const jwt = require('jsonwebtoken');

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-east-1' }));

module.exports.handler = async (event) => {
    const token = event.queryStringParameters?.token;
    if (!token) return { statusCode: 401, body: 'No token' };

    try {
        const { userId } = jwt.verify(token, process.env.JWT_SECRET);

        await ddb.send(new PutCommand({
            TableName: 'veda-ws-connections',
            Item: {
                userId,
                connectionId: event.requestContext.connectionId,
                connectedAt: new Date().toISOString()
            }
        }));

        return { statusCode: 200, body: 'Connected' };
    } catch (err) {
        console.error('wsConnect error:', err);
        return { statusCode: 401, body: 'Invalid token' };
    }
};
