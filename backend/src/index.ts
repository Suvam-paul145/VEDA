import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createSupabaseClient } from './services/supabase.js';
import { createRedisClient } from './services/redis.js';
import { OpenRouterClient } from './services/openrouter.js';
import { createAuthRouter } from './routes/auth.js';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const supabase = createSupabaseClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const redis = createRedisClient(
  process.env.UPSTASH_REDIS_REST_URL!,
  process.env.UPSTASH_REDIS_REST_TOKEN!
);

const openrouter = new OpenRouterClient(process.env.OPENROUTER_API_KEY!);

app.use('/auth', createAuthRouter(supabase));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/test/stream', async (req, res) => {
  try {
    const response = await openrouter.chatCompletion(
      'anthropic/claude-haiku-4-5',
      [
        { role: 'system', content: 'You are a helpful assistant' },
        { role: 'user', content: 'Say hello in 10 words' }
      ],
      { maxTokens: 50 }
    );

    res.json({ message: response });
  } catch (error: any) {
    console.error('Test stream error:', error.message);
    res.status(500).json({ error: 'Stream test failed' });
  }
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(port, () => {
  console.log(`🚀 Veda Learn Backend running on port ${port}`);
  console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔧 Demo mode: ${process.env.VEDA_DEMO_MODE === 'true' ? 'ON' : 'OFF'}`);
});
