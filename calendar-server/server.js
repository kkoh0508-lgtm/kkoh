import pg from 'pg';
import { createApp } from './app.js';

const {DATABASE_URL,APP_PASSWORD,SESSION_SECRET,APP_ORIGIN,RENDER_EXTERNAL_URL,NODE_ENV,PORT='3000'} = process.env;
if (!DATABASE_URL) throw Error('DATABASE_URL is required');
const origin = new URL(APP_ORIGIN || RENDER_EXTERNAL_URL || 'http://localhost:' + PORT).origin;
if (NODE_ENV === 'production' && !origin.startsWith('https://')) throw Error('Production requires HTTPS APP_ORIGIN or RENDER_EXTERNAL_URL');
const pool = new pg.Pool({connectionString:DATABASE_URL, max:5, connectionTimeoutMillis:10000, idleTimeoutMillis:30000, statement_timeout:15000});
pool.on('error', error => console.error('Database pool:',error.code || error.name));
await pool.query(`CREATE TABLE IF NOT EXISTS calendar_state (
  id INTEGER PRIMARY KEY CHECK (id=1), version INTEGER NOT NULL DEFAULT 0,
  events JSONB NOT NULL DEFAULT '[]', holiday_overrides JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
)`);
await pool.query('INSERT INTO calendar_state(id) VALUES(1) ON CONFLICT DO NOTHING');
const columns = 'version, events, holiday_overrides AS "holidayOverrides"';
const store = {
  health: () => pool.query('SELECT 1'),
  get: async () => (await pool.query(`SELECT ${columns} FROM calendar_state WHERE id=1`)).rows[0],
  put: async s => (await pool.query(`UPDATE calendar_state SET events=$1::jsonb, holiday_overrides=$2::jsonb, version=version+1, updated_at=now() WHERE id=1 AND version=$3 RETURNING ${columns}`, [JSON.stringify(s.events),JSON.stringify(s.holidayOverrides),s.version])).rows[0]
};
const server = createApp({store,password:APP_PASSWORD,secret:SESSION_SECRET,origin,secure:origin.startsWith('https://')});
server.listen(Number(PORT),'0.0.0.0',()=>console.log('Calendar server ready'));
process.on('SIGTERM',()=>{server.close(async()=>{await pool.end();process.exit(0)});setTimeout(()=>process.exit(1),10000).unref()});
