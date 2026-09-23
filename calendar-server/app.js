import { createServer } from 'node:http';
import { createHmac, createHash, timingSafeEqual } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { validState } from './validation.js';

const digest = value => createHash('sha256').update(value).digest();
export function createApp({store, password, secret, origin, secure = true}) {
  if (!password || password.length < 16 || !secret || secret.length < 32 || !origin) throw Error('APP_PASSWORD(16+), SESSION_SECRET(32+), origin are required');
  const sign = value => createHmac('sha256', secret).update(value).digest('hex');
  const passwordHash = digest(password);
  // A single-owner service: cap failed attempts globally, without trusting client IP headers.
  let failures = 0, windowStart = Date.now();
  const authenticated = req => {
    const token = /(?:^|;\s*)calendar_session=([^;]+)/.exec(req.headers.cookie || '')?.[1] || '';
    const [expiry, signature] = token.split('.');
    return /^\d+$/.test(expiry || '') && Number(expiry) > Date.now() && /^[a-f0-9]{64}$/.test(signature || '') && timingSafeEqual(Buffer.from(sign(expiry)), Buffer.from(signature));
  };
  const cookie = token => `calendar_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${token ? 2592000 : 0}${secure ? '; Secure' : ''}`;
  async function body(req) {
    let size = 0; const chunks = [];
    for await (const chunk of req) {size += chunk.length; if (size > 2_000_000) throw Object.assign(Error('요청이 너무 큽니다.'), {status:413}); chunks.push(chunk);}
    try {return JSON.parse(Buffer.concat(chunks).toString());} catch {throw Object.assign(Error('잘못된 JSON입니다.'), {status:400});}
  }
  return createServer(async (req, res) => {
    const json = (status, data) => {res.writeHead(status, {'Content-Type':'application/json; charset=utf-8'}); res.end(JSON.stringify(data));};
    res.setHeader('Cache-Control','no-store');
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','no-referrer');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://date.nager.at; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    try {
      const path = new URL(req.url, origin).pathname;
      if (['POST','PUT','DELETE','PATCH'].includes(req.method) && (req.headers.origin !== origin || !(req.headers['content-type'] || '').startsWith('application/json'))) return json(403, {error:'허용되지 않은 요청입니다.'});
      if (path === '/healthz' && req.method === 'GET') {await store.health(); return json(200,{ok:true});}
      if (path === '/api/login' && req.method === 'POST') {
        if (Date.now() - windowStart > 15*60*1000) {windowStart = Date.now(); failures = 0;}
        if (failures >= 20) return json(429,{error:'로그인 시도가 너무 많습니다. 15분 후 다시 시도하세요.'});
        const input = await body(req);
        if (typeof input?.password !== 'string' || !timingSafeEqual(digest(input.password), passwordHash)) {failures++; return json(401,{error:'비밀번호가 맞지 않습니다.'});}
        failures = 0;
        const expiry = String(Date.now() + 30*86400000);
        res.setHeader('Set-Cookie',cookie(`${expiry}.${sign(expiry)}`)); return json(200,{ok:true});
      }
      if (path === '/api/logout' && req.method === 'POST') {res.setHeader('Set-Cookie',cookie('')); return json(200,{ok:true});}
      if (path.startsWith('/api/')) {
        if (!authenticated(req)) return json(401,{error:'로그인이 필요합니다.'});
        if (path === '/api/state' && req.method === 'GET') return json(200,await store.get());
        if (path === '/api/state' && req.method === 'PUT') {
          const input = await body(req);
          if (!validState(input)) return json(400,{error:'일정 또는 공휴일 데이터 형식이 올바르지 않습니다.'});
          const updated = await store.put(input);
          return updated ? json(200,updated) : json(409,{error:'다른 창에서 데이터가 변경되었습니다. 새로고침 후 다시 저장하세요. 입력 내용은 현재 창에 남아 있습니다.'});
        }
        return json(404,{error:'API를 찾을 수 없습니다.'});
      }
      const files = {'/':['index.html','text/html'], '/calendar.js':['calendar.js','text/javascript'], '/cloud.js':['cloud.js','text/javascript']};
      if (req.method !== 'GET' || !files[path]) return json(404,{error:'페이지를 찾을 수 없습니다.'});
      const [file,type] = files[path]; const data = await readFile(new URL('./public/' + file, import.meta.url));
      res.writeHead(200,{'Content-Type':type + '; charset=utf-8'}); res.end(data);
    } catch (error) {
      if (error.status) return json(error.status,{error:error.message});
      console.error('Request failed:',error.code || error.name);
      json(503,{error:'서버에 연결하지 못했습니다. 잠시 후 다시 시도하세요. 변경 사항은 저장되지 않았습니다.'});
    }
  });
}
