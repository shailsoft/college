import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from './app.js';

test('notice workflow protects drafts and records publication', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'college-api-'));
  const server = createApp({ dataFile: join(dir, 'content.json'), adminEmail: 'admin@example.edu', adminPassword: 'test-password-123' });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = (path, options) => fetch(base + path, options);
  try {
    let response = await request('/api/admin/notices');
    assert.equal(response.status, 401);
    response = await request('/api/login', { method: 'POST', body: JSON.stringify({ email: 'admin@example.edu', password: 'wrong' }) });
    assert.equal(response.status, 401);
    response = await request('/api/login', { method: 'POST', body: JSON.stringify({ email: 'admin@example.edu', password: 'test-password-123' }) });
    assert.equal(response.status, 200);
    const cookie = response.headers.get('set-cookie').split(';')[0];
    response = await request('/api/admin/notices', { method: 'POST', headers: { cookie }, body: JSON.stringify({ title: 'Library hours update', body: 'The library will open at nine each morning.' }) });
    assert.equal(response.status, 201);
    const notice = await response.json();
    assert.equal(notice.status, 'draft');
    let publicNotices = await (await request('/api/notices')).json();
    assert.equal(publicNotices.some(n => n.id === notice.id), false);
    response = await request(`/api/admin/notices/${notice.id}/publish`, { method: 'POST', headers: { cookie } });
    assert.equal(response.status, 200);
    publicNotices = await (await request('/api/notices')).json();
    assert.equal(publicNotices.some(n => n.id === notice.id), true);
    response = await request(`/api/admin/notices/${notice.id}/publish`, { method: 'POST', headers: { cookie } });
    assert.equal(response.status, 409);
    const audit = await (await request('/api/admin/audit', { headers: { cookie } })).json();
    assert.deepEqual(audit.map(a => a.action), ['notice.published', 'notice.created']);
  } finally {
    await new Promise(resolve => server.close(resolve));
    await rm(dir, { recursive: true, force: true });
  }
});
