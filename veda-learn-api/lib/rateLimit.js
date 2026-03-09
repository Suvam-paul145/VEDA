'use strict';

const { DynamoDBClient, PutItemCommand, GetItemCommand } = require('@aws-sdk/client-dynamodb');

const dynamo = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });

/**
 * Check if a user is rate limited (30-second cooldown between analysis requests)
 * 
 * @param {string} userId - User ID to check
 * @returns {Promise<boolean>} - true if rate limited, false if allowed
 */
async function checkRateLimit(userId) {
  const lockKey = `analyze:${userId}`;
  const now = Math.floor(Date.now() / 1000);
  const ttl = now + 30; // 30 second TTL

  try {
    // Try to create a lock entry — also allow overwriting if existing lock has expired.
    // DynamoDB TTL deletion is lazy (can take hours), so we check expiry in-code.
    await dynamo.send(new PutItemCommand({
      TableName: 'veda-rate-limits',
      Item: {
        lockKey: { S: lockKey },
        userId: { S: userId },
        createdAt: { S: new Date().toISOString() },
        ttl: { N: ttl.toString() },
      },
      ConditionExpression: 'attribute_not_exists(lockKey) OR #t < :now',
      ExpressionAttributeNames: { '#t': 'ttl' },
      ExpressionAttributeValues: { ':now': { N: now.toString() } },
    }));

    // Lock created successfully - not rate limited
    return false;
  } catch (err) {
    if (err.name === 'ConditionalCheckFailedException') {
      // Lock already exists AND has not expired - rate limited
      console.log(`[RateLimit] User ${userId} is rate limited`);
      return true;
    }
    // Other error - log and allow (fail open)
    console.error('[RateLimit] Error checking rate limit:', err.message);
    return false;
  }
}

/**
 * Check per-minute rate limiting (20 requests per minute)
 * 
 * @param {string} userId - User ID to check
 * @returns {Promise<boolean>} - true if rate limited, false if allowed
 */
async function checkMinuteRateLimit(userId) {
  const minute = Math.floor(Date.now() / 60000); // Current minute
  const lockKey = `minute:${userId}:${minute}`;
  const ttl = Math.floor(Date.now() / 1000) + 65; // Expire after 65 seconds

  try {
    // Try to get existing counter
    const result = await dynamo.send(new GetItemCommand({
      TableName: 'veda-rate-limits',
      Key: { lockKey: { S: lockKey } },
    }));

    let count = 0;
    if (result.Item && result.Item.count) {
      count = parseInt(result.Item.count.N);
    }

    if (count >= 20) {
      console.log(`[RateLimit] User ${userId} exceeded minute limit (${count}/20)`);
      return true;
    }

    // Increment counter
    await dynamo.send(new PutItemCommand({
      TableName: 'veda-rate-limits',
      Item: {
        lockKey: { S: lockKey },
        userId: { S: userId },
        count: { N: (count + 1).toString() },
        createdAt: { S: new Date().toISOString() },
        ttl: { N: ttl.toString() },
      },
    }));

    return false;
  } catch (err) {
    console.error('[RateLimit] Error checking minute rate limit:', err.message);
    return false; // Fail open
  }
}

module.exports = { checkRateLimit, checkMinuteRateLimit };