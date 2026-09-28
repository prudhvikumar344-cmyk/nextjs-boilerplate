import { getAuthors, createSessionCookie } from '../../../lib/auth';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!process.env.SESSION_SECRET || !process.env.BLOG_AUTHORS) {
    res.status(500).json({ error: 'Login is not configured yet. Set BLOG_AUTHORS and SESSION_SECRET in your Vercel project settings.' });
    return;
  }

  const { username, password } = req.body || {};
  const authors = getAuthors();
  const match = authors.find((a) => a.username === username && a.password === password);

  if (!match) {
    res.status(401).json({ error: 'Wrong username or password.' });
    return;
  }

  res.setHeader('Set-Cookie', createSessionCookie(username));
  res.status(200).json({ ok: true, username });
}
