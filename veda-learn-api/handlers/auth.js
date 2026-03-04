const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: 'us-east-1' }));

module.exports.callback = async (event) => {
    try {
        const { code } = event.queryStringParameters || {};
        if (!code) return { statusCode: 400, body: 'Missing code' };

        // Exchange code for GitHub access token
        const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: process.env.GITHUB_CLIENT_ID,
                client_secret: process.env.GITHUB_CLIENT_SECRET,
                code
            })
        });
        const { access_token, error } = await tokenRes.json();
        if (error) return { statusCode: 400, body: JSON.stringify({ error }) };

        // Get GitHub user profile
        const userRes = await fetch('https://api.github.com/user', {
            headers: { Authorization: `token ${access_token}`, 'User-Agent': 'veda-learn' }
        });
        const ghUser = await userRes.json();

        const userId = `gh_${ghUser.id}`;

        // Upsert user into DynamoDB (preserve existing score/streak)
        await ddb.send(new PutCommand({
            TableName: 'veda-users',
            Item: {
                userId,
                githubId: String(ghUser.id),
                username: ghUser.login,
                email: ghUser.email || '',
                avatarUrl: ghUser.avatar_url,
                skillScore: 0,
                streakDays: 0,
                lastActive: new Date().toISOString().split('T')[0],
                createdAt: new Date().toISOString()
            },
            ConditionExpression: 'attribute_not_exists(userId)'
        })).catch(() => { }); // Ignore if user already exists

        // Issue 30-day JWT
        const token = jwt.sign(
            { userId, username: ghUser.login },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        // Redirect to VS Code via custom URI handler
        return {
            statusCode: 302,
            headers: { Location: `vscode://veda-learn.veda-learn/auth?token=${token}` }
        };

    } catch (err) {
        console.error('Auth error:', err);
        return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
};
