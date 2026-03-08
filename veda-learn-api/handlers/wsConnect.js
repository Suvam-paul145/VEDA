// veda-learn-api/handlers/wsConnect.js
'use strict';

const { DynamoDBClient, PutItemCommand } = require('@aws-sdk/client-dynamodb');
const jwt = require('jsonwebtoken');

const dynamo = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });

module.exports.handler = async (event) => {
    const connectionId = event.requestContext.connectionId;
    const domainName = event.requestContext.domainName;
    const stage = event.requestContext.stage;

    // Extract JWT from query string: wss://...?token=JWT
    const token = event.queryStringParameters?.token;

    if (!token) {
        console.warn(`[wsConnect] Missing token for connectionId=${connectionId}`);
        return { statusCode: 401, body: 'Unauthorized: missing token' };
    }

    let userId;
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        userId = decoded.userId;
    } catch (err) {
        console.warn(`[wsConnect] Invalid JWT: ${err.message}`);
        return { statusCode: 403, body: 'Forbidden: invalid token' };
    }

    // TTL: connections expire after 2 hours (API Gateway max is 2h anyway)
    const ttl = Math.floor(Date.now() / 1000) + 7200;

    try {
        await dynamo.send(new PutItemCommand({
            TableName: 'veda-ws-connections',
            Item: {
                connectionId: { S: connectionId },
                userId: { S: userId },
                endpoint: { S: `https://${domainName}/${stage}` },
                connectedAt: { S: new Date().toISOString() },
                ttl: { N: ttl.toString() },
            },
        }));

        console.log(`[wsConnect] userId=${userId} connected via connectionId=${connectionId}`);
        return { statusCode: 200, body: 'Connected' };
    } catch (err) {
        console.error('[wsConnect] DynamoDB error:', err);
        return { statusCode: 500, body: 'Internal error' };
    }
};
