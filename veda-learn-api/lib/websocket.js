'use strict';

const { ApiGatewayManagementApiClient, PostToConnectionCommand } = require('@aws-sdk/client-apigatewaymanagementapi');
const { DynamoDBClient, QueryCommand, DeleteItemCommand } = require('@aws-sdk/client-dynamodb');

const dynamo = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });

/**
 * Get all active WebSocket connectionIds for a given userId.
 * A user might have multiple open tabs — we push to all of them.
 */
async function getConnectionIds(userId) {
  try {
    const result = await dynamo.send(new QueryCommand({
      TableName: 'veda-ws-connections',
      IndexName: 'userId-index',          // GSI: userId → connectionId
      KeyConditionExpression: 'userId = :uid',
      ExpressionAttributeValues: { ':uid': { S: userId } },
    }));
    return (result.Items || []).map(item => item.connectionId.S);
  } catch (err) {
    console.error('[WS] Error getting connection IDs:', err.message);
    return [];
  }
}

/**
 * Push a JSON payload to a specific WebSocket connection.
 * Automatically removes stale connections (410 Gone).
 */
async function pushToConnection(connectionId, payload) {
  const endpoint = process.env.WEBSOCKET_ENDPOINT; // e.g. https://imhoyvukwe.execute-api.us-east-1.amazonaws.com/dev
  if (!endpoint) {
    console.error('[WS] WEBSOCKET_ENDPOINT not configured — cannot push to connections');
    return false;
  }
  const client = new ApiGatewayManagementApiClient({ endpoint });

  try {
    await client.send(new PostToConnectionCommand({
      ConnectionId: connectionId,
      Data: Buffer.from(JSON.stringify(payload)),
    }));
    return true;
  } catch (err) {
    if (err.$metadata?.httpStatusCode === 410) {
      // Connection is stale — clean it up
      console.log(`[WS] Stale connection ${connectionId} — removing from DynamoDB`);
      try {
        await dynamo.send(new DeleteItemCommand({
          TableName: 'veda-ws-connections',
          Key: { connectionId: { S: connectionId } },
        }));
      } catch (deleteErr) {
        console.error('[WS] Error cleaning up stale connection:', deleteErr.message);
      }
      return false;
    }
    console.error(`[WS] Failed to push to ${connectionId}:`, err.message);
    throw err;
  }
}

/**
 * Push a message to ALL active connections for a user.
 * Used by lesson.js, quiz.js, progressUpdate.js.
 *
 * @param {string} userId - DynamoDB userId
 * @param {object} message - { type: 'lesson'|'quiz'|'progress'|'error', data: {...} }
 */
async function pushToUser(userId, message) {
  const connectionIds = await getConnectionIds(userId);

  if (connectionIds.length === 0) {
    console.warn(`[WS] No active connections for userId=${userId}`);
    return { pushed: 0, skipped: 0 };
  }

  const results = await Promise.allSettled(
    connectionIds.map(id => pushToConnection(id, message))
  );

  const pushed  = results.filter(r => r.status === 'fulfilled' && r.value).length;
  const skipped = results.length - pushed;

  console.log(`[WS] Pushed to ${pushed}/${connectionIds.length} connections for userId=${userId}`);
  return { pushed, skipped };
}

module.exports = { pushToUser, pushToConnection, getConnectionIds };