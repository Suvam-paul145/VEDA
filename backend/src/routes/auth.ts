import { Router, Request, Response } from 'express';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import { SupabaseClient } from '@supabase/supabase-js';

export function createAuthRouter(supabase: SupabaseClient): Router {
  const router = Router();

  router.get('/github', (req: Request, res: Response) => {
    const clientId = process.env.GITHUB_CLIENT_ID;
    const redirectUri = process.env.GITHUB_CALLBACK_URL;
    
    if (!clientId || !redirectUri) {
      return res.status(500).json({ error: 'GitHub OAuth not configured' });
    }

    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=user:email`;
    res.redirect(githubAuthUrl);
  });

  router.get('/github/callback', async (req: Request, res: Response) => {
    try {
      const { code } = req.query;

      if (!code) {
        return res.status(400).json({ error: 'Authorization code missing' });
      }

      const clientId = process.env.GITHUB_CLIENT_ID;
      const clientSecret = process.env.GITHUB_CLIENT_SECRET;

      if (!clientId || !clientSecret) {
        return res.status(500).json({ error: 'GitHub OAuth not configured' });
      }

      const tokenResponse = await axios.post(
        'https://github.com/login/oauth/access_token',
        { client_id: clientId, client_secret: clientSecret, code },
        { headers: { Accept: 'application/json' } }
      );

      const accessToken = tokenResponse.data.access_token;

      if (!accessToken) {
        return res.status(400).json({ error: 'Failed to obtain access token' });
      }

      const userResponse = await axios.get('https://api.github.com/user', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      const githubUser = userResponse.data;

      const { data: user, error } = await supabase
        .from('users')
        .upsert({
          github_id: githubUser.id.toString(),
          email: githubUser.email,
          username: githubUser.login,
          avatar_url: githubUser.avatar_url
        }, { onConflict: 'github_id' })
        .select()
        .single();

      if (error || !user) {
        console.error('User upsert failed:', error);
        return res.status(500).json({ error: 'Failed to create user' });
      }

      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        return res.status(500).json({ error: 'JWT_SECRET not configured' });
      }

      const token = jwt.sign({ userId: user.id }, jwtSecret, { expiresIn: '30d' });

      res.json({ token, user });
    } catch (error: any) {
      console.error('GitHub OAuth callback error:', error.message);
      res.status(500).json({ error: 'Authentication failed' });
    }
  });

  return router;
}
