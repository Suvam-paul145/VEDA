const { handler } = require('../handlers/wsConnect');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { mockClient } = require('aws-sdk-client-mock');
const jwt = require('jsonwebtoken');

const ddbMock = mockClient(DynamoDBDocumentClient);

describe('wsConnect handler', () => {
    const mockConnectionId = 'test-connection-id';
    const mockUserId = 'user-123';
    const originalEnv = process.env.JWT_SECRET;
    const testSecret = 'test-secret';

    beforeAll(() => {
        process.env.JWT_SECRET = testSecret;
    });

    afterAll(() => {
        process.env.JWT_SECRET = originalEnv;
    });

    beforeEach(() => {
        ddbMock.reset();
    });

    it('returns 401 when token is missing', async () => {
        const event = {
            queryStringParameters: {} // no token
        };

        const response = await handler(event);
        expect(response.statusCode).toBe(401);
        expect(response.body).toBe('No token');
        // ensure DB was not called
        expect(ddbMock.calls().length).toBe(0);
    });

    it('returns 401 when token is invalid', async () => {
        const event = {
            queryStringParameters: { token: 'invalid.token.here' }
        };

        const response = await handler(event);
        expect(response.statusCode).toBe(401);
        expect(response.body).toBe('Invalid token');

        expect(ddbMock.calls().length).toBe(0);
    });

    it('returns 200 and saves connection when token is valid', async () => {
        const validToken = jwt.sign({ userId: mockUserId }, testSecret);
        const event = {
            queryStringParameters: { token: validToken },
            requestContext: { connectionId: mockConnectionId }
        };

        ddbMock.on(PutCommand).resolves({});

        const response = await handler(event);
        expect(response.statusCode).toBe(200);
        expect(response.body).toBe('Connected');

        const putCalls = ddbMock.commandCalls(PutCommand);
        expect(putCalls.length).toBe(1);
        const putInput = putCalls[0].args[0].input;
        expect(putInput.TableName).toBe('veda-ws-connections');
        expect(putInput.Item.userId).toBe(mockUserId);
        expect(putInput.Item.connectionId).toBe(mockConnectionId);
        expect(putInput.Item.connectedAt).toBeDefined();
    });
});
