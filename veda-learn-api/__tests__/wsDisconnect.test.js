const { handler } = require('../handlers/wsDisconnect');
const { DynamoDBDocumentClient, DeleteCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');
const { mockClient } = require('aws-sdk-client-mock');

const ddbMock = mockClient(DynamoDBDocumentClient);

describe('wsDisconnect handler', () => {
    const mockConnectionId = 'test-connection-id';
    const mockUserId = 'user-123';

    beforeEach(() => {
        ddbMock.reset();
    });

    it('returns 200 and deletes connection if found', async () => {
        const event = {
            requestContext: { connectionId: mockConnectionId }
        };

        // Mock querying the connection to find the userId
        ddbMock.on(QueryCommand).resolves({
            Items: [{ userId: mockUserId, connectionId: mockConnectionId }]
        });

        // Mock successful deletion
        ddbMock.on(DeleteCommand).resolves({});

        const response = await handler(event);
        expect(response.statusCode).toBe(200);
        expect(response.body).toBe('Disconnected');

        // Verify QueryCommand
        const queryCalls = ddbMock.commandCalls(QueryCommand);
        expect(queryCalls.length).toBe(1);
        expect(queryCalls[0].args[0].input.TableName).toBe('veda-ws-connections');
        expect(queryCalls[0].args[0].input.ExpressionAttributeValues[':c']).toBe(mockConnectionId);

        // Verify DeleteCommand
        const deleteCalls = ddbMock.commandCalls(DeleteCommand);
        expect(deleteCalls.length).toBe(1);
        expect(deleteCalls[0].args[0].input.TableName).toBe('veda-ws-connections');
        expect(deleteCalls[0].args[0].input.Key.userId).toBe(mockUserId);
    });

    it('returns 200 and does nothing if connection not found', async () => {
        const event = {
            requestContext: { connectionId: 'unknown-connection-id' }
        };

        // Mock querying the connection returning empty
        ddbMock.on(QueryCommand).resolves({
            Items: []
        });

        const response = await handler(event);
        expect(response.statusCode).toBe(200);
        expect(response.body).toBe('Disconnected');

        // Verify QueryCommand was called
        expect(ddbMock.commandCalls(QueryCommand).length).toBe(1);

        // Verify DeleteCommand was NOT called
        expect(ddbMock.commandCalls(DeleteCommand).length).toBe(0);
    });
});
