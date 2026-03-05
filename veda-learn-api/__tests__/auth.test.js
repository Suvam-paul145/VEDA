const { callback } = require('../handlers/auth');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const { mockClient } = require('aws-sdk-client-mock');
const jwt = require('jsonwebtoken');

// Setup mocks
const ddbMock = mockClient(DynamoDBDocumentClient);
jest.mock('node-fetch');
const fetch = require('node-fetch');

describe('auth callback handler', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        ddbMock.reset();
        jest.clearAllMocks();

        process.env = {
            ...originalEnv,
            GITHUB_CLIENT_ID: 'test_client_id',
            GITHUB_CLIENT_SECRET: 'test_client_secret',
            JWT_SECRET: 'test_jwt_secret',
        };
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    it('returns 400 when code is missing', async () => {
        const event = { queryStringParameters: {} };
        const response = await callback(event);

        expect(response.statusCode).toBe(400);
        expect(response.body).toBe('Missing code');
    });

    it('returns 400 when github token exchange fails (returns error)', async () => {
        const event = { queryStringParameters: { code: 'bad-code' } };

        // Mock token exchange failure
        fetch.mockResolvedValueOnce({
            json: jest.fn().mockResolvedValue({ error: 'bad_verification_code' })
        });

        const response = await callback(event);

        expect(response.statusCode).toBe(400);
        expect(JSON.parse(response.body).error).toBe('bad_verification_code');
        expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('successfully authenticates, saves user, and redirects with jwt', async () => {
        const event = { queryStringParameters: { code: 'good-code' } };

        // 1. Mock github access token response
        fetch.mockResolvedValueOnce({
            json: jest.fn().mockResolvedValue({ access_token: 'fake-gh-token' })
        });

        // 2. Mock github user profile response
        const mockUser = {
            id: 123456,
            login: 'testuser',
            email: 'test@example.com',
            avatar_url: 'https://example.com/avatar.png'
        };
        fetch.mockResolvedValueOnce({
            json: jest.fn().mockResolvedValue(mockUser)
        });

        // 3. Mock dynamodb PutCommand resolves
        ddbMock.on(PutCommand).resolves({});

        const response = await callback(event);

        expect(response.statusCode).toBe(302);
        expect(response.headers.Location).toMatch(/^vscode:\/\/veda-learn\.veda-learn\/auth\?token=.+/);

        // Verify dynamo db was called to insert/update user
        const putCalls = ddbMock.commandCalls(PutCommand);
        expect(putCalls.length).toBe(1);
        const putInput = putCalls[0].args[0].input;
        expect(putInput.TableName).toBe('veda-users');
        expect(putInput.Item.username).toBe('testuser');
        expect(putInput.Item.githubId).toBe('123456');

        // Verify the extracted JWT from the redirect location
        const urlParams = new URL(response.headers.Location.replace('vscode://', 'http://')).searchParams;
        const generatedToken = urlParams.get('token');
        const decoded = jwt.verify(generatedToken, process.env.JWT_SECRET);
        expect(decoded.username).toBe('testuser');
        expect(decoded.userId).toBe('gh_123456');
    });

    it('returns 500 on unexpected errors', async () => {
        const event = { queryStringParameters: { code: 'fail-code' } };

        fetch.mockRejectedValueOnce(new Error('Network error'));

        const response = await callback(event);

        expect(response.statusCode).toBe(500);
        expect(JSON.parse(response.body).error).toBe('Network error');
    });
});
