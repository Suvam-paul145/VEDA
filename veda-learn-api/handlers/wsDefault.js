// handlers/wsDefault.js — Default WebSocket route handler (ping/pong + catch-all)

const { ApiGatewayManagementApiClient, PostToConnectionCommand } = require('@aws-sdk/client-apigatewaymanagementapi');

module.exports.handler = async (event) => {
    const connectionId = event.requestContext?.connectionId;
    const endpoint = `https://${event.requestContext?.domainName}/${event.requestContext?.stage}`;

    let body;
    try {
        body = JSON.parse(event.body || '{}');
    } catch (e) {
        console.warn('[wsDefault] Unparseable message body:', event.body);
        return { statusCode: 200, body: 'ok' };
    }

    // Handle ping → respond with pong
    if (body.action === 'ping') {
        try {
            const client = new ApiGatewayManagementApiClient({ region: process.env.AWS_REGION || 'us-east-1', endpoint });
            await client.send(new PostToConnectionCommand({
                ConnectionId: connectionId,
                Data: JSON.stringify({ type: 'pong', ts: Date.now() }),
            }));
        } catch (err) {
            console.error('[wsDefault] Failed to send pong:', err.message);
        }
        return { statusCode: 200, body: 'pong' };
    }

    // Catch-all for unknown actions — acknowledge silently
    console.log('[wsDefault] Unhandled action:', body.action || '(none)', 'connectionId:', connectionId);
    return { statusCode: 200, body: 'ok' };
};
