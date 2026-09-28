import crypto from 'crypto';

function sign(value) {
  return crypto.createHmac('sha256', process.env.SESSION_SECRET || '').update(value).digest('hex');
}

export function getAuthors() {
  try {
    const list = JSON.parse(process.env.BLOG_AUTHORS || '[]');
    return Array.isArray(list) ? list : [];
  } catch (err) {
    return [];
  }
}

export function createSessionCookie(username) {
  const expires = Date.now() + 1000 * 60 * 60 * 24 * 7;
  const payload = `${username}.${expires}`;
  const signature = sign(payload);
  const value = encodeURIComponent(`${payload}.${signature}`);
  return `admin_session=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}`;
}

export function clearSessionCookie() {
  return 'admin_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0';
}

export function getSessionUser(req) {
  const cookieHeader = (req.headers && req.headers.cookie) || '';
  const match = cookieHeader.match(/(?:^|;\s*)admin_session=([^;]+)/);
  if (!match) return null;

  const raw = decodeURIComponent(match[1]);
  const parts = raw.split('.');
  if (parts.length !== 3) return null;

  const [username, expires, signature] = parts;
  const payload = `${username}.${expires}`;
  const expected = sign(payload);

  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  if (Date.now() > Number(expires)) return null;

  const authors = getAuthors();
  const stillValid = authors.some((author) => author.username === username);
  if (!stillValid) return null;

  return username;
}
