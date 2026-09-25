import http from 'node:http';
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import { dirname } from 'node:path';

const seed = { notices: [{ id: 'welcome', title: 'Welcome to the new college website', body: 'Official notices and admissions updates will be published here.', status: 'published', audience: 'public', createdAt: '2026-09-16T00:00:00.000Z', publishedAt: '2026-09-16T00:00:00.000Z' }], audit: [] };
const json = (res, status, data) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); res.end(JSON.stringify(data)); };
const clean = value => typeof value === 'string' ? value.trim() : '';
const readBody = async req => {
  let raw = '';
  for await (const chunk of req) { raw += chunk; if (raw.length > 10000) throw new Error('Request too large'); }
  return JSON.parse(raw || '{}');
};
const parseCookies = header => Object.fromEntries((header || '').split(';').map(v => v.trim().split('=').map(decodeURIComponent)).filter(v => v.length === 2));
export function createApp({ dataFile, adminEmail, adminPassword, now = () => new Date() }) {
  const sessions = new Map();
  const passwordSalt = randomBytes(16);
  const passwordHash = adminPassword ? scryptSync(adminPassword, passwordSalt, 64) : null;
  async function load() {
    try { return JSON.parse(await readFile(dataFile, 'utf8')); }
    catch (error) { if (error.code === 'ENOENT') return structuredClone(seed); throw error; }
  }
  async function save(data) {
    await mkdir(dirname(dataFile), { recursive: true });
    const temp = `${dataFile}.${randomBytes(6).toString('hex')}.tmp`;
    await writeFile(temp, JSON.stringify(data, null, 2), { mode: 0o600 });
    await rename(temp, dataFile);
  }
  function authenticated(req) {
    const token = parseCookies(req.headers.cookie).college_session;
    const session = sessions.get(token);
    if (!session || session.expires < Date.now()) { sessions.delete(token); return false; }
    return true;
  }
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://localhost');
      const method = req.method;
      if (method === 'GET' && url.pathname === '/api/health') return json(res, 200, { ok: true });
      if (method === 'GET' && url.pathname === '/api/notices') {
        const data = await load();
        return json(res, 200, data.notices.filter(n => n.status === 'published').sort((a,b) => b.publishedAt.localeCompare(a.publishedAt)));
      }
      if (method === 'POST' && url.pathname === '/api/login') {
        if (!passwordHash || !adminEmail) return json(res, 503, { error: 'Admin account is not configured' });
        const body = await readBody(req);
        const candidate = scryptSync(String(body.password || ''), passwordSalt, 64);
        if (clean(body.email).toLowerCase() !== adminEmail.toLowerCase() || !timingSafeEqual(candidate, passwordHash)) return json(res, 401, { error: 'Invalid credentials' });
        const token = randomBytes(32).toString('hex');
        sessions.set(token, { expires: Date.now() + 8 * 60 * 60 * 1000 });
        res.setHeader('Set-Cookie', `college_session=${token}; HttpOnly; SameSite=Strict; Path=/api; Max-Age=28800${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`);
        return json(res, 200, { email: adminEmail, role: 'admin' });
      }
      if (method === 'GET' && url.pathname === '/api/me') return authenticated(req) ? json(res, 200, { email: adminEmail, role: 'admin' }) : json(res, 401, { error: 'Login required' });
      if (method === 'POST' && url.pathname === '/api/logout') {
        sessions.delete(parseCookies(req.headers.cookie).college_session);
        res.setHeader('Set-Cookie', 'college_session=; HttpOnly; SameSite=Strict; Path=/api; Max-Age=0');
        return json(res, 200, { ok: true });
      }
      if (url.pathname.startsWith('/api/admin/')) {
        if (!authenticated(req)) return json(res, 401, { error: 'Login required' });
        const origin = req.headers.origin;
        if (method !== 'GET' && origin && new URL(origin).host !== req.headers.host && !['localhost:5173','127.0.0.1:5173'].includes(new URL(origin).host)) return json(res, 403, { error: 'Invalid origin' });
        const data = await load();
        if (method === 'GET' && url.pathname === '/api/admin/notices') return json(res, 200, data.notices);
        if (method === 'GET' && url.pathname === '/api/admin/audit') return json(res, 200, data.audit.slice(-50).reverse());
        if (method === 'POST' && url.pathname === '/api/admin/notices') {
          const body = await readBody(req);
          const title = clean(body.title), content = clean(body.body);
          if (title.length < 5 || title.length > 160 || content.length < 10 || content.length > 5000) return json(res, 400, { error: 'Title must be 5–160 characters and body 10–5000 characters' });
          const notice = { id: randomBytes(12).toString('hex'), title, body: content, status: 'draft', audience: 'public', createdAt: now().toISOString(), publishedAt: null };
          data.notices.push(notice);
          data.audit.push({ action: 'notice.created', noticeId: notice.id, actor: adminEmail, at: now().toISOString() });
          await save(data);
          return json(res, 201, notice);
        }
        const match = url.pathname.match(/^\/api\/admin\/notices\/([a-f0-9]+)\/publish$/);
        if (method === 'POST' && match) {
          const notice = data.notices.find(n => n.id === match[1]);
          if (!notice) return json(res, 404, { error: 'Notice not found' });
          if (notice.status !== 'draft') return json(res, 409, { error: 'Only draft notices can be published' });
          notice.status = 'published'; notice.publishedAt = now().toISOString();
          data.audit.push({ action: 'notice.published', noticeId: notice.id, actor: adminEmail, at: now().toISOString() });
          await save(data);
          return json(res, 200, notice);
        }
      }
      return json(res, 404, { error: 'Not found' });
    } catch (error) {
      return json(res, error instanceof SyntaxError ? 400 : 500, { error: error instanceof SyntaxError ? 'Invalid JSON' : 'Request failed' });
    }
  });
  return server;
}
