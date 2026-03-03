import { Redis } from '@upstash/redis';

export function createRedisClient(url: string, token: string): Redis {
  return new Redis({ url, token });
}

export async function checkLessonLock(redis: Redis, userId: string): Promise<boolean> {
  const key = `lesson-lock:${userId}`;
  const exists = await redis.exists(key);
  return exists === 1;
}

export async function setLessonLock(redis: Redis, userId: string, ttl: number = 30): Promise<void> {
  const key = `lesson-lock:${userId}`;
  await redis.set(key, Date.now(), { ex: ttl });
}

export async function checkRateLimit(redis: Redis, userId: string, limit: number = 20): Promise<boolean> {
  const currentMinute = Math.floor(Date.now() / 60000);
  const key = `rate:${userId}:${currentMinute}`;
  
  const count = await redis.incr(key);
  
  if (count === 1) {
    await redis.expire(key, 60);
  }
  
  return count <= limit;
}
